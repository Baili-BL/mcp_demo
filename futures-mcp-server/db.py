# -*- coding: utf-8 -*-
"""
数据访问层：metric 库（期货研究品种指标数据）

数据源路由（与线上既有 MCP 约定一致）：
  source=1  同花顺        base_from_ths_*
  source=9  SMM           base_from_smm_*
  source=11 上海钢联(化工) base_from_mysteel_chemical_*
  source=34 手工录入      base_from_manual_*
另覆盖：
  EDB 指标库  edb_info / edb_series_data / edb_classify
  汾渭周评    sxcoal_data
"""
import os
import queue
import threading
from datetime import date, datetime

import pymysql
import pymysql.cursors

# ------------------------------------------------------------------
# 连接池（只读账号即可；所有查询参数化）
# ------------------------------------------------------------------
_POOL = None
_POOL_LOCK = threading.Lock()


def _pool():
    global _POOL
    with _POOL_LOCK:
        if _POOL is None:
            _POOL = _ConnectionPool(
                maxsize=int(os.getenv("DB_POOL_SIZE", "6")),
                host=os.getenv("DB_HOST", "127.0.0.1"),
                port=int(os.getenv("DB_PORT", "3306")),
                user=os.getenv("DB_USER", ""),
                password=os.getenv("DB_PASSWORD", ""),
                database=os.getenv("DB_NAME", "metric"),
            )
    return _POOL


class _ConnectionPool:
    def __init__(self, maxsize, **kw):
        self._q = queue.Queue(maxsize)
        self._kw = kw
        for _ in range(maxsize):
            self._q.put(self._new())

    def _new(self):
        return pymysql.connect(
            autocommit=True, charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=10, read_timeout=60, write_timeout=30,
            **self._kw,
        )

    def acquire(self):
        conn = self._q.get()
        try:
            conn.ping(reconnect=True)
        except Exception:
            conn = self._new()
        return conn

    def release(self, conn):
        self._q.put(conn)


def query(sql, params=None):
    conn = _pool().acquire()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        _pool().release(conn)


def query_one(sql, params=None):
    rows = query(sql, params)
    return rows[0] if rows else None


def _ser(v):
    """日期/时间转 ISO 字符串，便于 JSON 序列化。"""
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


# ------------------------------------------------------------------
# 数据源路由表（各源表结构差异在此收敛）
# ------------------------------------------------------------------
SOURCES = {
    1: {
        "name": "同花顺",
        "index_table": "base_from_ths_index",
        "data_table": "base_from_ths_data",
        "classify_table": "base_from_ths_classify",
        "index_pk": "base_from_ths_index_id",
        "classify_fk": "classify_id",
        "classify_id_col": "classify_id",
        "latest_col": "latest_value",
        "refresh_col": "refresh_time",
    },
    9: {
        "name": "SMM",
        "index_table": "base_from_smm_index",
        "data_table": "base_from_smm_data",
        "classify_table": "base_from_smm_classify",
        "index_pk": "base_from_smm_index_id",
        "classify_fk": "classify_id",
        "classify_id_col": "classify_id",
        "latest_col": "end_value",
        "refresh_col": "sync_time",
    },
    11: {
        "name": "上海钢联(化工)",
        "index_table": "base_from_mysteel_chemical_index",
        "data_table": "base_from_mysteel_chemical_data",
        "classify_table": "base_from_mysteel_chemical_classify",
        "index_pk": "base_from_mysteel_chemical_index_id",
        "classify_fk": "base_from_mysteel_chemical_classify_id",
        "classify_id_col": "base_from_mysteel_chemical_classify_id",
        "latest_col": "end_value",
        "refresh_col": "sync_time",
    },
    34: {
        "name": "手工录入",
        "index_table": "base_from_manual_index",
        "data_table": "base_from_manual_data",
        "classify_table": "base_from_manual_classify",
        "index_pk": "base_from_manual_index_id",
        "classify_fk": "classify_id",
        "classify_id_col": "classify_id",
        "latest_col": "latest_value",
        "refresh_col": "sync_time",
    },
}

MAX_PAGE_SIZE = 200   # 与线上 search_source_indexes 调用习惯一致
MAX_SERIES_LIMIT = 5000


def _cfg(source: int) -> dict:
    if source not in SOURCES:
        raise ValueError(f"未知数据源 source={source}，可选：{sorted(SOURCES)}")
    return SOURCES[source]


# ------------------------------------------------------------------
# 1. 数据源清单
# ------------------------------------------------------------------
def list_sources():
    out = []
    for sid, c in SOURCES.items():
        row = query_one(
            f"SELECT COUNT(*) AS index_count,"
            f"       MAX(end_date) AS latest_data_date,"
            f"       MAX({c['refresh_col']}) AS last_sync_time"
            f"  FROM {c['index_table']} WHERE is_stop = 0"
        )
        out.append({
            "source": sid,
            "source_name": c["name"],
            "index_count": row["index_count"],
            "latest_data_date": _ser(row["latest_data_date"]),
            "last_sync_time": _ser(row["last_sync_time"]),
        })
    return out


# ------------------------------------------------------------------
# 2. 分类树
# ------------------------------------------------------------------
def list_classifies(source: int, parent_id=None, level=None):
    c = _cfg(source)
    sql = (f"SELECT {c['classify_id_col']} AS classify_id, classify_name, parent_id, level, sort"
           f"  FROM {c['classify_table']} WHERE 1=1")
    params = []
    if parent_id is not None:
        sql += " AND parent_id = %s"
        params.append(parent_id)
    if level is not None:
        sql += " AND level = %s"
        params.append(level)
    sql += " ORDER BY level, sort LIMIT 2000"
    return query(sql, params)


# ------------------------------------------------------------------
# 3. 指标搜索（分页）
# ------------------------------------------------------------------
def search_indexes(source: int, keyword=None, classify_id=None, current=1, size=20):
    c = _cfg(source)
    size = max(1, min(int(size), MAX_PAGE_SIZE))
    current = max(1, int(current))
    where, params = ["is_stop = 0"], []
    if keyword:
        where.append("(index_name LIKE %s OR index_code LIKE %s)")
        params += [f"%{keyword}%", f"%{keyword}%"]
    if classify_id is not None:
        where.append(f"{c['classify_fk']} = %s")
        params.append(classify_id)
    wsql = " AND ".join(where)
    total = query_one(f"SELECT COUNT(*) AS n FROM {c['index_table']} WHERE {wsql}", params)["n"]
    rows = query(
        f"SELECT index_code, index_name,"
        f"       {c['classify_fk']} AS classify_id, unit, frequency,"
        f"       start_date, end_date, {c['latest_col']} AS latest_value,"
        f"       {c['refresh_col']} AS last_sync_time"
        f"  FROM {c['index_table']} WHERE {wsql}"
        f"  ORDER BY sort LIMIT %s OFFSET %s",
        params + [size, (current - 1) * size],
    )
    for r in rows:
        for k in ("start_date", "end_date", "last_sync_time"):
            r[k] = _ser(r[k])
    return {"total": total, "current": current, "size": size, "list": rows}


# ------------------------------------------------------------------
# 4. 指标时间序列
# ------------------------------------------------------------------
def get_series(source: int, index_code: str, start_date=None, end_date=None, limit=500):
    c = _cfg(source)
    meta = query_one(
        f"SELECT index_code, index_name, unit, frequency, start_date, end_date,"
        f"       {c['latest_col']} AS latest_value"
        f"  FROM {c['index_table']} WHERE index_code = %s LIMIT 1",
        (index_code,),
    )
    if not meta:
        raise ValueError(f"指标不存在：source={source}, index_code={index_code}")
    limit = max(1, min(int(limit), MAX_SERIES_LIMIT))
    where, params = ["index_code = %s"], [index_code]
    if start_date:
        where.append("data_time >= %s")
        params.append(start_date)
    if end_date:
        where.append("data_time <= %s")
        params.append(end_date)
    rows = query(
        f"SELECT data_time, value FROM {c['data_table']}"
        f"  WHERE {' AND '.join(where)}"
        f"  ORDER BY data_time DESC LIMIT %s",
        params + [limit],
    )
    points = [{"date": _ser(r["data_time"]), "value": r["value"]} for r in reversed(rows)]
    for k in ("start_date", "end_date"):
        meta[k] = _ser(meta[k])
    return {"meta": meta, "count": len(points), "points": points}


# ------------------------------------------------------------------
# 5. 汾渭周评（双焦要素）
# ------------------------------------------------------------------
def get_sxcoal_weekly(article_type=None, limit=5):
    where, params = "", []
    if article_type is not None:
        where = "WHERE article_type = %s"
        params.append(article_type)
    rows = query(
        f"SELECT id, news_time, title, summary, article_type, content_url, result"
        f"  FROM sxcoal_data {where} ORDER BY news_time DESC LIMIT %s",
        params + [max(1, min(int(limit), 50))],
    )
    for r in rows:
        r["news_time"] = _ser(r["news_time"])
    return rows


# ------------------------------------------------------------------
# 6/7. EDB 指标库
# ------------------------------------------------------------------
def search_edb(keyword=None, source=None, current=1, size=20):
    size = max(1, min(int(size), MAX_PAGE_SIZE))
    current = max(1, int(current))
    where, params = ["1=1"], []
    if keyword:
        where.append("(edb_name LIKE %s OR edb_code LIKE %s)")
        params += [f"%{keyword}%", f"%{keyword}%"]
    if source is not None:
        where.append("source = %s")
        params.append(source)
    wsql = " AND ".join(where)
    total = query_one(f"SELECT COUNT(*) AS n FROM edb_info WHERE {wsql}", params)["n"]
    rows = query(
        "SELECT edb_code, edb_name, source, source_name, unit, frequency,"
        "       start_date, end_date, latest_value, classify_id"
        f"  FROM edb_info WHERE {wsql} ORDER BY sort LIMIT %s OFFSET %s",
        params + [size, (current - 1) * size],
    )
    for r in rows:
        for k in ("start_date", "end_date"):
            r[k] = _ser(r[k])
    return {"total": total, "current": current, "size": size, "list": rows}


# EDB 来源编号 -> base_from 数据源编号（注意：两套编号语义不同！）
#   edb_info.source: 1=同花顺 34=上海钢联 9=手工数据 11=SMM
#   base_from 体系 : 1=同花顺 11=钢联化工 34=手工录入 9=SMM
EDB_TO_BASE_SOURCE = {1: 1, 34: 11, 9: 34, 11: 9}


def get_edb_series(edb_code: str, start_date=None, end_date=None, limit=500):
    meta = query_one(
        "SELECT edb_code, edb_name, source, source_name, unit, frequency,"
        "       start_date, end_date, latest_value"
        "  FROM edb_info WHERE edb_code = %s LIMIT 1",
        (edb_code,),
    )
    if not meta:
        raise ValueError(f"EDB 指标不存在：edb_code={edb_code}")
    limit = max(1, min(int(limit), MAX_SERIES_LIMIT))

    def _points(table):
        where, params = ["edb_code = %s" if table == "edb_series_data" else "index_code = %s"], [edb_code]
        if start_date:
            where.append("data_time >= %s")
            params.append(start_date)
        if end_date:
            where.append("data_time <= %s")
            params.append(end_date)
        return query(
            f"SELECT data_time, value FROM {table}"
            f"  WHERE {' AND '.join(where)} ORDER BY data_time DESC LIMIT %s",
            params + [limit],
        )

    # 1) 派生指标（指标运算/同比/降频/相关性等）：数据在 edb_series_data
    rows = _points("edb_series_data")
    store = "edb_series_data"
    # 2) 基础指标：edb_info 仅元数据，序列回源到 base_from_* 数据表
    if not rows:
        base = EDB_TO_BASE_SOURCE.get(meta["source"])
        if base:
            c = SOURCES[base]
            exists = query_one(
                f"SELECT 1 AS x FROM {c['index_table']} WHERE index_code = %s LIMIT 1",
                (edb_code,),
            )
            if exists:
                where, params = ["index_code = %s"], [edb_code]
                if start_date:
                    where.append("data_time >= %s")
                    params.append(start_date)
                if end_date:
                    where.append("data_time <= %s")
                    params.append(end_date)
                rows = query(
                    f"SELECT data_time, value FROM {c['data_table']}"
                    f"  WHERE {' AND '.join(where)} ORDER BY data_time DESC LIMIT %s",
                    params + [limit],
                )
                store = f"{c['data_table']} (source={base})"
    points = [{"date": _ser(r["data_time"]), "value": r["value"]} for r in reversed(rows)]
    for k in ("start_date", "end_date"):
        meta[k] = _ser(meta[k])
    return {"meta": meta, "store": store, "count": len(points), "points": points}


# ------------------------------------------------------------------
# 8. 数据新鲜度（逾期指标：end_date 最旧在前）
# ------------------------------------------------------------------
def get_source_freshness(source: int, current=1, size=20):
    c = _cfg(source)
    size = max(1, min(int(size), MAX_PAGE_SIZE))
    current = max(1, int(current))
    stale_days = int(os.getenv("FRESHNESS_STALE_DAYS", "10"))
    total = query_one(
        f"SELECT COUNT(*) AS n FROM {c['index_table']}"
        f"  WHERE is_stop = 0 AND end_date < DATE_SUB(CURDATE(), INTERVAL {stale_days} DAY)"
    )["n"]
    rows = query(
        f"SELECT index_code, index_name, unit, frequency, end_date,"
        f"       {c['refresh_col']} AS last_sync_time,"
        f"       DATEDIFF(CURDATE(), end_date) AS stale_days"
        f"  FROM {c['index_table']}"
        f"  WHERE is_stop = 0 AND end_date < DATE_SUB(CURDATE(), INTERVAL {stale_days} DAY)"
        f"  ORDER BY end_date ASC LIMIT %s OFFSET %s",
        [size, (current - 1) * size],
    )
    for r in rows:
        r["end_date"] = _ser(r["end_date"])
        r["last_sync_time"] = _ser(r["last_sync_time"])
    return {"stale_threshold_days": stale_days, "total": total,
            "current": current, "size": size, "list": rows}


# ------------------------------------------------------------------
# 鉴权：API Key 校验（60s 内存缓存）
# ------------------------------------------------------------------
_KEY_CACHE = {"ts": 0, "keys": {}}


def check_api_key(api_key: str):
    """返回 (info_or_none, reason)。reason: ok | missing | disabled | expired

    表：base_from_mcp_api_key。expire_time 为空视为长期有效。
    """
    import time
    if not api_key:
        return None, "missing"
    now = time.time()
    if now - _KEY_CACHE["ts"] > 60:
        rows = query(
            "SELECT id, name, api_key, enabled, expire_time FROM base_from_mcp_api_key"
        )
        _KEY_CACHE["keys"] = {r["api_key"]: r for r in rows}
        _KEY_CACHE["ts"] = now
    info = _KEY_CACHE["keys"].get(api_key)
    if not info:
        return None, "missing"
    payload = {
        "key_id": info["id"],
        "key_name": info["name"],
        "expire_time": _ser(info.get("expire_time")),
    }
    if not info["enabled"]:
        return payload, "disabled"
    exp = info.get("expire_time")
    if exp and exp < datetime.now():
        return payload, "expired"
    return payload, "ok"
