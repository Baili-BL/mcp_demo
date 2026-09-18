# -*- coding: utf-8 -*-
"""
期货研究品种数据 MCP 服务（FastMCP · Streamable HTTP）

工具对齐线上既有约定（base_from_mcp_invoke_log 中已在用的工具名）：
  list_metric_sources / list_source_classifies / search_source_indexes
  get_source_series / get_sxcoal_weekly
新增覆盖实际存在的表：
  search_edb / get_edb_series（EDB 指标库）
  get_source_freshness（数据新鲜度/逾期指标）

鉴权：Authorization: Bearer <api_key>，校验 base_from_mcp_api_key 表。
调用日志：默认落 logs/invoke_log.jsonl（只读账号）；如有可写账号，
          设 MCP_LOG_TO_DB=1 可同时写 base_from_mcp_invoke_log。

启动：
  pip install -r requirements.txt
  cp .env.example .env   # 填入数据库配置
  python server.py
"""
import json
import os
import time
import traceback
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import get_http_headers
from fastmcp.server.middleware import Middleware, MiddlewareContext

import db

MCP_HOST = os.getenv("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.getenv("MCP_PORT", "8600"))
MCP_PATH = os.getenv("MCP_PATH", "/mcp")
AUTH_REQUIRED = os.getenv("MCP_AUTH_REQUIRED", "1") == "1"
LOG_TO_DB = os.getenv("MCP_LOG_TO_DB", "0") == "1"
LOG_DIR = Path(os.getenv("MCP_LOG_DIR", "logs"))
LOG_DIR.mkdir(exist_ok=True)

mcp = FastMCP(
    name="futures-metric-mcp",
    instructions=(
        "期货研究品种指标数据服务。数据源：1=同花顺 9=SMM 11=上海钢联(化工) 34=手工录入；"
        "另有 EDB 指标库（search_edb/get_edb_series）与汾渭双焦周评（get_sxcoal_weekly）。"
        "典型用法：list_metric_sources → list_source_classifies → search_source_indexes → get_source_series。"
    ),
)


# ------------------------------------------------------------------
# 调用日志
# ------------------------------------------------------------------
def _write_log(*, key_id, key_name, phase, tool_name, source, args_summary,
               success, error_msg, row_count, duration_ms, client_ip):
    rec = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "key_id": key_id, "key_name": key_name, "phase": phase,
        "tool_name": tool_name, "source": source, "args_summary": args_summary[:1000],
        "success": success, "error_msg": error_msg[:500], "row_count": row_count,
        "duration_ms": round(duration_ms, 1), "client_ip": client_ip,
    }
    # 本地 JSONL（只读账号场景的默认通道）
    with open(LOG_DIR / "invoke_log.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    # 可选：写 base_from_mcp_invoke_log（需要可写账号）
    if LOG_TO_DB:
        try:
            conn = db._pool().acquire()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO base_from_mcp_invoke_log"
                        " (key_id, key_name, phase, tool_name, source, args_summary,"
                        "  success, error_msg, row_count, duration_ms, client_ip, create_time)"
                        " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
                        (key_id, key_name or "", phase, tool_name, source,
                         rec["args_summary"], 1 if success else 0, rec["error_msg"],
                         row_count, int(duration_ms), client_ip),
                    )
            finally:
                db._pool().release(conn)
        except Exception:
            traceback.print_exc()


def _client_ip(headers: dict) -> str:
    return (headers.get("x-forwarded-for", "").split(",")[0].strip()
            or headers.get("x-real-ip", "") or "-")


# ------------------------------------------------------------------
# 鉴权中间件
# ------------------------------------------------------------------
class ApiKeyAuthMiddleware(Middleware):
    """tools/call 与 tools/list 需要 Bearer Key；initialize 等握手消息放行。"""

    async def on_list_tools(self, context: MiddlewareContext, call_next):
        if AUTH_REQUIRED:
            self._auth(phase="LIST_TOOLS")
        return await call_next(context)

    async def on_call_tool(self, context: MiddlewareContext, call_next):
        if not AUTH_REQUIRED:
            return await call_next(context)
        key_info, headers = self._auth(phase="TOOLS_CALL")
        tool_name = getattr(context.message, "name", "")
        args = getattr(context.message, "arguments", None) or {}
        t0 = time.time()
        try:
            result = await call_next(context)
            _write_log(
                key_id=key_info["key_id"], key_name=key_info["key_name"],
                phase="TOOLS_CALL", tool_name=tool_name,
                source=args.get("source"),
                args_summary=json.dumps(args, ensure_ascii=False),
                success=True, error_msg="", row_count=_row_count(result),
                duration_ms=(time.time() - t0) * 1000, client_ip=_client_ip(headers),
            )
            return result
        except Exception as e:
            _write_log(
                key_id=key_info["key_id"], key_name=key_info["key_name"],
                phase="TOOLS_CALL", tool_name=tool_name,
                source=args.get("source") if isinstance(args, dict) else None,
                args_summary=json.dumps(args, ensure_ascii=False),
                success=False, error_msg=str(e), row_count=0,
                duration_ms=(time.time() - t0) * 1000, client_ip=_client_ip(headers),
            )
            raise

    def _auth(self, phase):
        headers = {}
        try:
            # 注意：get_http_headers 默认剥离 authorization 等敏感头，需显式 include
            headers = get_http_headers(
                include={"authorization", "x-forwarded-for", "x-real-ip"}
            ) or {}
        except Exception:
            pass
        auth = headers.get("authorization", "")
        api_key = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        info, reason = db.check_api_key(api_key) if api_key else (None, "missing")
        if reason != "ok":
            msgs = {
                "missing": "鉴权失败：请在请求头携带 Authorization: Bearer <api_key>",
                "disabled": "鉴权失败：该 API Key 已停用",
                "expired": "鉴权失败：该 API Key 已过期，请联系管理员续期",
            }
            _write_log(
                key_id=(info or {}).get("key_id"),
                key_name=(info or {}).get("key_name") or "",
                phase="AUTH_FAIL", tool_name="",
                source=None, args_summary="", success=False,
                error_msg=reason, row_count=0,
                duration_ms=0, client_ip=_client_ip(headers),
            )
            raise ToolError(msgs.get(reason, msgs["missing"]))
        return info, headers


def _row_count(result) -> int:
    """尽力从工具返回中提取行数用于日志。"""
    try:
        data = result.structured_content if hasattr(result, "structured_content") else result
        if isinstance(data, dict):
            if isinstance(data.get("list"), list):
                return len(data["list"])
            if isinstance(data.get("count"), int):
                return data["count"]
        if isinstance(data, list):
            return len(data)
    except Exception:
        pass
    return 0


mcp.add_middleware(ApiKeyAuthMiddleware())


# ------------------------------------------------------------------
# 工具定义（与线上一致的命名与参数风格）
# ------------------------------------------------------------------
@mcp.tool
def list_metric_sources() -> dict:
    """列出全部指标数据源：source 编号、名称、在库指标数、最新数据日期、最近同步时间。

    返回的 source 编号用于其他工具的 source 参数：1=同花顺 9=SMM 11=上海钢联(化工) 34=手工录入。
    """
    return {"sources": db.list_sources()}


@mcp.tool
def list_source_classifies(source: int, parent_id: int = None, level: int = None) -> dict:
    """获取指定数据源的指标分类树（如 黑色建材/能源化工/有色金属/农产品/贵金属 等）。

    :param source: 数据源编号（见 list_metric_sources）
    :param parent_id: 父分类 ID；不传返回整棵树（最多 2000 条），传 0 表示只看顶层
    :param level: 按层级过滤（1=顶层板块）
    """
    rows = db.list_classifies(source, parent_id=parent_id, level=level)
    return {"source": source, "count": len(rows), "list": rows}


@mcp.tool
def search_source_indexes(source: int, keyword: str = None, classify_id: int = None,
                          current: int = 1, size: int = 20) -> dict:
    """分页搜索指标：按名称/代码关键字、分类过滤，返回指标元数据与最新值。

    :param source: 数据源编号
    :param keyword: 指标名称或 index_code 模糊匹配，如 "螺纹钢" / "库存"
    :param classify_id: 分类 ID（见 list_source_classifies）
    :param current: 页码，从 1 开始
    :param size: 每页条数，最大 200
    """
    return db.search_indexes(source, keyword=keyword, classify_id=classify_id,
                             current=current, size=size)


@mcp.tool
def get_source_series(source: int, index_code: str, start_date: str = None,
                      end_date: str = None, limit: int = 500) -> dict:
    """获取指标时间序列（升序返回），附带指标元数据。

    :param source: 数据源编号
    :param index_code: 指标代码（由 search_source_indexes 获得）
    :param start_date: 起始日期 YYYY-MM-DD（可选）
    :param end_date: 截止日期 YYYY-MM-DD（可选）
    :param limit: 最多返回点数，默认 500，最大 5000（取最近 N 点）
    """
    return db.get_series(source, index_code, start_date=start_date,
                         end_date=end_date, limit=limit)


@mcp.tool
def get_sxcoal_weekly(article_type: int = None, limit: int = 5) -> dict:
    """汾渭双焦周度评述（含结构化 result：供应/需求/库存/价格等要素）。

    :param article_type: 1=炼焦煤周评 2=焦炭周评；不传返回全部类型
    :param limit: 返回最近 N 篇，默认 5
    """
    return {"list": db.get_sxcoal_weekly(article_type=article_type, limit=limit)}


@mcp.tool
def search_edb(keyword: str = None, source: int = None, current: int = 1, size: int = 20) -> dict:
    """搜索 EDB 指标库（含宏观、派生运算指标：同比/降频/超季节性/预测等）。

    :param keyword: 指标名称或 edb_code 模糊匹配
    :param source: EDB 来源编号过滤（edb_info.source，如 1=同花顺 34=上海钢联 4=指标运算）
    :param current: 页码
    :param size: 每页条数，最大 200
    """
    return db.search_edb(keyword=keyword, source=source, current=current, size=size)


@mcp.tool
def get_edb_series(edb_code: str, start_date: str = None, end_date: str = None,
                   limit: int = 500) -> dict:
    """获取 EDB 指标时间序列（升序返回）。

    :param edb_code: EDB 指标代码（由 search_edb 获得）
    :param start_date: 起始日期 YYYY-MM-DD（可选）
    :param end_date: 截止日期 YYYY-MM-DD（可选）
    :param limit: 最多返回点数，默认 500，最大 5000
    """
    return db.get_edb_series(edb_code, start_date=start_date,
                             end_date=end_date, limit=limit)


@mcp.tool
def get_source_freshness(source: int, current: int = 1, size: int = 20) -> dict:
    """数据新鲜度检查：列出数据截止日期已逾期的指标（end_date 最旧在前）。

    逾期阈值由服务端 FRESHNESS_STALE_DAYS 控制（默认 10 天）。

    :param source: 数据源编号
    :param current: 页码
    :param size: 每页条数，最大 200
    """
    return db.get_source_freshness(source, current=current, size=size)


if __name__ == "__main__":
    print(f"[futures-metric-mcp] listening on http://{MCP_HOST}:{MCP_PORT}{MCP_PATH} "
          f"(auth={'on' if AUTH_REQUIRED else 'off'})")
    mcp.run(transport="http", host=MCP_HOST, port=MCP_PORT, path=MCP_PATH)
