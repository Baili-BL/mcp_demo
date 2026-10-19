<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, isDbKind, previewSql, createModeledDataset, createSqlDataset, updateModeledDataset, updateSqlDataset, compileModelSql } from '../store'
import {
  PH_KINDS, VAR_TYPES, SYSTEM_VARS, USER_TAGS, DEFAULT_SCOPES,
  kindLabel, phKey, mergePlaceholders, newManualPlaceholder, placeholderToken,
  renamePlaceholderInSql, removePlaceholderFromSql, validatePlaceholders, renderSql,
} from '../placeholders'
import { formatSql as formatSqlText } from '../sqlFormat'
import SqlEditor from '../components/SqlEditor.vue'
import SqlIcon1 from '../components/icons/sql/Icon1.vue'
import SqlIcon2 from '../components/icons/sql/Icon2.vue'
import SqlIcon4 from '../components/icons/sql/Icon4.vue'
import SqlIcon5 from '../components/icons/sql/Icon5.vue'
import SqlIcon6 from '../components/icons/sql/Icon6.vue'
import SqlIcon7 from '../components/icons/sql/Icon7.vue'

const FILTER_OPS = [
  { value: '=', label: '等于' },
  { value: '!=', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: 'empty', label: '为空' },
]
const DATE_ANCHORS = [
  { value: 'T', label: 'T' },
  { value: 'M', label: 'M' },
  { value: 'Y', label: 'Y' },
]
const JOIN_TYPES = [
  { value: 'left', label: '左关联', sql: 'LEFT JOIN', desc: '保留左表全部行，右表匹配不上则为空' },
  { value: 'right', label: '右关联', sql: 'RIGHT JOIN', desc: '保留右表全部行，左表匹配不上则为空' },
  { value: 'inner', label: '内关联', sql: 'INNER JOIN', desc: '只保留两边都能匹配上的行' },
  { value: 'full', label: '全关联', sql: 'FULL JOIN', desc: '两边行全部保留' },
]

defineOptions({ name: 'DatasetCreate' })

const props = defineProps({
  createMode: { type: String, default: 'canvas' },
  embedded: { type: Boolean, default: false },
})
const emit = defineEmits(['goto', 'close', 'done', 'open-sql'])

const name = ref(props.createMode === 'sql' ? '未命名SQL' : '未命名')
const step = ref(props.createMode === 'sql' ? 'sql' : 'canvas')
const enteredAsSql = ref(props.createMode === 'sql')
const sourceId = ref(store.sources.find((s) => isDbKind(s.kind))?.id || '')
const tableQuery = ref('')
const selectedIds = ref([])
const activeTableId = ref('')
const fieldConfigs = ref([])
const sqlText = ref('')
const sqlResult = ref(null)
const sqlMessage = ref('')
const sqlTab = ref('result')
const sqlHistory = ref([])
const joins = ref([])
const joinOpen = ref(false)
const joinIndex = ref(0)
const fieldQuery = ref('')
const leftFieldKw = ref('')
const rightFieldKw = ref('')
const sqlExpanded = ref(false)
const helpOpen = ref(false)
const phOpen = ref(false)
const placeholders = ref([])
const phDraft = ref([])
const phNewOpen = ref(false)
const phSyntaxOpen = ref(false)
const phForm = reactive({ kind: 'val', name: '', fields: [], varType: 'text', scope: 'global', defaultValue: '' })
const previewUserId = ref(store.users.find((u) => u.status === '正常')?.id || '')
const execSql = ref('')
const execNotes = ref([])
const sqlEditorEl = ref(null)
const filterOpen = ref(false)
const filterHelpOpen = ref(false)
const datasetFilters = ref([])
const activeFilterId = ref('')
const joinDraft = reactive({
  type: 'left',
  conditions: [{ leftField: '', rightField: '', op: '=' }],
})

function resetBlank(mode) {
  enteredAsSql.value = mode === 'sql'
  step.value = mode === 'sql' ? 'sql' : 'canvas'
  name.value = mode === 'sql' ? '未命名SQL' : '未命名'
  selectedIds.value = []
  fieldConfigs.value = []
  sqlText.value = ''
  sqlResult.value = null
  sqlMessage.value = ''
  sqlHistory.value = []
  sqlTab.value = 'result'
  joins.value = []
  joinOpen.value = false
  fieldQuery.value = ''
  leftFieldKw.value = ''
  rightFieldKw.value = ''
  sqlExpanded.value = false
  helpOpen.value = false
  phOpen.value = false
  placeholders.value = []
  phNewOpen.value = false
  execSql.value = ''
  execNotes.value = []
  filterOpen.value = false
  filterHelpOpen.value = false
  datasetFilters.value = []
  activeFilterId.value = ''
}

function loadEdit() {
  const d = store.datasets.find((x) => x.id === store.editDatasetId)
  if (!d) return false
  name.value = d.display_name || d.table_name || ''
  sourceId.value = d.data_source_id || sourceId.value
  if (d.source_type === 'sql') {
    enteredAsSql.value = true
    step.value = 'sql'
    placeholders.value = mergePlaceholders(d.sql || d.extra?.sql || '', d.extra?.placeholders || [])
    sqlText.value = d.sql || d.extra?.sql || ''
    sqlResult.value = null
    sqlMessage.value = ''
    if (sqlText.value.trim()) nextTick(() => runSql())
    return true
  }
  if (d.extra?.model) {
    enteredAsSql.value = false
    const ids = (d.extra.tableIds || []).filter((id) => store.datasets.some((t) => t.id === id))
    selectedIds.value = [...ids]
    activeTableId.value = ids[0] || ''
    fieldConfigs.value = (d.extra.fields || []).map((f) => ({ ...f }))
    if (!fieldConfigs.value.length) ids.forEach((id) => addTable(id))
    joins.value = (d.extra.joins || []).map((j) => ({
      ...j,
      conditions: (j.conditions || []).map((c) => ({ ...c })),
    }))
    datasetFilters.value = (d.extra.filters || []).map((f) => ({ ...f }))
    activeFilterId.value = datasetFilters.value[0]?.id || ''
    step.value = ids.length ? 'fields' : 'canvas'
    return true
  }
  return false
}

watch(() => props.createMode, (mode) => {
  if (store.editDatasetId && loadEdit()) return
  resetBlank(mode)
})

onMounted(() => {
  if (store.editDatasetId) loadEdit()
})

const dbSources = computed(() => store.sources.filter((s) => isDbKind(s.kind)))
const sourceName = computed(() => dbSources.value.find((s) => s.id === sourceId.value)?.name || '')
const sourceTables = computed(() => store.datasets.filter((d) => {
  if (d.data_source_id !== sourceId.value) return false
  if (d.source_type === 'sql' || d.extra?.model) return false
  const q = tableQuery.value.trim().toLowerCase()
  if (!q) return true
  return `${d.display_name} ${d.table_name}`.toLowerCase().includes(q)
}))
const selectedTables = computed(() => selectedIds.value
  .map((id) => store.datasets.find((d) => d.id === id))
  .filter(Boolean))
const activeTable = computed(() => selectedTables.value.find((t) => t.id === activeTableId.value) || selectedTables.value[0])
const selectedFields = computed(() => fieldConfigs.value.filter((f) => f.selected !== false))
const isSql = computed(() => step.value === 'sql')
const modelSql = computed(() => compileModelSql({
  tables: selectedTables.value,
  fields: selectedFields.value,
  joins: joins.value,
  filters: datasetFilters.value,
}))
const activeFilter = computed(() => datasetFilters.value.find((f) => f.id === activeFilterId.value) || null)
const filterableFields = computed(() => fieldConfigs.value.filter((f) => f.selected !== false))
const activeFilterIsDate = computed(() => fieldKind(fieldByFilterId(activeFilter.value?.fieldId)) === 'date')
const showDateStart = computed(() => {
  const f = activeFilter.value
  if (!f || !activeFilterIsDate.value) return false
  if (f.dateMode === 'single') return true
  return f.rangeType === 'start' || f.rangeType === 'between'
})
const showDateEnd = computed(() => {
  const f = activeFilter.value
  if (!f || !activeFilterIsDate.value) return false
  if (f.dateMode === 'single') return false
  return f.rangeType === 'end' || f.rangeType === 'between'
})
const activeFieldRows = computed(() => {
  const rows = fieldConfigs.value.filter((f) => f.datasetId === activeTable.value?.id)
  const q = fieldQuery.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((f) => `${f.fieldName} ${f.physicalName} ${f.dataType}`.toLowerCase().includes(q))
})
const activeFieldTotal = computed(() => fieldConfigs.value.filter((f) => f.datasetId === activeTable.value?.id).length)
const activeFieldSelected = computed(() => fieldConfigs.value.filter((f) => f.datasetId === activeTable.value?.id && f.selected !== false).length)
const joinLine = computed(() => joins.value.map((j, i) => {
  const right = selectedTables.value[i + 1]
  const on = (j.conditions || [])
    .filter((c) => c.leftField && c.rightField)
    .map((c) => `${c.leftField} ${c.op || '='} ${c.rightField}`)
    .join(' AND ')
  return `${joinLabel(j.type)} ${right?.display_name || ''} · ${on || '未配置字段'}`
}).join('  ·  '))

function columnsOf(table) {
  return table?.columns || []
}
function guessJoinFields(left, right) {
  const lcols = columnsOf(left).map((c) => c.column_name)
  const rcols = columnsOf(right).map((c) => c.column_name)
  const same = lcols.find((c) => rcols.includes(c))
  if (same) return { leftField: same, rightField: same }
  const idLike = lcols.find((c) => c === 'id' || c.endsWith('_id'))
  if (idLike && rcols.includes(idLike)) return { leftField: idLike, rightField: idLike }
  return { leftField: lcols[0] || '', rightField: rcols[0] || '' }
}
function joinLabel(type) {
  return JOIN_TYPES.find((j) => j.value === type)?.label || '左关联'
}
function openTable(id) {
  activeTableId.value = id
  fieldQuery.value = ''
  step.value = 'fields'
}
function joinReady(join) {
  return !!(join?.conditions || []).some((c) => c.leftField && c.rightField)
}
function ensureJoins() {
  const tables = selectedTables.value
  const next = []
  for (let i = 0; i < tables.length - 1; i += 1) {
    const left = tables[i]
    const right = tables[i + 1]
    const prev = joins.value.find((j) => j.leftTableId === left.id && j.rightTableId === right.id)
      || joins.value[i]
    const guess = guessJoinFields(left, right)
    next.push({
      id: prev?.id || `join-${left.id}-${right.id}`,
      leftTableId: left.id,
      rightTableId: right.id,
      type: prev?.type || 'left',
      conditions: (prev?.conditions || []).length
        ? prev.conditions.map((c) => ({ ...c }))
        : [{ leftField: guess.leftField, rightField: guess.rightField, op: '=' }],
    })
  }
  joins.value = next
}
function openJoin(index) {
  const join = joins.value[index]
  if (!join) return
  joinIndex.value = index
  joinDraft.type = join.type || 'left'
  joinDraft.conditions = (join.conditions || []).map((c) => ({ ...c }))
  if (!joinDraft.conditions.length) {
    const guess = guessJoinFields(selectedTables.value[index], selectedTables.value[index + 1])
    joinDraft.conditions = [{ ...guess, op: '=' }]
  }
  leftFieldKw.value = ''
  rightFieldKw.value = ''
  joinOpen.value = true
}
function addJoinCondition() {
  joinDraft.conditions.push({ leftField: '', rightField: '', op: '=' })
}
function persistJoin() {
  const join = joins.value[joinIndex.value]
  if (!join) return
  join.type = joinDraft.type
  const conds = joinDraft.conditions.filter((c) => c.leftField && c.rightField)
  if (conds.length) join.conditions = conds
}
function setJoinType(type) {
  joinDraft.type = type
  persistJoin()
}
function closeJoin() {
  persistJoin()
  joinOpen.value = false
}
function leftJoinTable() {
  return selectedTables.value[joinIndex.value]
}
function rightJoinTable() {
  return selectedTables.value[joinIndex.value + 1]
}
function fieldsOfTable(id) {
  return fieldConfigs.value.filter((f) => f.datasetId === id)
}
function filteredJoinFields(side) {
  const table = side === 'left' ? leftJoinTable() : rightJoinTable()
  const q = (side === 'left' ? leftFieldKw.value : rightFieldKw.value).trim().toLowerCase()
  const rows = fieldsOfTable(table?.id)
  if (!q) return rows
  return rows.filter((f) => `${f.fieldName} ${f.physicalName}`.toLowerCase().includes(q))
}

function fieldKind(f) {
  const t = String(f?.dataType || f?.data_type || '').toLowerCase()
  if (t.includes('date') || t.includes('time')) return 'date'
  if (t.includes('int') || t.includes('decimal') || t.includes('float') || t.includes('double') || t.includes('number')) return 'num'
  return 'str'
}
function fieldByFilterId(id) {
  return fieldConfigs.value.find((f) => f.id === id)
}
function openFilters() {
  if (!selectedIds.value.length) {
    Message.warning('请先选择数据表')
    return
  }
  if (!datasetFilters.value.length) addFilterField()
  else if (!activeFilterId.value) activeFilterId.value = datasetFilters.value[0].id
  filterOpen.value = true
}
function dateFilterDefaults() {
  return {
    dateMode: 'range',
    rangeType: 'between',
    startKind: 'relative',
    startDate: '',
    startAnchor: 'T',
    startSign: '-',
    startOffset: '',
    endKind: 'relative',
    endDate: '',
    endAnchor: 'T',
    endSign: '-',
    endOffset: '',
  }
}
function ensureDateFilter(item) {
  if (!item) return
  const d = dateFilterDefaults()
  Object.keys(d).forEach((k) => {
    if (item[k] == null) item[k] = d[k]
  })
}
function addFilterField() {
  const used = new Set(datasetFilters.value.map((f) => f.fieldId))
  const next = filterableFields.value.find((f) => !used.has(f.id) && fieldKind(f) === 'date')
    || filterableFields.value.find((f) => !used.has(f.id))
  if (!next) {
    Message.warning(filterableFields.value.length ? '可过滤字段已全部添加' : '请先选择数据表')
    return
  }
  const item = {
    id: `flt-${Date.now()}`,
    fieldId: next.id,
    mode: fieldKind(next) === 'date' ? 'condition' : 'enum',
    query: 'single',
    conditionField: '',
    op: '=',
    value: '',
    ...dateFilterDefaults(),
  }
  datasetFilters.value.push(item)
  activeFilterId.value = item.id
}
function removeFilterField(id) {
  datasetFilters.value = datasetFilters.value.filter((f) => f.id !== id)
  if (activeFilterId.value === id) activeFilterId.value = datasetFilters.value[0]?.id || ''
}
function changeFilterField(item, fieldId) {
  if (datasetFilters.value.some((f) => f.id !== item.id && f.fieldId === fieldId)) {
    Message.warning('该字段已添加为过滤项')
    return
  }
  item.fieldId = fieldId
  if (fieldKind(fieldByFilterId(fieldId)) === 'date') {
    item.mode = 'condition'
    ensureDateFilter(item)
  }
}
function pickDate(side) {
  const f = activeFilter.value
  if (!f) return
  if (side === 'end') f.endKind = 'absolute'
  else f.startKind = 'absolute'
}

function back() {
  if (isSql.value && !enteredAsSql.value) {
    step.value = 'canvas'
    return
  }
  if (props.embedded) {
    emit('close')
    return
  }
  if (store.studioDatasetId) {
    emit('goto', 'dataset-studio')
    return
  }
  store.editDatasetId = ''
  emit('goto', 'datasets')
}

function selectSource(id) {
  sourceId.value = id
  selectedIds.value = []
  activeTableId.value = ''
  fieldConfigs.value = []
  joins.value = []
  fieldQuery.value = ''
  sqlExpanded.value = false
  if (!isSql.value) step.value = 'canvas'
  sqlResult.value = null
  sqlMessage.value = ''
}

function fieldKey(datasetId, columnName) {
  return `${datasetId}::${columnName}`
}

function addTable(id) {
  const isNew = !selectedIds.value.includes(id)
  if (isNew) selectedIds.value = [...selectedIds.value, id]
  activeTableId.value = id
  const table = store.datasets.find((d) => d.id === id)
  const exists = new Set(fieldConfigs.value.filter((f) => f.datasetId === id).map((f) => f.physicalName))
  ;(table?.columns || []).forEach((col) => {
    if (exists.has(col.column_name)) return
    fieldConfigs.value.push({
      id: fieldKey(id, col.column_name),
      datasetId: id,
      sourceTableName: table.display_name || table.table_name,
      physicalName: col.column_name,
      fieldName: col.column_name,
      dataType: col.data_type,
      description: col.description || '',
      semanticHint: col.semantic_hint,
      selected: true,
    })
  })
  ensureJoins()
  if (isNew && selectedIds.value.length > 1) {
    step.value = 'canvas'
    nextTick(() => openJoin(selectedIds.value.length - 2))
    return
  }
  step.value = 'fields'
}

function removeTable(id) {
  selectedIds.value = selectedIds.value.filter((x) => x !== id)
  fieldConfigs.value = fieldConfigs.value.filter((f) => f.datasetId !== id)
  if (activeTableId.value === id) activeTableId.value = selectedIds.value[0] || ''
  ensureJoins()
  if (!selectedIds.value.length) step.value = 'canvas'
}

function onDrop(ev) {
  ev.preventDefault()
  const id = ev.dataTransfer.getData('application/x-mcp-table')
  if (id) addTable(id)
}

function openSql() {
  if (props.embedded) {
    emit('open-sql')
    return
  }
  step.value = 'sql'
  sqlMessage.value = ''
}

function insertTableSql(table) {
  const tableName = table.table_name || table.display_name
  const prefix = sqlText.value.trim() ? `${sqlText.value.trim()}\n` : ''
  sqlText.value = `${prefix}SELECT *\nFROM ${tableName}\nLIMIT 100`
}

const sqlDialect = computed(() => store.sources.find((s) => s.id === sourceId.value)?.kind === 'oracle' ? 'oracle' : 'mysql')
const sqlSchema = computed(() => {
  const out = {}
  store.datasets.forEach((d) => {
    if (d.data_source_id !== sourceId.value || d.source_type === 'sql' || d.extra?.model) return
    const table = d.table_name || d.display_name
    if (table) out[table] = (d.columns || []).map((c) => c.column_name)
  })
  return out
})

function formatSql() {
  if (!sqlText.value.trim()) return
  const { sql, error } = formatSqlText(sqlText.value, sqlDialect.value)
  if (error) {
    Message.warning(`格式化失败：${error}`)
    return
  }
  sqlText.value = sql
}

watch(sqlText, (v) => {
  placeholders.value = mergePlaceholders(v, placeholders.value)
})

const phCheck = computed(() => validatePlaceholders(placeholders.value))
const phDraftCheck = computed(() => validatePlaceholders(phDraft.value))
const previewUser = computed(() => store.users.find((u) => u.id === previewUserId.value) || null)
const needsIdentity = computed(() => placeholders.value.some((p) => p.used && (p.kind === 'tag' || p.kind === 'system')))
const sourceColumns = computed(() => {
  const names = new Set()
  sourceTables.value.forEach((t) => (t.columns || []).forEach((c) => names.add(c.column_name)))
  return [...names]
})

function openPlaceholders() {
  placeholders.value = mergePlaceholders(sqlText.value, placeholders.value)
  phDraft.value = placeholders.value.map((p) => ({ ...p, fields: [...(p.fields || [])], _name: p.name }))
  phOpen.value = true
}

function savePlaceholders() {
  if (phDraftCheck.value.errors.length) {
    Message.warning(phDraftCheck.value.errors[0])
    return false
  }
  let sql = sqlText.value
  for (const p of phDraft.value) {
    const next = String(p.name || '').trim()
    if (!next) {
      Message.warning('变量名不能为空')
      return false
    }
    if (next !== p._name && p.used) sql = renamePlaceholderInSql(sql, { ...p, name: p._name }, next)
  }
  const kept = phDraft.value.map(({ _name, ...rest }) => ({ ...rest, name: String(rest.name).trim() }))
  placeholders.value = mergePlaceholders(sql, kept.map((p) => ({ ...p, manual: p.manual || !p.used })))
  sqlText.value = sql
  phOpen.value = false
  Message.success('占位符已更新')
  return true
}

function removeDraftPlaceholder(p) {
  phDraft.value = phDraft.value.filter((x) => x !== p)
  if (p.used) {
    const next = removePlaceholderFromSql(sqlText.value, { ...p, name: p._name })
    if (next !== sqlText.value) {
      sqlText.value = next
      Message.info(`已把 SQL 中的「${p._name}」替换为 1=1`)
    } else {
      Message.info('SQL 中仍引用该占位符，删除后会在下次识别时重新出现，请同时修改 SQL')
    }
  }
}

function openNewPlaceholder() {
  Object.assign(phForm, { kind: 'val', name: '', fields: [], varType: 'text', scope: 'global', defaultValue: '' })
  phNewOpen.value = true
}

function createPlaceholder() {
  const name = String(phForm.name || '').trim()
  if (!name) {
    Message.warning('请输入变量名')
    return false
  }
  if (/[{}:,\s.]/.test(name)) {
    Message.warning('变量名不能包含空格、点、逗号、冒号或花括号')
    return false
  }
  if (['expr', 'accel', 'condition'].includes(phForm.kind) && !phForm.fields.length) {
    Message.warning('请选择物理字段')
    return false
  }
  if (phForm.kind === 'accel' && phDraft.value.some((p) => p.kind === 'accel')) {
    Message.warning('每个数据集仅支持 1 个加速占位符')
    return false
  }
  if (phDraft.value.some((p) => phKey(p) === `${phForm.kind}:${name}`)) {
    Message.warning('已存在同名同类型的占位符')
    return false
  }
  const p = newManualPlaceholder({ ...phForm, name, fields: [...phForm.fields] })
  phDraft.value = [...phDraft.value, { ...p, _name: name }]
  phNewOpen.value = false
  return true
}

function insertToken(p) {
  const token = placeholderToken(p)
  nextTick(() => sqlEditorEl.value?.insertAtCursor(token))
  Message.success(`已插入 ${token}`)
}

function insertFromDraft(p) {
  if (!savePlaceholders()) return
  insertToken({ ...p, name: String(p.name).trim() })
}

function runSql() {
  const started = Date.now()
  const check = validatePlaceholders(placeholders.value)
  const rendered = renderSql(sqlText.value, placeholders.value, { user: previewUser.value, groups: store.userGroups })
  execSql.value = rendered.sql
  execNotes.value = rendered.notes
  const blocker = check.errors[0] || rendered.errors[0]
  const result = blocker
    ? { error: blocker }
    : previewSql(store, { data_source_id: sourceId.value, sql: rendered.sql, limit: 100 })
  const duration = Date.now() - started
  if (result.error) {
    sqlResult.value = null
    sqlMessage.value = result.error
    sqlHistory.value = [{ id: `${Date.now()}`, at: new Date().toLocaleTimeString('zh-CN', { hour12: false }), success: false, rows: 0, duration, message: result.error }, ...sqlHistory.value.slice(0, 9)]
    return
  }
  sqlResult.value = result
  sqlMessage.value = `运行成功，返回 ${result.row_count || 0} 行`
  sqlHistory.value = [{ id: `${Date.now()}`, at: new Date().toLocaleTimeString('zh-CN', { hour12: false }), success: true, rows: result.row_count || 0, duration, message: 'SELECT 预览' }, ...sqlHistory.value.slice(0, 9)]
  sqlTab.value = 'result'
}

function finish() {
  if (isSql.value) {
    const check = validatePlaceholders(placeholders.value)
    if (check.errors.length) {
      Message.warning(check.errors[0])
      openPlaceholders()
      return
    }
    const payload = {
      name: name.value,
      sourceId: sourceId.value,
      sql: sqlText.value,
      columns: sqlResult.value?.columns,
      placeholders: placeholders.value,
    }
    const { error, dataset } = store.editDatasetId
      ? updateSqlDataset(store, store.editDatasetId, payload)
      : createSqlDataset(store, payload)
    if (error) { Message.warning(error); return }
    Message.success(`SQL 数据集「${dataset.display_name}」已保存`)
    store.studioDatasetId = dataset.id
    store.editDatasetId = dataset.id
    emit('goto', 'dataset-studio')
    return
  }
  if (!selectedIds.value.length) {
    Message.warning('请先选择数据表')
    return
  }
  if (selectedTables.value.length > 1 && joins.value.some((j) => !joinReady(j))) {
    Message.warning('请先配置表关联：支持左关联 / 右关联 / 内关联 / 全关联')
    const idx = joins.value.findIndex((j) => !joinReady(j))
    openJoin(idx < 0 ? 0 : idx)
    return
  }
  const payload = {
    name: name.value,
    sourceId: sourceId.value,
    tables: selectedTables.value,
    fields: selectedFields.value,
    joins: joins.value,
    filters: datasetFilters.value,
  }
  const { error, dataset } = store.editDatasetId
    ? updateModeledDataset(store, store.editDatasetId, payload)
    : createModeledDataset(store, payload)
  if (error) { Message.warning(error); return }
  Message.success(`数据集「${dataset.display_name}」已保存`)
  store.studioDatasetId = dataset.id
  store.editDatasetId = dataset.id
  if (props.embedded) {
    emit('done', dataset)
    return
  }
  emit('goto', 'dataset-studio')
}

const finishLabel = computed(() => {
  if (isSql.value) return store.editDatasetId ? '保存' : '确认编辑'
  return store.editDatasetId ? '保存' : '完成，开始数据处理'
})
</script>

<template>
  <div class="create-page">
    <header v-if="!isSql" class="create-head">
      <div class="create-head-left">
        <button type="button" class="icon-btn" @click="back"><icon-arrow-left /></button>
        <span class="create-mark"><icon-storage /></span>
        <label class="name-box">
          <input v-model="name" class="create-name" placeholder="输入数据集名称" />
          <icon-edit />
        </label>
      </div>
      <div class="head-actions">
        <button type="button" class="ghost-btn" @click="openFilters">高级配置</button>
        <button type="button" class="primary-btn" :disabled="!selectedIds.length && !sqlText.trim()" @click="finish">保存</button>
      </div>
    </header>

    <header v-else class="create-head sql-head">
      <div class="create-head-left">
        <i class="sql-file-ico">
          <SqlIcon1 :size="16" />
        </i>
        <label class="sql-name-box">
          <input v-model="name" class="sql-name" placeholder="请输入片段名称" maxlength="100" />
          <span class="sql-count">{{ name.length }}/100</span>
        </label>
      </div>
      <div class="sql-actions">
        <button type="button" class="sql-text-btn" @click="helpOpen = true">
          <SqlIcon2 :size="16" />
          常见问题
        </button>
        <button type="button" class="sql-outline-btn" @click="formatSql">
          <SqlIcon4 :size="16" />
          格式化
        </button>
        <button type="button" class="sql-outline-btn" @click="openPlaceholders">
          <SqlIcon5 :size="16" />
          占位符管理
          <span v-if="placeholders.length" class="ph-count" :class="{ bad: phCheck.errors.length }">{{ placeholders.length }}</span>
        </button>
        <button type="button" class="sql-primary-btn" @click="runSql">
          <SqlIcon6 :size="16" />
          运行
        </button>
        <button type="button" class="sql-primary-btn sql-confirm" @click="finish">确认编辑</button>
        <span class="sql-split" />
        <button type="button" class="sql-close" title="关闭" @click="back">
          <SqlIcon7 :size="16" />
        </button>
      </div>
    </header>

    <div v-if="!isSql" class="create-body">
      <aside class="create-side">
        <div class="side-bar">模型配置</div>
        <div class="side-pad">
          <div class="side-row">
            <h2 class="side-title">数据表</h2>
          </div>
          <div class="side-label">选择数据源</div>
          <label class="source-pick">
            <icon-storage />
            <a-select v-model="sourceId" :bordered="false" @change="selectSource">
              <a-option v-for="s in dbSources" :key="s.id" :value="s.id">{{ s.name }}</a-option>
            </a-select>
          </label>
          <label class="pill-search">
            <icon-search />
            <input v-model="tableQuery" placeholder="搜索数据表" />
          </label>
          <button type="button" class="dash-btn" @click="openSql"><icon-code /> SQL 代码创建表</button>
          <div class="table-list">
            <button
              v-for="t in sourceTables"
              :key="t.id"
              type="button"
              class="table-item"
              :class="{ on: selectedIds.includes(t.id) }"
              draggable="true"
              @dragstart="(e) => e.dataTransfer.setData('application/x-mcp-table', t.id)"
              @click="addTable(t.id)"
            >
              <icon-file />
              <span class="ellipsis">{{ t.display_name }}</span>
              <icon-check-circle v-if="selectedIds.includes(t.id)" />
            </button>
            <div v-if="!sourceTables.length" class="muted empty-hint">暂无数据表</div>
          </div>
        </div>
      </aside>

      <section class="create-canvas" :class="{ dim: step === 'fields' || joinOpen }" @dragover.prevent @drop="onDrop">
        <div v-if="selectedTables.length" class="canvas-graph-wrap" :class="{ lifted: step === 'fields' || joinOpen }">
          <div class="canvas-graph">
            <template v-for="(t, i) in selectedTables" :key="t.id">
              <div
                class="table-card"
                :class="{ on: activeTable?.id === t.id }"
                @click="openTable(t.id)"
              >
                <div class="table-card-hd">
                  <span class="card-ico"><icon-file /></span>
                  <div class="min0">
                    <div class="ds-title">{{ t.display_name }}</div>
                    <div class="sub">{{ t.table_name }}</div>
                  </div>
                  <button type="button" class="rm" title="移除" @click.stop="removeTable(t.id)"><icon-close /></button>
                </div>
                <div class="card-chips">
                  <span>字段 {{ t.columns?.length || 0 }}</span>
                  <span>约 {{ (t.row_count_estimate || 0).toLocaleString() }} 行</span>
                </div>
              </div>
              <button
                v-if="i < selectedTables.length - 1"
                type="button"
                class="join-link"
                :class="{ ready: joinReady(joins[i]), warn: !joinReady(joins[i]) }"
                @click.stop="openJoin(i)"
              >
                <span class="join-line" />
                <span class="join-node">
                  <span class="join-venn" :class="joins[i]?.type || 'left'" />
                  {{ joinReady(joins[i]) ? joinLabel(joins[i]?.type) : '配置关联' }}
                </span>
                <span class="join-line" />
              </button>
            </template>
          </div>
          <p class="canvas-hint">
            {{ selectedTables.length > 1 ? '点击中间节点配置左关联 / 右关联 / 内关联 / 全关联。' : '可继续从左侧拖入数据表，完成后开始数据处理。' }}
          </p>
          <button v-if="selectedTables.length > 1 && joinLine" type="button" class="join-summary" @click="sqlExpanded = !sqlExpanded">
            <icon-relation />
            <span class="ellipsis">{{ joinLine }}</span>
            <span class="muted">{{ sqlExpanded ? '收起 SQL' : '查看 SQL' }}</span>
          </button>
          <pre v-if="sqlExpanded && modelSql" class="join-sql mono">{{ modelSql }}</pre>
        </div>
        <div v-else class="canvas-empty">
          <icon-mind-mapping class="empty-ico" />
          <p>请从左侧选择数据表，或使用 SQL 代码创建逻辑表，构建关系模型</p>
          <div class="chip-row">
            <button v-for="t in sourceTables.slice(0, 8)" :key="t.id" type="button" class="chip" @click="addTable(t.id)">
              <icon-file /> {{ t.display_name }}
            </button>
          </div>
        </div>

        <div v-if="joinOpen" class="join-sheet">
          <div class="sheet-handle">
            <span />
            <button type="button" class="join-sheet-close" title="关闭" @click="closeJoin"><icon-close /></button>
          </div>
          <div class="join-sheet-body">
            <section class="join-kind-pane">
              <div class="join-pane-title">选择关联方式</div>
              <div class="jk-cards">
                <button
                  v-for="t in JOIN_TYPES"
                  :key="t.value"
                  type="button"
                  class="jk-card"
                  :class="{ on: joinDraft.type === t.value }"
                  :title="t.desc"
                  @click="setJoinType(t.value)"
                >
                  <span class="jk-switch" :class="{ on: joinDraft.type === t.value }"><i /></span>
                  <span>{{ t.label }}</span>
                </button>
              </div>
              <div class="join-cond-hd">关联条件</div>
              <div v-for="(c, i) in joinDraft.conditions" :key="i" class="join-cond">
                <a-select v-model="c.leftField" :placeholder="leftJoinTable()?.display_name || '左表字段'" size="small" :style="{ width: '148px' }" @change="persistJoin">
                  <a-option v-for="col in columnsOf(leftJoinTable())" :key="col.column_name" :value="col.column_name">{{ col.column_name }}</a-option>
                </a-select>
                <a-select v-model="c.op" size="small" :style="{ width: '64px' }" @change="persistJoin">
                  <a-option value="=">=</a-option>
                  <a-option value="!=">!=</a-option>
                </a-select>
                <a-select v-model="c.rightField" :placeholder="rightJoinTable()?.display_name || '右表字段'" size="small" :style="{ width: '148px' }" @change="persistJoin">
                  <a-option v-for="col in columnsOf(rightJoinTable())" :key="col.column_name" :value="col.column_name">{{ col.column_name }}</a-option>
                </a-select>
                <button type="button" class="text-danger" @click="joinDraft.conditions.splice(i, 1); persistJoin()">删除</button>
              </div>
              <button type="button" class="ghost-btn sm" @click="addJoinCondition">添加条件</button>
            </section>
            <section class="join-field-pane">
              <div class="join-pane-title">快捷选择展示字段</div>
              <div class="jf-cols">
                <div class="jf-col">
                  <div class="jf-col-hd">
                    <span class="jf-tag">左表</span>
                    <span class="ellipsis">{{ leftJoinTable()?.display_name || '—' }}</span>
                  </div>
                  <label class="jf-search">
                    <icon-search />
                    <input v-model="leftFieldKw" placeholder="请输入关键字搜索" />
                  </label>
                  <div class="jf-list">
                    <label v-for="f in filteredJoinFields('left')" :key="f.id" class="jf-row">
                      <a-checkbox v-model="f.selected" />
                      <span class="jf-mark" />
                      <span class="ellipsis">{{ f.fieldName }}</span>
                    </label>
                    <div v-if="!filteredJoinFields('left').length" class="muted empty-hint">暂无字段</div>
                  </div>
                </div>
                <div class="jf-col">
                  <div class="jf-col-hd">
                    <span class="jf-tag">右表</span>
                    <span class="ellipsis">{{ rightJoinTable()?.display_name || '—' }}</span>
                  </div>
                  <label class="jf-search">
                    <icon-search />
                    <input v-model="rightFieldKw" placeholder="请输入关键字搜索" />
                  </label>
                  <div class="jf-list">
                    <label v-for="f in filteredJoinFields('right')" :key="f.id" class="jf-row">
                      <a-checkbox v-model="f.selected" />
                      <span class="jf-mark" />
                      <span class="ellipsis">{{ f.fieldName }}</span>
                    </label>
                    <div v-if="!filteredJoinFields('right').length" class="muted empty-hint">暂无字段</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div v-if="step === 'fields' && !joinOpen" class="field-sheet">
          <div class="sheet-handle"><span /></div>
          <div class="sheet-body">
            <aside class="sheet-side">
              <div class="sheet-kicker">逻辑表详情</div>
              <div class="ds-title">{{ activeTable?.display_name }}</div>
              <div class="sub">数据源：{{ sourceName || '—' }}</div>
              <button type="button" class="ghost-btn danger" :disabled="!activeTable" @click="removeTable(activeTable.id)">删除此表</button>
              <div v-if="selectedTables.length > 1" class="picked">
                <div class="side-label">已选择数据表</div>
                <button
                  v-for="t in selectedTables"
                  :key="t.id"
                  type="button"
                  class="picked-item"
                  :class="{ on: activeTable?.id === t.id }"
                  @click="openTable(t.id)"
                >
                  <icon-file />
                  <span class="ellipsis">{{ t.display_name }}</span>
                </button>
              </div>
            </aside>
            <div class="sheet-main">
              <div class="field-hd">
                <strong>字段选择（{{ activeFieldSelected }}/{{ activeFieldTotal }}）</strong>
                <div class="field-hd-right">
                  <label class="pill-search sm">
                    <icon-search />
                    <input v-model="fieldQuery" placeholder="搜索字段" />
                  </label>
                  <button type="button" class="icon-btn" title="返回画布" @click="step = 'canvas'"><icon-close /></button>
                </div>
              </div>
              <div class="field-list">
                <div class="field-row head">
                  <span />
                  <span>字段名称</span>
                  <span>类型</span>
                  <span>物理字段</span>
                </div>
                <label v-for="f in activeFieldRows" :key="f.id" class="field-row">
                  <a-checkbox v-model="f.selected" />
                  <a-input v-model="f.fieldName" size="small" />
                  <a-tag size="small" color="arcoblue">{{ f.dataType }}</a-tag>
                  <span class="mono sub">{{ f.physicalName }}</span>
                </label>
                <div v-if="!activeFieldRows.length" class="muted empty-hint">没有匹配的字段</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="sql-body">
      <aside class="create-side">
        <div class="side-pad">
          <div class="side-row">
            <h2 class="side-title">数据表</h2>
          </div>
          <div class="side-label">当前数据源</div>
          <label class="source-pick">
            <icon-storage />
            <a-select v-model="sourceId" :bordered="false" @change="selectSource">
              <a-option v-for="s in dbSources" :key="s.id" :value="s.id">{{ s.name }}</a-option>
            </a-select>
          </label>
          <label class="pill-search">
            <icon-search />
            <input v-model="tableQuery" placeholder="搜索数据表" />
          </label>
          <div class="table-list">
            <button v-for="t in sourceTables" :key="t.id" type="button" class="table-item" @click="insertTableSql(t)">
              <icon-file />
              <span class="ellipsis">{{ t.display_name }}</span>
            </button>
          </div>
        </div>
      </aside>
      <section class="sql-main">
        <SqlEditor
          ref="sqlEditorEl"
          v-model="sqlText"
          class="sql-editor"
          :dialect="sqlDialect"
          :schema="sqlSchema"
          placeholder="SELECT * FROM table_name LIMIT 100"
          @run="runSql"
          @format="formatSql"
        />
        <div class="sql-result">
          <div class="side-tabs result-tabs" style="padding: 0 16px">
            <button type="button" :class="{ on: sqlTab === 'result' }" @click="sqlTab = 'result'">运行结果</button>
            <button type="button" :class="{ on: sqlTab === 'exec' }" @click="sqlTab = 'exec'">实际执行 SQL</button>
            <button type="button" :class="{ on: sqlTab === 'history' }" @click="sqlTab = 'history'">历史记录</button>
            <span class="tab-gap" />
            <label v-if="needsIdentity" class="preview-as">
              预览身份
              <a-select v-model="previewUserId" size="mini" :style="{ width: '150px' }" allow-search>
                <a-option v-for="u in store.users" :key="u.id" :value="u.id">{{ u.name }} · {{ u.team || u.role }}</a-option>
              </a-select>
            </label>
          </div>
          <div v-if="sqlTab === 'exec'" class="sql-pad">
            <div v-if="!execSql" class="muted" style="text-align:center; padding: 32px 0">运行后，这里展示占位符替换后的 SQL。</div>
            <template v-else>
              <div v-for="n in execNotes" :key="n" class="exec-note">{{ n }}</div>
              <pre class="exec-sql mono">{{ execSql }}</pre>
            </template>
          </div>
          <div v-if="sqlTab === 'history'" class="sql-pad">
            <div v-if="!sqlHistory.length" class="muted" style="text-align:center; padding: 32px 0">运行 SQL 后会在这里记录执行状态。</div>
            <div v-else v-for="h in sqlHistory" :key="h.id" class="hist-row">
              <span>{{ h.at }}</span>
              <span :class="h.success ? 'ok' : 'bad'">{{ h.success ? '成功' : '失败' }}</span>
              <span>{{ h.success ? `${h.rows} 行 · ${h.duration}ms` : h.message }}</span>
            </div>
          </div>
          <div v-else-if="sqlTab === 'result'" class="sql-pad">
            <div v-if="!sqlResult" class="muted" style="text-align:center; padding: 32px 0">{{ sqlMessage || '编辑完代码后，点击上方运行即可查看结果。' }}</div>
            <template v-else>
              <div class="ok" style="margin-bottom: 8px">{{ sqlMessage }}</div>
              <a-table :data="sqlResult.rows" :pagination="false" size="small" :scroll="{ x: true }">
                <template #columns>
                  <a-table-column v-for="c in sqlResult.columns" :key="c" :title="c" :data-index="c" />
                </template>
              </a-table>
            </template>
          </div>
        </div>
      </section>
    </div>

    <footer v-if="!isSql && step !== 'sql' && !joinOpen" class="create-foot">
      <button type="button" class="primary-btn lg" :disabled="!selectedIds.length" @click="finish">{{ finishLabel }}</button>
    </footer>

    <a-modal v-model:visible="helpOpen" title="常见问题" :width="480" unmount-on-close :footer="false">
      <ul class="sql-help">
        <li>SQL 数据集仅支持 SELECT 查询，运行后按当前数据源抽样预览。</li>
        <li>点击左侧数据表可插入 <span class="mono">SELECT * FROM 表名 LIMIT 100</span>。</li>
        <li>
          支持值 <span class="mono">{{ "'$val{name}'" }}</span>、表达式 <span class="mono">{{ '$expr{字段:name}' }}</span>、条件、加速、标签、系统六类占位符，在「占位符管理」里设置变量类型和默认值。
        </li>
      </ul>
      <div style="text-align:right; margin-top: 16px">
        <a-button type="primary" @click="helpOpen = false">知道了</a-button>
      </div>
    </a-modal>
    <a-drawer
      v-model:visible="phOpen"
      :width="980"
      unmount-on-close
      ok-text="确定"
      class="ph-drawer"
      :on-before-ok="savePlaceholders"
    >
      <template #title>
        占位符管理
        <span class="ph-title-count">{{ phDraft.length }} 个</span>
      </template>
      <div class="ph-bar">
        <span class="hint">系统自动识别 SQL 中的占位符，可修改变量类型和查询默认值；也可以手动新建后插入到光标处。</span>
        <a-space>
          <a-link href="/docs/placeholder.html" target="_blank">使用说明</a-link>
          <a-button size="small" @click="phSyntaxOpen = !phSyntaxOpen">{{ phSyntaxOpen ? '收起语法' : '语法说明' }}</a-button>
          <a-button size="small" type="primary" :disabled="phNewOpen" @click="openNewPlaceholder"><template #icon><icon-plus /></template>新建占位符</a-button>
        </a-space>
      </div>
      <section v-if="phNewOpen" class="ph-new">
        <div class="ph-new-hd">
          新建占位符
          <span class="muted tiny">{{ PH_KINDS.find((k) => k.value === phForm.kind)?.desc }}</span>
        </div>
        <div class="ph-new-grid">
          <label>
            <span>类型</span>
            <a-select v-model="phForm.kind" size="small" @change="(k) => { phForm.scope = k === 'accel' ? 'dataset' : 'global'; phForm.varType = k === 'accel' ? 'date' : 'text'; phForm.fields = []; phForm.name = k === 'system' ? 'accountName' : k === 'tag' ? USER_TAGS[0] : '' }">
              <a-option v-for="k in PH_KINDS" :key="k.value" :value="k.value">{{ k.label }}</a-option>
            </a-select>
          </label>
          <label>
            <span>{{ phForm.kind === 'tag' ? '用户标签' : phForm.kind === 'system' ? '系统变量' : '变量名' }}</span>
            <a-select v-if="phForm.kind === 'system'" v-model="phForm.name" size="small">
              <a-option v-for="s in SYSTEM_VARS" :key="s.value" :value="s.value">{{ s.value }} · {{ s.label }}</a-option>
            </a-select>
            <a-select v-else-if="phForm.kind === 'tag'" v-model="phForm.name" size="small" allow-create>
              <a-option v-for="t in USER_TAGS" :key="t" :value="t">{{ t }}</a-option>
            </a-select>
            <a-input v-else v-model="phForm.name" size="small" placeholder="如 report_date、area_ph" />
          </label>
          <label v-if="['expr', 'accel', 'condition'].includes(phForm.kind)" class="span2">
            <span>{{ phForm.kind === 'condition' ? '物理字段（按层级顺序，最多 10 个）' : '物理字段' }}</span>
            <a-select v-if="phForm.kind === 'condition'" v-model="phForm.fields" size="small" multiple :limit="10" allow-search allow-create placeholder="选择或输入字段名">
              <a-option v-for="c in sourceColumns" :key="c" :value="c">{{ c }}</a-option>
            </a-select>
            <a-select
              v-else
              :model-value="phForm.fields[0] || ''"
              size="small"
              allow-search
              allow-create
              placeholder="选择或输入字段名"
              @change="(v) => { phForm.fields = v ? [v] : [] }"
            >
              <a-option v-for="c in sourceColumns" :key="c" :value="c">{{ c }}</a-option>
            </a-select>
          </label>
          <template v-if="phForm.kind !== 'tag' && phForm.kind !== 'system'">
            <label>
              <span>变量类型</span>
              <a-select v-model="phForm.varType" size="small">
                <a-option v-for="t in VAR_TYPES" :key="t.value" :value="t.value">{{ t.label }}</a-option>
              </a-select>
            </label>
            <label class="span2">
              <span>查询默认值</span>
              <div class="ph-default">
                <a-select v-model="phForm.scope" size="small" :style="{ width: '110px' }" :disabled="phForm.kind === 'accel'">
                  <a-option v-for="s in DEFAULT_SCOPES" :key="s.value" :value="s.value">{{ s.label }}</a-option>
                </a-select>
                <a-input v-model="phForm.defaultValue" size="small" :max-length="150" show-word-limit allow-clear placeholder="选填" />
              </div>
            </label>
          </template>
        </div>
        <div class="ph-new-ft">
          <span class="muted tiny">写入 SQL 后：<span class="mono">{{ placeholderToken({ ...phForm, name: phForm.name || 'name' }) }}</span></span>
          <a-space>
            <a-button size="small" @click="phNewOpen = false">取消</a-button>
            <a-button size="small" type="primary" @click="createPlaceholder">添加</a-button>
          </a-space>
        </div>
      </section>
      <div v-if="phSyntaxOpen" class="ph-syntax">
        <div v-for="k in PH_KINDS" :key="k.value" class="ph-syn-row">
          <span class="ph-kind" :class="`k-${k.value}`">{{ k.label }}</span>
          <span class="mono">{{ k.syntax }}</span>
          <span class="muted">{{ k.desc }}</span>
        </div>
        <div class="ph-syn-row">
          <span class="ph-kind k-system">系统变量</span>
          <span class="muted">{{ SYSTEM_VARS.map((s) => `${s.value}（${s.label}）`).join('、') }}</span>
        </div>
        <div class="ph-syn-row">
          <span class="ph-kind k-tag">用户标签</span>
          <span class="muted">{{ USER_TAGS.join('、') }}（取自用户管理中的团队、角色、用户组、身份）</span>
        </div>
      </div>
      <a-table :data="phDraft" :pagination="false" size="small" row-key="id" :scroll="{ y: 360 }">
        <template #empty>
          <div class="muted" style="padding: 24px 0">SQL 中还没有占位符。可点击「新建占位符」，或在 SQL 中写入 <span class="mono">{{ "'$val{name}'" }}</span>。</div>
        </template>
        <template #columns>
          <a-table-column title="变量名" :width="170">
            <template #cell="{ record }">
              <a-input v-model="record.name" size="small" :disabled="record.kind === 'system'" />
            </template>
          </a-table-column>
          <a-table-column title="类型" :width="130">
            <template #cell="{ record }">
              <span class="ph-kind" :class="`k-${record.kind}`">{{ kindLabel(record.kind) }}</span>
              <div v-if="record.fields?.length" class="muted tiny mono ph-fields">{{ record.fields.join(', ') }}</div>
            </template>
          </a-table-column>
          <a-table-column title="变量类型" :width="160">
            <template #cell="{ record }">
              <span v-if="record.kind === 'tag' || record.kind === 'system'" class="muted">运行时取当前用户</span>
              <a-select v-else v-model="record.varType" size="small">
                <a-option v-for="t in VAR_TYPES" :key="t.value" :value="t.value">{{ t.label }}</a-option>
              </a-select>
            </template>
          </a-table-column>
          <a-table-column title="查询默认值">
            <template #cell="{ record }">
              <span v-if="record.kind === 'tag' || record.kind === 'system'" class="muted">无需默认值</span>
              <div v-else class="ph-default">
                <a-select v-model="record.scope" size="small" :style="{ width: '104px' }" :disabled="record.kind === 'accel'">
                  <a-option v-for="s in DEFAULT_SCOPES" :key="s.value" :value="s.value">{{ s.label }}</a-option>
                </a-select>
                <a-input
                  v-model="record.defaultValue"
                  size="small"
                  :max-length="150"
                  allow-clear
                  :placeholder="record.kind === 'expr' || record.kind === 'accel' || record.kind === 'condition'
                    ? `完整表达式，如 ${(record.fields || [])[0] || 'field'} >= '2026-01-01'`
                    : record.range ? '起始~结束' : (VAR_TYPES.find((t) => t.value === record.varType)?.hint || '')"
                />
              </div>
            </template>
          </a-table-column>
          <a-table-column title="引用" :width="110">
            <template #cell="{ record }">
              <a-tag v-if="record.used" size="small" color="arcoblue">SQL 中 {{ record.count }} 处</a-tag>
              <a-tag v-else size="small" color="orangered">未引用</a-tag>
              <div v-if="record.inSelect" class="muted tiny">用在 SELECT</div>
              <div v-if="record.range" class="muted tiny">区间 .get(0/1)</div>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="110">
            <template #cell="{ record }">
              <a-space :size="2">
                <a-button type="text" size="mini" @click="insertFromDraft(record)">插入</a-button>
                <a-button type="text" size="mini" status="danger" @click="removeDraftPlaceholder(record)">
                  <template #icon><icon-delete /></template>
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <div v-if="phDraftCheck.errors.length || phDraftCheck.warnings.length" class="ph-check">
        <div v-for="e in phDraftCheck.errors" :key="e" class="ph-err"><icon-close-circle /> {{ e }}</div>
        <div v-for="w in phDraftCheck.warnings" :key="w" class="ph-warn"><icon-exclamation-circle /> {{ w }}</div>
      </div>
      <div class="muted tiny" style="margin-top:10px">
        默认值生效范围：「仅数据集」只在数据集编辑页运行时生效；「全局生效」在发布的 MCP 工具等下游也生效，工具调用方不传值时使用。加速占位符固定为仅数据集。
      </div>
    </a-drawer>

    <a-modal
      v-model:visible="filterOpen"
      :width="800"
      :footer="false"
      :closable="false"
      unmount-on-close
      modal-class="flt-dialog"
      :body-style="{ padding: 0 }"
    >
      <div class="flt-sheet">
        <div class="flt-head">
          <span class="flt-title">数据集过滤条件设置</span>
          <button type="button" class="flt-help" @click="filterHelpOpen = true">查看帮助 <icon-right /></button>
          <button type="button" class="flt-x" title="关闭" @click="filterOpen = false"><icon-close /></button>
        </div>
        <div class="flt-banner">数据集过滤条件将在整个数据集范围生效，即：所有逻辑表都将受到过滤的影响。</div>
        <div class="flt-body">
          <aside class="flt-side">
            <div class="flt-side-hd">
              <span>过滤字段项</span>
              <button type="button" class="flt-add" title="添加过滤字段" @click="addFilterField"><icon-plus /></button>
            </div>
            <button
              v-for="item in datasetFilters"
              :key="item.id"
              type="button"
              class="flt-chip"
              :class="{ on: activeFilterId === item.id }"
              @click="activeFilterId = item.id"
            >
              <span class="flt-ico" :class="fieldKind(fieldByFilterId(item.fieldId))">
                <icon-calendar v-if="fieldKind(fieldByFilterId(item.fieldId)) === 'date'" :size="12" />
                <span v-else-if="fieldKind(fieldByFilterId(item.fieldId)) === 'num'">#</span>
                <span v-else>fx</span>
              </span>
              <a-select
                :model-value="item.fieldId"
                size="mini"
                :bordered="false"
                :style="{ width: '132px' }"
                @click.stop
                @change="(v) => changeFilterField(item, v)"
              >
                <a-option v-for="f in filterableFields" :key="f.id" :value="f.id">{{ f.fieldName }}</a-option>
              </a-select>
              <span class="flt-chip-del" title="移除" @click.stop="removeFilterField(item.id)"><icon-close /></span>
            </button>
            <div v-if="!datasetFilters.length" class="flt-empty">点击右上角 + 添加过滤字段</div>
          </aside>
          <section v-if="activeFilter" class="flt-main">
            <template v-if="activeFilterIsDate">
              <div class="flt-row">
                <span class="flt-label">过滤方式</span>
                <div class="flt-opts">
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.dateMode === 'single' }" @click="activeFilter.dateMode = 'single'">
                    <i /><span>单日</span>
                  </button>
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.dateMode === 'range' }" @click="activeFilter.dateMode = 'range'">
                    <i /><span>日区间</span>
                  </button>
                </div>
              </div>
              <div v-if="activeFilter.dateMode === 'range'" class="flt-row">
                <span class="flt-label">区间类型</span>
                <div class="flt-opts">
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.rangeType === 'start' }" @click="activeFilter.rangeType = 'start'">
                    <i /><span>开始于</span>
                  </button>
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.rangeType === 'end' }" @click="activeFilter.rangeType = 'end'">
                    <i /><span>结束于</span>
                  </button>
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.rangeType === 'between' }" @click="activeFilter.rangeType = 'between'">
                    <i /><span>时间区间</span>
                  </button>
                </div>
              </div>
              <div class="flt-row flt-row-top">
                <span class="flt-label">过滤条件</span>
                <div class="flt-date-pair" :class="{ one: !(showDateStart && showDateEnd) }">
                  <div v-if="showDateStart" class="flt-date-col">
                    <div v-if="activeFilter.dateMode === 'range'" class="flt-date-k">开始于</div>
                    <a-date-picker
                      v-model="activeFilter.startDate"
                      value-format="YYYY-MM-DD"
                      placeholder="请选择日期"
                      style="width: 100%"
                      @change="pickDate('start')"
                    />
                    <a-select v-model="activeFilter.startKind" size="small">
                      <a-option value="relative">相对时间</a-option>
                      <a-option value="absolute">具体时间</a-option>
                    </a-select>
                    <div class="flt-rel">
                      <a-select v-model="activeFilter.startAnchor" size="small" :disabled="activeFilter.startKind !== 'relative'" :style="{ width: '58px' }">
                        <a-option v-for="a in DATE_ANCHORS" :key="a.value" :value="a.value">{{ a.label }}</a-option>
                      </a-select>
                      <a-select v-model="activeFilter.startSign" size="small" :disabled="activeFilter.startKind !== 'relative'" :style="{ width: '52px' }">
                        <a-option value="-">-</a-option>
                        <a-option value="+">+</a-option>
                      </a-select>
                      <a-input v-model="activeFilter.startOffset" size="small" :disabled="activeFilter.startKind !== 'relative'" placeholder="" />
                    </div>
                  </div>
                  <div v-if="showDateEnd" class="flt-date-col">
                    <div class="flt-date-k">结束于</div>
                    <a-date-picker
                      v-model="activeFilter.endDate"
                      value-format="YYYY-MM-DD"
                      placeholder="请选择日期"
                      style="width: 100%"
                      @change="pickDate('end')"
                    />
                    <a-select v-model="activeFilter.endKind" size="small">
                      <a-option value="relative">相对时间</a-option>
                      <a-option value="absolute">具体时间</a-option>
                    </a-select>
                    <div class="flt-rel">
                      <a-select v-model="activeFilter.endAnchor" size="small" :disabled="activeFilter.endKind !== 'relative'" :style="{ width: '58px' }">
                        <a-option v-for="a in DATE_ANCHORS" :key="a.value" :value="a.value">{{ a.label }}</a-option>
                      </a-select>
                      <a-select v-model="activeFilter.endSign" size="small" :disabled="activeFilter.endKind !== 'relative'" :style="{ width: '52px' }">
                        <a-option value="-">-</a-option>
                        <a-option value="+">+</a-option>
                      </a-select>
                      <a-input v-model="activeFilter.endOffset" size="small" :disabled="activeFilter.endKind !== 'relative'" placeholder="" />
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="flt-row">
                <span class="flt-label">过滤方式</span>
                <div class="flt-opts">
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.mode === 'condition' }" @click="activeFilter.mode = 'condition'">
                    <i /><span>按条件过滤</span>
                  </button>
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.mode === 'enum' }" @click="activeFilter.mode = 'enum'">
                    <i /><span>按枚举过滤</span>
                  </button>
                </div>
              </div>
              <div v-if="activeFilter.mode === 'enum'" class="flt-row">
                <span class="flt-label">查询方式</span>
                <div class="flt-opts">
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.query === 'single' }" @click="activeFilter.query = 'single'">
                    <i /><span>单选</span>
                  </button>
                  <button type="button" class="flt-radio" :class="{ on: activeFilter.query === 'multi' }" @click="activeFilter.query = 'multi'">
                    <i /><span>多选</span>
                  </button>
                </div>
              </div>
              <div v-if="activeFilter.mode === 'enum'" class="flt-row">
                <span class="flt-label">过滤条件</span>
                <a-select v-model="activeFilter.conditionField" allow-clear placeholder="请选择字段" :style="{ width: '280px' }">
                  <a-option v-for="f in filterableFields" :key="f.id" :value="f.physicalName || f.fieldName">{{ f.fieldName }}</a-option>
                </a-select>
              </div>
              <div v-else class="flt-row">
                <span class="flt-label">过滤条件</span>
                <a-select v-model="activeFilter.op" :style="{ width: '104px' }">
                  <a-option v-for="o in FILTER_OPS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
                </a-select>
                <a-input v-if="activeFilter.op !== 'empty'" v-model="activeFilter.value" placeholder="条件值" :style="{ width: '168px' }" />
              </div>
            </template>
          </section>
          <section v-else class="flt-main flt-main-empty">请在左侧添加过滤字段</section>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:visible="filterHelpOpen" title="数据集过滤条件" :width="480" unmount-on-close :footer="false">
      <ul class="sql-help">
        <li>过滤条件在整个数据集上生效，使用该数据集的所有查询都会套用这些规则。</li>
        <li><b>日期字段</b>：可按单日或日区间过滤，支持具体日期和相对时间（T 当天、M 当月、Y 当年）。</li>
        <li><b>按条件过滤</b>：在数据集上固定条件，例如地区等于某值。</li>
        <li><b>按枚举过滤</b>：查询时由使用者从字段枚举值中单选或多选。</li>
        <li>左侧可添加多个过滤字段，右侧配置当前字段的过滤方式。</li>
      </ul>
      <div style="text-align:right; margin-top: 16px">
        <a-button type="primary" @click="filterHelpOpen = false">知道了</a-button>
      </div>
    </a-modal>

  </div>
</template>

<style scoped>
.create-page {
  --accent: 86, 82, 255;
  --accent-soft: 232, 232, 255;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #fff;
  color: #1a1c1c;
}
.create-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 20px;
  border-bottom: 1px solid #d9e0e8;
  flex-shrink: 0;
  background: #fff;
}
.sql-head {
  height: 60px;
  padding: 0 16px 5px 15px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', helvetica, arial, sans-serif;
}
.sql-file-ico {
  display: inline-flex;
  color: rgb(46, 116, 255);
  margin-right: 10px;
  line-height: 0;
}
.sql-file-ico :deep(svg) { display: block; overflow: hidden; }
.sql-name-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 299px;
  max-width: 299px;
}
.sql-name {
  box-sizing: border-box;
  width: 100%;
  height: 28px;
  padding: 2.5px 55px 2.5px 9px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  font-size: 14px;
  line-height: 21px;
  color: rgba(0, 0, 0, 0.65);
}
.sql-name:focus { border-color: rgb(46, 116, 255); }
.sql-count {
  position: absolute;
  right: 7px;
  bottom: 3px;
  height: 22px;
  padding: 0 5px;
  line-height: 22px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  background: #fff;
}
.sql-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.sql-text-btn,
.sql-outline-btn,
.sql-primary-btn,
.sql-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}
.sql-text-btn {
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
}
.sql-text-btn:hover { background: rgba(0, 0, 0, 0.04); }
.sql-outline-btn {
  padding: 0 12px;
  border: 1px solid rgb(46, 116, 255);
  background: #fff;
  color: rgb(46, 116, 255);
}
.sql-outline-btn:hover { background: rgba(46, 116, 255, 0.06); }
.sql-primary-btn {
  padding: 0 14px;
  border: 1px solid rgb(46, 116, 255);
  background: rgb(46, 116, 255);
  color: #fff;
}
.sql-primary-btn:hover { filter: brightness(1.05); }
.sql-confirm { width: 90px; padding: 0; }
.sql-split {
  width: 1px;
  height: 24px;
  margin: 0 4px;
  background: rgba(0, 0, 0, 0.06);
}
.sql-close {
  width: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
}
.sql-close:hover { background: rgba(0, 0, 0, 0.04); }
.sql-text-btn :deep(svg),
.sql-outline-btn :deep(svg),
.sql-primary-btn :deep(svg),
.sql-close :deep(svg) { display: block; overflow: hidden; }
.sql-help { margin: 0; padding-left: 18px; color: rgba(0, 0, 0, 0.65); line-height: 1.8; }
.create-head-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sql-head .create-head-left { gap: 0; }
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #555f6d;
  cursor: pointer;
}
.icon-btn:hover { background: #eef2f7; color: #1a1c1c; }
.create-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgb(var(--accent));
  color: #fff;
  font-size: 16px;
}
.create-mark.sql { background: #d25f00; }
.name-box {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 460px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #f5f7fb;
  color: #555f6d;
}
.name-box:hover { border-color: #d9e0e8; }
.name-box:focus-within { border-color: rgb(var(--accent)); background: #fff; color: rgb(var(--accent)); }
.create-name {
  min-width: 0;
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 18px;
  font-weight: 600;
  color: #1a1c1c;
}
.head-actions { display: flex; align-items: center; gap: 10px; }
.ghost-btn, .primary-btn, .dash-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.ghost-btn { border: 1px solid #d9e0e8; background: #fff; color: #555f6d; }
.ghost-btn:hover { background: #eef2f7; }
.ghost-btn.sm { height: 32px; padding: 0 12px; font-size: 13px; }
.ghost-btn.danger { width: 100%; margin: 14px 0 8px; }
.ghost-btn.danger:hover { border-color: #ffdad6; background: #ffdad6; color: #93000a; }
.primary-btn {
  border: none;
  background: rgb(var(--accent));
  color: #fff;
  font-weight: 600;
}
.primary-btn:hover { filter: brightness(1.05); }
.primary-btn:disabled { background: var(--accent-soft); color: rgba(86, 82, 255, .45); cursor: not-allowed; }
.primary-btn.lg { height: 42px; padding: 0 28px; font-size: 15px; }
.create-body, .sql-body { display: grid; grid-template-columns: 320px minmax(0, 1fr); min-height: 0; flex: 1; }
.create-side {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #d9e0e8;
  background: #fff;
}
.side-bar {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #d9e0e8;
  font-size: 16px;
  font-weight: 600;
}
.side-pad { display: flex; flex-direction: column; min-height: 0; flex: 1; padding: 16px; overflow: auto; }
.side-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.side-title { margin: 0; font-size: 16px; font-weight: 600; }
.side-label { font-size: 13px; color: #667085; margin-bottom: 6px; }
.source-pick {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  margin-bottom: 16px;
  padding: 0 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: rgb(var(--accent));
}
.source-pick :deep(.arco-select) { flex: 1; }
.source-pick :deep(.arco-select-view) { background: transparent; padding: 0; }
.side-tabs { display: flex; gap: 20px; margin-bottom: 12px; }
.side-tabs button {
  position: relative;
  height: 32px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: #555f6d;
  font-size: 14px;
}
.side-tabs button.on { color: #1a1c1c; font-weight: 600; }
.side-tabs button.on::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgb(var(--accent));
}
.pill-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  margin-bottom: 12px;
  padding: 0 12px;
  border: 1px solid #d9e0e8;
  border-radius: 999px;
  color: #555f6d;
}
.pill-search.sm { width: 220px; margin: 0; background: #fff; }
.pill-search:focus-within { border-color: rgb(var(--accent)); }
.pill-search input { min-width: 0; flex: 1; border: none; outline: none; background: transparent; font-size: 13px; }
.dash-btn {
  width: 100%;
  margin-bottom: 12px;
  border: 1px dashed rgba(86, 82, 255, .55);
  background: #fff;
  color: rgb(var(--accent));
  font-weight: 500;
}
.dash-btn:hover { background: var(--accent-soft); }
.table-list { display: flex; flex-direction: column; gap: 2px; }
.table-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 0 8px;
  cursor: pointer;
  text-align: left;
  color: #555f6d;
  font-size: 14px;
}
.table-item:hover, .table-item.on { background: #eef2f7; color: #1a1c1c; }
.table-item .arco-icon { color: #555f6d; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint { padding: 24px 0; text-align: center; }
.min0 { min-width: 0; flex: 1; }
.sub { margin-top: 2px; font-size: 12px; color: #667085; }
.create-canvas {
  position: relative;
  background: #f3f6fb;
  background-image: radial-gradient(#c8d2e4 1px, transparent 1px);
  background-size: 24px 24px;
  overflow: auto;
  padding: 32px;
}
.create-canvas.dim { padding-bottom: 320px; }
.canvas-empty { text-align: center; margin-top: 12vh; color: #555f6d; }
.empty-ico { font-size: 64px; color: rgb(var(--accent)); opacity: .28; margin-bottom: 12px; }
.chip-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border: 1px solid #d9e0e8;
  background: #fff;
  border-radius: 8px;
  padding: 0 12px;
  cursor: pointer;
  color: #555f6d;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
}
.chip:hover { border-color: rgb(var(--accent)); color: rgb(var(--accent)); }
.canvas-graph-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.canvas-graph-wrap.lifted { padding-top: 24px; }
.canvas-graph { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; }
.table-card {
  min-width: 260px;
  background: #fff;
  border: 1px solid #d9e0e8;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
}
.table-card.on { border-color: rgb(var(--accent)); }
.table-card-hd { display: flex; align-items: flex-start; gap: 10px; }
.card-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: rgb(var(--accent));
  font-size: 18px;
}
.rm {
  opacity: 0;
  border: none;
  background: transparent;
  color: #555f6d;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}
.table-card:hover .rm { opacity: 1; }
.rm:hover { background: #ffdad6; color: #93000a; }
.card-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
.card-chips span {
  padding: 4px 8px;
  border-radius: 6px;
  background: #f5f7fb;
  font-size: 12px;
  color: #555f6d;
}
.canvas-hint { margin: 0; font-size: 13px; color: #667085; text-align: center; }
.join-link {
  display: flex;
  align-items: center;
  border: none;
  background: none;
  padding: 0 4px;
  cursor: pointer;
  min-width: 132px;
  color: rgb(var(--accent));
}
.join-line { flex: 1; height: 2px; background: #c8d2e4; min-width: 16px; }
.join-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgb(var(--accent));
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .06);
}
.join-link.warn .join-node { border-color: #f77234; color: #d25f00; }
.join-venn { width: 22px; height: 14px; position: relative; display: inline-block; }
.join-venn::before,
.join-venn::after {
  content: '';
  position: absolute;
  top: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  box-sizing: border-box;
}
.join-venn::before { left: 0; }
.join-venn::after { right: 0; }
.join-venn.inner::before,
.join-venn.inner::after { background: color-mix(in srgb, currentColor 35%, transparent); }
.join-venn.left::before { background: currentColor; }
.join-venn.right::after { background: currentColor; }
.join-venn.full::before,
.join-venn.full::after { background: currentColor; }
.join-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 720px;
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #d9e0e8;
  border-radius: 10px;
  background: #fff;
  color: #1a1c1c;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}
.join-summary:hover { border-color: rgb(var(--accent)); }
.join-sql {
  width: min(720px, 100%);
  margin: 0;
  padding: 12px;
  background: #fff;
  border: 1px solid #d9e0e8;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  text-align: left;
  color: #555f6d;
}
.join-sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  z-index: 9;
  height: 300px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: #fff;
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}
.join-sheet-body {
  position: relative;
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.2fr);
  min-height: 0;
  flex: 1;
}
.sheet-handle { position: relative; }
.join-sheet-close {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.join-sheet-close:hover { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.85); }
.join-kind-pane,
.join-field-pane {
  min-width: 0;
  min-height: 0;
  padding: 4px 20px 16px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.join-field-pane { border-left: 1px solid rgba(0, 0, 0, 0.06); padding-right: 16px; }
.join-pane-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}
.jk-cards {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.jk-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 88px;
  height: 72px;
  padding: 8px 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background: #fff;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  font-size: 12px;
  line-height: 18px;
}
.jk-card.on {
  border-color: rgb(46, 116, 255);
  color: rgb(46, 116, 255);
  background: rgba(46, 116, 255, 0.04);
}
.jk-switch {
  position: relative;
  width: 32px;
  height: 16px;
  border-radius: 999px;
  background: #c9cdd4;
  flex-shrink: 0;
}
.jk-switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
}
.jk-switch.on { background: rgb(46, 116, 255); }
.jk-switch.on i { left: 18px; }
.jf-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 0;
  flex: 1;
  align-items: stretch;
}
.jf-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.jf-col-hd {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  height: 20px;
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}
.jf-col-hd .ellipsis { flex: 1; min-width: 0; }
.jf-tag {
  flex-shrink: 0;
  padding: 0 6px;
  height: 20px;
  line-height: 20px;
  border-radius: 2px;
  background: rgba(46, 116, 255, 0.1);
  color: rgb(46, 116, 255);
  font-size: 12px;
}
.jf-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px;
  margin-bottom: 8px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  background: #fff;
  color: rgba(0, 0, 0, 0.45);
}
.jf-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
}
.jf-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.jf-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 4px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
}
.jf-row:hover { background: rgba(0, 0, 0, 0.04); }
.jf-mark {
  width: 3px;
  height: 12px;
  border-radius: 1px;
  background: rgb(46, 116, 255);
  flex-shrink: 0;
}
.join-cond-hd { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.join-cond { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.join-kind-pane > .ghost-btn { align-self: flex-start; }
.text-danger { border: none; background: none; color: #f53f3f; cursor: pointer; }
.field-sheet {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  z-index: 8;
  height: 420px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255,255,255,.6);
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  background: rgba(255,255,255,.92);
  box-shadow: 0 -18px 48px rgba(15, 23, 42, .16);
  overflow: hidden;
}
.sheet-handle { height: 28px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #eef2f7; }
.sheet-handle span { width: 28px; height: 4px; border-radius: 99px; background: #c8d2e4; }
.sheet-body { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 0; flex: 1; }
.sheet-side { padding: 20px; border-right: 1px solid #eef2f7; overflow: auto; }
.sheet-kicker { margin-bottom: 16px; font-size: 16px; font-weight: 600; }
.sheet-main { display: flex; flex-direction: column; min-width: 0; padding: 16px 16px 8px; }
.picked { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eef2f7; }
.picked-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 0 8px;
  cursor: pointer;
  color: #555f6d;
}
.picked-item.on { background: var(--accent-soft); color: rgb(var(--accent)); }
.field-hd { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
.field-hd-right { display: flex; align-items: center; gap: 8px; }
.field-list { min-height: 0; flex: 1; overflow: auto; }
.field-row {
  display: grid;
  grid-template-columns: 28px minmax(160px, 1fr) 90px minmax(140px, 1fr);
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid #eef2f7;
}
.field-row.head { font-size: 12px; font-weight: 600; color: #667085; border-bottom-color: #d9e0e8; }
.create-foot {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #d9e0e8;
  flex-shrink: 0;
  background: #fff;
}
.sql-main { display: grid; grid-template-rows: 1fr 1fr; min-width: 0; }
.sql-editor { width: 100%; height: 100%; min-height: 0; }
.sql-result { border-top: 1px solid #d9e0e8; display: flex; flex-direction: column; min-height: 0; background: #fff; }
.sql-pad { padding: 12px 16px; overflow: auto; flex: 1; }
.hist-row { display: grid; grid-template-columns: 110px 70px 1fr; gap: 8px; padding: 8px 0; border-bottom: 1px solid #d9e0e8; font-size: 13px; }
.ok { color: #00b42a; }
.bad { color: #f53f3f; }
.ds-title { font-weight: 600; }
.flt-sheet {
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: rgba(0, 0, 0, 0.85);
}
.flt-head {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.flt-title { font-size: 14px; font-weight: 600; }
.flt-help {
  margin-left: 12px;
  border: none;
  background: none;
  color: rgb(46, 116, 255);
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.flt-help:hover { opacity: 0.85; }
.flt-x {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.flt-x:hover { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.85); }
.flt-banner {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 8px 16px;
  background: #e8f3ff;
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
  line-height: 18px;
}
.flt-body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  min-height: 320px;
}
.flt-side {
  padding: 12px;
  background: #f7f8fa;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}
.flt-side-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}
.flt-add {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: rgb(46, 116, 255);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.flt-add:hover { background: rgba(46, 116, 255, 0.08); }
.flt-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 32px;
  margin-bottom: 8px;
  padding: 0 4px 0 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}
.flt-chip.on { border-color: rgb(46, 116, 255); }
.flt-chip-del {
  display: none;
  color: rgba(0, 0, 0, 0.35);
  line-height: 0;
}
.flt-chip:hover .flt-chip-del { display: inline-flex; }
.flt-ico {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: rgb(46, 116, 255);
  line-height: 1;
}
.flt-ico.date { color: rgb(46, 116, 255); }
.flt-ico.num { color: #00b42a; }
.flt-ico.str { color: #165dff; font-size: 11px; font-style: italic; }
.flt-empty, .flt-main-empty {
  color: rgba(0, 0, 0, 0.35);
  font-size: 12px;
  padding: 16px 0;
  text-align: center;
}
.flt-main { padding: 20px 24px; }
.flt-main-empty { display: flex; align-items: flex-start; }
.flt-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 32px;
  margin-bottom: 18px;
}
.flt-row-top { align-items: flex-start; }
.flt-date-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  min-width: 0;
}
.flt-date-pair.one { grid-template-columns: minmax(220px, 1fr); }
.flt-date-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.flt-date-k { font-size: 12px; color: rgba(0, 0, 0, 0.65); }
.flt-rel { display: flex; align-items: center; gap: 8px; }
.flt-label {
  width: 72px;
  flex-shrink: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}
.flt-opts { display: flex; align-items: center; gap: 24px; }
.flt-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
}
.flt-radio i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #c9cdd4;
  position: relative;
  box-sizing: border-box;
}
.flt-radio.on i { border-color: rgb(46, 116, 255); }
.flt-radio.on i::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: rgb(46, 116, 255);
}
.flt-chip :deep(.arco-select-view) { padding: 0; background: transparent; }
.flt-chip :deep(.arco-select-view-value) { font-size: 12px; }
.ph-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgb(46, 116, 255);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}
.ph-count.bad { background: #f53f3f; }
.result-tabs { align-items: center; }
.tab-gap { flex: 1; }
.preview-as { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #555f6d; }
.exec-note {
  font-size: 12px;
  color: #d25f00;
  background: #fff7e8;
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 6px;
}
.exec-sql {
  margin: 0;
  padding: 12px;
  background: #f7f8fa;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}
.ph-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.ph-bar .hint { font-size: 12px; color: #86909c; }
.ph-syntax {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
  display: grid;
  gap: 6px;
  font-size: 12px;
}
.ph-syn-row { display: grid; grid-template-columns: 96px 260px 1fr; gap: 10px; align-items: center; }
.ph-syn-row .mono { color: #1d2129; }
.ph-syn-row .muted { color: #86909c; }
.ph-kind {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  background: #e8f3ff;
  color: #165dff;
  white-space: nowrap;
}
.ph-kind.k-expr { background: #f5e8ff; color: #722ed1; }
.ph-kind.k-condition { background: #e8fffb; color: #0fc6c2; }
.ph-kind.k-accel { background: #fff3e8; color: #f77234; }
.ph-kind.k-tag { background: #e8ffea; color: #00b42a; }
.ph-kind.k-system { background: #f2f3f5; color: #4e5969; }
.ph-fields { margin-top: 2px; }
.ph-default { display: flex; gap: 6px; align-items: center; }
.ph-default :deep(.arco-input-wrapper) { flex: 1; }
.ph-check { margin-top: 10px; display: grid; gap: 4px; font-size: 12px; }
.ph-err { color: #f53f3f; }
.ph-warn { color: #d25f00; }
.tiny { font-size: 12px; }
.ph-title-count { margin-left: 8px; font-size: 12px; font-weight: 400; color: #86909c; }
.ph-new {
  border: 1px solid #bedaff;
  background: #f5f9ff;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 12px;
}
.ph-new-hd { font-weight: 600; font-size: 13px; margin-bottom: 10px; display: flex; gap: 10px; align-items: baseline; }
.ph-new-hd .muted { font-weight: 400; color: #86909c; }
.ph-new-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 12px; }
.ph-new-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #4e5969; }
.ph-new-grid .span2 { grid-column: span 2; }
.ph-new-ft { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
</style>
