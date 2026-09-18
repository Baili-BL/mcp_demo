import { reactive } from 'vue'

export const SECTOR_TAG = { 黑色: 'gray', 有色: 'orange', 能化: 'purple', 农产品: 'green', 贵金属: 'gold' }
export const SVC_COLORS = ['#165dff', '#722ed1', '#eb2f96', '#f77234', '#14c9c9', '#00b42a']
export const ERR_DIST = [
  { code: 'MCP_ERR_UPSTREAM_TIMEOUT', n: 86, c: '#165dff', note: '上游数据源超时' },
  { code: 'MCP_ERR_UPSTREAM_502', n: 47, c: '#14c9c9', note: '上游网关错误' },
  { code: 'MCP_ERR_RATE_LIMITED', n: 34, c: '#f7ba1e', note: '触发 QPS 限流' },
  { code: 'MCP_ERR_SCHEMA_MISMATCH', n: 15, c: '#f77234', note: '参数校验失败' },
  { code: 'MCP_ERR_NOT_FOUND', n: 11, c: '#f53f3f', note: '数据缺失' },
]
export const SCHEMA_TPL = `{
  "type": "object",
  "properties": {
    "variety": { "type": "string", "description": "品种代码，如 CU / RB / SA" },
    "start_date": { "type": "string", "format": "date" },
    "end_date": { "type": "string", "format": "date" }
  },
  "required": ["variety"]
}`

function pattern(h) {
  const p = { 9: 1, 10: 1.1, 11: 0.8, 13: 0.9, 14: 1, 15: 0.7, 21: 0.9, 22: 0.8, 23: 0.5 }
  return p[h] || 0.12
}
export function genTrend() {
  const mk = (s) => Array.from({ length: 24 }, (_, h) => Math.round(s * pattern(h) * (0.85 + Math.random() * 0.3)))
  return {
    labels: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00'),
    series: [
      { name: '品种行情服务', color: '#165dff', data: mk(2000) },
      { name: '产业基本面服务', color: '#14c9c9', data: mk(660) },
      { name: '研报知识服务', color: '#f7ba1e', data: mk(280) },
      { name: '数据分析服务', color: '#722ed1', data: mk(420) },
    ],
  }
}
export function genLatency(labels) {
  const mk = (base) => Array.from({ length: 24 }, (_, h) => {
    let v = base * (0.82 + pattern(h) * 0.45 + Math.random() * 0.22)
    if (h === 13 || h === 14) v *= 1.9
    return Math.round(v)
  })
  return {
    labels,
    series: [
      { name: 'P50', color: '#00b42a', data: mk(165) },
      { name: 'P95', color: '#f77234', data: mk(430) },
      { name: 'P99', color: '#f53f3f', data: mk(810) },
    ],
  }
}

const trend0 = genTrend()

export const store = reactive({
  services: [
    { id: 'mkt', name: '品种行情服务', code: 'futures-market-mcp', version: 'v1.3.2', proto: 'Streamable HTTP', endpoint: 'https://mcp.futures-data.cn/market/mcp', sources: ['同花顺'], health: 'healthy', inst: '3/3', calls1h: 1832, err1h: 2, sla: '99.98%' },
    { id: 'fund', name: '产业基本面服务', code: 'futures-fundamental-mcp', version: 'v1.1.0', proto: 'Streamable HTTP', endpoint: 'https://mcp.futures-data.cn/fundamental/mcp', sources: ['SMM', '上海钢联'], health: 'healthy', inst: '2/2', calls1h: 964, err1h: 5, sla: '99.92%' },
    { id: 'res', name: '研报知识服务', code: 'research-knowledge-mcp', version: 'v0.9.4', proto: 'SSE', endpoint: 'https://mcp.futures-data.cn/research/sse', sources: [], health: 'degraded', inst: '2/3', calls1h: 417, err1h: 21, sla: '99.61%' },
    { id: 'anl', name: '数据分析服务', code: 'data-analytics-mcp', version: 'v0.8.1', proto: 'Streamable HTTP', endpoint: 'https://mcp.futures-data.cn/analytics/mcp', sources: ['CRM 系统', '数仓'], health: 'healthy', inst: '2/2', calls1h: 538, err1h: 3, sla: '99.88%' },
  ],
  svcMeta: {
    mkt: { n: '品种行情服务', c: '#165dff' },
    fund: { n: '产业基本面服务', c: '#14c9c9' },
    res: { n: '研报知识服务', c: '#f7ba1e' },
    anl: { n: '数据分析服务', c: '#722ed1' },
  },
  tools: [
    { name: 'get_spot_price', cn: '现货价格查询', svc: 'mkt', sector: '有色', version: 'v1.3.0', calls: 4213, sr: 99.7, lat: 156, on: true, desc: '按品种/地区查询现货日度价格，支持升贴水与均价口径。', schema: { type: 'object', properties: { variety: { type: 'string', description: '品种代码，如 CU / RB / SA' }, region: { type: 'string', description: '地区，默认华东' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' } }, required: ['variety'] }, week: [3820, 4102, 3988, 4230, 4405, 4021, 4213], errs: [{ t: '09:12', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '同花顺行情网关响应超时（>3s），已重试成功' }] },
    { name: 'get_futures_quote', cn: '盘面行情快照', svc: 'mkt', sector: '黑色', version: 'v1.3.2', calls: 6832, sr: 99.9, lat: 98, on: true, desc: '主力/次主力合约实时行情快照：最新价、持仓、成交、结算价。', schema: { type: 'object', properties: { variety: { type: 'string', description: '品种代码' }, contract: { type: 'string', description: '合约，默认主力连续', default: 'main' }, fields: { type: 'array', items: { type: 'string' }, description: '返回字段子集' } }, required: ['variety'] }, week: [6210, 6544, 6702, 6890, 7012, 6554, 6832], errs: [{ t: '10:41', code: 'MCP_ERR_SCHEMA_MISMATCH', msg: '客户端传入 contract=“rb9999” 非法，已拒绝' }] },
    { name: 'get_basis', cn: '基差与升贴水', svc: 'mkt', sector: '能化', version: 'v1.2.1', calls: 2854, sr: 99.5, lat: 172, on: true, desc: '期现基差、现货升贴水计算，支持自定义现货口径与合约。', schema: { type: 'object', properties: { variety: { type: 'string' }, contract: { type: 'string', default: 'main' }, spot_basis: { type: 'string', description: '现货口径：华东市场价/长江现货等' } }, required: ['variety'] }, week: [2410, 2566, 2698, 2777, 2901, 2633, 2854], errs: [{ t: '13:05', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '现货口径数据延迟 8 分钟' }] },
    { name: 'get_term_structure', cn: '期限结构曲线', svc: 'mkt', sector: '贵金属', version: 'v1.1.0', calls: 1476, sr: 99.8, lat: 210, on: true, desc: '输出品种全部挂牌合约价格曲线，识别 Contango / Back 结构。', schema: { type: 'object', properties: { variety: { type: 'string' }, date: { type: 'string', format: 'date', description: '默认最新交易日' } }, required: ['variety'] }, week: [1202, 1311, 1380, 1422, 1509, 1440, 1476], errs: [{ t: '14:20', code: 'MCP_ERR_NOT_FOUND', msg: '品种 AG 当日次主力合约无成交，返回空集' }] },
    { name: 'get_inventory', cn: '库存数据查询', svc: 'mkt', sector: '黑色', version: 'v1.2.4', calls: 3541, sr: 99.1, lat: 188, on: true, desc: '交易所仓单 + 社会库存 + 港口库存，支持周度/日度频度。', schema: { type: 'object', properties: { variety: { type: 'string' }, inv_type: { type: 'string', enum: ['exchange', 'social', 'port'], description: '库存类型' }, freq: { type: 'string', enum: ['daily', 'weekly'], default: 'weekly' } }, required: ['variety', 'inv_type'] }, week: [3105, 3320, 3412, 3566, 3488, 3402, 3541], errs: [{ t: '08:15', code: 'MCP_ERR_UPSTREAM_DELAY', msg: 'SMM 库存数据同步延迟 12 分钟' }] },
    { name: 'get_production_profit', cn: '产业利润测算', svc: 'fund', sector: '黑色', version: 'v1.0.8', calls: 1902, sr: 99.4, lat: 340, on: true, desc: '钢厂/焦化/电解铝等产业利润模型测算，含原料成本拆分。', schema: { type: 'object', properties: { industry: { type: 'string', description: '产业：高炉/电炉/焦化/电解铝…' }, region: { type: 'string' }, model: { type: 'string', description: '测算模型版本', default: 'v2026.3' } }, required: ['industry'] }, week: [1622, 1740, 1805, 1877, 1950, 1832, 1902], errs: [{ t: '11:32', code: 'MCP_ERR_UPSTREAM_502', msg: '钢联成本接口 502，已切换缓存数据' }] },
    { name: 'get_operating_rate', cn: '开工率 / 产能利用率', svc: 'fund', sector: '能化', version: 'v1.1.0', calls: 2267, sr: 98.9, lat: 296, on: true, desc: '分行业开工率与产能利用率，周度更新，含样本覆盖率说明。', schema: { type: 'object', properties: { industry: { type: 'string' }, weeks: { type: 'integer', description: '回看周数', default: 12 } }, required: ['industry'] }, week: [1890, 2011, 2145, 2233, 2301, 2198, 2267], errs: [{ t: '10:02', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '钢联周度样本接口超时' }] },
    { name: 'get_capacity', cn: '产能产量统计', svc: 'fund', sector: '有色', version: 'v1.0.3', calls: 1120, sr: 99.6, lat: 265, on: true, desc: '品种产能、产量、新增/淘汰产能动态，月度频度。', schema: { type: 'object', properties: { variety: { type: 'string' }, months: { type: 'integer', default: 24 } }, required: ['variety'] }, week: [980, 1022, 1098, 1135, 1188, 1102, 1120], errs: [{ t: '15:44', code: 'MCP_ERR_NOT_FOUND', msg: '品种 NI 2025 年以前产能数据缺失' }] },
    { name: 'get_trade_flow', cn: '进出口与发运', svc: 'fund', sector: '农产品', version: 'v0.9.7', calls: 861, sr: 96.2, lat: 420, on: true, desc: '海关进出口、港口发运/到港数据，支持国别维度。', schema: { type: 'object', properties: { variety: { type: 'string' }, country: { type: 'string', description: '国别，默认全部' }, months: { type: 'integer', default: 12 } }, required: ['variety'] }, week: [702, 744, 812, 835, 890, 822, 861], errs: [{ t: '09:47', code: 'MCP_ERR_UPSTREAM_502', msg: '海关数据源接口抖动，成功率下降' }, { t: '14:18', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '发运数据拉取超时' }] },
    { name: 'search_reports', cn: '研报全文检索', svc: 'res', sector: '有色', version: 'v0.9.4', calls: 1543, sr: 98.2, lat: 1180, on: true, desc: '对研报库（PDF/MD）做全文+语义检索，返回段落级引用。', schema: { type: 'object', properties: { query: { type: 'string', description: '检索词或自然语言问题' }, variety: { type: 'string' }, top_k: { type: 'integer', default: 10 }, date_range: { type: 'string', description: '如 2026-01-01/2026-09-16' } }, required: ['query'] }, week: [1210, 1388, 1452, 1501, 1602, 1488, 1543], errs: [{ t: '13:58', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '向量检索集群负载高，P95 超阈值' }, { t: '16:02', code: 'MCP_ERR_RATE_LIMITED', msg: '单客户端触发 20 QPS 限流' }] },
    { name: 'get_research_framework', cn: '品种投研框架', svc: 'res', sector: '农产品', version: 'v0.8.2', calls: 692, sr: 99.3, lat: 640, on: true, desc: '返回品种投研框架与核心指标树（蒸馏自研究员方法论）。', schema: { type: 'object', properties: { variety: { type: 'string' }, depth: { type: 'integer', description: '指标树深度', default: 3 } }, required: ['variety'] }, week: [566, 601, 640, 675, 710, 655, 692], errs: [{ t: '12:20', code: 'MCP_ERR_NOT_FOUND', msg: '品种 SI 框架尚未蒸馏入库' }] },
    { name: 'extract_indicator_view', cn: '研报指标观点抽取', svc: 'res', sector: '贵金属', version: 'v0.7.5', calls: 428, sr: 97.1, lat: 1520, on: true, desc: '从研报正文抽取指标级多空观点与逻辑链，结构化输出。', schema: { type: 'object', properties: { report_id: { type: 'string' }, indicators: { type: 'array', items: { type: 'string' }, description: '指定指标，默认全量' }, llm: { type: 'string', description: '抽取模型', default: 'qwen3-72b' } }, required: ['report_id'] }, week: [301, 335, 372, 398, 445, 410, 428], errs: [{ t: '15:10', code: 'MCP_ERR_UPSTREAM_502', msg: 'LLM 抽取网关 502，自动降级轻量模型' }, { t: '16:31', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '长文档抽取超时（>30s）' }] },
    { name: 'list_datasets', cn: '列出分析数据集', svc: 'anl', sector: '数仓', version: 'v0.8.1', calls: 712, sr: 99.6, lat: 180, on: true, desc: '枚举 CRM / 数仓中已授权的分析数据集与字段字典，供 Agent 选表。', schema: { type: 'object', properties: { source: { type: 'string', enum: ['crm', 'warehouse', 'all'], description: '数据来源，默认 all', default: 'all' }, keyword: { type: 'string', description: '按名称或业务域过滤' } }, required: [] }, week: [540, 588, 610, 655, 690, 668, 712], errs: [{ t: '—', code: '—', msg: '暂无错误记录' }] },
    { name: 'query_warehouse', cn: '数仓取数', svc: 'anl', sector: '数仓', version: 'v0.8.1', calls: 964, sr: 98.8, lat: 620, on: true, desc: '按数据集 ID 与过滤条件从数仓拉明细 / 汇总，限制返回行数。', schema: { type: 'object', properties: { dataset_id: { type: 'string', description: '如 dw.ads_variety_pnl_d' }, filters: { type: 'string', description: '过滤条件，如 variety=CU AND dt>=2026-01-01' }, metrics: { type: 'array', items: { type: 'string' }, description: '指标列，默认全部' }, limit: { type: 'integer', default: 500, description: '最大行数，上限 5000' } }, required: ['dataset_id'] }, week: [720, 780, 810, 888, 940, 902, 964], errs: [{ t: '11:08', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '数仓查询队列拥堵，已重试成功' }] },
    { name: 'search_crm_accounts', cn: 'CRM 客户检索', svc: 'anl', sector: 'CRM', version: 'v0.7.4', calls: 486, sr: 99.2, lat: 240, on: true, desc: '按名称、行业、跟进人检索 CRM 客户与最近互动。', schema: { type: 'object', properties: { query: { type: 'string', description: '客户名称 / 统一社会信用代码 / 跟进人' }, industry: { type: 'string', description: '行业，可选' }, status: { type: 'string', enum: ['active', 'churn', 'all'], default: 'active' }, limit: { type: 'integer', default: 20 } }, required: ['query'] }, week: [310, 355, 380, 412, 450, 428, 486], errs: [{ t: '09:22', code: 'MCP_ERR_RATE_LIMITED', msg: 'CRM 开放接口触发 10 QPS 限流' }] },
    { name: 'get_crm_pipeline', cn: 'CRM 商机漏斗', svc: 'anl', sector: 'CRM', version: 'v0.7.4', calls: 328, sr: 99.4, lat: 310, on: true, desc: '按时间窗与销售团队汇总商机阶段、金额与转化率。', schema: { type: 'object', properties: { team: { type: 'string', description: '销售团队，默认全部' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' } }, required: [] }, week: [210, 244, 268, 290, 318, 301, 328], errs: [{ t: '—', code: '—', msg: '暂无错误记录' }] },
    { name: 'run_stat_analysis', cn: '统计与相关性分析', svc: 'anl', sector: '数仓', version: 'v0.8.0', calls: 255, sr: 97.8, lat: 1480, on: true, desc: '对选定数据集做描述性统计、分组对比或相关系数，返回结构化结果。', schema: { type: 'object', properties: { dataset_id: { type: 'string' }, method: { type: 'string', enum: ['describe', 'groupby', 'corr'], description: '分析方法', default: 'describe' }, group_by: { type: 'string', description: 'groupby 时的维度列' }, columns: { type: 'array', items: { type: 'string' }, description: '分析列，默认数值列' } }, required: ['dataset_id'] }, week: [160, 188, 201, 220, 248, 232, 255], errs: [{ t: '16:40', code: 'MCP_ERR_UPSTREAM_TIMEOUT', msg: '宽表 corr 计算超过 15s，已降级抽样' }] },
  ],
  clients: [
    { id: 'ck-claude', name: 'Claude Desktop', type: '桌面助手', tag: 'purple', key: 'mcp-sk-a3f8…9c2e', calls: 12408, quota: 50000, qps: 10, status: 'normal', expire: '2026-12-31 23:59:59', last: '10 秒前', toolsetIds: ['ts-market'], userId: 'u-an' },
    { id: 'ck-cursor', name: 'Cursor', type: 'IDE 插件', tag: 'cyan', key: 'mcp-sk-77b1…04fa', calls: 8932, quota: 30000, qps: 20, status: 'normal', expire: '2026-09-24 23:59:59', last: '32 秒前', toolsetIds: ['ts-market', 'ts-fund'], userId: 'u-an' },
    { id: 'ck-agent', name: '自研投研 Agent', type: '服务端应用', tag: 'blue', key: 'mcp-sk-e5d2…88aa', calls: 5210, quota: 100000, qps: 50, status: 'normal', expire: null, last: '1 分钟前', toolsetIds: ['ts-market', 'ts-fund', 'ts-analytics'], userId: 'u-dev' },
    { id: 'ck-bot', name: '数据校验 Bot', type: '服务端应用', tag: 'blue', key: 'mcp-sk-1b9c…f377', calls: 1179, quota: 10000, qps: 5, status: 'limited', expire: '2026-12-31 23:59:59', last: '4 分钟前', toolsetIds: ['ts-fund'], userId: 'u-dev' },
    { id: 'ck-trial', name: '合作方试用', type: '服务端应用', tag: 'gray', key: 'mcp-sk-9e01…c4b2', calls: 86, quota: 5000, qps: 5, status: 'normal', expire: '2026-09-10 23:59:59', last: '3 天前', toolsetIds: ['ts-analytics'], userId: 'u-cust' },
  ],
  users: [
    { id: 'u-admin', name: '陈可', email: 'chenke@example.com', phone: '13800001001', kind: 'staff', role: '管理员', tag: 'red', team: '数智中心', status: '正常', created: '2026-08-01', last: '10 分钟前', wecomUserId: 'chenke' },
    { id: 'u-dev', name: '林舟', email: 'linzhou@example.com', phone: '13800001002', kind: 'staff', role: '开发工程师', tag: 'arcoblue', team: '数智中心', status: '正常', created: '2026-08-12', last: '1 小时前', wecomUserId: 'linzhou' },
    { id: 'u-an', name: '周研', email: 'zhouyan@example.com', phone: '13800001003', kind: 'staff', role: '研究员', tag: 'green', team: '有色组', status: '正常', created: '2026-09-02', last: '昨天', wecomUserId: 'zhouyan' },
    { id: 'u-cust', name: '苏岚', email: 'sulan@tongye.example', phone: '13900002001', kind: 'customer', role: '客户', tag: 'gray', team: '某铜业集团', status: '正常', created: '2026-09-10', last: '3 天前' },
    { id: 'u-wait', name: '王启', email: '', phone: '', kind: 'staff', role: '研究员', tag: 'green', team: '能化组', status: '待注册', created: '2026-09-17', last: '—', wecomUserId: 'wangqi' },
    { id: 'u-cust-wait', name: '待注册', email: '', phone: '', kind: 'customer', role: '客户', tag: 'gray', team: '华东贸易', status: '待注册', created: '2026-09-18', last: '—', inviteToken: 'inv-cust-demo' },
    { id: 'u-app', name: '赵衡', email: 'zhaoheng@example.com', phone: '13700001005', kind: 'staff', role: '开发工程师', tag: 'arcoblue', team: '数据分析', status: '待审批', created: '2026-09-18', last: '—', wecomUserId: 'zhaoheng', note: '待从企业微信通讯录确认开通' },
  ],
  invites: [
    { token: 'inv-cust-demo', kind: 'customer', role: '客户', org: '华东贸易', nameHint: '', status: 'open', created: '2026-09-18', expireAt: '2026-09-25' },
  ],
  rules: [
    { name: '调用成功率低于 99%（持续 5 分钟）', level: '严重', tag: 'red', notify: '飞书 + 企业微信', on: true },
    { name: 'P95 延迟超过 800ms（持续 10 分钟）', level: '警告', tag: 'orangered', notify: '飞书', on: true },
    { name: '健康检查连续失败 3 次', level: '严重', tag: 'red', notify: '飞书 + 企业微信', on: true },
    { name: '单客户端触发 QPS 限流', level: '提示', tag: 'blue', notify: '企业微信', on: true },
    { name: 'API Key 到期前 7 天提醒', level: '警告', tag: 'orangered', notify: '飞书 + 企业微信', on: true },
    { name: '上游数据源同步延迟 > 30 分钟', level: '警告', tag: 'orangered', notify: '企业微信', on: false },
  ],
  alerts: [
    { t: '今日 14:32', level: '严重', tag: 'red', obj: '研报知识服务', ct: '健康检查 /research/sse 连续 3 次失败，已自动切换备用实例', st: '已确认' },
    { t: '今日 13:58', level: '警告', tag: 'orangered', obj: 'research-knowledge-mcp', ct: 'P95 延迟 1,240ms，超过 800ms 阈值', st: '未处理' },
    { t: '今日 11:20', level: '提示', tag: 'blue', obj: '数据校验 Bot', ct: '触发 5 QPS 限流，已丢弃 34 次调用', st: '已确认' },
    { t: '今日 10:05', level: '警告', tag: 'orangered', obj: 'Cursor', ct: 'API Key 将于 2026-09-24 到期（剩余 7 天），请及时续期', st: '未处理' },
    { t: '今日 08:40', level: '严重', tag: 'red', obj: '合作方试用', ct: 'API Key 已于 2026-09-10 过期，网关已拒绝后续调用', st: '未处理' },
    { t: '今日 09:47', level: '警告', tag: 'orangered', obj: 'get_trade_flow', ct: '调用成功率降至 96.2%，低于 99% 阈值', st: '未处理' },
    { t: '今日 08:15', level: '提示', tag: 'blue', obj: 'get_inventory', ct: '上游 SMM 库存数据同步延迟 12 分钟', st: '已恢复' },
    { t: '昨日 22:40', level: '警告', tag: 'orangered', obj: '产业基本面服务', ct: 'P95 延迟 812ms 超阈值，10 分钟后自动恢复', st: '已恢复' },
  ],
  trend: trend0,
  lat: genLatency(trend0.labels),
  logs: [],
  logPause: false,
  logFilter: 'all',
  flt: { svc: 'all', sector: 'all', platform: 'all', kw: '' },
  platforms: ['同花顺', 'SMM', '上海钢联', 'CRM 系统', '数仓'],
  hubTab: 'services',
  toolsets: [
    {
      id: 'ts-market',
      name: '投研行情工具集',
      path: '/mcp',
      auth: 'apikey',
      mode: 'all',
      status: 'running',
      created: '2026-09-12 10:24:11',
      tools: ['get_spot_price', 'get_futures_quote', 'get_basis', 'get_inventory'],
    },
    {
      id: 'ts-fund',
      name: '产业基本面工具集',
      path: '/mcp',
      auth: 'apikey',
      mode: 'all',
      status: 'running',
      created: '2026-09-14 16:03:40',
      tools: ['get_production_profit', 'get_operating_rate', 'get_capacity', 'get_trade_flow'],
    },
    {
      id: 'ts-analytics',
      name: '数据分析工具集',
      path: '/mcp',
      auth: 'apikey',
      mode: 'semantic',
      status: 'running',
      created: '2026-09-16 09:18:22',
      tools: ['list_datasets', 'query_warehouse', 'search_crm_accounts', 'get_crm_pipeline', 'run_stat_analysis'],
    },
  ],
  mcpConfig: { visible: false, svcId: null, toolsetId: null, apiKey: null, expire: undefined, once: false },
  clientFlt: { toolsetId: '', userId: '', openIssue: false, kw: '' },
  userFlt: { kw: '' },
  playground: {
    visible: false,
    endpoint: '',
    apiKey: '',
    proto: 'Streamable HTTP',
    toolName: '',
    allowTools: null,
  },
})

export const CALL_MODES = [
  { id: 'all', title: '全量返回', desc: '连接后直接返回工具集内全部 MCP 工具。工具数量较少（如 20 个以内）时建议使用。' },
  { id: 'semantic', title: '语义检索', desc: '基于调用意图与工具描述做语义匹配，适合工具较多、Agent 需要按问题选工具的场景。' },
  { id: 'tag', title: '标签检索', desc: '按所属系统、业务标签筛选工具。标签可扩展，不限定于行情品种。' },
]
export const CLIENT_TYPES = [
  { value: 'blue', label: '服务端应用' },
  { value: 'purple', label: '桌面助手' },
  { value: 'cyan', label: 'IDE 插件' },
]
export const USER_KINDS = [
  { value: 'staff', label: '内部员工', tag: 'arcoblue', desc: '从企业微信通讯录选择同事开通，手机号与企业邮箱由企微返回' },
  { value: 'customer', label: '外部客户', tag: 'orangered', desc: '合作方 / 产业客户，须持邀请链接注册，默认 90 天低配额' },
]
export const USER_ROLES = [
  { value: '管理员', tag: 'red' },
  { value: '开发工程师', tag: 'arcoblue' },
  { value: '研究员', tag: 'green' },
  { value: '客户', tag: 'gray' },
]
export function kindMeta(kind) {
  return USER_KINDS.find((k) => k.value === kind) || USER_KINDS[0]
}
export function roleTag(role) {
  return USER_ROLES.find((r) => r.value === role)?.tag || 'gray'
}

export const WECOM_DEPTS = ['数智中心', '有色组', '能化组', '数据分析', '黑色组']
export const WECOM_MEMBERS = [
  { userid: 'chenke', name: '陈可', dept: '数智中心', title: '管理员', mobile: '13800001001', email: 'chenke@example.com' },
  { userid: 'linzhou', name: '林舟', dept: '数智中心', title: '开发工程师', mobile: '13800001002', email: 'linzhou@example.com' },
  { userid: 'zhouyan', name: '周研', dept: '有色组', title: '研究员', mobile: '13800001003', email: 'zhouyan@example.com' },
  { userid: 'wangqi', name: '王启', dept: '能化组', title: '研究员', mobile: '13800001006', email: 'wangqi@example.com' },
  { userid: 'zhaoheng', name: '赵衡', dept: '数据分析', title: '开发工程师', mobile: '13700001005', email: 'zhaoheng@example.com' },
  { userid: 'guheng', name: '顾衡', dept: '数智中心', title: '开发工程师', mobile: '13800001011', email: 'guheng@example.com' },
  { userid: 'yening', name: '叶宁', dept: '有色组', title: '研究员', mobile: '13800001012', email: 'yening@example.com' },
  { userid: 'shenlan', name: '沈岚', dept: '能化组', title: '研究员', mobile: '13800001013', email: 'shenlan@example.com' },
  { userid: 'machuan', name: '马川', dept: '黑色组', title: '研究员', mobile: '13800001014', email: 'machuan@example.com' },
  { userid: 'dingke', name: '丁可', dept: '数据分析', title: '开发工程师', mobile: '13800001015', email: 'dingke@example.com' },
]
export function wecomMemberStatus(m) {
  const u = store.users.find((x) =>
    x.kind === 'staff' && (x.wecomUserId === m.userid || x.phone === m.mobile || (x.email && x.email === m.email))
  )
  if (!u) return { bound: false, status: '', user: null }
  return { bound: u.status === '正常', status: u.status, user: u }
}
export function importStaffFromWecom(members, role = '研究员') {
  const created = []
  const updated = []
  const today = new Date().toISOString().slice(0, 10)
  members.forEach((m) => {
    const hit = wecomMemberStatus(m)
    if (hit.bound) return
    if (hit.user) {
      hit.user.name = m.name
      hit.user.phone = m.mobile
      hit.user.email = m.email
      hit.user.team = m.dept
      hit.user.wecomUserId = m.userid
      hit.user.role = role || hit.user.role
      hit.user.tag = roleTag(hit.user.role)
      hit.user.status = '正常'
      hit.user.last = '刚刚'
      hit.user.source = 'wecom'
      updated.push(hit.user)
      return
    }
    const user = {
      id: 'u-' + Date.now().toString(36) + m.userid,
      name: m.name,
      phone: m.mobile,
      email: m.email,
      kind: 'staff',
      role,
      tag: roleTag(role),
      team: m.dept,
      status: '正常',
      created: today,
      last: '刚刚',
      wecomUserId: m.userid,
      source: 'wecom',
    }
    store.users.unshift(user)
    created.push(user)
  })
  return { created, updated }
}
export function mintInviteToken() {
  const n = Math.random().toString(36).slice(2, 10)
  return 'inv-' + n
}
export function inviteUrl(token) {
  const base = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  return `${base}#register?t=${encodeURIComponent(token)}`
}
export function findInvite(token) {
  return store.invites.find((i) => i.token === token)
}
function plusDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
export function createInvite(opts = {}) {
  const kind = 'customer'
  const role = '客户'
  const org = (opts.org || '').trim() || '外部客户'
  const nameHint = (opts.name || '').trim()
  const token = mintInviteToken()
  const created = new Date().toISOString().slice(0, 10)
  const invite = { token, kind, role, org, nameHint, status: 'open', created, expireAt: plusDays(7) }
  store.invites.unshift(invite)
  const user = {
    id: 'u-' + Date.now().toString(36),
    name: nameHint || '待注册',
    email: '',
    phone: '',
    kind,
    role,
    tag: roleTag(role),
    team: org,
    status: '待注册',
    inviteToken: token,
    created,
    last: '—',
  }
  store.users.unshift(user)
  return { invite, user, url: inviteUrl(token) }
}
export function registerByInvite(token, payload = {}) {
  const invite = findInvite(token)
  if (!invite) return { ok: false, msg: '邀请链接无效' }
  if (invite.status !== 'open') return { ok: false, msg: '该链接已使用或已作废' }
  if (invite.expireAt && invite.expireAt < new Date().toISOString().slice(0, 10)) {
    return { ok: false, msg: '邀请链接已过期，请联系管理员重新发送' }
  }
  const name = String(payload.name || '').trim()
  const phone = String(payload.phone || '').trim()
  const email = String(payload.email || '').trim()
  if (!name || !phone) return { ok: false, msg: '请填写姓名与手机号' }
  if (!/^1\d{10}$/.test(phone)) return { ok: false, msg: '请填写 11 位手机号' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: '登录邮箱格式不正确' }
  if (store.users.some((u) => u.inviteToken !== token && (u.phone === phone || (email && u.email === email)))) {
    return { ok: false, msg: email ? '手机号或登录邮箱已被占用' : '手机号已被占用' }
  }
  const user = store.users.find((u) => u.inviteToken === token)
  if (!user) return { ok: false, msg: '邀请不存在' }
  user.name = name
  user.phone = phone
  user.email = email
  user.status = '正常'
  user.last = '刚刚'
  invite.status = 'used'
  return { ok: true, user }
}

export function mintApiKey() {
  const bytes = (typeof crypto !== 'undefined' && crypto.getRandomValues)
    ? [...crypto.getRandomValues(new Uint8Array(16))]
    : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
  const full = 'mcp-sk-' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  return { full, masked: full.slice(0, 12) + '…' + full.slice(-4) }
}
export function issueClient(opts = {}) {
  const { full, masked } = mintApiKey()
  const type = CLIENT_TYPES.find((o) => o.value === (opts.tag || 'blue')) || CLIENT_TYPES[0]
  const client = {
    id: 'ck-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    name: (opts.name || '未命名接入端').trim() || '未命名接入端',
    type: type.label,
    tag: type.value,
    key: masked,
    secret: full,
    calls: 0,
    quota: opts.quota ?? 20000,
    qps: opts.qps ?? 10,
    status: 'normal',
    expire: opts.expire === undefined ? null : opts.expire,
    last: '刚刚',
    toolsetIds: [...(opts.toolsetIds || [])],
    userId: opts.userId || 'u-dev',
  }
  store.clients.unshift(client)
  return { client, full }
}
export function clientsOfToolset(tsId) {
  return store.clients.filter((c) => (c.toolsetIds || []).includes(tsId) && c.status !== 'revoked')
}
export function toolsetsOfClient(c) {
  const ids = new Set(c?.toolsetIds || [])
  return store.toolsets.filter((t) => ids.has(t.id))
}
export function attachToolsetToClients(tsId, clientIds) {
  const want = new Set(clientIds || [])
  store.clients.forEach((c) => {
    if (!want.has(c.id)) return
    const ids = new Set(c.toolsetIds || [])
    ids.add(tsId)
    c.toolsetIds = [...ids]
  })
}
export function primaryClientOfToolset(ts) {
  return clientsOfToolset(ts?.id)[0] || null
}
export function keyOfToolset(ts) {
  const c = primaryClientOfToolset(ts)
  return c?.secret || c?.key || ''
}
export function keyForEndpoint(endpoint) {
  const url = String(endpoint || '').trim()
  const ts = store.toolsets.find((s) => toolsetEndpoint(s) === url || url.includes(`/toolsets/${s.id}`))
  if (ts) {
    const k = keyOfToolset(ts)
    if (k) return k
  }
  const svc = findServiceByEndpoint(url) || store.services.find((s) => s.endpoint === url)
  if (svc) {
    for (const set of toolsetsUsingService(svc.id)) {
      const k = keyOfToolset(set)
      if (k) return k
    }
  }
  const c = store.clients.find((x) => x.status !== 'revoked')
  return c?.secret || c?.key || 'mcp-sk-console-self-test'
}

export function platformOptions() {
  const set = new Set(store.platforms)
  store.services.forEach((s) => (s.sources || []).forEach((x) => { if (x) set.add(x) }))
  return [...set]
}
export function rememberPlatforms(names) {
  ;(names || []).forEach((n) => {
    const t = String(n || '').trim()
    if (t && !store.platforms.includes(t)) store.platforms.push(t)
  })
}
export function tagColor(tag) {
  return SECTOR_TAG[tag] || 'arcoblue'
}
export function ensureSvcMeta(svc) {
  if (!svc?.id) return
  if (!store.svcMeta[svc.id]) {
    store.svcMeta[svc.id] = { n: svc.name, c: SVC_COLORS[Object.keys(store.svcMeta).length % SVC_COLORS.length] }
  } else {
    store.svcMeta[svc.id].n = svc.name
  }
}
export function toolsOfService(svcId) {
  return store.tools.filter((t) => t.svc === svcId)
}
export function toolsetsUsingService(svcId) {
  const names = new Set(toolsOfService(svcId).map((t) => t.name))
  return store.toolsets.filter((ts) => (ts.tools || []).some((n) => names.has(n)))
}
export function servicesOfSet(ts) {
  const names = new Set(ts?.tools || [])
  const ids = new Set(store.tools.filter((t) => names.has(t.name)).map((t) => t.svc))
  return store.services.filter((s) => ids.has(s.id))
}
export function platformsOfSet(ts) {
  const set = new Set()
  servicesOfSet(ts).forEach((s) => (s.sources || []).forEach((x) => { if (x) set.add(x) }))
  return [...set]
}
export function findServiceByEndpoint(url) {
  const u = String(url || '').trim()
  if (!u) return null
  return store.services.find((s) => s.endpoint === u || u.includes(`/${s.code}/`) || u.includes(`/${s.id}/`) || u.includes(s.code)) || null
}
export function makeDiscoveredTools(svc) {
  const prefix = String(svc.code || svc.id).replace(/-/g, '_')
  const srcHint = (svc.sources || []).filter(Boolean).join('、') || svc.name
  const tag = (svc.sources || [])[0] || ''
  return [
    { suffix: 'list', cn: '列出资源', desc: `探测自「${svc.name}」：枚举 ${srcHint} 可访问对象`, req: [] },
    { suffix: 'get', cn: '读取明细', desc: `按 ID 读取 ${srcHint} 一条记录`, req: ['id'] },
    { suffix: 'search', cn: '检索', desc: `按关键词检索 ${srcHint}`, req: ['query'] },
  ].map((sp) => ({
    name: `${prefix}_${sp.suffix}`,
    cn: `${svc.name} · ${sp.cn}`,
    svc: svc.id,
    sector: tag,
    version: svc.version || 'v1.0.0',
    calls: 0, sr: 100, lat: 0, on: true,
    desc: sp.desc,
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '资源 ID' },
        query: { type: 'string', description: '检索词或过滤条件' },
        limit: { type: 'integer', description: '返回条数', default: 20 },
      },
      required: sp.req,
    },
    week: [0, 0, 0, 0, 0, 0, 0],
    errs: [{ t: '—', code: '—', msg: '暂无错误记录' }],
  }))
}
export function discoverToolsForService(svc) {
  if (!svc) return []
  const existing = toolsOfService(svc.id)
  if (existing.length) return existing
  makeDiscoveredTools(svc).forEach((t) => {
    if (!store.tools.some((x) => x.name === t.name)) store.tools.push(t)
  })
  return toolsOfService(svc.id)
}
export function appendToolsToSet(ts, names) {
  if (!ts) return
  const set = new Set(ts.tools || [])
  ;(names || []).forEach((n) => set.add(n))
  ts.tools = [...set]
}
export function createToolsetFromService(svc, toolNames) {
  const names = toolNames || toolsOfService(svc.id).map((t) => t.name)
  const ts = {
    id: 'ts-' + Date.now().toString(36),
    name: (svc?.name || '新建') + '工具集',
    path: '/mcp',
    auth: 'apikey',
    mode: 'all',
    status: 'running',
    created: new Date().toISOString().slice(0, 19).replace('T', ' '),
    tools: [...names],
  }
  store.toolsets.unshift(ts)
  issueClient({
    name: `${ts.name} 接入`,
    tag: 'blue',
    qps: 10,
    quota: 20000,
    expire: null,
    toolsetIds: [ts.id],
  })
  return ts
}

export function toolsetEndpoint(ts) {
  return `https://mcp.futures-data.cn/toolsets/${ts.id}${ts.path || '/mcp'}`
}
export function toolsetAsSvc(ts) {
  return {
    id: ts.id,
    name: ts.name,
    code: String(ts.id).replace(/-/g, '_'),
    proto: 'Streamable HTTP',
    endpoint: toolsetEndpoint(ts),
  }
}
export function toolsOfSet(ts) {
  const names = new Set(ts?.tools || [])
  return store.tools.filter((t) => names.has(t.name) && t.on)
}
export function openPlayground(opts = {}) {
  const pg = store.playground
  pg.visible = true
  pg.endpoint = opts.endpoint || ''
  pg.apiKey = opts.apiKey || ''
  pg.proto = opts.proto || 'Streamable HTTP'
  pg.toolName = opts.toolName || ''
  pg.allowTools = opts.allowTools || null
}

export function totalCalls() {
  return store.tools.reduce((a, t) => a + t.calls, 0)
}
export function weightedSR() {
  const tot = totalCalls()
  return tot ? store.tools.reduce((a, t) => a + t.sr * t.calls, 0) / tot : 0
}
export function openAlertCount() {
  return store.alerts.filter((a) => a.st === '未处理').length
}
export function refreshMock() {
  store.tools.forEach((t) => { t.calls = Math.max(0, Math.round(t.calls * (0.98 + Math.random() * 0.05))) })
  store.trend = genTrend()
  store.lat = genLatency(store.trend.labels)
}
export function randLog() {
  const t = store.tools[Math.floor(Math.random() * store.tools.length)]
  const r = Math.random()
  const st = r < 0.9 ? 200 : r < 0.96 ? 429 : 500
  return {
    ts: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    trace: 'tr-' + Math.random().toString(16).slice(2, 8),
    client: store.clients[Math.floor(Math.random() * store.clients.length)].name,
    tool: t.name,
    st,
    lat: Math.max(20, Math.round((t.lat || 120) * (0.5 + Math.random() * 1.3))),
    err: st === 200 ? '' : st === 429 ? 'MCP_ERR_RATE_LIMITED' : 'MCP_ERR_UPSTREAM_TIMEOUT',
  }
}
export function showMcpConfig(svcId, apiKey, expire) {
  store.mcpConfig.visible = true
  store.mcpConfig.svcId = svcId
  store.mcpConfig.toolsetId = null
  store.mcpConfig.apiKey = apiKey || null
  store.mcpConfig.expire = expire
  store.mcpConfig.once = !!(apiKey && !String(apiKey).includes('…'))
}
export function showToolsetConfig(ts, opts = {}) {
  const bound = primaryClientOfToolset(ts)
  const fullKey = opts.fullKey || bound?.secret || bound?.key || null
  store.mcpConfig.visible = true
  store.mcpConfig.svcId = null
  store.mcpConfig.toolsetId = ts.id
  store.mcpConfig.apiKey = fullKey
  store.mcpConfig.expire = opts.expire !== undefined ? opts.expire : (bound ? bound.expire : undefined)
  store.mcpConfig.once = !!opts.fullKey
}
export function ensureLogs() {
  if (store.logs.length) return
  const now = Date.now()
  for (let i = 13; i >= 0; i--) {
    const l = randLog()
    l.ts = new Date(now - i * 8000 - Math.random() * 5000).toLocaleTimeString('zh-CN', { hour12: false })
    store.logs.push(l)
  }
}
