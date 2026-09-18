# MCP 工具概览

MCP 工具是给 LLM Agent 用的期货研究品种指标适配器。它不改指标口径，只把 MySQL 指标库的查询重组为可被模型选择的工具、参数与返回值。

- **薄包装原则**：工具实现只查询既有指标表（同花顺 / SMM / 钢联化工 / 手工录入 / EDB），不在 MCP 层重算口径。
- **数据语义一致**：返回字段与源库一致（指标代码、名称、单位、时间序列点）。
- **错误透传**：鉴权失败、参数不合法、上游超时以 MCP `ToolError` / 网关状态码返回，不改写业务含义。

## 鉴权

| 形态 | 入口 | 鉴权 |
|---|---|---|
| 托管 MCP Server | Streamable HTTP 端点 | `Authorization: Bearer <api_key>`，校验 `base_from_mcp_api_key`（enabled + expire_time） |
| 自托管 / 本地调试 | `python3 server.py` → `http://127.0.0.1:8600/mcp` | 同一套 Bearer Key；`MCP_AUTH_REQUIRED=0` 可关鉴权（仅本机） |

API Key 在管理台「接入与密钥」签发，仅创建时完整展示。过期与日配额 / QPS 相互独立：过期直接 `AUTH_FAIL`，超限返回 429。

## 调用频率与限流

按接入密钥限制日配额与 QPS。请控制短时高并发；HTTP 429 表示触发限流，应降低并发、避免立即连续重试、按 `Retry-After` 稍后重试。密钥到期前 7 天会告警。

## MCP 服务与访问端点

当前生产按业务拆为多个 MCP 服务；本地联调使用同一个 FastMCP 进程：

| MCP 服务 | 标的宇宙 | MCP 访问端点 |
|---|---|---|
| futures-market-mcp | 品种行情 / 库存 / 基差 | https://mcp.futures-data.cn/market/mcp |
| futures-fundamental-mcp | 产业基本面 | https://mcp.futures-data.cn/fundamental/mcp |
| research-knowledge-mcp | 研报知识（SSE） | https://mcp.futures-data.cn/research/sse |
| futures-metric-mcp（本地） | 四源指标 + EDB + 汾渭周评 | http://127.0.0.1:8600/mcp |

本地 `futures-metric-mcp` 是行情与基本面指标的数据面实现，建议与密钥管理台一起使用。`list_metric_sources` / `search_source_indexes` 是其余取数工具的前置步骤。

## 客户端快速配置

把 JSON 粘进对应客户端。`<your-api-key>` 换成管理台签发的 Key。HTTP 远程服务**不要**配 stdio 的 `command` / `args` / `env`，那是本地进程型 MCP 用的。

### Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "futures-metric": {
      "type": "http",
      "url": "http://127.0.0.1:8600/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

SSE 服务把 `type` 改为 `"sse"`，`url` 换成对应 SSE 端点。远程 HTTP MCP 统一这一份 JSON，鉴权为 Bearer API Key。

各客户端配置文件位置：

| 客户端 | 配置文件路径 |
|---|---|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) · `%APPDATA%\Claude\claude_desktop_config.json` (Windows) |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline (VS Code) | 命令面板 → Cline: Open MCP Settings |

配好后重启客户端生效。`initialize` 握手不强制鉴权；`tools/list` 与 `tools/call` 必须带 Key。

## 工具一览

当前本地 FastMCP 共注册 8 个工具，覆盖四源产业指标检索、时间序列、EDB 派生指标、汾渭双焦周评与数据新鲜度。

| MCP 服务 | MCP 端点 | MCP 工具 | 中文名 | 对应数据 |
|---|---|---|---|---|
| futures-metric-mcp | /mcp | list_metric_sources | 列出指标数据源 | source=1/9/11/34 元数据 |
| futures-metric-mcp | /mcp | list_source_classifies | 数据源分类树 | 各源 classify 表 |
| futures-metric-mcp | /mcp | search_source_indexes | 搜索指标 | 按 keyword / classify 分页 |
| futures-metric-mcp | /mcp | get_source_series | 指标时间序列 | 升序点，最大 5000 |
| futures-metric-mcp | /mcp | get_sxcoal_weekly | 汾渭双焦周评 | 炼焦煤 / 焦炭周评 |
| futures-metric-mcp | /mcp | search_edb | 搜索 EDB 指标 | 宏观 / 派生运算 |
| futures-metric-mcp | /mcp | get_edb_series | EDB 时间序列 | edb_series_data，可回源 |
| futures-metric-mcp | /mcp | get_source_freshness | 数据新鲜度 | end_date 逾期（默认 10 天） |

`search_source_indexes` 返回条数等于 `size` 时递增 `current` 直到取尽。`get_source_series` / `get_edb_series` 先确定 `index_code` / `edb_code` 再取序列。

## AI Agent 跨服务调用场景

不确定指标代码时，先 `list_metric_sources`（或已知 source）再 `search_source_indexes`，不要直接猜 `index_code`。

1. **「螺纹钢最近价格怎么样？」** → `search_source_indexes{source:1, keyword:"螺纹钢"}` → 选用收盘价指标 → `get_source_series{source:1, index_code:"S012107757"}` → 用最新点生成结论。
2. **「焦炭周度供需怎么说？」** → `get_sxcoal_weekly{article_type:2, limit:3}` → 归纳供应 / 需求 / 库存 / 价格。
3. **「这个源哪些指标停更了？」** → `get_source_freshness{source:1}` → 按 end_date 列出逾期项。
4. **「宏观同比或派生指标」** → `search_edb{keyword:"…"}` → `get_edb_series{edb_code:"…"}`。

## 与 REST 的差异

| | MCP | 管理台 / 直连库 |
|---|---|---|
| 认证 | `Authorization: Bearer` | 管理台会话；库账号不对外 |
| 调用方式 | `tools/list` · `tools/call` | 控制台表单 / SQL |
| 数据一致 | 同一套指标表与口径 | 同一套指标表与口径 |
| 传输 | Streamable HTTP（部分知识服务为 SSE） | HTTPS 控制台 |
