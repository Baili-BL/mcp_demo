import { placeholderToolParams } from './placeholders.js'

function col(name, type, comment = '') {
  return { name, type, comment }
}
function cat(objectType, name, comment, columns) {
  return { objectType, name, comment, columns }
}

/** 示例目录：同步元数据只展示这份清单，不访问数据库。 */
export const SOURCE_CATALOG = {
  'src-ths': [
    cat('table', 'base_from_ths_index', '同花顺指标定义', [
      col('base_from_ths_index_id', 'bigint', '主键'),
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('frequency', 'varchar', '频度'),
      col('start_date', 'date', '开始日期'),
      col('end_date', 'date', '结束日期'),
      col('latest_value', 'decimal', '最新值'),
      col('classify_id', 'bigint', '分类'),
      col('is_stop', 'tinyint', '是否停更'),
      col('sort', 'int', '排序'),
    ]),
    cat('table', 'base_from_ths_data', '同花顺指标序列', [
      col('index_code', 'varchar', '指标代码'),
      col('data_time', 'date', '数据日期'),
      col('value', 'decimal', '数值'),
      col('create_time', 'datetime', '入库时间'),
    ]),
    cat('view', 'v_ths_index_live', '在营指标视图（库侧已过滤停更）', [
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('frequency', 'varchar', '频度'),
      col('start_date', 'date', '开始日期'),
      col('end_date', 'date', '结束日期'),
      col('latest_value', 'decimal', '最新值'),
      col('classify_id', 'bigint', '分类'),
    ]),
  ],
  'src-smm': [
    cat('table', 'base_from_smm_index', 'SMM 指标定义', [
      col('base_from_smm_index_id', 'bigint', '主键'),
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('frequency', 'varchar', '频度'),
      col('end_value', 'decimal', '最新值'),
      col('classify_id', 'bigint', '分类'),
    ]),
    cat('view', 'v_smm_index_live', '在营 SMM 指标视图', [
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('frequency', 'varchar', '频度'),
      col('end_value', 'decimal', '最新值'),
      col('classify_id', 'bigint', '分类'),
    ]),
  ],
  'src-ms': [
    cat('table', 'base_from_mysteel_chemical_index', '钢联化工指标', [
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('frequency', 'varchar', '频度'),
      col('end_value', 'decimal', '最新值'),
    ]),
    cat('view', 'v_mysteel_chemical_live', '在营化工指标视图', [
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('end_value', 'decimal', '最新值'),
    ]),
  ],
  'src-manual': [
    cat('table', 'base_from_manual_index', '手工录入指标', [
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('latest_value', 'decimal', '最新值'),
      col('classify_id', 'bigint', '分类'),
    ]),
    cat('view', 'v_manual_index_open', '对外手工指标视图', [
      col('index_code', 'varchar', '指标代码'),
      col('index_name', 'varchar', '指标名称'),
      col('unit', 'varchar', '单位'),
      col('latest_value', 'decimal', '最新值'),
    ]),
  ],
  'src-edb': [
    cat('table', 'edb_info', 'EDB 指标定义', [
      col('edb_code', 'varchar', '指标代码'),
      col('edb_name', 'varchar', '指标名称'),
      col('source', 'int', '来源编号'),
      col('source_name', 'varchar', '来源名称'),
      col('unit', 'varchar', '单位'),
      col('frequency', 'varchar', '频度'),
      col('latest_value', 'decimal', '最新值'),
      col('classify_id', 'bigint', '分类'),
    ]),
    cat('table', 'edb_series_data', 'EDB 序列', [
      col('edb_code', 'varchar', '指标代码'),
      col('data_time', 'date', '数据日期'),
      col('value', 'decimal', '数值'),
    ]),
    cat('view', 'v_edb_series_pub', '近 24 个月公开序列视图', [
      col('edb_code', 'varchar', '指标代码'),
      col('data_time', 'date', '数据日期'),
      col('value', 'decimal', '数值'),
    ]),
  ],
  'src-crm': [
    cat('table', 'crm_account', '客户主数据', [
      col('id', 'bigint', '主键'),
      col('name', 'varchar', '客户名称'),
      col('industry', 'varchar', '行业'),
      col('owner', 'varchar', '跟进人'),
      col('phone', 'varchar', '电话'),
      col('status', 'varchar', '状态'),
    ]),
    cat('view', 'v_crm_account_open', '在营客户视图', [
      col('id', 'bigint', '主键'),
      col('name', 'varchar', '客户名称'),
      col('industry', 'varchar', '行业'),
      col('owner', 'varchar', '跟进人'),
    ]),
  ],
  'src-dw': [
    cat('table', 'ads_variety_pnl_d', '品种盈亏日表', [
      col('variety', 'varchar', '品种'),
      col('dt', 'date', '日期'),
      col('pnl', 'decimal', '盈亏'),
      col('cost', 'decimal', '成本'),
      col('team_id', 'varchar', '团队'),
    ]),
    cat('view', 'v_ads_variety_pnl_pub', '公开盈亏视图', [
      col('variety', 'varchar', '品种'),
      col('dt', 'date', '日期'),
      col('pnl', 'decimal', '盈亏'),
    ]),
  ],
  'src-ora-risk': [
    cat('table', 'WH_RECEIPT', '仓单明细', [
      col('receipt_id', 'number', '仓单号'),
      col('variety', 'varchar2', '品种'),
      col('warehouse', 'varchar2', '仓库'),
      col('qty', 'number', '数量'),
      col('grade', 'varchar2', '品级'),
      col('owner_id', 'varchar2', '货主'),
      col('biz_date', 'date', '业务日期'),
    ]),
    cat('view', 'V_WH_RECEIPT_OPEN', '有效仓单视图', [
      col('variety', 'varchar2', '品种'),
      col('warehouse', 'varchar2', '仓库'),
      col('qty', 'number', '数量'),
      col('grade', 'varchar2', '品级'),
      col('biz_date', 'date', '业务日期'),
    ]),
  ],
}

/** MCP 授权预设（与 vibeBI Dataset 分离，仅初始化 Grant）。 */
const GRANT_PRESET = {
  'src-ths': {
    'base_from_ths_index': { hidden: ['base_from_ths_index_id', 'sort'], row_filter: '' },
    'base_from_ths_data': { hidden: ['create_time'], row_filter: '' },
    'v_ths_index_live': { hidden: [], row_filter: 'is_stop = 0' },
  },
  'src-smm': {
    'base_from_smm_index': { hidden: ['base_from_smm_index_id'], row_filter: '' },
    'v_smm_index_live': { hidden: [], row_filter: 'is_stop = 0' },
  },
  'src-ms': {
    'base_from_mysteel_chemical_index': { hidden: [], row_filter: '' },
    'v_mysteel_chemical_live': { hidden: [], row_filter: '' },
  },
  'src-manual': {
    'base_from_manual_index': { hidden: [], row_filter: '' },
    'v_manual_index_open': { hidden: [], row_filter: '' },
  },
  'src-edb': {
    'edb_info': { hidden: [], row_filter: '' },
    'edb_series_data': { hidden: [], row_filter: '' },
    'v_edb_series_pub': { hidden: [], row_filter: "data_time >= '2024-10-01'" },
  },
  'src-crm': {
    'crm_account': { hidden: ['phone'], row_filter: '' },
    'v_crm_account_open': { hidden: [], row_filter: "status = 'active'" },
  },
  'src-dw': {
    'ads_variety_pnl_d': { hidden: ['team_id'], row_filter: '' },
    'v_ads_variety_pnl_pub': { hidden: [], row_filter: "dt >= '2024-01-01'" },
  },
  'src-ora-risk': {
    'WH_RECEIPT': { hidden: ['receipt_id', 'owner_id'], row_filter: '' },
    'V_WH_RECEIPT_OPEN': { hidden: [], row_filter: 'qty > 0' },
  },
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export const ROOT_FOLDER_ID = 'root'

export function isDbKind(kind) {
  return !!kind && kind !== 'http'
}

export function stampNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
function seedStamp(key, hoursAgo) {
  const n = [...String(key)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const d = new Date('2026-10-15T13:18:00')
  d.setHours(d.getHours() - hoursAgo - (n % 36))
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`
}

/** vibeBI Dataset + DatasetColumn（不含 ACL）。 */
export function datasetFromCatalogEntry(source, entry) {
  const isView = entry.objectType === 'view'
  return {
    id: `dset-${source.id}-${entry.objectType}-${entry.name}`,
    data_source_id: source.id,
    table_name: entry.name,
    display_name: entry.name,
    description: entry.comment || '',
    row_count_estimate: 800 + ((entry.name.length * 97) % 9200),
    schema_version: 1,
    is_enabled: true,
    source_type: 'table',
    extra: isView ? { source_kind: 'view' } : { source_kind: 'table' },
    columns: (entry.columns || []).map((c, i) => ({
      id: `col-${source.id}-${entry.name}-${c.name}`,
      column_name: c.name,
      data_type: c.type,
      ordinal_position: i + 1,
      is_nullable: true,
      sample_values: null,
      distinct_count: null,
      null_count: null,
      semantic_hint: null,
      description: c.comment || '',
    })),
    created_at: seedStamp(`${source.id}-${entry.name}`, 320),
    updated_at: seedStamp(`${source.id}-${entry.name}-u`, 12),
    folder_id: ROOT_FOLDER_ID,
    creator_id: '',
    modifier_id: '',
  }
}

export const DEFAULT_DATASET_FOLDERS = [
  { id: 'fld-market', name: '行情数据', parent_id: 'root', creator_id: 'u-admin', created_at: '2026-03-01 09:00:00', updated_at: '2026-03-12 10:20:00' },
  { id: 'fld-spot', name: '现货', parent_id: 'fld-market', creator_id: 'u-admin', created_at: '2026-03-12 10:21:00', updated_at: '2026-09-18 16:40:00' },
  { id: 'fld-crm', name: 'CRM', parent_id: 'root', creator_id: 'u-admin', created_at: '2026-04-08 09:10:00', updated_at: '2026-08-22 11:05:00' },
  { id: 'fld-risk', name: '风控', parent_id: 'root', creator_id: 'u-admin', created_at: '2026-05-16 14:02:00', updated_at: '2026-09-03 09:18:00' },
  { id: 'fld-dw', name: '数仓', parent_id: 'root', creator_id: 'u-admin', created_at: '2026-06-01 11:30:00', updated_at: '2026-10-08 15:42:00' },
]

const FOLDER_BY_SOURCE = {
  'src-ths': 'fld-spot',
  'src-smm': 'fld-spot',
  'src-ms': 'fld-spot',
  'src-manual': 'fld-market',
  'src-edb': 'fld-market',
  'src-crm': 'fld-crm',
  'src-dw': 'fld-dw',
  'src-ora-risk': 'fld-risk',
}

export function hydrateDatasetFolders(store) {
  if (!store.datasetFolders?.length) {
    store.datasetFolders = clone(DEFAULT_DATASET_FOLDERS)
    return
  }
  const byId = new Map(DEFAULT_DATASET_FOLDERS.map((f) => [f.id, f]))
  store.datasetFolders.forEach((f) => {
    const preset = byId.get(f.id)
    if (!f.created_at) f.created_at = preset?.created_at || f.updated_at
    if (preset?.updated_at && !f.updated_at) f.updated_at = preset.updated_at
  })
}

export function findFolder(store, folderId) {
  if (!folderId || folderId === ROOT_FOLDER_ID) return null
  return (store.datasetFolders || []).find((f) => f.id === folderId) || null
}

export function folderChildren(store, parentId = ROOT_FOLDER_ID) {
  const pid = parentId || ROOT_FOLDER_ID
  return (store.datasetFolders || [])
    .filter((f) => (f.parent_id || ROOT_FOLDER_ID) === pid)
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'))
}

export function folderPath(store, folderId) {
  if (!folderId || folderId === ROOT_FOLDER_ID) return '根目录'
  const names = []
  const seen = new Set()
  let cur = findFolder(store, folderId)
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    names.unshift(cur.name)
    cur = findFolder(store, cur.parent_id)
  }
  return ['根目录', ...names].join(' / ')
}

export function folderCrumbs(store, folderId) {
  const crumbs = [{ id: ROOT_FOLDER_ID, name: '根目录' }]
  if (!folderId || folderId === ROOT_FOLDER_ID) return crumbs
  const chain = []
  const seen = new Set()
  let cur = findFolder(store, folderId)
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift(cur)
    cur = findFolder(store, cur.parent_id)
  }
  chain.forEach((f) => crumbs.push({ id: f.id, name: f.name }))
  return crumbs
}

export function flattenFolders(store, parentId = ROOT_FOLDER_ID, depth = 0) {
  const out = []
  folderChildren(store, parentId).forEach((f) => {
    out.push({ ...f, depth })
    out.push(...flattenFolders(store, f.id, depth + 1))
  })
  return out
}

export function defaultGrantForDataset(dataset, preset = {}) {
  const hidden = new Set(preset.hidden || [])
  const columns = (dataset.columns || []).map((c) => ({
    column_name: c.column_name,
    allowed: !hidden.has(c.column_name),
    mask: hidden.has(c.column_name) ? 'hide' : 'none',
    users: [],
    on: true,
  }))
  const row_filter = preset.row_filter || ''
  return {
    dataset_id: dataset.id,
    columns,
    row_filter,
    row_enabled: !!row_filter,
    col_enabled: hidden.size > 0,
    row_rules: row_filter ? [{ column: '', op: '=', value: '', users: [] }] : [],
    row_policies: [],
    row_whitelist: [],
    row_other: 'all',
    row_join: 'and',
    row_mode: 'combo',
    col_policies: (() => {
      const cols = columns.filter((c) => c.mask === 'hide').map((c) => c.column_name)
      return cols.length
        ? [{ id: 'col-seed-0', column: cols[0], columns: cols, mask: 'hide', subject: 'all_on', users: [], groups: [], on: true }]
        : []
    })(),
    col_other: 'allow',
    col_whitelist: [],
    collab: [],
    version: 1,
    updated_at: stampNow(),
  }
}

function pushCreatedDataset(store, dataset) {
  store.datasets.unshift(dataset)
  if (!store.datasetGrants.find((g) => g.dataset_id === dataset.id)) {
    store.datasetGrants.push(defaultGrantForDataset(dataset))
  }
  return dataset
}

export const JOIN_SQL = {
  inner: 'INNER JOIN',
  left: 'LEFT JOIN',
  right: 'RIGHT JOIN',
  full: 'FULL JOIN',
}

function compileRelativeDate(anchor, sign, offset) {
  const raw = String(offset ?? '').trim()
  if (raw === '') return ''
  const n = Math.max(0, parseInt(raw, 10) || 0)
  const add = sign === '+'
  if (anchor === 'M') {
    const base = "DATE_FORMAT(CURDATE(), '%Y-%m-01')"
    if (!n) return base
    return add ? `DATE_ADD(${base}, INTERVAL ${n} MONTH)` : `DATE_SUB(${base}, INTERVAL ${n} MONTH)`
  }
  if (anchor === 'Y') {
    const base = "DATE_FORMAT(CURDATE(), '%Y-01-01')"
    if (!n) return base
    return add ? `DATE_ADD(${base}, INTERVAL ${n} YEAR)` : `DATE_SUB(${base}, INTERVAL ${n} YEAR)`
  }
  if (!n) return 'CURDATE()'
  return add ? `DATE_ADD(CURDATE(), INTERVAL ${n} DAY)` : `DATE_SUB(CURDATE(), INTERVAL ${n} DAY)`
}

function compileDateBound(kind, date, anchor, sign, offset) {
  if (kind === 'absolute' && date) return `'${String(date).replace(/'/g, "''")}'`
  if (kind === 'relative') return compileRelativeDate(anchor, sign, offset)
  return ''
}

export function compileModelSql({ tables = [], fields = [], joins = [], filters = [] }) {
  const picked = tables.filter(Boolean)
  if (!picked.length) return ''
  const aliasOf = (i) => `t${i}`
  const indexById = new Map(picked.map((t, i) => [t.id, i]))
  const selectedFields = (fields || []).filter((f) => f.selected !== false)
  const used = new Set()
  const select = selectedFields.map((f) => {
    const i = indexById.has(f.datasetId) ? indexById.get(f.datasetId) : 0
    const physical = f.physicalName || f.column_name
    let name = f.fieldName || physical
    if (used.has(name)) name = `${picked[i]?.table_name || 't'}_${physical}`
    used.add(name)
    return `${aliasOf(i)}.${physical} AS ${name}`
  })
  let sql = `SELECT ${select.join(', ') || '*'}\nFROM ${picked[0].table_name} ${aliasOf(0)}`
  ;(joins || []).forEach((join, i) => {
    const right = picked[i + 1]
    if (!right) return
    const clause = JOIN_SQL[join.type] || JOIN_SQL.left
    const on = (join.conditions || [])
      .filter((c) => c.leftField && c.rightField)
      .map((c) => `${aliasOf(i)}.${c.leftField} ${c.op || '='} ${aliasOf(i + 1)}.${c.rightField}`)
      .join(' AND ')
    sql += `\n${clause} ${right.table_name} ${aliasOf(i + 1)}`
    if (on) sql += ` ON ${on}`
  })
  const where = []
  ;(filters || []).forEach((flt) => {
    const f = selectedFields.find((x) => x.id === flt.fieldId)
    if (!f) return
    const i = indexById.has(f.datasetId) ? indexById.get(f.datasetId) : 0
    const col = `${aliasOf(i)}.${f.physicalName || f.column_name}`
    const type = String(f.dataType || f.data_type || '').toLowerCase()
    const isDate = type.includes('date') || type.includes('time')
    if (isDate) {
      const start = compileDateBound(flt.startKind, flt.startDate, flt.startAnchor, flt.startSign, flt.startOffset)
      const end = compileDateBound(flt.endKind, flt.endDate, flt.endAnchor, flt.endSign, flt.endOffset)
      if (flt.dateMode === 'single') {
        if (start) where.push(`${col} = ${start}`)
        return
      }
      const rangeType = flt.rangeType || 'between'
      if ((rangeType === 'start' || rangeType === 'between') && start) where.push(`${col} >= ${start}`)
      if ((rangeType === 'end' || rangeType === 'between') && end) where.push(`${col} <= ${end}`)
      return
    }
    if (flt.mode !== 'condition') return
    const op = flt.op || '='
    if (op === 'empty') {
      where.push(`${col} IS NULL`)
      return
    }
    const val = String(flt.value || '').trim()
    if (!val) return
    const escaped = val.replace(/'/g, "''")
    if (op === 'contains') where.push(`${col} LIKE '%${escaped}%'`)
    else where.push(`${col} ${op} '${escaped}'`)
  })
  if (where.length) sql += `\nWHERE ${where.join(' AND ')}`
  return sql
}

export function createModeledDataset(store, { name, sourceId, tables, fields, folderId, joins, filters }) {
  const picked = (tables || []).filter(Boolean)
  if (!picked.length) return { error: '请先选择至少一张数据表' }
  const selectedFields = (fields || []).filter((f) => f.selected !== false)
  if (!selectedFields.length) return { error: '请至少选择一个字段' }
  if (picked.length > 1) {
    const missing = (joins || []).find((j) => !(j.conditions || []).some((c) => c.leftField && c.rightField))
    if (!joins?.length || missing) return { error: '多表模型需要配置关联字段，支持左连接 / 右连接 / 内连接 / 全连接' }
  }
  const now = stampNow()
  const displayName = String(name || '').trim() || '未命名'
  const sql = compileModelSql({ tables: picked, fields: selectedFields, joins: joins || [], filters: filters || [] })
  const dataset = {
    id: `dset-model-${Date.now()}`,
    data_source_id: sourceId || picked[0].data_source_id,
    table_name: `model_${Date.now()}`,
    display_name: displayName,
    description: `由 ${picked.map((t) => t.display_name || t.table_name).join('、')} 创建`,
    row_count_estimate: picked.reduce((sum, t) => sum + Number(t.row_count_estimate || 0), 0) || 0,
    schema_version: 1,
    is_enabled: true,
    source_type: 'table',
    extra: {
      source_kind: 'table',
      model: true,
      tableIds: picked.map((t) => t.id),
      fields: clone(selectedFields),
      joins: clone(joins || []),
      filters: clone(filters || []),
      sql,
    },
    folder_id: folderId || ROOT_FOLDER_ID,
    creator_id: 'u-admin',
    modifier_id: 'u-admin',
    created_at: now,
    updated_at: now,
    columns: selectedFields.map((f, i) => ({
      id: f.id || `col-model-${Date.now()}-${i}`,
      column_name: f.fieldName || f.column_name,
      data_type: f.dataType || f.data_type || 'varchar',
      ordinal_position: i + 1,
      is_nullable: true,
      sample_values: null,
      distinct_count: null,
      null_count: null,
      semantic_hint: f.semanticHint || null,
      description: f.description || '',
    })),
  }
  return { dataset: pushCreatedDataset(store, dataset) }
}

function clonePlaceholders(list) {
  return (list || []).map((p) => ({
    id: p.id,
    kind: p.kind,
    name: p.name,
    fields: [...(p.fields || [])],
    varType: p.varType,
    scope: p.scope,
    defaultValue: p.defaultValue ?? '',
    range: !!p.range,
    inSelect: !!p.inSelect,
    manual: !!p.manual,
    used: p.used !== false,
  }))
}

export function createSqlDataset(store, { name, sourceId, sql, columns, folderId, placeholders }) {
  const text = String(sql || '').trim()
  if (!sourceId) return { error: '请先选择一个数据源' }
  if (!/^\s*select\b/i.test(text)) return { error: 'SQL 数据集仅支持 SELECT 查询' }
  if (/\b(insert|update|delete|drop|alter|truncate|create)\b/i.test(text)) {
    return { error: '禁止写操作关键字' }
  }
  const now = stampNow()
  const displayName = String(name || '').trim() || '未命名SQL'
  const colNames = (columns || []).length ? columns : ['col_a', 'col_b', 'col_c']
  const dataset = {
    id: `dset-sql-${Date.now()}`,
    data_source_id: sourceId,
    table_name: `sql_${Date.now()}`,
    display_name: displayName,
    description: text,
    row_count_estimate: 0,
    schema_version: 1,
    is_enabled: true,
    source_type: 'sql',
    sql: text,
    extra: { source_kind: 'sql', sql: text, placeholders: clonePlaceholders(placeholders) },
    folder_id: folderId || ROOT_FOLDER_ID,
    creator_id: 'u-admin',
    modifier_id: 'u-admin',
    created_at: now,
    updated_at: now,
    columns: colNames.map((name, i) => ({
      id: `col-sql-${Date.now()}-${i}`,
      column_name: typeof name === 'string' ? name : name.column_name,
      data_type: typeof name === 'string' ? 'varchar' : (name.data_type || 'varchar'),
      ordinal_position: i + 1,
      is_nullable: true,
      sample_values: null,
      distinct_count: null,
      null_count: null,
      semantic_hint: null,
      description: '',
    })),
  }
  return { dataset: pushCreatedDataset(store, dataset) }
}

function applySqlFields(dataset, { name, sourceId, sql, columns, placeholders }) {
  const text = String(sql || '').trim()
  if (!sourceId) return '请先选择一个数据源'
  if (!/^\s*select\b/i.test(text)) return 'SQL 数据集仅支持 SELECT 查询'
  if (/\b(insert|update|delete|drop|alter|truncate|create)\b/i.test(text)) {
    return '禁止写操作关键字'
  }
  const displayName = String(name || '').trim() || '未命名SQL'
  const colNames = (columns || []).length ? columns : (dataset.columns || []).map((c) => c.column_name)
  const names = colNames.length ? colNames : ['col_a', 'col_b', 'col_c']
  dataset.display_name = displayName
  dataset.data_source_id = sourceId
  dataset.description = text
  dataset.sql = text
  dataset.source_type = 'sql'
  dataset.extra = {
    ...(dataset.extra || {}),
    source_kind: 'sql',
    sql: text,
    placeholders: placeholders !== undefined ? clonePlaceholders(placeholders) : (dataset.extra?.placeholders || []),
  }
  dataset.columns = names.map((n, i) => ({
    id: typeof n === 'string' ? `col-sql-${dataset.id}-${i}` : (n.id || `col-sql-${dataset.id}-${i}`),
    column_name: typeof n === 'string' ? n : n.column_name,
    data_type: typeof n === 'string' ? 'varchar' : (n.data_type || 'varchar'),
    ordinal_position: i + 1,
    is_nullable: true,
    sample_values: null,
    distinct_count: null,
    null_count: null,
    semantic_hint: typeof n === 'string' ? null : (n.semantic_hint || null),
    description: typeof n === 'string' ? '' : (n.description || ''),
  }))
  dataset.updated_at = stampNow()
  dataset.modifier_id = 'u-admin'
  return ''
}

export function updateSqlDataset(store, id, payload) {
  const dataset = findDataset(store, id)
  if (!dataset) return { error: '数据集不存在' }
  const error = applySqlFields(dataset, payload)
  if (error) return { error }
  return { dataset }
}

export function updateModeledDataset(store, id, { name, sourceId, tables, fields, joins, filters }) {
  const dataset = findDataset(store, id)
  if (!dataset) return { error: '数据集不存在' }
  const picked = (tables || []).filter(Boolean)
  if (!picked.length) return { error: '请先选择至少一张数据表' }
  const selectedFields = (fields || []).filter((f) => f.selected !== false)
  if (!selectedFields.length) return { error: '请至少选择一个字段' }
  if (picked.length > 1) {
    const missing = (joins || []).find((j) => !(j.conditions || []).some((c) => c.leftField && c.rightField))
    if (!joins?.length || missing) return { error: '多表模型需要配置关联字段，支持左连接 / 右连接 / 内连接 / 全连接' }
  }
  const displayName = String(name || '').trim() || '未命名'
  const sql = compileModelSql({ tables: picked, fields: selectedFields, joins: joins || [], filters: filters || [] })
  dataset.display_name = displayName
  dataset.description = `由 ${picked.map((t) => t.display_name || t.table_name).join('、')} 创建`
  dataset.data_source_id = sourceId || picked[0].data_source_id
  dataset.row_count_estimate = picked.reduce((sum, t) => sum + Number(t.row_count_estimate || 0), 0) || 0
  dataset.schema_version = (dataset.schema_version || 1) + 1
  dataset.extra = {
    source_kind: 'table',
    model: true,
    tableIds: picked.map((t) => t.id),
    fields: clone(selectedFields),
    joins: clone(joins || []),
    filters: clone(filters || []),
    sql,
  }
  dataset.columns = selectedFields.map((f, i) => ({
    id: f.id || `col-model-${dataset.id}-${i}`,
    column_name: f.fieldName || f.column_name,
    data_type: f.dataType || f.data_type || 'varchar',
    ordinal_position: i + 1,
    is_nullable: true,
    sample_values: null,
    distinct_count: null,
    null_count: null,
    semantic_hint: f.semanticHint || null,
    description: f.description || '',
  }))
  dataset.updated_at = stampNow()
  dataset.modifier_id = 'u-admin'
  return { dataset }
}

export function hydrateSources(sources) {
  sources.forEach((s) => {
    const catalog = SOURCE_CATALOG[s.id] || []
    s.catalog = clone(catalog)
    s.objects = []
    if (!s.lastSyncedAt && catalog.length) s.lastSyncedAt = s.lastCheck || stampNow()
  })
}

export function hydrateDatasets(store) {
  const list = []
  const grants = []
  store.sources.forEach((s) => {
    if (!isDbKind(s.kind)) return
    const catalog = s.catalog?.length ? s.catalog : (SOURCE_CATALOG[s.id] || [])
    const presets = GRANT_PRESET[s.id] || {}
    catalog.forEach((entry) => {
      const dset = datasetFromCatalogEntry(s, entry)
      const owners = (store.users || []).filter((u) => u.kind === 'staff' && u.status === '正常')
      const owner = owners[list.length % Math.max(owners.length, 1)] || owners[0]
      dset.creator_id = owner?.id || 'u-admin'
      dset.modifier_id = owner?.id || 'u-admin'
      dset.folder_id = FOLDER_BY_SOURCE[s.id] || ROOT_FOLDER_ID
      list.push(dset)
      grants.push(defaultGrantForDataset(dset, presets[entry.name] || {}))
    })
  })
  store.datasets = list
  store.datasetGrants = grants
}

export function attachSampleCatalog(src) {
  if (src.catalog?.length) return src.catalog
  const schema = src.schema || src.database || 'app'
  src.catalog = [
    cat('table', `${schema}_item`, '示例业务表', [
      col('id', 'bigint', '主键'),
      col('code', 'varchar', '编码'),
      col('name', 'varchar', '名称'),
      col('status', 'varchar', '状态'),
      col('owner', 'varchar', '负责人'),
      col('updated_at', 'datetime', '更新时间'),
    ]),
    cat('view', `v_${schema}_open`, '示例公开视图', [
      col('code', 'varchar', '编码'),
      col('name', 'varchar', '名称'),
      col('status', 'varchar', '状态'),
    ]),
  ]
  return src.catalog
}

export function testSourceConnection(source) {
  if (!source?.enabled) return { success: false, message: '数据源已停用', tables_found: 0 }
  const host = String(source.host || '').toLowerCase()
  if (host.includes('timeout') || host.startsWith('down.')) {
    return { success: false, message: `连接超时（>${source.timeout || 10}s）`, tables_found: 0 }
  }
  attachSampleCatalog(source)
  source.status = 'connected'
  source.lastCheck = stampNow()
  source.lastError = ''
  source.latency = 28 + (host.length % 60)
  const tables = (source.catalog || []).filter((e) => e.objectType === 'table').length
  return { success: true, message: '连接成功', tables_found: tables || source.catalog.length }
}

/** vibeBI sync：目录对象 → Dataset；附带初始化 Grant（不覆盖已有 Grant）。 */
export function syncSchema(store, source) {
  attachSampleCatalog(source)
  const presets = GRANT_PRESET[source.id] || {}
  let created = 0
  let updated = 0
  source.catalog.forEach((entry) => {
    const dset = datasetFromCatalogEntry(source, entry)
    const i = store.datasets.findIndex((d) => d.id === dset.id)
    if (i >= 0) {
      const prev = store.datasets[i]
      dset.created_at = prev.created_at
      dset.schema_version = (prev.schema_version || 1) + 1
      dset.folder_id = prev.folder_id || ROOT_FOLDER_ID
      dset.creator_id = prev.creator_id
      dset.modifier_id = prev.modifier_id
      dset.display_name = prev.display_name || dset.display_name
      dset.description = prev.description || dset.description
      store.datasets.splice(i, 1, dset)
      updated += 1
    } else {
      dset.folder_id = FOLDER_BY_SOURCE[source.id] || ROOT_FOLDER_ID
      store.datasets.unshift(dset)
      created += 1
    }
    if (!store.datasetGrants.find((g) => g.dataset_id === dset.id)) {
      store.datasetGrants.push(defaultGrantForDataset(dset, presets[entry.name] || {}))
    } else {
      ensureGrantColumns(store, dset)
    }
  })
  source.lastSyncedAt = stampNow()
  source.status = 'connected'
  source.lastCheck = source.lastSyncedAt
  return {
    success: true,
    datasets_created: created,
    datasets_updated: updated,
    tables_synced: source.catalog.length,
    tables_found: source.catalog.length,
  }
}

function ensureGrantColumns(store, dataset) {
  const grant = store.datasetGrants.find((g) => g.dataset_id === dataset.id)
  if (!grant) return
  const map = new Map((grant.columns || []).map((c) => [c.column_name, c.allowed !== false]))
  grant.columns = (dataset.columns || []).map((c) => ({
    column_name: c.column_name,
    allowed: map.has(c.column_name) ? map.get(c.column_name) : true,
  }))
}

export function findDataset(store, id) {
  return store.datasets.find((d) => d.id === id) || null
}

export function findGrant(store, datasetId) {
  return store.datasetGrants.find((g) => g.dataset_id === datasetId) || null
}

export function getOrCreateGrant(store, dataset) {
  let g = findGrant(store, dataset.id)
  if (!g) {
    g = defaultGrantForDataset(dataset)
    store.datasetGrants.push(g)
  }
  return g
}

/** SchemaExplorer：只改语义字段。 */
export function updateColumn(store, columnId, { semantic_hint, description }) {
  for (const d of store.datasets) {
    const col = (d.columns || []).find((c) => c.id === columnId)
    if (!col) continue
    if (semantic_hint !== undefined) col.semantic_hint = semantic_hint
    if (description !== undefined) col.description = description
    d.updated_at = stampNow()
    return col
  }
  return null
}

export function previewDataset(store, dataset, limit = 20, userId) {
  const grant = getOrCreateGrant(store, dataset)
  const scoped = columnsForUser(grant, userId, store.users)
  const allowed = new Set(scoped.filter((c) => c.allowed !== false).map((c) => c.column_name))
  const cols = (dataset.columns || []).filter((c) => allowed.has(c.column_name))
  const names = cols.map((c) => c.column_name)
  const rows = Array.from({ length: Math.min(limit, 8) }, (_, r) => {
    const row = {}
    names.forEach((name, i) => {
      const t = String(cols[i]?.data_type || '').toLowerCase()
      const hit = scoped.find((c) => c.column_name === name)
      if (hit?.mask === 'mask') {
        row[name] = '***'
        return
      }
      if (t.includes('date')) row[name] = `2026-0${(r % 9) + 1}-15`
      else if (['int', 'bigint', 'number', 'decimal', 'float'].some((x) => t.includes(x))) row[name] = (r + 1) * (i + 3)
      else row[name] = `${name}_${r + 1}`
    })
    return row
  })
  const appliedFilter = compileGrantRowFilter(grant, userId, store.users)
  return {
    dataset_id: dataset.id,
    columns: names,
    rows,
    limit,
    row_count: rows.length,
    applied_columns: names,
    applied_row_filter: appliedFilter,
    applied_user: userId || '',
  }
}

/** 模拟只读 SQL 预览（骨架）。 */
export function previewSql(store, { data_source_id, sql, limit = 100 }) {
  const text = String(sql || '').trim()
  if (!/^\s*select\b/i.test(text)) return { error: '仅允许 SELECT' }
  if (/\b(insert|update|delete|drop|alter|truncate|create)\b/i.test(text)) {
    return { error: '禁止写操作关键字' }
  }
  const source = store.sources.find((s) => s.id === data_source_id)
  if (!source) return { error: '数据源不存在' }
  const cols = ['col_a', 'col_b', 'col_c']
  const n = Math.min(Math.max(1, limit), 20)
  const rows = Array.from({ length: Math.min(n, 5) }, (_, i) => ({
    col_a: `a_${i + 1}`,
    col_b: (i + 1) * 10,
    col_c: `2026-01-${String(i + 1).padStart(2, '0')}`,
  }))
  return { columns: cols, rows, limit: n, row_count: rows.length }
}

export function ruleAppliesToUser(rule, userId) {
  const users = rule?.users || []
  if (!users.length) return !userId
  return !!userId && users.includes(userId)
}

export function compileRowFilter(rules, extraSql, userId) {
  const parts = (rules || []).filter((r) => {
    if (r.on === false) return false
    if (!(r.column && String(r.value || '').trim())) return false
    if (userId === undefined) return !(r.users || []).length
    return ruleAppliesToUser(r, userId)
  }).map((r) => {
    const col = r.column
    const val = String(r.value).trim()
    if (r.op === 'in') {
      const items = val.split(/[,，]/).map((x) => `'${x.trim().replace(/'/g, "''")}'`).filter(Boolean)
      return items.length ? `${col} IN (${items.join(', ')})` : ''
    }
    if (r.op === '!=') return `${col} <> '${val.replace(/'/g, "''")}'`
    return `${col} = '${val.replace(/'/g, "''")}'`
  }).filter(Boolean)
  const extra = String(extraSql || '').trim()
  if (extra) parts.push(`(${extra})`)
  return parts.join(' AND ')
}

export function isMeasureColumn(col) {
  const t = String(col?.data_type || col?.type || '').toLowerCase()
  return ['int', 'integer', 'bigint', 'smallint', 'tinyint', 'number', 'decimal', 'float', 'double', 'numeric'].some((x) => t.includes(x))
}

function escSql(v) {
  return String(v ?? '').replace(/'/g, "''")
}

function condToSql(c, user) {
  const col = c.column
  if (!col) return ''
  if (c.method === 'tag') {
    if (!user) return ''
    const v = c.tagKey === 'role' ? user.role : c.tagKey === 'name' ? user.name : user.team
    if (!v) return ''
    return `${col} = '${escSql(v)}'`
  }
  if (c.method === 'enum') {
    const vals = (c.values || []).map((x) => String(x).trim()).filter(Boolean)
    if (!vals.length) return ''
    const list = vals.map((v) => `'${escSql(v)}'`).join(', ')
    if (c.op === 'not_in' || c.op === 'not_contains') return `${col} NOT IN (${list})`
    return `${col} IN (${list})`
  }
  const op = c.op || '='
  const val = String(c.value ?? '').trim()
  if (op === 'empty') return `(${col} IS NULL OR ${col} = '')`
  if (op === 'not_empty') return `(${col} IS NOT NULL AND ${col} <> '')`
  if (op === 'between') {
    const b = String(c.value2 ?? '').trim()
    if (!val || !b) return ''
    return `(${col} >= '${escSql(val)}' AND ${col} <= '${escSql(b)}')`
  }
  if (!val) return ''
  const lit = /^-?\d+(\.\d+)?$/.test(val) ? val : `'${escSql(val)}'`
  if (op === '!=') return `${col} <> ${lit}`
  if (op === 'contains') return `${col} LIKE '%${escSql(val)}%'`
  if (op === 'not_contains') return `${col} NOT LIKE '%${escSql(val)}%'`
  if (op === 'starts') return `${col} LIKE '${escSql(val)}%'`
  if (op === 'ends') return `${col} LIKE '%${escSql(val)}'`
  if (['>', '>=', '<', '<='].includes(op)) return `${col} ${op} ${lit}`
  return `${col} = ${lit}`
}

function userHitsGroups(user, groupKeys) {
  if (!user || !groupKeys?.length) return false
  return (user.groupIds || []).some((id) => groupKeys.includes(id))
}

function policyAppliesToUser(p, user) {
  if (p.on === false) return false
  const subject = p.subject || 'all'
  if (subject === 'all') return true
  if (!user) return false
  if (subject === 'users') return (p.users || []).includes(user.id)
  if (subject === 'groups') return userHitsGroups(user, p.groups || [])
  return false
}

export function isRowGroup(node) {
  return !!node && Array.isArray(node.conditions)
}

export function rowRoot(p) {
  const blocks = p?.blocks || []
  if (blocks.length === 1) return blocks[0]
  if (!blocks.length) return { id: 'root', join: 'and', conditions: [] }
  return { id: blocks[0].id, join: 'and', conditions: blocks }
}

export function rowLeaves(p) {
  const out = []
  const walk = (g) => (g.conditions || []).forEach((n) => {
    if (isRowGroup(n)) return walk(n)
    out.push(n)
    if (n.sub) walk(n.sub)
  })
  walk(rowRoot(p))
  return out
}

function leafSql(n, user) {
  const own = condToSql(n, user)
  const sub = n.sub ? groupSql(n.sub, user) : ''
  return own && sub ? `(${own} AND ${sub})` : own || sub
}

function groupSql(g, user) {
  const parts = (g.conditions || []).map((n) => (isRowGroup(n) ? groupSql(n, user) : leafSql(n, user))).filter(Boolean)
  if (!parts.length) return ''
  return parts.length === 1 ? parts[0] : `(${parts.join(` ${(g.join || 'and').toUpperCase()} `)})`
}

function compilePolicySql(p, user) {
  return groupSql(rowRoot(p), user)
}

export function compileGrantRowFilter(grant, userId, users = []) {
  if (!grant || grant.row_enabled === false) return ''
  const user = userId ? (users.find((u) => u.id === userId) || { id: userId }) : null
  if (user && (grant.row_whitelist || []).includes(user.id)) return ''
  const policies = grant.row_policies || []
  if (policies.length) {
    const matched = []
    for (const p of policies) {
      if (userId === undefined) {
        if ((p.subject || 'all') === 'all' && p.on !== false) {
          const sql = compilePolicySql(p, null)
          if (sql) matched.push(sql)
        }
        continue
      }
      if (!policyAppliesToUser(p, user)) continue
      const sql = compilePolicySql(p, user)
      if (sql) matched.push(sql)
    }
    if (matched.length) {
      const j = (grant.row_join || 'and').toUpperCase()
      return matched.map((s) => `(${s})`).join(` ${j} `)
    }
    if (userId && grant.row_other === 'none') return '1=0'
    return ''
  }
  return compileRowFilter(grant.row_rules || [], '', userId) || (grant.row_enabled ? grant.row_filter : '') || ''
}

export function flattenPoliciesToRules(policies) {
  const rules = []
  for (const p of policies || []) {
    for (const c of rowLeaves(p)) {
      if (!c.column) continue
      const value = c.method === 'enum'
        ? (c.values || []).join(',')
        : c.method === 'tag'
          ? `{{user.${c.tagKey || 'team'}}}`
          : (c.op === 'between' ? `${c.value},${c.value2 || ''}` : c.value)
      if (c.method !== 'tag' && !String(value || '').trim()) continue
      rules.push({
        name: p.name,
        column: c.column,
        op: c.method === 'enum' ? ((c.op === 'not_in' || c.op === 'not_contains') ? '!=' : 'in') : (c.op || '='),
        value,
        users: p.subject === 'users' ? [...(p.users || [])] : [],
        groups: p.subject === 'groups' ? [...(p.groups || [])] : [],
        subject: p.subject || 'all',
        method: c.method,
        on: p.on !== false,
      })
    }
  }
  return rules
}

function parseSqlFilter(sql) {
  const text = String(sql || '').trim()
  if (!text) return null
  const conds = []
  for (const raw of text.split(/\s+AND\s+/i)) {
    const m = raw.trim().replace(/^\((.*)\)$/, '$1').trim()
      .match(/^([A-Za-z_][\w.]*)\s*(>=|<=|<>|!=|=|>|<)\s*(?:'((?:[^']|'')*)'|(-?\d+(?:\.\d+)?))$/)
    if (!m) return null
    conds.push({ column: m[1], op: m[2] === '<>' ? '!=' : m[2], value: m[3] !== undefined ? m[3].replace(/''/g, "'") : m[4] })
  }
  return conds
}

export function hydrateRowPolicies(grant) {
  if ((grant?.row_policies || []).length) return grant.row_policies.map((p) => ({ ...p }))
  const rules = (grant?.row_rules || []).filter((r) => r.column && String(r.value || '').trim())
  if (!rules.length) {
    const conds = parseSqlFilter(grant?.row_filter_def ?? grant?.row_filter)
    if (!conds) return []
    return [{
      id: 'sql-0',
      name: '规则1',
      subject: 'all',
      users: [],
      groups: [],
      on: true,
      blocks: [{
        id: 'sql-b-0',
        join: 'and',
        conditions: conds.map((c, i) => ({
          id: `sql-c-${i}`,
          column: c.column,
          method: 'condition',
          op: c.op,
          values: [],
          value: c.value,
          value2: '',
          tagKey: 'team',
        })),
      }],
    }]
  }
  return rules.map((r, i) => ({
    id: `legacy-${i}`,
    name: r.name || `规则${i + 1}`,
    subject: (r.users || []).length ? 'users' : (r.subject || 'all'),
    users: [...(r.users || [])],
    groups: [...(r.groups || [])],
    on: r.on !== false,
    blocks: [{
      id: `legacy-b-${i}`,
      join: 'and',
      conditions: [{
        id: `legacy-c-${i}`,
        column: r.column,
        method: r.method || (r.op === 'in' ? 'enum' : 'condition'),
        op: r.op || '=',
        values: r.op === 'in' ? String(r.value).split(/[,，]/).map((x) => x.trim()).filter(Boolean) : [],
        value: r.value,
        value2: '',
        tagKey: 'team',
      }],
    }],
  }))
}

export function describeRowCondition(c) {
  if (!c?.column) return ''
  if (c.method === 'tag') {
    const tag = c.tagKey === 'role' ? '角色' : c.tagKey === 'name' ? '姓名' : '团队'
    return `${c.column} 绑定${tag}`
  }
  if (c.method === 'enum') {
    const vals = (c.values || []).filter(Boolean)
    const op = (c.op === 'not_in' || c.op === 'not_contains') ? '不包含' : '包含'
    return vals.length ? `${c.column} ${op} ${vals.join('、')}` : `${c.column} ${op}`
  }
  const op = c.op || '='
  if (op === 'empty') return `${c.column} 为空`
  if (op === 'not_empty') return `${c.column} 不为空`
  if (op === 'between') return `${c.column} 介于 ${c.value} ~ ${c.value2 || ''}`
  const labels = { '=': '等于', '!=': '不等于', contains: '包含', not_contains: '不包含', starts: '开头是', ends: '结尾是', '>': '大于', '>=': '大于等于', '<': '小于', '<=': '小于等于' }
  return `${c.column} ${labels[op] || op} ${c.value || ''}`
}

function describeLeaf(n) {
  const own = describeRowCondition(n)
  const sub = n.sub ? describeGroup(n.sub, true) : ''
  return own && sub ? `（${own} 且 ${sub}）` : own || sub
}

function describeGroup(g, nested) {
  const parts = (g.conditions || []).map((n) => (isRowGroup(n) ? describeGroup(n, true) : describeLeaf(n))).filter(Boolean)
  if (!parts.length) return ''
  const text = parts.join(g.join === 'or' ? ' 或 ' : ' 且 ')
  return nested && parts.length > 1 ? `（${text}）` : text
}

export function describeRowPolicy(p) {
  return describeGroup(rowRoot(p), false) || '未设置筛选'
}

export function colPolicyApplies(p, user, userId) {
  if (!p || p.on === false) return false
  const s = p.subject || 'all_on'
  if (s === 'all_on') return true
  if (s === 'all_off') return false
  const hit = !!user && ((p.users || []).includes(user.id) || userHitsGroups(user, p.groups || []))
  if (s === 'only') return hit
  if (s === 'except') return userId === undefined ? true : !hit
  return false
}

export function colPolicyColumns(p) {
  if (Array.isArray(p?.columns) && p.columns.length) return p.columns
  return p?.column ? [p.column] : []
}

export function hydrateColPolicies(grant) {
  if ((grant?.col_policies || []).length) {
    return grant.col_policies.map((p) => {
      const columns = [...colPolicyColumns(p)]
      return { ...p, columns, column: columns[0] || '' }
    })
  }
  return (grant?.columns || []).filter((c) => c.mask && c.mask !== 'none').map((c, i) => ({
    id: `col-legacy-${c.column_name}-${i}`,
    column: c.column_name,
    columns: [c.column_name],
    mask: c.mask === 'mask' ? 'mask' : 'hide',
    subject: (c.users || []).length ? 'only' : 'all_on',
    users: [...(c.users || [])],
    groups: [...(c.groups || [])],
    on: c.on !== false,
  }))
}

export function describeColSubject(p) {
  const s = p?.subject || 'all_on'
  if (s === 'all_off') return '所有人不生效'
  if (s === 'only') return '仅对TA们有效'
  if (s === 'except') return '仅对TA们无效'
  return '所有人生效'
}

export function columnsForUser(grant, userId, users = []) {
  const cols = grant?.columns || []
  if (!grant?.col_enabled) {
    return cols.map((c) => ({ ...c, mask: 'none', allowed: true }))
  }
  const user = userId ? (users.find((u) => u.id === userId) || { id: userId }) : null
  if (user && (grant.col_whitelist || []).includes(user.id)) {
    return cols.map((c) => ({ ...c, mask: 'none', allowed: true }))
  }
  const policies = (grant.col_policies || []).filter((p) => p.on !== false)
  if (policies.length) {
    const affected = policies.some((p) => colPolicyApplies(p, user, userId))
    return cols.map((c) => {
      const p = policies.find((x) => colPolicyColumns(x).includes(c.column_name))
      if (p) {
        if (colPolicyApplies(p, user, userId)) {
          const mask = p.mask || 'hide'
          return { ...c, mask, allowed: mask !== 'hide' }
        }
        return { ...c, mask: 'none', allowed: true }
      }
      if (affected && grant.col_other === 'deny') {
        return { ...c, mask: 'hide', allowed: false }
      }
      return { ...c, mask: 'none', allowed: true }
    })
  }
  return cols.map((c) => {
    const bound = c.users || []
    const hits = !bound.length || (!!userId && bound.includes(userId))
    const mask = c.on !== false && hits ? (c.mask || 'none') : 'none'
    return { ...c, mask, allowed: mask !== 'hide' }
  })
}

export function saveDatasetGrant(store, draft) {
  const prev = findGrant(store, draft.dataset_id) || {}
  const columns = (draft.columns || prev.columns || []).map((c) => {
    const mask = c.mask || (c.allowed === false ? 'hide' : 'none')
    return {
      column_name: c.column_name,
      allowed: mask !== 'hide',
      mask,
      users: Array.isArray(c.users) ? [...c.users] : (c.users ? [c.users] : []),
      on: c.on !== false,
    }
  })
  if (draft.col_enabled !== false && columns.length && !columns.some((c) => c.allowed)) {
    return '列级权限至少保留一个可见字段'
  }
  const row_policies = draft.row_policies !== undefined ? draft.row_policies : (prev.row_policies || [])
  const row_rules = draft.row_rules !== undefined
    ? draft.row_rules
    : (draft.row_policies !== undefined ? flattenPoliciesToRules(row_policies) : (prev.row_rules || []))
  const extraSql = draft.row_sql !== undefined ? draft.row_sql : ''
  const row_whitelist = draft.row_whitelist !== undefined ? [...draft.row_whitelist] : [...(prev.row_whitelist || [])]
  const row_other = draft.row_other !== undefined ? draft.row_other : (prev.row_other || 'all')
  const row_join = draft.row_join !== undefined ? draft.row_join : (prev.row_join || 'and')
  const row_mode = draft.row_mode !== undefined ? draft.row_mode : (prev.row_mode || 'combo')
  const col_policies = draft.col_policies !== undefined ? draft.col_policies : (prev.col_policies || [])
  const col_other = draft.col_other !== undefined ? draft.col_other : (prev.col_other || 'allow')
  const col_whitelist = draft.col_whitelist !== undefined ? [...draft.col_whitelist] : [...(prev.col_whitelist || [])]
  let nextColumns = columns
  if (draft.col_policies !== undefined) {
    const map = new Map(col_policies.flatMap((p) => colPolicyColumns(p).map((col) => [col, p])))
    nextColumns = columns.map((c) => {
      const p = map.get(c.column_name)
      if (!p) return { ...c, mask: 'none', allowed: true, users: [], on: true }
      const mask = p.mask === 'mask' ? 'mask' : 'hide'
      return {
        ...c,
        mask,
        allowed: mask !== 'hide',
        users: p.subject === 'only' ? [...(p.users || [])] : [],
        on: p.on !== false,
      }
    })
    if (draft.col_enabled !== false && nextColumns.length && !nextColumns.some((c) => c.allowed)) {
      return '列级权限至少保留一个可见字段'
    }
  }
  const row = {
    ...prev,
    dataset_id: draft.dataset_id,
    columns: nextColumns,
    row_enabled: draft.row_enabled !== undefined ? !!draft.row_enabled : (prev.row_enabled ?? false),
    col_enabled: draft.col_enabled !== undefined ? !!draft.col_enabled : (prev.col_enabled ?? columns.some((c) => !c.allowed || c.mask === 'mask')),
    row_rules,
    row_policies,
    row_whitelist,
    row_other,
    row_join,
    row_mode,
    col_policies,
    col_other,
    col_whitelist,
    collab: draft.collab !== undefined ? draft.collab : (prev.collab || []),
    version: (prev.version || 1) + 1,
    updated_at: stampNow(),
  }
  const toggleOnly = draft.row_rules === undefined && draft.row_policies === undefined && draft.row_sql === undefined
  const compiled = draft.row_filter !== undefined
    ? String(draft.row_filter || '').trim()
    : ((row_policies || []).length
        ? compileGrantRowFilter({ ...row, row_enabled: true })
        : (compileRowFilter(row_rules, extraSql) || (toggleOnly ? (prev.row_filter_def ?? prev.row_filter ?? '') : '')))
  row.row_filter_def = compiled
  row.row_filter = row.row_enabled === false ? '' : compiled
  if (draft.row_enabled === undefined) {
    row.row_enabled = prev.row_enabled ?? !!(compiled || (row_policies || []).length)
  }
  const i = store.datasetGrants.findIndex((g) => g.dataset_id === row.dataset_id)
  if (i >= 0) store.datasetGrants.splice(i, 1, row)
  else store.datasetGrants.push(row)
  syncBoundTools(store, row.dataset_id)
  const ds = store.datasets.find((d) => d.id === row.dataset_id)
  if (ds?.sec_view) ds.sec_view.syncedAt = row.updated_at
  return ''
}

export function toolsOfDataset(store, datasetId) {
  return store.tools.filter((t) => t.dataset?.datasetId === datasetId)
}

export function readerToolsOfDataset(store, datasetId) {
  return store.tools.filter((t) => !t.dataset && (t.reads || []).includes(datasetId))
}

export function linkedToolsOfDataset(store, datasetId) {
  return [...toolsOfDataset(store, datasetId), ...readerToolsOfDataset(store, datasetId)]
}

export function datasetKind(d) {
  if (!d) return 'table'
  if (d.source_type === 'sql' || d.extra?.source_kind === 'sql') return 'sql'
  if (d.extra?.source_kind === 'view') return 'view'
  return 'table'
}

export function datasetKindLabel(kind) {
  if (kind === 'view') return '数据视图'
  if (kind === 'sql') return 'SQL 数据集'
  return '数据表'
}

function schemaPropFromColumn(column) {
  const t = String(column.data_type || column.type || '').toLowerCase()
  const description = column.description || column.comment
    ? `${column.description || column.comment}，可选过滤`
    : `按 ${column.column_name || column.name} 过滤`
  if (['int', 'integer', 'bigint', 'smallint', 'tinyint', 'number'].includes(t)) {
    return { type: 'integer', description }
  }
  if (['decimal', 'float', 'double', 'numeric'].includes(t)) {
    return { type: 'number', description }
  }
  if (t === 'date') return { type: 'string', format: 'date', description }
  if (t.includes('time')) return { type: 'string', format: 'date-time', description }
  return { type: 'string', description }
}

function buildToolSchema(dataset, grant, filterFields) {
  const allowedNames = new Set((grant.columns || []).filter((c) => c.allowed !== false).map((c) => c.column_name))
  const cols = (dataset.columns || []).filter((c) => allowedNames.has(c.column_name))
  const filters = new Set(filterFields || [])
  const properties = {}
  cols.filter((c) => filters.has(c.column_name)).forEach((c) => {
    properties[c.column_name] = schemaPropFromColumn(c)
  })
  const phProps = placeholderToolParams(dataset.extra?.placeholders)
  Object.entries(phProps).forEach(([k, v]) => {
    if (!properties[k]) properties[k] = v
  })
  properties.limit = { type: 'integer', default: 500, description: '最大行数，上限 5000' }
  return {
    schema: { type: 'object', properties, required: [] },
    allowedCols: cols,
    rowFilter: grant.row_filter || ((grant.row_rules || []).some((r) => (r.users || []).length) ? `按用户绑定 ${(grant.row_rules || []).filter((r) => (r.users || []).length).length} 条行规则` : ''),
  }
}

export function syncBoundTools(store, datasetId) {
  const dataset = findDataset(store, datasetId)
  if (!dataset) return 0
  const grant = getOrCreateGrant(store, dataset)
  const source = store.sources.find((s) => s.id === dataset.data_source_id)
  let n = 0
  store.tools.forEach((tool) => {
    if (tool.dataset?.datasetId !== datasetId) return
    if (tool.dataset.syncMode === 'pin') return
    const filterFields = Object.keys(tool.schema?.properties || {}).filter((k) => k !== 'limit')
    const built = buildToolSchema(dataset, grant, filterFields)
    const packed = toolDatasetPayload(dataset, source, grant, built)
    tool.desc = packed.desc
    tool.schema = built.schema
    tool.dataset = {
      ...tool.dataset,
      ...packed.dataset,
      syncMode: tool.dataset.syncMode || 'follow',
    }
    n += 1
  })
  return n
}

function toolDatasetPayload(dataset, source, grant, built) {
  const kind = datasetKind(dataset)
  const kindLabel = datasetKindLabel(kind)
  return {
    dataset: {
      datasetId: dataset.id,
      sourceId: dataset.data_source_id,
      sourceName: source?.name || '',
      displayName: dataset.display_name,
      objectName: dataset.table_name,
      objectType: kind,
      columns: built.allowedCols.map((c) => c.column_name),
      filterFields: Object.keys(built.schema.properties || {}).filter((k) => k !== 'limit'),
      rowFilter: built.rowFilter || ((grant.row_rules || []).some((r) => (r.users || []).length) ? `按用户绑定 ${(grant.row_rules || []).filter((r) => (r.users || []).length).length} 条行规则` : ''),
      grantVersion: grant.version,
      syncMode: 'follow',
    },
    desc: `读取 ${source?.name || ''} 的${kindLabel} ${dataset.table_name}（按数据权限过滤）。`,
  }
}

export const DATASET_SVC_ID = 'dsx'

/** 发布或更新绑定 datasetId 的 MCP 工具，统一挂在平台托管的数据集服务下。 */
export function publishDatasetTool(store, { dataset, source, name, cn, filterFields }) {
  const toolName = String(name || '').trim()
  const title = String(cn || '').trim()
  const svc = DATASET_SVC_ID
  if (!/^[a-z][a-z0-9_]*$/.test(toolName)) return { error: '工具名称需为 snake_case（小写字母/数字/下划线）' }
  if (!title) return { error: '请填写中文名称' }
  if (!dataset?.is_enabled) return { error: '数据集已停用，无法发布' }
  const clash = store.tools.find((t) => t.name === toolName && t.dataset?.datasetId !== dataset.id)
  if (clash) return { error: `工具名 ${toolName} 已被占用` }

  const grant = getOrCreateGrant(store, dataset)
  const built = buildToolSchema(dataset, grant, filterFields)
  if (!built.allowedCols.length) return { error: '至少保留一个可见字段（请先在数据权限中放开列）' }

  const packed = toolDatasetPayload(dataset, source, grant, built)
  const payload = {
    cn: title,
    svc,
    sector: source?.name || '',
    version: 'v1.0.0',
    on: true,
    desc: packed.desc,
    schema: built.schema,
    dataset: packed.dataset,
  }

  const existingByDs = store.tools.find((t) => t.dataset?.datasetId === dataset.id)
  if (existingByDs) {
    Object.assign(existingByDs, payload, { name: toolName })
    return { tool: existingByDs, updated: true }
  }

  const tool = {
    name: toolName,
    ...payload,
    calls: 0,
    sr: 100,
    lat: 0,
    week: [0, 0, 0, 0, 0, 0, 0],
    errs: [{ t: '—', code: '—', msg: '暂无错误记录' }],
  }
  store.tools.push(tool)
  return { tool, updated: false }
}

export function queryDatasetWithGrant(store, { dataset_id, limit = 20, user_id, ...filters }) {
  const dataset = findDataset(store, dataset_id)
  if (!dataset) return { error: '数据集不存在' }
  if (!dataset.is_enabled) return { error: '数据集已停用' }
  const preview = previewDataset(store, dataset, limit, user_id)
  return {
    dataset_id,
    columns: preview.columns,
    rows: preview.rows,
    row_count: preview.row_count,
    limit: preview.limit,
    applied_columns: preview.applied_columns,
    applied_row_filter: preview.applied_row_filter,
    applied_user: preview.applied_user,
    filters_received: filters,
  }
}

export function listAuthorizedDatasets(store, { keyword } = {}) {
  const q = String(keyword || '').trim().toLowerCase()
  return store.datasets
    .filter((d) => d.is_enabled)
    .filter((d) => {
      const g = findGrant(store, d.id)
      if (!g) return true
      return (g.columns || []).some((c) => c.allowed !== false)
    })
    .filter((d) => {
      if (!q) return true
      return `${d.display_name} ${d.table_name} ${d.description || ''}`.toLowerCase().includes(q)
    })
    .map((d) => {
      const g = getOrCreateGrant(store, d)
      const src = store.sources.find((s) => s.id === d.data_source_id)
      return {
        dataset_id: d.id,
        display_name: d.display_name,
        table_name: d.table_name,
        source_name: src?.name || '',
        source_type: d.source_type || 'table',
        columns_allowed: (g.columns || []).filter((c) => c.allowed !== false).length,
        row_filter: g.row_filter || '',
      }
    })
}

// 兼容旧导入名
export const publishVibeDatasetTool = (store, args) => publishDatasetTool(store, args)
export const draftFromCatalog = () => null
export const saveObjectGrant = () => '请改用数据权限'
