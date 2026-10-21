<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, isDbKind, previewSql, createModeledDataset, createSqlDataset, updateModeledDataset, updateSqlDataset, compileModelSql } from '../store'
import {
  PH_KINDS, VAR_TYPES, SYSTEM_VARS, USER_TAGS, DEFAULT_SCOPES,
  kindLabel, phKey, mergePlaceholders, newManualPlaceholder, placeholderToken,
  renamePlaceholderInSql, removePlaceholderFromSql, validatePlaceholders, renderSql,
} from '../placeholders'
import { formatSql as formatSqlText } from '../sqlFormat'
import { checkSqlSpec, parseOutputColumns, suggestColumnDef, tableAliases } from '../sqlSpec'
import { generateSql } from '../sqlGen'
import SqlEditor from '../components/SqlEditor.vue'
import DbTypeIcon from '../components/DbTypeIcon.vue'
import MysqlFlag from '../components/MysqlFlag.vue'
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
const sourceId = ref(
  (store.datasetFlt.sourceId && store.sources.some((s) => s.id === store.datasetFlt.sourceId && isDbKind(s.kind))
    ? store.datasetFlt.sourceId
    : '') || store.sources.find((s) => isDbKind(s.kind))?.id || '',
)
const tableQuery = ref('')
const tableSearchOpen = ref(false)
const tableSearchRef = ref(null)
const tablesLoading = ref(false)
const sideCollapsed = ref(false)
let tableLoadTimer = 0
const selectedIds = ref([])
const activeTableId = ref('')
const fieldConfigs = ref([])
const sqlText = ref('')
const sqlResult = ref(null)
const sqlMessage = ref('')
const sqlTab = ref('result')
const sqlColumnDefs = ref([])
const specResult = ref({ errors: [], warnings: [], columns: [] })
const specAlert = ref(false)
const fieldCfgFilter = ref('all')
const sqlHistory = ref([])
const joins = ref([])
const joinOpen = ref(false)
const joinAdvOpen = ref(false)
const joinIndex = ref(0)
const canvasZoom = ref(100)
const fieldQuery = ref('')
const leftFieldKw = ref('')
const rightFieldKw = ref('')
const sqlExpanded = ref(false)
const helpOpen = ref(false)
const phOpen = ref(false)
const aiSqlOpen = ref(false)
const aiSqlPrompt = ref('')
const aiSqlPreview = ref('')
const aiSqlError = ref('')
const placeholders = ref([])
const phDraft = ref([])
const phNewOpen = ref(false)
const phSyntaxOpen = ref(false)
const phForm = reactive({ kind: 'val', name: '', fields: [], varType: 'text', scope: 'global', defaultValue: '' })
const previewUserId = ref(store.users.find((u) => u.status === '正常')?.id || '')
const execSql = ref('')
const execNotes = ref([])
const sqlEditorEl = ref(null)
const sqlMainEl = ref(null)
const sqlResultH = ref(320)
const splitDrag = ref(false)
let stopSplit = null
const filterOpen = ref(false)
const filterHelpOpen = ref(false)
const datasetFilters = ref([])
const activeFilterId = ref('')
const CARDINALITY_OPTS = [
  { value: '1', label: '1' },
  { value: 'N', label: 'N' },
]
const MATCH_OPTS = [
  { value: 'partial', label: '部分匹配' },
  { value: 'full', label: '全部匹配' },
]
const joinDraft = reactive({
  type: 'left',
  leftCard: 'N',
  rightCard: 'N',
  leftMatch: 'partial',
  rightMatch: 'partial',
  conditions: [{ leftField: '', rightField: '', op: '=' }],
})

function joinTypeFromMatch(leftMatch, rightMatch) {
  if (leftMatch === 'full' && rightMatch === 'full') return 'inner'
  if (leftMatch === 'partial' && rightMatch === 'full') return 'left'
  if (leftMatch === 'full' && rightMatch === 'partial') return 'right'
  return 'full'
}
function matchFromJoinType(type) {
  if (type === 'inner') return { leftMatch: 'full', rightMatch: 'full' }
  if (type === 'left') return { leftMatch: 'partial', rightMatch: 'full' }
  if (type === 'right') return { leftMatch: 'full', rightMatch: 'partial' }
  return { leftMatch: 'partial', rightMatch: 'partial' }
}

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
  sqlColumnDefs.value = []
  specResult.value = { errors: [], warnings: [], columns: [] }
  specAlert.value = false
  fieldCfgFilter.value = 'all'
  joins.value = []
  joinOpen.value = false
  fieldQuery.value = ''
  leftFieldKw.value = ''
  rightFieldKw.value = ''
  sqlExpanded.value = false
  helpOpen.value = false
  phOpen.value = false
  aiSqlOpen.value = false
  placeholders.value = []
  phNewOpen.value = false
  execSql.value = ''
  execNotes.value = []
  filterOpen.value = false
  filterHelpOpen.value = false
  datasetFilters.value = []
  activeFilterId.value = ''
}

function sqlTextOfDataset(d) {
  if (d.sql || d.extra?.sql) return d.sql || d.extra.sql
  if (d.extra?.model) {
    const tables = (d.extra.tableIds || [])
      .map((id) => store.datasets.find((t) => t.id === id))
      .filter(Boolean)
    const compiled = compileModelSql({
      tables,
      fields: d.extra.fields || [],
      joins: d.extra.joins || [],
      filters: d.extra.filters || [],
    })
    if (compiled) return compiled
  }
  const cols = (d.columns || []).map((c) => c.column_name).filter(Boolean)
  const table = d.table_name || d.display_name || ''
  if (!table) return ''
  return `SELECT ${cols.length ? cols.join(', ') : '*'}\nFROM ${table}`
}
function columnDefOf(c) {
  return {
    column_name: c.column_name,
    data_type: c.data_type || 'varchar',
    cn: c.semantic_hint || c.cn || '',
    description: c.description || '',
  }
}
function syncColumnDefs(names) {
  const prev = new Map(sqlColumnDefs.value.map((c) => [c.column_name, c]))
  sqlColumnDefs.value = names.map((name) => prev.get(name) || {
    column_name: name,
    data_type: 'varchar',
    cn: '',
    description: '',
  })
}
function loadAsSql(d) {
  enteredAsSql.value = true
  step.value = 'sql'
  const sql = sqlTextOfDataset(d)
  placeholders.value = mergePlaceholders(sql, d.extra?.placeholders || [])
  sqlText.value = sql
  sqlColumnDefs.value = (d.columns || []).filter((c) => c.column_name).map(columnDefOf)
  sqlResult.value = null
  sqlMessage.value = ''
  specResult.value = { errors: [], warnings: [], columns: [] }
  specAlert.value = false
  if (sql.trim()) nextTick(() => runSql())
}
function loadEdit() {
  const d = store.datasets.find((x) => x.id === store.editDatasetId)
  if (!d) return false
  name.value = d.display_name || d.table_name || ''
  sourceId.value = d.data_source_id || sourceId.value
  if (props.createMode === 'sql' || d.source_type === 'sql') {
    loadAsSql(d)
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
    step.value = 'canvas'
    return true
  }
  return false
}

watch(() => props.createMode, (mode) => {
  if (store.editDatasetId && loadEdit()) return
  resetBlank(mode)
})

function startSplit(e) {
  if (e.button != null && e.button !== 0) return
  e.preventDefault()
  splitDrag.value = true
  const startY = e.clientY
  const startH = sqlResultH.value
  const move = (ev) => {
    const main = sqlMainEl.value
    const max = main ? main.clientHeight - 140 : 640
    const next = startH - (ev.clientY - startY)
    sqlResultH.value = Math.max(120, Math.min(Math.max(120, max), next))
  }
  const up = () => {
    splitDrag.value = false
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    stopSplit = null
  }
  stopSplit = up
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
onMounted(() => {
  if (store.editDatasetId) loadEdit()
})
onBeforeUnmount(() => {
  if (stopSplit) stopSplit()
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
function typeBadge(col) {
  const k = fieldKind(col)
  if (k === 'date') return 'Dt'
  if (k === 'num') return 'N0'
  return 'Str'
}
function colByName(table, name) {
  return columnsOf(table).find((c) => c.column_name === name)
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
      leftCard: prev?.leftCard || 'N',
      rightCard: prev?.rightCard || 'N',
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
  joinDraft.leftCard = join.leftCard || 'N'
  joinDraft.rightCard = join.rightCard || 'N'
  Object.assign(joinDraft, matchFromJoinType(joinDraft.type))
  joinDraft.conditions = (join.conditions || []).map((c) => ({ ...c }))
  if (!joinDraft.conditions.length) {
    const guess = guessJoinFields(selectedTables.value[index], selectedTables.value[index + 1])
    joinDraft.conditions = [{ ...guess, op: '=' }]
  }
  leftFieldKw.value = ''
  rightFieldKw.value = ''
  joinAdvOpen.value = true
  joinOpen.value = true
}
function addJoinCondition() {
  joinDraft.conditions.push({ leftField: '', rightField: '', op: '=' })
}
function clearJoinConditions() {
  joinDraft.conditions = [{ leftField: '', rightField: '', op: '=' }]
}
function removeJoinCondition(i) {
  if (joinDraft.conditions.length <= 1) {
    clearJoinConditions()
    return
  }
  joinDraft.conditions.splice(i, 1)
}
function syncJoinTypeFromMatch() {
  joinDraft.type = joinTypeFromMatch(joinDraft.leftMatch, joinDraft.rightMatch)
}
function resetJoinAdv() {
  joinDraft.leftCard = 'N'
  joinDraft.rightCard = 'N'
  joinDraft.leftMatch = 'partial'
  joinDraft.rightMatch = 'partial'
  syncJoinTypeFromMatch()
}
function persistJoin() {
  const join = joins.value[joinIndex.value]
  if (!join) return
  syncJoinTypeFromMatch()
  join.type = joinDraft.type
  join.leftCard = joinDraft.leftCard
  join.rightCard = joinDraft.rightCard
  const conds = joinDraft.conditions.filter((c) => c.leftField && c.rightField)
  if (conds.length) join.conditions = conds
  else join.conditions = joinDraft.conditions.map((c) => ({ ...c }))
}
function closeJoin() {
  persistJoin()
  joinOpen.value = false
}
function confirmJoin() {
  persistJoin()
  if (selectedTables.value.length > 1 && !joinReady(joins.value[joinIndex.value])) {
    Message.warning('请选择关联字段')
    return
  }
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

function startTableLoad() {
  tablesLoading.value = true
  clearTimeout(tableLoadTimer)
  tableLoadTimer = setTimeout(() => {
    tablesLoading.value = false
  }, 480)
}
function openTableSearch() {
  tableSearchOpen.value = true
  nextTick(() => tableSearchRef.value?.focus())
}
function closeTableSearch() {
  tableSearchOpen.value = false
  tableQuery.value = ''
}
function refreshTables() {
  startTableLoad()
}
function selectSource(id) {
  sourceId.value = id
  selectedIds.value = []
  activeTableId.value = ''
  fieldConfigs.value = []
  joins.value = []
  fieldQuery.value = ''
  tableQuery.value = ''
  tableSearchOpen.value = false
  sqlExpanded.value = false
  if (!isSql.value) step.value = 'canvas'
  sqlResult.value = null
  sqlMessage.value = ''
  startTableLoad()
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
  step.value = 'fields'
}

function removeTable(id) {
  selectedIds.value = selectedIds.value.filter((x) => x !== id)
  fieldConfigs.value = fieldConfigs.value.filter((f) => f.datasetId !== id)
  if (activeTableId.value === id) activeTableId.value = selectedIds.value[0] || ''
  ensureJoins()
  step.value = 'canvas'
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
  const cols = (table.columns || []).map((c) => c.column_name).filter(Boolean)
  const select = cols.length ? cols.join(', ') : 'column_name'
  const prefix = sqlText.value.trim() ? `${sqlText.value.trim()}\n` : ''
  const limit = sqlDialect.value === 'oracle' ? 'FETCH FIRST 100 ROWS ONLY' : 'LIMIT 100'
  sqlText.value = `${prefix}SELECT ${select}\nFROM ${tableName}\n${limit}`
}

const sqlDialect = computed(() => store.sources.find((s) => s.id === sourceId.value)?.kind === 'oracle' ? 'oracle' : 'mysql')
const currentKind = computed(() => store.sources.find((s) => s.id === sourceId.value)?.kind || 'mysql')
const dialectHint = computed(() => {
  if (currentKind.value === 'tidb') return '当前是 TiDB，语法与 MySQL 相同。限制行数写 LIMIT。'
  return '当前是 MySQL。限制行数写 LIMIT。'
})
const sqlPlaceholder = computed(() => (
  sqlDialect.value === 'oracle'
    ? 'SELECT index_code, data_time FROM table_name FETCH FIRST 100 ROWS ONLY'
    : 'SELECT index_code, data_time FROM table_name LIMIT 100'
))
const sqlSchema = computed(() => {
  const out = {}
  store.datasets.forEach((d) => {
    if (d.data_source_id !== sourceId.value || d.source_type === 'sql' || d.extra?.model) return
    const table = d.table_name || d.display_name
    if (table) out[table] = (d.columns || []).map((c) => c.column_name)
  })
  return out
})

function catalogTables() {
  return store.datasets
    .filter((d) => d.data_source_id === sourceId.value && d.source_type !== 'sql' && !d.extra?.model)
    .map((d) => ({
      name: d.table_name || d.display_name,
      comment: d.description || '',
      kind: d.extra?.source_kind || 'table',
      columns: (d.columns || []).map((c) => ({
        name: c.column_name,
        comment: c.description || '',
        type: c.data_type || '',
      })),
    }))
}
function openAiSql() {
  aiSqlError.value = ''
  aiSqlPreview.value = ''
  aiSqlOpen.value = true
}
function draftAiSql(prompt) {
  if (typeof prompt === 'string') aiSqlPrompt.value = prompt
  const { sql, error } = generateSql(catalogTables(), aiSqlPrompt.value, sqlDialect.value)
  aiSqlPreview.value = sql || ''
  aiSqlError.value = error || ''
}
function applyAiSql() {
  if (!aiSqlPreview.value) draftAiSql()
  if (!aiSqlPreview.value) {
    if (aiSqlError.value) Message.warning(aiSqlError.value)
    return
  }
  sqlText.value = aiSqlPreview.value
  aiSqlOpen.value = false
  Message.success('已写入 SQL，可再改后运行')
}
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

function execSpecErrors(errors) {
  return (errors || []).filter((err) => err !== '还有字段未配置')
}
function specColumns() {
  return sqlColumnDefs.value.map((c) => ({
    column_name: c.column_name,
    data_type: c.data_type,
    semantic_hint: String(c.cn || '').trim(),
    description: String(c.description || '').trim(),
    cn: String(c.cn || '').trim(),
  }))
}
function lookupColumnHint(physical, tableName, tableNames) {
  const pool = store.datasets.filter((d) => d.data_source_id === sourceId.value && d.source_type !== 'sql' && !d.extra?.model)
  const preferred = tableName
    ? pool.filter((d) => d.table_name === tableName || d.display_name === tableName)
    : []
  const ranked = [
    ...preferred,
    ...pool.filter((d) => tableNames.includes(d.table_name) || tableNames.includes(d.display_name)),
    ...pool,
  ]
  for (const table of ranked) {
    const col = (table.columns || []).find((c) => c.column_name === physical)
    if (col && (col.description || col.data_type)) {
      return { ...col, table: table.table_name || table.display_name, physical }
    }
  }
  return tableName ? { table: tableName, physical } : null
}
function fillAiDefs() {
  const parsed = parseOutputColumns(sqlText.value)
  if (!parsed.columns?.length) {
    Message.warning(parsed.error || '请先写出明确的输出列，再补齐中文名和说明')
    specResult.value = checkSqlSpec({ sql: sqlText.value, placeholders: placeholders.value, columns: specColumns(), dialect: sqlDialect.value })
    specAlert.value = execSpecErrors(specResult.value.errors).length > 0
    sqlTab.value = specAlert.value ? 'spec' : 'fields'
    return
  }
  syncColumnDefs(parsed.columns)
  const { tables, aliases } = tableAliases(sqlText.value)
  const joined = tables.length > 1
  let n = 0
  sqlColumnDefs.value.forEach((col, i) => {
    const field = parsed.fields?.[i] || { physical: col.column_name, qualifier: '' }
    const sourceTable = aliases[field.qualifier] || (tables.length === 1 ? tables[0] : '')
    const hint = lookupColumnHint(field.physical || col.column_name, sourceTable, tables) || {}
    if (!joined) delete hint.table
    const sug = suggestColumnDef(col.column_name, hint)
    if (!String(col.cn || '').trim()) {
      col.cn = sug.cn
      n += 1
    }
    if (!String(col.description || '').trim()) {
      col.description = sug.description
      n += 1
    }
    if (sug.data_type && (!col.data_type || col.data_type === 'varchar')) col.data_type = sug.data_type
  })
  runSpecCheck({ keepTab: true })
  sqlTab.value = 'fields'
  Message.success(n ? `已补齐 ${n} 项中文名或说明` : '中文名和说明都已填写')
}
function fieldReady(col) {
  return !!(String(col?.cn || '').trim() && String(col?.description || '').trim())
}
const fieldCfg = computed(() => {
  const rows = sqlColumnDefs.value
  const done = rows.filter(fieldReady).length
  return { total: rows.length, done, open: rows.length - done }
})
const fieldCfgRows = computed(() => {
  if (fieldCfgFilter.value === 'open') return sqlColumnDefs.value.filter((col) => !fieldReady(col))
  if (fieldCfgFilter.value === 'done') return sqlColumnDefs.value.filter(fieldReady)
  return sqlColumnDefs.value
})
function openFieldConfig() {
  const parsed = parseOutputColumns(sqlText.value)
  if (parsed.columns?.length) syncColumnDefs(parsed.columns)
  else if (!sqlColumnDefs.value.length) {
    specResult.value = checkSqlSpec({ sql: sqlText.value, placeholders: placeholders.value, columns: specColumns(), dialect: sqlDialect.value })
  }
  sqlTab.value = 'fields'
}
function runSpecCheck(opts = {}) {
  const parsed = parseOutputColumns(sqlText.value)
  if (parsed.columns?.length) syncColumnDefs(parsed.columns)
  const spec = checkSqlSpec({
    sql: sqlText.value,
    placeholders: placeholders.value,
    columns: specColumns(),
    dialect: sqlDialect.value,
  })
  specResult.value = spec
  specAlert.value = execSpecErrors(spec.errors).length > 0
  if (!opts.keepTab) sqlTab.value = specAlert.value || spec.errors.length ? 'spec' : 'result'
  return spec
}
function runSql() {
  const started = Date.now()
  const parsed = parseOutputColumns(sqlText.value)
  if (parsed.columns?.length) syncColumnDefs(parsed.columns)
  const spec = checkSqlSpec({
    sql: sqlText.value,
    placeholders: placeholders.value,
    columns: specColumns(),
    dialect: sqlDialect.value,
  })
  specResult.value = spec
  const check = validatePlaceholders(placeholders.value)
  const rendered = renderSql(sqlText.value, placeholders.value, { user: previewUser.value, groups: store.userGroups })
  execSql.value = rendered.sql
  execNotes.value = rendered.notes
  const blocker = check.errors[0] || rendered.errors[0]
  const result = blocker
    ? { error: blocker }
    : previewSql(store, { data_source_id: sourceId.value, sql: rendered.sql, limit: 100 })
  const duration = Date.now() - started
  const execErrors = execSpecErrors(spec.errors)
  specAlert.value = !!result.error || execErrors.length > 0
  if (result.error) {
    sqlResult.value = null
    sqlMessage.value = result.error
    sqlHistory.value = [{ id: `${Date.now()}`, at: new Date().toLocaleTimeString('zh-CN', { hour12: false }), success: false, rows: 0, duration, message: result.error }, ...sqlHistory.value.slice(0, 9)]
    sqlTab.value = execErrors.length ? 'spec' : 'result'
    return
  }
  sqlResult.value = result
  sqlMessage.value = `运行成功，返回 ${result.row_count || 0} 行`
  sqlHistory.value = [{ id: `${Date.now()}`, at: new Date().toLocaleTimeString('zh-CN', { hour12: false }), success: true, rows: result.row_count || 0, duration, message: 'SELECT 预览' }, ...sqlHistory.value.slice(0, 9)]
  sqlTab.value = execErrors.length ? 'spec' : 'result'
}

function finish() {
  if (isSql.value) {
    const spec = runSpecCheck({ keepTab: true })
    const execErrors = execSpecErrors(spec.errors)
    specAlert.value = execErrors.length > 0
    if (spec.errors.length) {
      sqlTab.value = execErrors.length ? 'spec' : 'fields'
      Message.warning(execErrors[0] || spec.errors[0])
      return
    }
    const payload = {
      name: name.value,
      sourceId: sourceId.value,
      sql: sqlText.value,
      columns: specColumns(),
      placeholders: placeholders.value,
    }
    const { error, dataset } = store.editDatasetId
      ? updateSqlDataset(store, store.editDatasetId, payload)
      : createSqlDataset(store, payload)
    if (error) { Message.warning(error); return }
    Message.success(`SQL 数据集「${dataset.display_name}」已保存`)
    store.studioDatasetId = ''
    store.openModelDrawer = false
    store.editDatasetId = dataset.id
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
        <button type="button" class="sql-outline-btn" @click="openAiSql">AI 生成 SQL</button>
        <button v-if="specAlert" type="button" class="sql-outline-btn" @click="runSpecCheck()">
          规范检查
          <span class="ph-count bad">{{ execSpecErrors(specResult.errors).length || specResult.errors.length }}</span>
        </button>
        <button type="button" class="sql-primary-btn sql-confirm" @click="finish">确认编辑</button>
        <span class="sql-split" />
        <button type="button" class="sql-close" title="关闭" @click="back">
          <SqlIcon7 :size="16" />
        </button>
      </div>
    </header>

    <div v-if="!isSql" class="create-body" :class="{ 'side-off': sideCollapsed }">
      <aside class="create-side">
        <div class="side-bar">模型配置</div>
        <button v-if="sideCollapsed" type="button" class="side-expand" @click="sideCollapsed = false">数据表</button>
        <div v-else class="side-pad">
          <div class="side-hd">
            <span>数据表</span>
            <button type="button" class="side-ico" title="收起" @click="sideCollapsed = true"><icon-menu-fold /></button>
          </div>
          <div class="side-label">选择数据源</div>
          <label class="source-pick">
            <a-select v-model="sourceId" allow-search :bordered="false" placeholder="请选择数据源" :trigger-props="{ contentClass: 'src-kind-drop' }" @change="selectSource">
              <template #prefix>
                <MysqlFlag v-if="currentKind === 'mysql'" />
                <DbTypeIcon v-else :type="currentKind" />
              </template>
              <template #label="{ data }">
                <span class="ellipsis">{{ data?.label }}</span>
              </template>
              <a-option v-for="s in dbSources" :key="s.id" :value="s.id" :label="s.name">
                <span class="src-opt">
                  <MysqlFlag v-if="s.kind === 'mysql'" />
                  <DbTypeIcon v-else :type="s.kind" />
                  <span class="ellipsis">{{ s.name }}</span>
                </span>
              </a-option>
            </a-select>
          </label>
          <p class="src-dialect">{{ dialectHint }}</p>
          <div class="side-tabrow">
            <template v-if="!tableSearchOpen">
              <span class="side-tab on">数据表</span>
              <span class="tab-gap" />
              <button type="button" class="side-ico" title="搜索" @click="openTableSearch"><icon-search /></button>
              <button type="button" class="side-ico" title="刷新" :disabled="tablesLoading" @click="refreshTables"><icon-refresh /></button>
            </template>
            <label v-else class="inline-search">
              <icon-search />
              <input ref="tableSearchRef" v-model="tableQuery" placeholder="搜索数据表" />
              <button type="button" class="side-ico" title="关闭搜索" @click="closeTableSearch"><icon-close /></button>
            </label>
          </div>
          <button type="button" class="dash-btn" @click="openSql"><icon-code /> SQL代码创建表</button>
          <div class="table-list">
            <div v-if="tablesLoading" class="table-loading">数据加载中...</div>
            <template v-else>
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
              <div v-if="!sourceTables.length" class="muted empty-hint">{{ tableQuery.trim() ? '没有匹配的数据表' : '暂无数据表' }}</div>
            </template>
          </div>
        </div>
      </aside>

      <section class="create-canvas" @dragover.prevent @drop="onDrop">
        <div v-if="selectedTables.length" class="canvas-graph-wrap">
          <div class="graph-board" :style="{ transform: `scale(${canvasZoom / 100})` }">
            <template v-for="(t, i) in selectedTables" :key="t.id">
              <div
                class="graph-node"
                :class="{ on: activeTable?.id === t.id, warn: i > 0 && !joinReady(joins[i - 1]) }"
                :title="t.display_name"
                @click="openTable(t.id)"
              >
                <span class="ellipsis">{{ t.display_name }}</span>
                <button type="button" class="rm" title="移除" @click.stop="removeTable(t.id)"><icon-close /></button>
              </div>
              <button
                v-if="i < selectedTables.length - 1"
                type="button"
                class="graph-edge"
                :class="{ warn: !joinReady(joins[i]) }"
                title="编辑逻辑关联"
                @click.stop="openJoin(i)"
              >
                <i class="wire" />
                <span class="dot" />
                <i class="wire" />
                <span class="dot" />
                <i class="wire" />
              </button>
            </template>
          </div>
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

        <div class="canvas-zoom">
          <button type="button" :disabled="canvasZoom <= 50" @click="canvasZoom = Math.max(50, canvasZoom - 10)">−</button>
          <span>{{ canvasZoom }}%</span>
          <button type="button" :disabled="canvasZoom >= 150" @click="canvasZoom = Math.min(150, canvasZoom + 10)">＋</button>
        </div>

        <div v-if="step === 'fields'" class="field-sheet">
          <div class="sheet-handle"><span /></div>
          <div class="sheet-body">
            <aside class="sheet-side">
              <div class="sheet-kicker">逻辑表详情</div>
              <div class="ds-title">{{ activeTable?.display_name }}</div>
              <div class="sub">数据源：{{ sourceName || '—' }}</div>
              <button type="button" class="ghost-btn danger" :disabled="!activeTable" @click="removeTable(activeTable.id)">删除此表</button>
              <div class="picked">
                <div class="side-label">已选择数据表 · 请逐个配置字段</div>
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
                  <em>{{ fieldsOfTable(t.id).filter((f) => f.selected !== false).length }}/{{ fieldsOfTable(t.id).length }}</em>
                </button>
              </div>
            </aside>
            <div class="sheet-main">
              <div class="field-hd">
                <strong>
                  {{ activeTable?.display_name || '字段选择' }}
                  （{{ activeFieldSelected }}/{{ activeFieldTotal }}）
                </strong>
                <div class="field-hd-right">
                  <button type="button" class="link" :disabled="!activeFieldRows.length" @click="fieldsOfTable(activeTable?.id).forEach((f) => { f.selected = true })">全选</button>
                  <button type="button" class="link" :disabled="!activeFieldSelected" @click="fieldsOfTable(activeTable?.id).forEach((f) => { f.selected = false })">清空</button>
                  <label class="pill-search sm">
                    <icon-search />
                    <input v-model="fieldQuery" placeholder="搜索字段" />
                  </label>
                  <button type="button" class="icon-btn" title="返回画布" @click="step = 'canvas'"><icon-close /></button>
                </div>
              </div>
              <p v-if="selectedTables.length > 1" class="field-tip">
                已选 {{ selectedTables.length }} 张表，请在左侧切换，为每一张表分别勾选并命名字段
                <template v-if="selectedTables.findIndex((t) => t.id === activeTable?.id) < selectedTables.length - 1">
                  ·
                  <button
                    type="button"
                    class="link"
                    @click="openTable(selectedTables[selectedTables.findIndex((t) => t.id === activeTable?.id) + 1].id)"
                  >配置下一张表</button>
                </template>
              </p>
              <div class="field-list">
                <div class="field-row head">
                  <span />
                  <span>字段名称</span>
                  <span>物理字段</span>
                  <span>类型</span>
                </div>
                <label v-for="f in activeFieldRows" :key="f.id" class="field-row">
                  <a-checkbox v-model="f.selected" />
                  <a-input v-model="f.fieldName" size="small" />
                  <span class="mono sub field-phy">{{ f.physicalName }}</span>
                  <a-tag size="small" color="arcoblue">{{ f.dataType }}</a-tag>
                </label>
                <div v-if="!activeFieldRows.length" class="muted empty-hint">没有匹配的字段</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="sql-body" :class="{ 'side-off': sideCollapsed }">
      <aside class="create-side">
        <button v-if="sideCollapsed" type="button" class="side-expand" @click="sideCollapsed = false">数据表</button>
        <div v-else class="side-pad">
          <div class="side-hd">
            <span>数据表</span>
            <button type="button" class="side-ico" title="收起" @click="sideCollapsed = true"><icon-menu-fold /></button>
          </div>
          <div class="side-label">选择数据源</div>
          <label class="source-pick">
            <a-select v-model="sourceId" allow-search :bordered="false" placeholder="请选择数据源" :trigger-props="{ contentClass: 'src-kind-drop' }" @change="selectSource">
              <template #prefix>
                <MysqlFlag v-if="currentKind === 'mysql'" />
                <DbTypeIcon v-else :type="currentKind" />
              </template>
              <template #label="{ data }">
                <span class="ellipsis">{{ data?.label }}</span>
              </template>
              <a-option v-for="s in dbSources" :key="s.id" :value="s.id" :label="s.name">
                <span class="src-opt">
                  <MysqlFlag v-if="s.kind === 'mysql'" />
                  <DbTypeIcon v-else :type="s.kind" />
                  <span class="ellipsis">{{ s.name }}</span>
                </span>
              </a-option>
            </a-select>
          </label>
          <p class="src-dialect">{{ dialectHint }}</p>
          <div class="side-tabrow">
            <template v-if="!tableSearchOpen">
              <span class="side-tab on">数据表</span>
              <span class="tab-gap" />
              <button type="button" class="side-ico" title="搜索" @click="openTableSearch"><icon-search /></button>
              <button type="button" class="side-ico" title="刷新" :disabled="tablesLoading" @click="refreshTables"><icon-refresh /></button>
            </template>
            <label v-else class="inline-search">
              <icon-search />
              <input ref="tableSearchRef" v-model="tableQuery" placeholder="搜索数据表" />
              <button type="button" class="side-ico" title="关闭搜索" @click="closeTableSearch"><icon-close /></button>
            </label>
          </div>
          <div class="table-list">
            <div v-if="tablesLoading" class="table-loading">数据加载中...</div>
            <template v-else>
              <button v-for="t in sourceTables" :key="t.id" type="button" class="table-item" @click="insertTableSql(t)">
                <icon-file />
                <span class="ellipsis">{{ t.display_name }}</span>
              </button>
              <div v-if="!sourceTables.length" class="muted empty-hint">{{ tableQuery.trim() ? '没有匹配的数据表' : '暂无数据表' }}</div>
            </template>
          </div>
        </div>
      </aside>
      <section ref="sqlMainEl" class="sql-main" :class="{ 'is-split': splitDrag }">
        <SqlEditor
          ref="sqlEditorEl"
          v-model="sqlText"
          class="sql-editor"
          :dialect="sqlDialect"
          :schema="sqlSchema"
          :placeholder="sqlPlaceholder"
          @run="runSql"
          @format="formatSql"
        />
        <div class="sql-resize" role="separator" aria-orientation="horizontal" aria-label="拖拽调整高度" @mousedown="startSplit" />
        <div class="sql-result" :style="{ height: sqlResultH + 'px' }">
          <div class="side-tabs result-tabs" style="padding: 0 16px">
            <button type="button" :class="{ on: sqlTab === 'result' }" @click="sqlTab = 'result'">运行结果</button>
            <button type="button" :class="{ on: sqlTab === 'exec' }" @click="sqlTab = 'exec'">实际执行 SQL</button>
            <button type="button" :class="{ on: sqlTab === 'history' }" @click="sqlTab = 'history'">历史记录</button>
            <button type="button" :class="{ on: sqlTab === 'spec' }" @click="runSpecCheck()">规范检查</button>
            <button type="button" :class="{ on: sqlTab === 'fields' }" @click="openFieldConfig">
              配置字段
              <span v-if="fieldCfg.total" class="ph-count" :class="{ bad: fieldCfg.open }">{{ fieldCfg.done }}/{{ fieldCfg.total }}</span>
            </button>
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
          <div v-else-if="sqlTab === 'spec'" class="sql-pad">
            <div v-if="!specResult.errors.length && !specResult.warnings.length && !sqlColumnDefs.length" class="muted" style="text-align:center; padding: 32px 0">点击「规范检查」查看 SQL 是否能作为 MCP 工具使用。</div>
            <div v-if="specResult.errors.length" class="spec-block">
              <div v-for="err in specResult.errors" :key="err" class="spec-line bad">{{ err }}</div>
            </div>
            <div v-if="specResult.warnings.length" class="spec-block">
              <div v-for="warn in specResult.warnings" :key="warn" class="spec-line warn">{{ warn }}</div>
            </div>
            <div v-if="fieldCfg.total" class="spec-toolbar">
              <span>字段配置 {{ fieldCfg.done }}/{{ fieldCfg.total }}</span>
              <button type="button" class="sql-text-btn" @click="openFieldConfig">去配置字段</button>
            </div>
          </div>
          <div v-else-if="sqlTab === 'fields'" class="sql-pad">
            <div v-if="!sqlColumnDefs.length" class="muted" style="text-align:center; padding: 32px 0">{{ specResult.errors[0] || '写出 SELECT 列名后，这里配置中文名和字段说明。' }}</div>
            <div v-else class="spec-fields">
              <div class="spec-toolbar">
                <div class="cfg-filters">
                  <button type="button" :class="{ on: fieldCfgFilter === 'all' }" @click="fieldCfgFilter = 'all'">全部 {{ fieldCfg.total }}</button>
                  <button type="button" :class="{ on: fieldCfgFilter === 'open' }" @click="fieldCfgFilter = 'open'">未配置 {{ fieldCfg.open }}</button>
                  <button type="button" :class="{ on: fieldCfgFilter === 'done' }" @click="fieldCfgFilter = 'done'">已配置 {{ fieldCfg.done }}</button>
                </div>
                <button type="button" class="sql-outline-btn" @click="fillAiDefs">AI 补齐</button>
              </div>
              <div class="spec-fields-hd">
                <span>输出列</span>
                <span>状态</span>
                <span>中文名</span>
                <span>说明</span>
              </div>
              <div v-if="!fieldCfgRows.length" class="muted" style="padding: 16px 0">这个状态下没有字段。</div>
              <div v-for="col in fieldCfgRows" :key="col.column_name" class="spec-fields-row">
                <span class="mono">{{ col.column_name }}</span>
                <span class="cfg-tag" :class="fieldReady(col) ? 'done' : 'open'">{{ fieldReady(col) ? '已配置' : '未配置' }}</span>
                <a-textarea v-model="col.cn" size="small" :auto-size="{ minRows: 1, maxRows: 4 }" placeholder="如 指标代码" />
                <a-textarea v-model="col.description" size="small" :auto-size="{ minRows: 1, maxRows: 6 }" placeholder="字段说明，可直接用列 comment" />
              </div>
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

    <footer v-if="!isSql && step !== 'sql'" class="create-foot">
      <button type="button" class="primary-btn lg" :disabled="!selectedIds.length" @click="finish">{{ finishLabel }}</button>
    </footer>

    <Teleport to="body">
      <div v-if="joinOpen" class="rel-mask" @click.self="closeJoin">
        <div class="rel-sheet" role="dialog" aria-label="编辑逻辑关联">
          <div class="rel-head">
            <span>编辑逻辑关联</span>
            <button type="button" class="rel-x" aria-label="关闭" @click="closeJoin"><icon-close /></button>
          </div>
          <div class="rel-body">
            <div class="rel-tables">
              <div class="rel-tbl"><icon-file /> <span class="ellipsis">{{ leftJoinTable()?.display_name }}</span></div>
              <span class="rel-tables-gap" />
              <div class="rel-tbl"><icon-file /> <span class="ellipsis">{{ rightJoinTable()?.display_name }}</span></div>
            </div>
            <div class="rel-conds">
              <div v-for="(c, i) in joinDraft.conditions" :key="i" class="rel-cond">
                <a-select
                  v-model="c.leftField"
                  allow-search
                  size="small"
                  :placeholder="leftJoinTable()?.display_name || '左表字段'"
                  @change="persistJoin"
                >
                  <a-option
                    v-for="col in columnsOf(leftJoinTable())"
                    :key="col.column_name"
                    :value="col.column_name"
                    :label="col.column_name"
                  >
                    <span class="rel-opt"><i class="rel-type" :class="fieldKind(col)">{{ typeBadge(col) }}</i><span>{{ col.column_name }}</span></span>
                  </a-option>
                </a-select>
                <span class="rel-eq">=</span>
                <a-select
                  v-model="c.rightField"
                  allow-search
                  size="small"
                  :placeholder="rightJoinTable()?.display_name || '右表字段'"
                  @change="persistJoin"
                >
                  <a-option
                    v-for="col in columnsOf(rightJoinTable())"
                    :key="col.column_name"
                    :value="col.column_name"
                    :label="col.column_name"
                  >
                    <span class="rel-opt"><i class="rel-type" :class="fieldKind(col)">{{ typeBadge(col) }}</i><span>{{ col.column_name }}</span></span>
                  </a-option>
                </a-select>
                <button type="button" class="rel-cond-rm" title="删除条件" @click="removeJoinCondition(i)"><icon-close /></button>
              </div>
            </div>
            <div class="rel-acts">
              <button type="button" class="rel-link" @click="addJoinCondition"><icon-plus /> 添加关联字段</button>
              <button type="button" class="rel-link muted" @click="clearJoinConditions"><icon-delete /> 清除全部</button>
            </div>

            <div v-if="joinAdvOpen" class="rel-adv-panel">
              <div class="rel-adv-hd">
                <div class="rel-adv-title">
                  <span>高级配置</span>
                  <a-tooltip content="关联关系表示两侧基数；数据匹配度决定保留哪侧未匹配行（部分=保留，全部=仅匹配）。">
                    <icon-question-circle class="rel-help" />
                  </a-tooltip>
                </div>
                <button type="button" class="rel-link muted" @click="resetJoinAdv"><icon-refresh /> 恢复默认</button>
              </div>
              <div class="rel-adv-row">
                <div class="rel-adv-label"><span class="req">*</span>关联关系</div>
                <div class="rel-adv-pair">
                  <a-select v-model="joinDraft.leftCard" size="small" :options="CARDINALITY_OPTS" @change="persistJoin" />
                  <span class="rel-colon">:</span>
                  <a-select v-model="joinDraft.rightCard" size="small" :options="CARDINALITY_OPTS" @change="persistJoin" />
                </div>
              </div>
              <div class="rel-adv-row">
                <div class="rel-adv-label"><span class="req">*</span>数据匹配度</div>
                <div class="rel-adv-pair">
                  <a-select
                    v-model="joinDraft.leftMatch"
                    size="small"
                    :options="MATCH_OPTS"
                    @change="() => { syncJoinTypeFromMatch(); persistJoin() }"
                  />
                  <span class="rel-colon" />
                  <a-select
                    v-model="joinDraft.rightMatch"
                    size="small"
                    :options="MATCH_OPTS"
                    @change="() => { syncJoinTypeFromMatch(); persistJoin() }"
                  />
                </div>
                <div class="rel-adv-hint muted">当前等价于{{ joinLabel(joinDraft.type) }}（{{ JOIN_TYPES.find((t) => t.value === joinDraft.type)?.sql }}）</div>
              </div>
            </div>
          </div>
          <div class="rel-foot">
            <button type="button" class="rel-toggle" @click="joinAdvOpen = !joinAdvOpen">
              {{ joinAdvOpen ? '收起' : '高级配置' }}
              <icon-up v-if="joinAdvOpen" />
              <icon-down v-else />
            </button>
            <button type="button" class="rel-ok" @click="confirmJoin">确定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <a-modal v-model:visible="aiSqlOpen" title="AI 生成 SQL" :width="640" unmount-on-close :footer="false">
      <p class="ai-sql-hint">用一句话描述要查的数据。生成结果来自当前数据源已同步的表和字段注释，写入后还可以改。</p>
      <a-textarea v-model="aiSqlPrompt" :auto-size="{ minRows: 3, maxRows: 6 }" placeholder="例如：在营指标关联序列，统计每个指标的点数、最大值和最早日期" />
      <div class="ai-sql-examples">
        <button type="button" @click="draftAiSql('在营指标关联序列，统计每个指标的点数、最大值和最早日期')">在营指标关联序列</button>
        <button type="button" @click="draftAiSql('查询指标代码、指标名称、单位和最新值')">指标代码、名称、单位和最新值</button>
      </div>
      <div v-if="aiSqlError" class="spec-line bad">{{ aiSqlError }}</div>
      <pre v-if="aiSqlPreview" class="exec-sql mono">{{ aiSqlPreview }}</pre>
      <div class="ai-sql-actions">
        <a-button @click="aiSqlOpen = false">取消</a-button>
        <a-button @click="draftAiSql()">生成</a-button>
        <a-button type="primary" :disabled="!aiSqlPreview" @click="applyAiSql">写入编辑器</a-button>
      </div>
    </a-modal>
    <a-modal v-model:visible="helpOpen" title="常见问题" :width="480" unmount-on-close :footer="false">
      <ul class="sql-help">
        <li>SQL 数据集会发布成 MCP 工具，只允许一条只读 SELECT。禁止 <span class="mono">SELECT *</span>，每个输出列都要填写中文名和说明。</li>
        <li>点击左侧数据表会插入该表的明确列。MySQL 和 TiDB 都用 <span class="mono">LIMIT 100</span>，数据源名称旁会标出类型。</li>
        <li>「AI 生成 SQL」按当前数据源里已同步的表和字段注释起草 SELECT。写入编辑器后还可以改。</li>
        <li>
          支持值 <span class="mono">{{ "'$val{name}'" }}</span>、表达式 <span class="mono">{{ '$expr{字段:name}' }}</span>、条件、加速、标签、系统六类占位符，在「占位符管理」里设置变量类型和默认值。用在 SELECT 里的占位符必须设置全局默认值。
        </li>
        <li>限制原因见帮助中心 <a href="/docs/sql-spec.html" target="_blank">SQL 数据集规范</a>。</li>
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
            <div
              v-for="item in datasetFilters"
              :key="item.id"
              role="button"
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
                @change="(v) => changeFilterField(item, v)"
              >
                <a-option v-for="f in filterableFields" :key="f.id" :value="f.id">{{ f.fieldName }}</a-option>
              </a-select>
              <span class="flt-chip-del" title="移除" @click.stop="removeFilterField(item.id)"><icon-close /></span>
            </div>
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
.ai-sql-hint { margin: 0 0 10px; font-size: 13px; color: rgba(0, 0, 0, 0.65); line-height: 1.6; }
.ai-sql-examples { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.ai-sql-examples button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d9e0e8;
  border-radius: 4px;
  background: #fff;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
}
.ai-sql-examples button:hover { border-color: #2e74ff; color: #2e74ff; }
.ai-sql-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
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
.create-body, .sql-body { display: grid; grid-template-columns: 239px minmax(0, 1fr); min-height: 0; flex: 1; }
.create-body.side-off, .sql-body.side-off { grid-template-columns: 36px minmax(0, 1fr); }
.create-side {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
}
.side-bar {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 14px;
  font-weight: 600;
}
.side-off .side-bar { display: none; }
.side-pad { display: flex; flex-direction: column; min-height: 0; flex: 1; padding: 0 0 16px; overflow: hidden; }
.side-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 8px 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}
.side-expand {
  writing-mode: vertical-rl;
  letter-spacing: 3px;
  margin: 16px auto 0;
  padding: 10px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 16px;
}
.side-expand:hover { color: rgb(46, 116, 255); background: rgba(46, 116, 255, 0.06); }
.side-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.side-title { margin: 0; font-size: 16px; font-weight: 600; }
.side-label {
  font-size: 12px;
  line-height: 20px;
  color: rgba(0, 0, 0, 0.45);
  padding: 0 12px;
  margin: 0 0 8px;
}
.source-pick {
  display: flex;
  align-items: center;
  height: 36px;
  margin: 0 8px 4px 12px;
  border-radius: 4px;
  background: rgba(46, 116, 255, 0.08);
  color: rgba(0, 0, 0, 0.65);
}
.source-pick :deep(.arco-select) { flex: 1; min-width: 0; width: 100%; }
.source-pick :deep(.arco-select-view) {
  background: transparent;
  padding: 0 9px;
  height: 36px;
  min-height: 36px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.85);
}
.source-pick :deep(.arco-select-view-value) { display: flex; width: 100%; }
.source-pick :deep(.arco-select-view-prefix) {
  padding-right: 6px;
}
.src-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.source-pick :deep(.db-ico),
.src-opt :deep(.db-ico) {
  width: 16px;
  height: 16px;
  margin: 0;
  flex: none;
}
.source-pick :deep(.db-ico svg),
.src-opt :deep(.db-ico svg) {
  width: 16px;
  height: 16px;
}
:global(.src-kind-drop .arco-select-option-selected) {
  background: #eef3ff;
  color: rgba(0, 0, 0, 0.85);
}
.src-dialect {
  margin: 0 12px 8px;
  font-size: 12px;
  line-height: 18px;
  color: rgba(0, 0, 0, 0.45);
}
.side-tabrow {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 8px 0 12px;
  margin-top: 4px;
}
.side-tab {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  line-height: 36px;
}
.side-ico {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.side-ico + .side-ico { margin-left: 4px; }
.side-ico:hover { background: rgba(0, 0, 0, 0.04); }
.side-ico:disabled { opacity: 0.45; cursor: default; }
.inline-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 6px 0 8px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  color: rgba(0, 0, 0, 0.45);
}
.inline-search:focus-within { border-color: rgb(46, 116, 255); }
.inline-search input {
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.85);
}
.table-loading {
  margin-top: 40px;
  padding: 0 24px;
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
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
  display: flex;
  align-items: center;
  width: calc(100% - 20px);
  height: 32px;
  margin: 0 8px 0 12px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  color: rgba(0, 0, 0, 0.85);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  text-align: left;
  gap: 8px;
}
.dash-btn:hover { color: rgb(46, 116, 255); }
.table-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 8px;
}
.table-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  padding: 0 8px;
  cursor: pointer;
  text-align: left;
  color: rgba(0, 0, 0, 0.85);
  font-size: 12px;
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
.canvas-graph-wrap {
  display: flex;
  justify-content: center;
  padding: 48px 24px 80px;
}
.graph-board {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0 0;
  transform-origin: top center;
}
.graph-node {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 220px;
  height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 18px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.graph-node .ellipsis { min-width: 0; flex: 1; }
.graph-node.on { border-color: rgb(46, 116, 255); color: rgb(46, 116, 255); }
.graph-node.warn { border-color: #f77234; }
.graph-node .rm {
  display: none;
  margin-left: 6px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.graph-node:hover .rm { display: inline-flex; }
.graph-edge {
  display: inline-flex;
  align-items: center;
  width: 72px;
  height: 36px;
  border: 0;
  background: none;
  padding: 0 4px;
  cursor: pointer;
}
.graph-edge .wire {
  flex: 1;
  height: 0;
  border-top: 1px solid #c9cdd4;
}
.graph-edge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid rgb(46, 116, 255);
  background: #fff;
  box-sizing: border-box;
}
.graph-edge.warn .dot { border-color: #f77234; }
.canvas-zoom {
  position: absolute;
  right: 20px;
  bottom: 72px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 8px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}
.canvas-zoom button {
  width: 20px;
  height: 20px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
}
.canvas-zoom button:disabled { opacity: 0.35; cursor: default; }
.rel-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}
.rel-sheet {
  width: 420px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 9px 28px 8px rgba(0, 0, 0, 0.05), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.85);
  font-size: 12px;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', helvetica, arial, sans-serif;
}
.rel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
}
.rel-x {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rel-x:hover { background: rgba(0, 0, 0, 0.04); }
.rel-body { padding: 0 20px; }
.rel-tables {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
}
.rel-tables-gap { flex: 0 0 32px; }
.rel-tbl {
  flex: 1 0 136px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: rgba(0, 0, 0, 0.85);
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
}
.rel-conds {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.rel-cond {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}
.rel-cond :deep(.arco-select) { flex: 1 0 136px; min-width: 0; }
.rel-eq {
  flex: 0 0 32px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(46, 116, 255);
  font-weight: 600;
  font-size: 14px;
}
.rel-cond-rm {
  flex: 0 0 24px;
  width: 24px;
  height: 28px;
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.rel-cond-rm:hover { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.75); }
.rel-opt { display: inline-flex; align-items: center; gap: 6px; }
.rel-type {
  font-style: normal;
  font-size: 11px;
  line-height: 16px;
  color: #13c2c2;
  min-width: 18px;
}
.rel-type.date { color: rgb(46, 116, 255); }
.rel-type.num { color: #23c343; }
.rel-acts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.rel-link {
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
  color: rgb(46, 116, 255);
  font-size: 12px;
  line-height: 16px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.rel-link.muted { color: rgba(0, 0, 0, 0.45); }
.rel-link:hover { opacity: 0.85; }
.rel-adv-panel { margin-top: 18px; }
.rel-adv-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.rel-adv-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}
.rel-help { color: rgba(0, 0, 0, 0.65); cursor: help; font-size: 14px; }
.rel-adv-row { margin-bottom: 16px; }
.rel-adv-label {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.85);
}
.rel-adv-label .req { color: rgb(255, 110, 105); margin-right: 4px; }
.rel-adv-pair {
  display: flex;
  align-items: center;
  gap: 4px;
}
.rel-adv-pair :deep(.arco-select) { flex: 1 0 136px; }
.rel-colon {
  flex: 0 0 32px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}
.rel-adv-hint { margin-top: 8px; font-size: 12px; line-height: 18px; }
.rel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 20px;
}
.rel-toggle {
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.rel-toggle:hover { color: rgb(46, 116, 255); }
.rel-ok {
  height: 32px;
  min-width: 64px;
  padding: 0 16px;
  border: 0;
  border-radius: 4px;
  background: rgb(46, 116, 255);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 22px;
}
.rel-ok:hover { filter: brightness(1.05); }
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
.picked-item em {
  margin-left: auto;
  font-style: normal;
  font-size: 12px;
  color: #86909c;
  flex-shrink: 0;
}
.picked-item.on em { color: rgb(var(--accent)); }
.field-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: #86909c;
  line-height: 1.5;
}
.field-hd { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
.field-hd-right { display: flex; align-items: center; gap: 8px; }
.field-list { min-height: 0; flex: 1; overflow: auto; }
.field-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) minmax(0, 1fr) 90px;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid #eef2f7;
}
.field-row > * { min-width: 0; box-sizing: border-box; }
.field-phy {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.sql-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.sql-main.is-split { cursor: row-resize; user-select: none; }
.sql-editor { width: 100%; flex: 1; min-height: 120px; }
.sql-resize {
  flex: none;
  height: 8px;
  margin: -4px 0;
  width: 100%;
  cursor: row-resize;
  position: relative;
  z-index: 2;
}
.sql-resize::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 3px;
  height: 1px;
  background: #d9e0e8;
}
.sql-resize:hover::after,
.sql-main.is-split .sql-resize::after { height: 2px; top: 3px; background: #2e74ff; }
.sql-result { flex: none; display: flex; flex-direction: column; min-height: 0; background: #fff; overflow: hidden; }
.sql-pad { padding: 12px 16px; overflow: auto; flex: 1; }
.hist-row { display: grid; grid-template-columns: 110px 70px 1fr; gap: 8px; padding: 8px 0; border-bottom: 1px solid #d9e0e8; font-size: 13px; }
.ok { color: #00b42a; }
.bad { color: #f53f3f; }
.spec-block { margin-bottom: 12px; }
.spec-line { padding: 6px 0; font-size: 13px; line-height: 1.5; }
.spec-line.warn { color: #d9480f; }
.spec-fields { display: flex; flex-direction: column; gap: 8px; }
.spec-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; font-size: 12px; color: rgba(0, 0, 0, 0.45); }
.spec-fields-hd,
.spec-fields-row { display: grid; grid-template-columns: 168px 72px 180px 1fr; gap: 8px; align-items: center; }
.spec-fields-row { align-items: start; }
.spec-fields-row .mono,
.spec-fields-row .cfg-tag { margin-top: 5px; }
.spec-fields-row :deep(textarea) {
  font-size: 12px;
  line-height: 20px;
  resize: none;
}
.spec-fields-hd { font-size: 12px; color: rgba(0, 0, 0, 0.45); }
.cfg-filters { display: flex; gap: 6px; }
.cfg-filters button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #d9e0e8;
  border-radius: 4px;
  background: #fff;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
}
.cfg-filters button.on { border-color: #2e74ff; color: #2e74ff; background: rgba(46, 116, 255, 0.06); }
.cfg-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  border-radius: 4px;
  font-size: 12px;
}
.cfg-tag.open { color: #d9480f; background: #fff3e8; }
.cfg-tag.done { color: #0f8a5f; background: #e8ffea; }
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
  box-sizing: border-box;
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
