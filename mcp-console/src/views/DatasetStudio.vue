<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, previewDataset, findSource, toolsOfDataset } from '../store'
import DsMark from '../components/icons/DsMark.vue'
import PublishToolModal from '../components/PublishToolModal.vue'
import DatasetCreate from './DatasetCreate.vue'

defineOptions({ name: 'DatasetStudio' })
const emit = defineEmits(['goto'])

const TOOLS = [
  { group: 'create', items: [
    { key: 'calc', label: '新建计算字段', icon: 'calc' },
    { key: 'group', label: '新建分组维度', icon: 'group' },
    { key: 'level', label: '新建层级结构', icon: 'level' },
    { key: 'ph', label: '新建占位符', icon: 'ph' },
  ]},
  { group: 'clean', items: [
    { key: 'datediff', label: '获取时间差', icon: 'clock' },
    { key: 'nullfill', label: '缺失值替换', icon: 'swap' },
    { key: 'alias', label: '新增维值别名', icon: 'tags' },
  ]},
  { group: 'split', items: [
    { key: 'split', label: '拆分字段', icon: 'split' },
    { key: 'merge', label: '合并字段', icon: 'merge' },
  ]},
  { group: 'format', items: [
    { key: 'format', label: '展示格式', icon: 'pct', kind: 'format' },
    { key: 'nullshow', label: '空值展示', icon: 'empty', caret: true },
  ]},
  { group: 'filter', items: [
    { key: 'sort', label: '排序', icon: 'sort' },
    { key: 'filter', label: '过滤', icon: 'filter' },
  ]},
  { group: 'find', items: [
    { key: 'find', label: '字段查找', icon: 'search' },
  ]},
]
const COLORS = ['#3c7eff', '#7c5cff', '#f53f3f', '#23c343']
const PH_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数值' },
  { value: 'date', label: '日期' },
]
const PH_TIP = '请输入规范的名称，不要使用特殊字符，前后不能包含空格，不超过50个字符。'
const FORMAT_OPTS = [
  { value: 'auto', label: '自动' },
  { value: 'int', label: '整数' },
  { value: 'dec1', label: '1.0' },
  { value: 'pct', label: '百分比' },
]
const NULL_OPTS = [
  { value: "展示为'-'", label: "展示为'-'" },
  { value: '展示为空', label: '展示为空' },
  { value: '展示为0', label: '展示为0' },
]
const MISS_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'date', label: '日期' },
  { value: 'string', label: '文本' },
  { value: 'number', label: '数值' },
]
const MISS_ORIGINS = [
  { value: '空值', label: '空值' },
  { value: '空字符串', label: '空字符串' },
  { value: '0', label: '0' },
]
const FILTER_OPS = [
  { value: '=', label: '等于' },
  { value: '!=', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: '>=', label: '大于等于' },
  { value: '<=', label: '小于等于' },
  { value: 'empty', label: '为空' },
]
const DATE_ANCHORS = [
  { value: 'T', label: 'T' },
  { value: 'M', label: 'M' },
  { value: 'Y', label: 'Y' },
]

const tab = ref('preview')
const outlineKw = ref('')
const dimOpen = ref(true)
const meaOpen = ref(true)
const phSecOpen = ref(true)
const phDlgOpen = ref(false)
const placeholders = ref([])
const phForm = reactive({ name: '', type: 'text', defaultValue: '' })
const hideHidden = ref(true)
const preview = ref(null)
const loading = ref(false)
const searchRef = ref(null)
const drafts = ref([])
const formatOpen = ref(false)
const nullOpen = ref(false)
const grpDlgOpen = ref(false)
const grpDescOpen = ref(false)
const grpHelpOpen = ref(false)
const grpForm = reactive({ name: '', description: '', fieldId: '' })
const grpBuckets = ref([])
const modelOpen = ref(false)
const missOpen = ref(false)
const missType = ref('all')
const missForm = reactive({ name: '', fieldId: '', originals: ['空值'], replace: '' })
const fltOpen = ref(false)
const fltHelpOpen = ref(false)
const studioFilters = ref([])
const activeFilterId = ref('')

const dataset = computed(() => store.datasets.find((d) => d.id === store.studioDatasetId) || null)
const sourceName = computed(() => findSource(dataset.value?.data_source_id)?.name || '来源表')
const tableCount = computed(() => 1 + (dataset.value?.extra?.joins?.length || 0))
const boundToolCount = computed(() => dataset.value ? toolsOfDataset(store, dataset.value.id).length : 0)
const pubOpen = ref(false)
function openPublish() {
  if (!dataset.value) {
    Message.warning('请先保存数据集')
    return
  }
  pubOpen.value = true
}

function kindOf(col) {
  const t = `${col.data_type || ''}`.toLowerCase()
  if (t.includes('date') || t.includes('time')) return 'date'
  if (['int', 'bigint', 'number', 'decimal', 'float', 'double', 'numeric'].some((x) => t.includes(x))) return 'number'
  return 'string'
}
function badgeOf(kind) {
  if (kind === 'date') return 'Dt'
  if (kind === 'number') return 'N0'
  return 'Str'
}
function typeLabel(kind) {
  if (kind === 'date') return '日期'
  if (kind === 'number') return '数值'
  return '文本'
}
function colorOf(i) {
  return COLORS[Math.min(i, COLORS.length - 1)]
}

function buildDrafts(ds) {
  drafts.value = (ds?.columns || []).map((c) => {
    const kind = kindOf(c)
    return {
      id: c.id || c.column_name,
      column_name: c.column_name,
      display_name: c.semantic_hint || c.column_name,
      data_type: c.data_type,
      description: c.description || '',
      kind,
      role: kind === 'number' ? 'measure' : 'dimension',
      selected: true,
      grouped: false,
      nullShow: "展示为'-'",
    }
  })
  ;(ds.extra?.groupDimensions || []).forEach((g) => {
    if (drafts.value.some((d) => d.id === g.id)) return
    drafts.value.push({
      ...g,
      kind: 'string',
      role: 'dimension',
      selected: g.selected !== false,
      grouped: true,
      nullShow: g.nullShow || "展示为'-'",
    })
  })
  ;(ds.extra?.nullFills || []).forEach((g) => {
    if (drafts.value.some((d) => d.id === g.id)) return
    drafts.value.push({
      ...g,
      selected: g.selected !== false,
      nullShow: g.nullShow || "展示为'-'",
    })
  })
}

const visibleFields = computed(() => {
  const list = hideHidden.value ? drafts.value.filter((f) => f.selected) : drafts.value
  const q = outlineKw.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((f) => `${f.display_name} ${f.column_name}`.toLowerCase().includes(q))
})
const dimensions = computed(() => visibleFields.value.filter((f) => f.role === 'dimension'))
const measures = computed(() => visibleFields.value.filter((f) => f.role === 'measure'))
const previewCols = computed(() => {
  const names = preview.value?.columns
  let cols
  if (names?.length) {
    cols = names.map((name) => drafts.value.find((f) => f.column_name === name) || { column_name: name, display_name: name, kind: 'string', selected: true })
  } else {
    cols = visibleFields.value.filter((f) => f.selected)
  }
  drafts.value.filter((f) => f.missFill && f.selected !== false).forEach((f) => {
    if (!cols.some((c) => c.column_name === f.column_name)) cols = [...cols, f]
  })
  if (hideHidden.value) cols = cols.filter((f) => f.selected !== false)
  return cols
})
const previewRows = computed(() => {
  let rows = preview.value?.rows || []
  const fills = drafts.value.filter((f) => f.missFill)
  if (fills.length) {
    rows = rows.map((row) => {
      const next = { ...row }
      fills.forEach((f) => {
        const src = drafts.value.find((x) => x.id === f.missFill.sourceField)
        next[f.column_name] = applyMissFill(src ? row[src.column_name] : null, f.missFill)
      })
      return next
    })
  }
  if (studioFilters.value.length) rows = rows.filter((row) => studioFilters.value.every((flt) => rowMatchesFilter(row, flt)))
  return rows
})

function back() {
  store.openModelDrawer = false
  emit('goto', 'datasets')
}
function openModel() {
  store.editDatasetId = dataset.value?.id || ''
  modelOpen.value = true
}
function closeModel() {
  modelOpen.value = false
  if (!dataset.value) emit('goto', 'datasets')
}
function onModelDone() {
  modelOpen.value = false
}
function onModelSql() {
  modelOpen.value = false
  if (dataset.value?.source_type !== 'sql') store.editDatasetId = ''
  emit('goto', 'dataset-sql')
}
function onCreateGoto(id) {
  if (id === 'dataset-sql') {
    onModelSql()
    return
  }
  if (id === 'datasets' || id === 'dataset-studio') {
    closeModel()
    if (id === 'datasets') emit('goto', 'datasets')
    return
  }
  emit('goto', id)
}
function syncModelDrawer() {
  if (!store.openModelDrawer) return
  store.openModelDrawer = false
  modelOpen.value = true
  if (dataset.value) store.editDatasetId = dataset.value.id
}
function phNameOk(name) {
  const raw = String(name ?? '')
  if (!raw || raw !== raw.trim() || raw.length > 50) return false
  return /^[A-Za-z0-9_\u4e00-\u9fa5]+$/.test(raw)
}
const phNameInvalid = computed(() => !phNameOk(phForm.name))
function openPh() {
  phForm.name = ''
  phForm.type = 'text'
  phForm.defaultValue = ''
  phDlgOpen.value = true
}
function closePh() {
  phDlgOpen.value = false
}
const grpSourceFields = computed(() => drafts.value.filter((f) => !f.grouped))
const grpField = computed(() => grpSourceFields.value.find((f) => f.id === grpForm.fieldId) || null)
const grpValues = computed(() => {
  const f = grpField.value
  if (!f) return []
  const fromPreview = (preview.value?.rows || []).map((r) => r[f.column_name]).filter((v) => v != null && v !== '')
  const uniq = [...new Set(fromPreview.map(String))]
  if (uniq.length) return uniq
  return Array.from({ length: 6 }, (_, i) => `${f.display_name}_${i + 1}`)
})
const grpAssigned = computed(() => new Set(grpBuckets.value.flatMap((b) => b.values)))
const grpUngrouped = computed(() => grpValues.value.filter((v) => !grpAssigned.value.has(v)))
const grpReady = computed(() => Boolean(String(grpForm.name || '').trim() && grpForm.fieldId))

function openGrp() {
  closeToolMenus()
  grpForm.name = ''
  grpForm.description = ''
  grpForm.fieldId = ''
  grpDescOpen.value = false
  grpHelpOpen.value = false
  grpBuckets.value = []
  grpDlgOpen.value = true
}
function closeGrp() {
  grpDlgOpen.value = false
}
function onGrpField(id) {
  grpForm.fieldId = id
  grpBuckets.value = id ? [{ id: `gb-${Date.now()}`, name: '分组1', values: [] }] : []
}
function addGrpBucket() {
  grpBuckets.value.push({ id: `gb-${Date.now()}`, name: `分组${grpBuckets.value.length + 1}`, values: [] })
}
function removeGrpBucket(id) {
  grpBuckets.value = grpBuckets.value.filter((b) => b.id !== id)
}
function assignGrpValue(bucket, value) {
  grpBuckets.value.forEach((b) => {
    b.values = b.values.filter((v) => v !== value)
  })
  bucket.values = [...bucket.values, value]
}
function unassignGrpValue(bucket, value) {
  bucket.values = bucket.values.filter((v) => v !== value)
}
function persistGroups() {
  if (!dataset.value) return
  dataset.value.extra = {
    ...(dataset.value.extra || {}),
    placeholders: placeholders.value.map((p) => ({ ...p })),
    groupDimensions: drafts.value.filter((f) => f.grouped).map((f) => ({ ...f })),
    nullFills: drafts.value.filter((f) => f.missFill).map((f) => ({ ...f })),
    studioFilters: studioFilters.value.map((f) => ({ ...f })),
  }
}
function confirmGrp() {
  if (!grpReady.value) return
  const name = grpForm.name.trim()
  if (drafts.value.some((f) => f.display_name === name || f.column_name === name)) {
    Message.warning('字段名称已存在')
    return
  }
  drafts.value = [
    ...drafts.value,
    {
      id: `grp-${Date.now()}`,
      column_name: name,
      display_name: name,
      description: grpForm.description.trim(),
      data_type: 'varchar',
      kind: 'string',
      role: 'dimension',
      selected: true,
      grouped: true,
      sourceField: grpForm.fieldId,
      groups: grpBuckets.value.map((b) => ({ id: b.id, name: b.name, values: [...b.values] })),
      nullShow: "展示为'-'",
    },
  ]
  persistGroups()
  grpDlgOpen.value = false
  Message.success(`已新建分组维度「${name}」`)
}
function confirmPh() {
  if (phNameInvalid.value) return
  const name = phForm.name.trim()
  if (placeholders.value.some((p) => p.name === name)) {
    Message.warning('占位符名称已存在')
    return
  }
  placeholders.value = [
    ...placeholders.value,
    {
      id: `ph-${Date.now()}`,
      name,
      type: phForm.type,
      defaultValue: String(phForm.defaultValue || '').trim(),
    },
  ]
  persistGroups()
  phDlgOpen.value = false
  Message.success(`已新建占位符 ${name}`)
}

const missFields = computed(() => {
  const list = drafts.value.filter((f) => !f.missFill && !f.grouped)
  if (missType.value === 'all') return list
  return list.filter((f) => f.kind === missType.value)
})
const missReady = computed(() => Boolean(String(missForm.name || '').trim() && missForm.fieldId && String(missForm.replace ?? '').length))
function setMissType(t) {
  missType.value = t
  if (missForm.fieldId && !missFields.value.some((f) => f.id === missForm.fieldId)) missForm.fieldId = ''
}
function openMiss() {
  missForm.name = ''
  missForm.fieldId = ''
  missForm.originals = ['空值']
  missForm.replace = ''
  missType.value = 'all'
  missOpen.value = true
}
function closeMiss() {
  missOpen.value = false
}
function applyMissFill(raw, cfg) {
  const originals = cfg.originals || ['空值']
  const hit = originals.some((o) => {
    if (o === '空值') return raw == null || raw === ''
    if (o === '空字符串') return raw === ''
    if (o === '0') return raw === 0 || raw === '0'
    return String(raw) === String(o)
  })
  return hit ? cfg.replace : raw
}
function confirmMiss() {
  if (!missReady.value) return
  const name = missForm.name.trim()
  if (drafts.value.some((f) => f.display_name === name || f.column_name === name)) {
    Message.warning('字段名称已存在')
    return
  }
  const src = drafts.value.find((f) => f.id === missForm.fieldId)
  if (!src) {
    Message.warning('请选择字段')
    return
  }
  drafts.value = [
    ...drafts.value,
    {
      id: `miss-${Date.now()}`,
      column_name: name,
      display_name: name,
      data_type: src.data_type,
      kind: src.kind,
      role: src.role,
      selected: true,
      missFill: {
        sourceField: missForm.fieldId,
        originals: [...(missForm.originals || ['空值'])],
        replace: missForm.replace,
      },
      nullShow: "展示为'-'",
    },
  ]
  persistGroups()
  missOpen.value = false
  Message.success(`已添加缺失值字段「${name}」`)
}

function studioKind(f) {
  if (!f) return 'str'
  if (f.kind === 'date') return 'date'
  if (f.kind === 'number') return 'num'
  return 'str'
}
function filterOpsOf(kind) {
  if (kind === 'num') {
    return FILTER_OPS.filter((o) => o.value !== 'contains')
  }
  if (kind === 'date') return FILTER_OPS.filter((o) => ['=', '!=', 'empty'].includes(o.value))
  return FILTER_OPS.filter((o) => ['=', '!=', 'contains', 'empty'].includes(o.value))
}
const filterableFields = computed(() => drafts.value.filter((f) => f.selected !== false && !f.missFill))
const activeFilter = computed(() => studioFilters.value.find((f) => f.id === activeFilterId.value) || null)
function fieldByFilterId(id) {
  return drafts.value.find((f) => f.id === id)
}
const activeFilterIsDate = computed(() => studioKind(fieldByFilterId(activeFilter.value?.fieldId)) === 'date')
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
function openStudioFilter() {
  if (!filterableFields.value.length) {
    Message.warning('暂无可过滤字段')
    return
  }
  if (!studioFilters.value.length) addFilterField()
  else if (!activeFilterId.value) activeFilterId.value = studioFilters.value[0].id
  fltOpen.value = true
}
function closeStudioFilter() {
  fltOpen.value = false
  persistGroups()
}
function addFilterField() {
  const used = new Set(studioFilters.value.map((f) => f.fieldId))
  const next = filterableFields.value.find((f) => !used.has(f.id) && f.kind === 'date')
    || filterableFields.value.find((f) => !used.has(f.id))
  if (!next) {
    Message.warning(filterableFields.value.length ? '可过滤字段已全部添加' : '暂无可过滤字段')
    return
  }
  const item = {
    id: `flt-${Date.now()}`,
    fieldId: next.id,
    mode: next.kind === 'date' ? 'condition' : 'condition',
    query: 'single',
    conditionField: '',
    op: '=',
    value: '',
    ...dateFilterDefaults(),
  }
  studioFilters.value.push(item)
  activeFilterId.value = item.id
}
function removeFilterField(id) {
  studioFilters.value = studioFilters.value.filter((f) => f.id !== id)
  if (activeFilterId.value === id) activeFilterId.value = studioFilters.value[0]?.id || ''
}
function changeFilterField(item, fieldId) {
  if (studioFilters.value.some((f) => f.id !== item.id && f.fieldId === fieldId)) {
    Message.warning('该字段已添加为过滤项')
    return
  }
  item.fieldId = fieldId
  const kind = studioKind(fieldByFilterId(fieldId))
  if (kind === 'date') item.mode = 'condition'
  if (kind === 'num' && item.op === 'contains') item.op = '='
}
function pickDate(side) {
  const f = activeFilter.value
  if (!f) return
  if (side === 'end') f.endKind = 'absolute'
  else f.startKind = 'absolute'
}
function boundDate(kind, date, anchor, sign, offset) {
  if (kind === 'absolute' && date) return String(date).slice(0, 10)
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const n = Number(offset) || 0
  const dir = sign === '+' ? 1 : -1
  if (anchor === 'Y') d.setFullYear(d.getFullYear() + dir * n)
  else if (anchor === 'M') d.setMonth(d.getMonth() + dir * n)
  else d.setDate(d.getDate() + dir * n)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
function rowMatchesFilter(row, flt) {
  const field = fieldByFilterId(flt.fieldId)
  if (!field) return true
  const raw = row[field.column_name]
  const kind = studioKind(field)
  if (kind === 'date') {
    const cell = raw == null ? '' : String(raw).slice(0, 10)
    if (!cell) return flt.op === 'empty'
    const start = boundDate(flt.startKind, flt.startDate, flt.startAnchor, flt.startSign, flt.startOffset)
    const end = boundDate(flt.endKind, flt.endDate, flt.endAnchor, flt.endSign, flt.endOffset)
    if (flt.dateMode === 'single') return !flt.startDate && flt.startKind === 'relative' ? cell >= start : cell === start || (flt.startKind === 'relative' && cell >= start)
    const rangeType = flt.rangeType || 'between'
    if (rangeType === 'start') return cell >= start
    if (rangeType === 'end') return cell <= end
    return cell >= start && cell <= end
  }
  if (flt.mode === 'enum') return true
  const op = flt.op || '='
  if (op === 'empty') return raw == null || raw === ''
  const val = String(flt.value ?? '').trim()
  if (!val) return true
  if (kind === 'num') {
    const n = Number(raw)
    const t = Number(val)
    if (Number.isNaN(n) || Number.isNaN(t)) return false
    if (op === '>') return n > t
    if (op === '<') return n < t
    if (op === '>=') return n >= t
    if (op === '<=') return n <= t
    if (op === '!=') return n !== t
    return n === t
  }
  const s = String(raw ?? '')
  if (op === 'contains') return s.includes(val)
  if (op === '!=') return s !== val
  return s === val
}

function closeToolMenus() {
  formatOpen.value = false
  nullOpen.value = false
}
function onTool(key) {
  if (key === 'find') {
    closeToolMenus()
    searchRef.value?.focus()
    return
  }
  if (key === 'ph') {
    closeToolMenus()
    openPh()
    return
  }
  if (key === 'group') {
    openGrp()
    return
  }
  if (key === 'nullfill') {
    closeToolMenus()
    openMiss()
    return
  }
  if (key === 'filter') {
    closeToolMenus()
    openStudioFilter()
    return
  }
  if (key === 'format') {
    nullOpen.value = false
    formatOpen.value = !formatOpen.value
    return
  }
  if (key === 'nullshow') {
    formatOpen.value = false
    nullOpen.value = !nullOpen.value
    return
  }
  closeToolMenus()
  Message.info('该数据处理能力即将开放')
}
function applyFormat(opt) {
  drafts.value.filter((f) => f.selected).forEach((f) => { f.format = opt.value })
  formatOpen.value = false
  Message.success(`展示格式已设为「${opt.label}」`)
}
function applyNullShow(opt) {
  drafts.value.filter((f) => f.selected).forEach((f) => { f.nullShow = opt.value })
  nullOpen.value = false
  Message.success(`空值展示已设为「${opt.label}」`)
}
function refresh() {
  if (!dataset.value) return
  loading.value = true
  setTimeout(() => {
    preview.value = previewDataset(store, dataset.value, 100)
    loading.value = false
  }, 280)
}
function save() {
  const ds = dataset.value
  if (!ds) {
    openModel()
    return
  }
  ds.display_name = ds.display_name || ds.table_name
  drafts.value.forEach((f) => {
    const col = (ds.columns || []).find((c) => c.column_name === f.column_name)
    if (!col) return
    col.semantic_hint = f.display_name === f.column_name ? null : f.display_name
    col.description = f.description || ''
  })
  persistGroups()
  ds.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
  ds.modifier_id = 'u-admin'
  Message.success('已保存数据集配置')
}
function copyFields(list) {
  const text = list.map((f) => f.display_name).join('\n')
  navigator.clipboard?.writeText(text)
  Message.success('已复制字段列表')
}

watch(dataset, (ds) => {
  if (!ds) return
  buildDrafts(ds)
  placeholders.value = (ds.extra?.placeholders || []).map((p) => ({ ...p }))
  studioFilters.value = (ds.extra?.studioFilters || []).map((f) => ({ ...f }))
  activeFilterId.value = studioFilters.value[0]?.id || ''
  preview.value = previewDataset(store, ds, 100)
  tab.value = 'preview'
}, { immediate: true })

watch(() => store.openModelDrawer, syncModelDrawer)

onMounted(() => {
  syncModelDrawer()
  if (!dataset.value && !modelOpen.value) emit('goto', 'datasets')
})
</script>

<template>
  <div class="studio">
    <header class="st-head">
      <div class="st-head-left">
        <button type="button" class="st-back" title="返回" @click="back"><icon-arrow-left /></button>
        <DsMark :size="12" />
        <span class="st-title">{{ dataset?.display_name || '未命名' }}</span>
      </div>
      <div class="st-head-right">
        <button type="button" class="st-pub" @click="openPublish">{{ boundToolCount ? '更新工具' : '发布工具' }}</button>
        <button type="button" class="st-save" @click="save">保存</button>
      </div>
    </header>

    <div class="st-work">
    <aside class="st-rail">
      <button type="button" class="st-rail-tab" :class="{ on: modelOpen }" @click="openModel">模型配置</button>
    </aside>
    <div class="st-work-main">
    <div class="st-tools">
      <button type="button" class="st-source" :title="sourceName" @click="openModel">
        <span class="st-source-top">
          <i class="st-table-ico" />
          <b>来源表</b>
          <em>·</em>
          <span>{{ tableCount }}</span>
        </span>
        <small>探索空间（公测）</small>
      </button>
      <template v-for="g in TOOLS" :key="g.group">
        <i class="st-split" />
        <template v-for="t in g.items" :key="t.key">
          <div v-if="t.kind === 'format'" class="st-format">
            <button type="button" class="st-format-sel" @click="onTool('format')">
              <span>展示格式</span>
              <i class="st-caret-sm" />
            </button>
            <div class="st-format-icons">
              <button type="button" title="百分比" @click="applyFormat(FORMAT_OPTS[3])"><i class="st-ico pct" /></button>
              <button type="button" title="1.0" @click="applyFormat(FORMAT_OPTS[2])"><i class="st-ico numfmt" /></button>
            </div>
            <div v-if="formatOpen" class="st-menu">
              <button v-for="opt in FORMAT_OPTS" :key="opt.value" type="button" @click="applyFormat(opt)">{{ opt.label }}</button>
            </div>
          </div>
          <div v-else class="st-tool-wrap">
            <button type="button" class="st-tool" @click="onTool(t.key)">
              <span class="st-tool-icorow">
                <i class="st-ico" :class="t.icon" />
                <i v-if="t.caret" class="st-caret-ico" />
              </span>
              <span>{{ t.label }}</span>
            </button>
            <div v-if="t.key === 'nullshow' && nullOpen" class="st-menu">
              <button v-for="opt in NULL_OPTS" :key="opt.value" type="button" @click="applyNullShow(opt)">{{ opt.label }}</button>
            </div>
          </div>
        </template>
      </template>
    </div>

    <div class="st-body">
      <aside class="st-outline">
        <div class="st-ol-head">
          <span>字段大纲</span>
          <button type="button" class="st-mini" title="列表"><icon-list /></button>
        </div>
        <label class="st-search">
          <icon-search />
          <input ref="searchRef" v-model="outlineKw" placeholder="" />
        </label>
        <div class="st-ol-scroll">
          <div class="st-sec">
            <div class="st-sec-h" @click="dimOpen = !dimOpen">
              <i class="st-tri" :class="{ on: dimOpen }" />
              <span>维度</span>
              <em>{{ dimensions.length }}</em>
              <button type="button" class="st-mini" title="复制" @click.stop="copyFields(dimensions)"><icon-copy /></button>
            </div>
            <div v-show="dimOpen" class="st-sec-b">
              <div v-for="f in dimensions" :key="f.id" class="st-field" :class="[f.kind, { grouped: f.grouped, miss: f.missFill }]">
                <i v-if="f.kind === 'date'" class="st-tri nested" />
                <i v-if="f.kind === 'date'" class="st-cal" />
                <span class="st-badge" :class="f.kind">{{ f.grouped ? 'Grp' : f.missFill ? 'Fill' : badgeOf(f.kind) }}</span>
                <span class="st-fname">{{ f.display_name }}</span>
              </div>
            </div>
          </div>
          <div class="st-sec">
            <div class="st-sec-h" @click="meaOpen = !meaOpen">
              <i class="st-tri" :class="{ on: meaOpen }" />
              <span>度量</span>
              <em>{{ measures.length }}</em>
              <button type="button" class="st-mini" title="复制" @click.stop="copyFields(measures)"><icon-copy /></button>
            </div>
            <div v-show="meaOpen" class="st-sec-b">
              <div v-for="f in measures" :key="f.id" class="st-field measure" :class="{ miss: f.missFill }">
                <span class="st-badge" :class="f.kind">{{ f.missFill ? 'Fill' : badgeOf(f.kind) }}</span>
                <span class="st-fname">{{ f.display_name }}</span>
              </div>
            </div>
          </div>
          <div class="st-sec">
            <div class="st-sec-h" @click="phSecOpen = !phSecOpen">
              <i class="st-tri" :class="{ on: phSecOpen }" />
              <span>占位符</span>
              <em>{{ placeholders.length }}</em>
            </div>
            <div v-show="phSecOpen" class="st-sec-b">
              <div v-for="p in placeholders" :key="p.id" class="st-field ph">
                <span class="st-ph-mark">${}</span>
                <span class="st-fname" :title="p.name">{{ p.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="st-main">
        <div class="st-tabs">
          <div class="st-seg">
            <button type="button" :class="{ on: tab === 'preview' }" @click="tab = 'preview'">数据预览</button>
            <button type="button" :class="{ on: tab === 'fields' }" @click="tab = 'fields'">字段详情</button>
          </div>
          <div class="st-tabs-right">
            <label class="st-hide">
              <span class="st-ckbox" :class="{ on: hideHidden }">
                <input v-model="hideHidden" type="checkbox" />
              </span>
              不展示隐藏字段
            </label>
            <button type="button" class="st-refresh-btn" :disabled="loading" @click="refresh">
              <icon-refresh /> 刷新
            </button>
          </div>
        </div>

        <div v-if="tab === 'preview'" class="st-preview">
          <div class="st-preview-inner">
            <div class="st-cols">
              <div
                v-for="(f, i) in previewCols"
                :key="f.column_name"
                class="st-col"
                :style="{ borderTopColor: colorOf(i) }"
              >
                <div class="st-col-name" :title="f.display_name">{{ f.display_name }}</div>
                <div class="st-col-meta">
                  <span class="st-badge" :class="f.kind">{{ badgeOf(f.kind) }}</span>
                  <i class="st-gear" />
                </div>
              </div>
            </div>
            <table v-if="previewRows.length" class="st-table">
              <tbody>
                <tr v-for="(row, ri) in previewRows" :key="ri">
                  <td v-for="f in previewCols" :key="f.column_name">{{ row[f.column_name] ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!previewRows.length" class="st-empty">
            <div class="st-illu">
              <span class="st-cal-box" />
              <span class="st-clock" />
            </div>
            <p>您可以直接开始处理并编辑数据，或点击下方<br />刷新按钮预览数据并配置。</p>
            <button type="button" class="st-refresh" :disabled="loading" @click="refresh">
              <icon-refresh /> {{ loading ? '刷新中' : '刷新' }}
            </button>
          </div>
        </div>

        <div v-else class="st-fields">
          <div class="st-fhead">
            <span />
            <span>字段名称</span>
            <span>物理字段名</span>
            <span>类型</span>
            <span>角色</span>
            <span>空值展示</span>
            <span>字段描述</span>
          </div>
          <div v-for="f in visibleFields" :key="f.id" class="st-frow">
            <label class="st-ck">
              <input v-model="f.selected" type="checkbox" />
            </label>
            <input v-model="f.display_name" class="st-fin" />
            <span class="st-fphy">{{ f.column_name }}</span>
            <span>{{ typeLabel(f.kind) }}</span>
            <span>{{ f.role === 'measure' ? '度量' : '维度' }}</span>
            <span>{{ f.nullShow }}</span>
            <input v-model="f.description" class="st-fin" placeholder="" />
          </div>
        </div>
      </section>
    </div>
    </div>
    </div>

    <Teleport to="body">
      <div v-if="modelOpen" class="model-overlay" role="dialog" aria-label="模型配置">
        <DatasetCreate
          :key="store.editDatasetId || 'new-model'"
          create-mode="canvas"
          embedded
          @goto="onCreateGoto"
          @close="closeModel"
          @done="onModelDone"
          @open-sql="onModelSql"
        />
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="phDlgOpen" class="ph-mask" @click.self="closePh">
        <div class="ph-sheet" role="dialog" aria-label="新建占位符">
          <div class="ph-head">
            <span>新建占位符</span>
            <button type="button" class="ph-x" aria-label="Close" @click="closePh"><icon-close /></button>
          </div>
          <div class="ph-body">
            <div class="ph-cols">
              <span class="ph-col-h on">变量名</span>
              <span class="ph-col-h">变量类型</span>
              <span class="ph-col-h wide">查询默认值</span>
            </div>
            <div class="ph-row">
              <input
                v-model="phForm.name"
                class="ph-in"
                :class="{ err: phNameInvalid }"
                maxlength="50"
                placeholder="请输入占位符名称"
              />
              <a-select v-model="phForm.type" class="ph-type" :bordered="true">
                <a-option v-for="t in PH_TYPES" :key="t.value" :value="t.value">{{ t.label }}</a-option>
              </a-select>
              <input v-model="phForm.defaultValue" class="ph-in wide" placeholder="请输入默认值" />
            </div>
            <div v-if="phNameInvalid" class="ph-err">{{ PH_TIP }}</div>
          </div>
          <div class="ph-foot">
            <button type="button" class="ph-btn" @click="closePh">取 消</button>
            <button type="button" class="ph-btn primary" @click.stop="confirmPh">确 定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="grpDlgOpen" class="ph-mask" @click.self="closeGrp">
        <div class="grp-sheet" role="dialog" aria-label="新建分组维度">
          <div class="grp-head">
            <div class="grp-head-row">
              <input v-model="grpForm.name" class="grp-name" maxlength="50" placeholder="请输入字段名称" />
              <button type="button" class="grp-desc-btn" :class="{ on: grpDescOpen }" @click="grpDescOpen = !grpDescOpen">
                <icon-edit /> 字段描述
              </button>
            </div>
            <textarea v-if="grpDescOpen" v-model="grpForm.description" class="grp-desc" rows="2" placeholder="请输入字段描述" />
            <button type="button" class="ph-x" aria-label="Close" @click="closeGrp"><icon-close /></button>
          </div>
          <div class="grp-body">
            <div class="grp-line">
              <span class="grp-label">分组字段</span>
              <a-select
                :model-value="grpForm.fieldId"
                allow-search
                placeholder="请选择分组字段"
                class="grp-select"
                style="width: 280px"
                @change="onGrpField"
              >
                <a-option v-for="f in grpSourceFields" :key="f.id" :value="f.id">{{ f.display_name }}</a-option>
              </a-select>
            </div>
            <div class="grp-setup-title">分组设置</div>
            <div v-if="!grpForm.fieldId" class="grp-empty">
              <svg class="grp-empty-ico" viewBox="0 0 48 48" aria-hidden="true">
                <rect x="10" y="6" width="22" height="28" rx="2" fill="#fff" stroke="#d9d9d9" />
                <path d="M24 6v7h8" fill="#f0f0f0" stroke="#d9d9d9" />
                <path d="M14 22h14M14 26h10" stroke="#e5e5e5" stroke-width="1.5" />
                <path d="M32 28l8 3-3.2 1.2L35 36z" fill="#fff" stroke="#bfbfbf" />
              </svg>
              <p>请先在上方选择分组字段</p>
            </div>
            <div v-else class="grp-setup">
              <div class="grp-unassigned">
                <div class="grp-col-h">未分组值 <em>{{ grpUngrouped.length }}</em></div>
                <button
                  v-for="v in grpUngrouped"
                  :key="v"
                  type="button"
                  class="grp-chip"
                  :disabled="!grpBuckets.length"
                  @click="assignGrpValue(grpBuckets[grpBuckets.length - 1], v)"
                >{{ v }}</button>
                <p v-if="!grpUngrouped.length" class="grp-hint">值已全部分组</p>
              </div>
              <div class="grp-buckets">
                <div v-for="b in grpBuckets" :key="b.id" class="grp-bucket">
                  <div class="grp-bucket-h">
                    <input v-model="b.name" class="grp-bucket-name" />
                    <button type="button" class="grp-bucket-x" @click="removeGrpBucket(b.id)"><icon-close /></button>
                  </div>
                  <div class="grp-bucket-vals">
                    <span v-for="v in b.values" :key="v" class="grp-tag" @click="unassignGrpValue(b, v)">{{ v }} ×</span>
                    <span v-if="!b.values.length" class="grp-hint">点击左侧值加入此分组</span>
                  </div>
                </div>
                <button type="button" class="grp-add" @click="addGrpBucket">+ 添加分组</button>
              </div>
            </div>
            <p v-if="grpHelpOpen" class="grp-help-txt">将原始字段值归入自定义分组。未分组的值会保留原值；点击左侧值加入当前最后一个分组，点击已分组标签可移出。</p>
          </div>
          <div class="grp-foot">
            <button type="button" class="grp-help" @click="grpHelpOpen = !grpHelpOpen">查看帮助</button>
            <button type="button" class="ph-btn" @click="closeGrp">取 消</button>
            <button type="button" class="ph-btn primary" :disabled="!grpReady" @click.stop="confirmGrp">确 定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="missOpen" class="ph-mask" @click.self="closeMiss">
        <div class="miss-sheet" role="dialog" aria-label="缺失值替换">
          <div class="ph-head">
            <span>缺失值替换</span>
            <button type="button" class="ph-x" aria-label="Close" @click="closeMiss"><icon-close /></button>
          </div>
          <div class="miss-body">
            <div class="miss-line">
              <span class="miss-label">字段名称</span>
              <input v-model="missForm.name" class="miss-name" maxlength="50" placeholder="请输入字段名称" />
            </div>
            <div class="miss-setup-h">
              <span>缺失值设置</span>
              <div class="miss-types">
                <button
                  v-for="t in MISS_TYPES"
                  :key="t.value"
                  type="button"
                  class="miss-type"
                  :class="{ on: missType === t.value }"
                  @click="setMissType(t.value)"
                >{{ t.label }}</button>
              </div>
            </div>
            <div class="miss-table">
              <div class="miss-th">
                <span>选择字段</span>
                <span>原值</span>
                <span>替换为</span>
              </div>
              <div class="miss-td">
                <a-select
                  v-model="missForm.fieldId"
                  allow-search
                  placeholder="请选择字段"
                  class="miss-sel"
                >
                  <a-option v-for="f in missFields" :key="f.id" :value="f.id">
                    <span class="miss-opt"><i :class="f.kind" />{{ f.display_name }}</span>
                  </a-option>
                </a-select>
                <a-select
                  v-model="missForm.originals"
                  multiple
                  allow-create
                  placeholder="原值"
                  class="miss-sel"
                >
                  <a-option v-for="o in MISS_ORIGINS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
                </a-select>
                <input v-model="missForm.replace" class="miss-rep" placeholder="请输入" />
              </div>
            </div>
          </div>
          <div class="ph-foot">
            <button type="button" class="ph-btn" @click="closeMiss">取 消</button>
            <button type="button" class="ph-btn primary" :disabled="!missReady" @click.stop="confirmMiss">确 定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="fltOpen" class="ph-mask" @click.self="closeStudioFilter">
        <div class="flt-sheet" role="dialog" aria-label="数据集过滤条件设置">
          <div class="flt-head">
            <span class="flt-title">数据集过滤条件设置</span>
            <button type="button" class="flt-help" @click="fltHelpOpen = !fltHelpOpen">查看帮助 <icon-right /></button>
            <button type="button" class="flt-x" title="关闭" @click="closeStudioFilter"><icon-close /></button>
          </div>
          <div class="flt-banner">数据集过滤条件将在整个数据集范围生效。支持日期、文本与数值字段。</div>
          <div class="flt-body">
            <aside class="flt-side">
              <div class="flt-side-hd">
                <span>过滤字段项</span>
                <button type="button" class="flt-add" title="添加过滤字段" @click="addFilterField"><icon-plus /></button>
              </div>
              <button
                v-for="item in studioFilters"
                :key="item.id"
                type="button"
                class="flt-chip"
                :class="{ on: activeFilterId === item.id }"
                @click="activeFilterId = item.id"
              >
                <span class="flt-ico" :class="studioKind(fieldByFilterId(item.fieldId))">
                  <icon-calendar v-if="studioKind(fieldByFilterId(item.fieldId)) === 'date'" :size="12" />
                  <span v-else-if="studioKind(fieldByFilterId(item.fieldId)) === 'num'">#</span>
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
                  <a-optgroup v-if="filterableFields.some((x) => x.kind === 'date')" label="日期">
                    <a-option v-for="f in filterableFields.filter((x) => x.kind === 'date')" :key="f.id" :value="f.id">{{ f.display_name }}</a-option>
                  </a-optgroup>
                  <a-optgroup v-if="filterableFields.some((x) => x.kind === 'string')" label="文本">
                    <a-option v-for="f in filterableFields.filter((x) => x.kind === 'string')" :key="f.id" :value="f.id">{{ f.display_name }}</a-option>
                  </a-optgroup>
                  <a-optgroup v-if="filterableFields.some((x) => x.kind === 'number')" label="数值">
                    <a-option v-for="f in filterableFields.filter((x) => x.kind === 'number')" :key="f.id" :value="f.id">{{ f.display_name }}</a-option>
                  </a-optgroup>
                </a-select>
                <span class="flt-chip-del" title="移除" @click.stop="removeFilterField(item.id)"><icon-close /></span>
              </button>
              <div v-if="!studioFilters.length" class="flt-empty">点击右上角 + 添加过滤字段</div>
            </aside>
            <section v-if="activeFilter" class="flt-main">
              <template v-if="activeFilterIsDate">
                <div class="flt-row">
                  <span class="flt-label">过滤方式</span>
                  <div class="flt-opts">
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.dateMode === 'single' }" @click="activeFilter.dateMode = 'single'"><i /><span>单日</span></button>
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.dateMode === 'range' }" @click="activeFilter.dateMode = 'range'"><i /><span>日区间</span></button>
                  </div>
                </div>
                <div v-if="activeFilter.dateMode === 'range'" class="flt-row">
                  <span class="flt-label">区间类型</span>
                  <div class="flt-opts">
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.rangeType === 'start' }" @click="activeFilter.rangeType = 'start'"><i /><span>开始于</span></button>
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.rangeType === 'end' }" @click="activeFilter.rangeType = 'end'"><i /><span>结束于</span></button>
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.rangeType === 'between' }" @click="activeFilter.rangeType = 'between'"><i /><span>时间区间</span></button>
                  </div>
                </div>
                <div class="flt-row flt-row-top">
                  <span class="flt-label">过滤条件</span>
                  <div class="flt-date-pair" :class="{ one: !(showDateStart && showDateEnd) }">
                    <div v-if="showDateStart" class="flt-date-col">
                      <div v-if="activeFilter.dateMode === 'range'" class="flt-date-k">开始于</div>
                      <a-date-picker v-model="activeFilter.startDate" value-format="YYYY-MM-DD" placeholder="请选择日期" style="width: 100%" @change="pickDate('start')" />
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
                      <a-date-picker v-model="activeFilter.endDate" value-format="YYYY-MM-DD" placeholder="请选择日期" style="width: 100%" @change="pickDate('end')" />
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
                  <span class="flt-label">字段类型</span>
                  <span class="flt-kind">{{ studioKind(fieldByFilterId(activeFilter.fieldId)) === 'num' ? '数值' : '文本' }}</span>
                </div>
                <div class="flt-row">
                  <span class="flt-label">过滤方式</span>
                  <div class="flt-opts">
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.mode === 'condition' }" @click="activeFilter.mode = 'condition'"><i /><span>按条件过滤</span></button>
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.mode === 'enum' }" @click="activeFilter.mode = 'enum'"><i /><span>按枚举过滤</span></button>
                  </div>
                </div>
                <div v-if="activeFilter.mode === 'enum'" class="flt-row">
                  <span class="flt-label">查询方式</span>
                  <div class="flt-opts">
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.query === 'single' }" @click="activeFilter.query = 'single'"><i /><span>单选</span></button>
                    <button type="button" class="flt-radio" :class="{ on: activeFilter.query === 'multi' }" @click="activeFilter.query = 'multi'"><i /><span>多选</span></button>
                  </div>
                </div>
                <div v-if="activeFilter.mode === 'enum'" class="flt-row">
                  <span class="flt-label">过滤条件</span>
                  <a-select v-model="activeFilter.conditionField" allow-clear placeholder="请选择字段" :style="{ width: '280px' }">
                    <a-option v-for="f in filterableFields" :key="f.id" :value="f.column_name">{{ f.display_name }}</a-option>
                  </a-select>
                </div>
                <div v-else class="flt-row">
                  <span class="flt-label">过滤条件</span>
                  <a-select v-model="activeFilter.op" :style="{ width: '104px' }">
                    <a-option v-for="o in filterOpsOf(studioKind(fieldByFilterId(activeFilter.fieldId)))" :key="o.value" :value="o.value">{{ o.label }}</a-option>
                  </a-select>
                  <a-input v-if="activeFilter.op !== 'empty'" v-model="activeFilter.value" :placeholder="studioKind(fieldByFilterId(activeFilter.fieldId)) === 'num' ? '数值' : '条件值'" :style="{ width: '168px' }" />
                </div>
              </template>
              <p v-if="fltHelpOpen" class="flt-help-txt">日期支持单日/区间与相对时间（T 当天、M 当月、Y 当年）。文本支持等于、包含；数值支持比较运算。</p>
            </section>
            <section v-else class="flt-main flt-main-empty">请在左侧添加过滤字段</section>
          </div>
        </div>
      </div>
    </Teleport>

    <PublishToolModal v-model:visible="pubOpen" :dataset-id="dataset?.id || ''" @goto="emit('goto', $event)" />
  </div>
</template>

<style scoped>
.studio {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgb(245, 248, 252);
  color: rgba(0, 0, 0, 0.85);
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', helvetica, arial, sans-serif;
}
.st-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.st-head-left { display: flex; align-items: center; gap: 4px; min-width: 0; }
.st-back {
  width: 28px; height: 28px; border: 0; background: transparent; cursor: pointer;
  color: rgba(0, 0, 0, 0.65); border-radius: 4px;
}
.st-back:hover { background: rgba(0, 0, 0, 0.04); }
.st-title { font-size: 14px; font-weight: 500; margin-left: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-head-right { display: flex; align-items: center; gap: 8px; }
.st-pub {
  height: 28px; padding: 0 12px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px; cursor: pointer;
  background: #fff; color: rgba(0, 0, 0, 0.85); font-size: 13px;
}
.st-pub:hover { color: rgb(46, 116, 255); border-color: rgb(46, 116, 255); }
.st-save {
  height: 28px; padding: 0 12px; border: 0; border-radius: 4px; cursor: pointer;
  background: rgb(46, 116, 255); color: #fff; font-size: 13px;
}
.st-tools {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 76px;
  padding: 10px 14px;
  background: rgb(245, 248, 252);
  overflow: visible;
  position: relative;
  z-index: 5;
}
.st-work { flex: 1; min-height: 0; display: flex; }
.st-rail {
  width: 36px; flex-shrink: 0; background: #fff; border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex; flex-direction: column; align-items: center; padding-top: 16px;
}
.st-rail-tab {
  writing-mode: vertical-rl; letter-spacing: 3px; padding: 10px 4px; border: 0; border-radius: 4px;
  background: transparent; cursor: pointer; font-size: 12px; color: rgba(0, 0, 0, 0.65); line-height: 16px;
}
.st-rail-tab:hover, .st-rail-tab.on { color: rgb(46, 116, 255); background: rgba(46, 116, 255, 0.06); }
.st-work-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.st-source {
  display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
  height: 46px; padding: 0; border: 0; background: transparent; cursor: pointer; text-align: left;
  color: rgba(0, 0, 0, 0.85); flex-shrink: 0;
}
.st-source-top { display: flex; align-items: center; gap: 4px; height: 24px; font-size: 12px; }
.st-source b { font-weight: 500; }
.st-source em { font-style: normal; color: rgba(0, 0, 0, 0.45); }
.st-source small { display: block; font-size: 12px; line-height: 18px; color: rgba(0, 0, 0, 0.45); padding-left: 4px; }
.st-table-ico {
  width: 16px; height: 16px; flex-shrink: 0; background: currentColor; opacity: 0.75;
  -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 4h5v5H4V4zm6.5 0h5v5h-5V4zM17 4h5v5h-5V4zM4 10.5h5v5H4v-5zm6.5 0h5v5h-5v-5zm6.5 0h5v5h-5v-5zM4 17h5v5H4v-5zm6.5 0h5v5h-5v-5zM17 17h5v5h-5v-5z'/></svg>") center / contain no-repeat;
  mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 4h5v5H4V4zm6.5 0h5v5h-5V4zM17 4h5v5h-5V4zM4 10.5h5v5H4v-5zm6.5 0h5v5h-5v-5zm6.5 0h5v5h-5v-5zM4 17h5v5H4v-5zm6.5 0h5v5h-5v-5zM17 17h5v5h-5v-5z'/></svg>") center / contain no-repeat;
}
.st-split { width: 1px; height: 32px; background: rgba(0, 0, 0, 0.08); margin: 0 8px; flex-shrink: 0; }
.st-tool-wrap { position: relative; flex-shrink: 0; }
.st-tool {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-width: 44px; height: 47px; padding: 4px 8px 4px 0; border: 0; background: transparent;
  cursor: pointer; color: rgba(0, 0, 0, 0.85); font-size: 12px; line-height: 18px; border-radius: 4px;
}
.st-tool:hover { background: rgba(0, 0, 0, 0.04); }
.st-tool span { white-space: nowrap; }
.st-tool-icorow { display: flex; align-items: center; height: 18px; margin-bottom: 2px; }
.st-tool-icorow .st-ico { margin-bottom: 0; }
.st-caret-ico {
  width: 0; height: 0; margin-left: 2px;
  border: 4px solid transparent; border-top-color: rgba(0, 0, 0, 0.45); border-bottom: 0;
}
.st-format { position: relative; display: flex; flex-direction: column; width: 114px; height: 49px; flex-shrink: 0; padding-right: 12px; }
.st-format-sel {
  display: flex; align-items: center; justify-content: space-between;
  height: 22px; padding: 0 4px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 2px;
  background: transparent; cursor: pointer; color: rgba(0, 0, 0, 0.65); font-size: 12px; width: 114px;
}
.st-format-sel:hover { border-color: rgb(46, 116, 255); color: rgb(46, 116, 255); }
.st-caret-sm {
  width: 0; height: 0; border: 4px solid transparent; border-top-color: rgba(0, 0, 0, 0.45); border-bottom: 0;
}
.st-format-icons { display: flex; align-items: center; height: 27px; }
.st-format-icons button {
  width: 30px; height: 27px; padding: 0; margin-right: 12px; border: 0; background: transparent;
  cursor: pointer; color: rgba(0, 0, 0, 0.65); display: flex; align-items: center; justify-content: center;
}
.st-format-icons button:hover { color: rgb(46, 116, 255); }
.st-format-icons .st-ico { margin: 0; opacity: 0.85; }
.st-menu {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 30; min-width: 128px;
  background: #fff; border-radius: 4px; padding: 4px 0;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
}
.st-menu button {
  display: block; width: 100%; height: 32px; padding: 0 12px; border: 0; background: transparent;
  text-align: left; cursor: pointer; font-size: 12px; color: rgba(0, 0, 0, 0.85);
}
.st-menu button:hover { background: rgba(0, 0, 0, 0.04); }
.st-ico {
  width: 18px; height: 18px; margin-bottom: 2px;
  background: currentColor; opacity: 0.7;
  -webkit-mask-size: contain; mask-size: contain;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  -webkit-mask-position: center; mask-position: center;
}
.st-ico.calc { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v14h14V5H5zm2 2h4v2H7V7zm6 0h4v2h-4V7zM7 11h4v2H7v-2zm6 0h4v2h-4v-2zM7 15h10v2H7v-2z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v14h14V5H5zm2 2h4v2H7V7zm6 0h4v2h-4V7zM7 11h4v2H7v-2zm6 0h4v2h-4v-2zM7 15h10v2H7v-2z'/></svg>"); }
.st-ico.group { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M3 5h8v6H3V5zm10 0h8v6h-8V5zM3 13h8v6H3v-6zm10 0h8v6h-8v-6z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M3 5h8v6H3V5zm10 0h8v6h-8V5zM3 13h8v6H3v-6zm10 0h8v6h-8v-6z'/></svg>"); }
.st-ico.level { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 4h6v4H4V4zm8 6h6v4h-6v-4zM4 16h10v4H4v-4zM7 8v2h3v2'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 4h6v4H4V4zm8 6h6v4h-6v-4zM4 16h10v4H4v-4zM7 8v2h3v2'/></svg>"); }
.st-ico.ph { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M7 4h10v3h-3v10h-4V7H7V4zm-2 16h14v2H5v-2z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M7 4h10v3h-3v10h-4V7H7V4zm-2 16h14v2H5v-2z'/></svg>"); }
.st-ico.clock { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.6l3.2 1.9-.9 1.5L11 13.2V7h2v5.6z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.6l3.2 1.9-.9 1.5L11 13.2V7h2v5.6z'/></svg>"); }
.st-ico.swap { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M7 7h11l-3-3 1.4-1.4L22.8 8 16.4 14.4 15 13l3-3H7V7zm10 10H6l3 3-1.4 1.4L1.2 16 7.6 9.6 9 11l-3 3h11v3z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M7 7h11l-3-3 1.4-1.4L22.8 8 16.4 14.4 15 13l3-3H7V7zm10 10H6l3 3-1.4 1.4L1.2 16 7.6 9.6 9 11l-3 3h11v3z'/></svg>"); }
.st-ico.tags { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M3 5h10l8 8-9 9-8-8V5zm4.5 2A1.5 1.5 0 117 8.5 1.5 1.5 0 017.5 7z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M3 5h10l8 8-9 9-8-8V5zm4.5 2A1.5 1.5 0 117 8.5 1.5 1.5 0 017.5 7z'/></svg>"); }
.st-ico.split { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 11h7V4h2v7h7v2h-7v7h-2v-7H4z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 11h7V4h2v7h7v2h-7v7h-2v-7H4z'/></svg>"); }
.st-ico.merge { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z'/></svg>"); }
.st-ico.pct { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M7.5 6A2.5 2.5 0 105 8.5 2.5 2.5 0 007.5 6zm9 9A2.5 2.5 0 1014 17.5 2.5 2.5 0 0016.5 15zM6 19L18 5l1.4 1.4L7.4 20.4z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M7.5 6A2.5 2.5 0 105 8.5 2.5 2.5 0 007.5 6zm9 9A2.5 2.5 0 1014 17.5 2.5 2.5 0 0016.5 15zM6 19L18 5l1.4 1.4L7.4 20.4z'/></svg>"); }
.st-ico.numfmt { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 16a4 4 0 118 0 4 4 0 01-8 0zm2 0a2 2 0 104 0 2 2 0 00-4 0zM16 4a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4zM3 4l17 17-1.4 1.4L1.6 5.4z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 16a4 4 0 118 0 4 4 0 01-8 0zm2 0a2 2 0 104 0 2 2 0 00-4 0zM16 4a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4zM3 4l17 17-1.4 1.4L1.6 5.4z'/></svg>"); }
.st-ico.empty { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 18h16v2H4v-2zM6 6a4 4 0 118 0 4 4 0 01-8 0zm2 0a2 2 0 104 0 2 2 0 00-4 0zm10 6a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 18h16v2H4v-2zM6 6a4 4 0 118 0 4 4 0 01-8 0zm2 0a2 2 0 104 0 2 2 0 00-4 0zm10 6a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z'/></svg>"); }
.st-ico.sort { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M8 4l4 5H9v7H7V9H4l4-5zm8 16l-4-5h3V8h2v7h3l-4 5z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M8 4l4 5H9v7H7V9H4l4-5zm8 16l-4-5h3V8h2v7h3l-4 5z'/></svg>"); }
.st-ico.filter { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 5h16l-6 8v5l-4 2v-7L4 5z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M4 5h16l-6 8v5l-4 2v-7L4 5z'/></svg>"); }
.st-ico.search { -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M10 4a6 6 0 014.7 9.8l5 5-1.4 1.4-5-5A6 6 0 1110 4zm0 2a4 4 0 100 8 4 4 0 000-8z'/></svg>"); mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M10 4a6 6 0 014.7 9.8l5 5-1.4 1.4-5-5A6 6 0 1110 4zm0 2a4 4 0 100 8 4 4 0 000-8z'/></svg>"); }

.st-body { flex: 1; min-height: 0; display: flex; background: #fff; }
.st-outline {
  width: 240px; flex-shrink: 0; display: flex; flex-direction: column; min-height: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.12); padding: 16px 0 8px;
}
.st-ol-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px 8px; font-size: 14px; font-weight: 500;
}
.st-mini {
  width: 22px; height: 22px; border: 0; background: transparent; cursor: pointer;
  color: rgba(0, 0, 0, 0.45); border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;
}
.st-mini:hover { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.75); }
.st-search {
  display: flex; align-items: center; gap: 6px; margin: 0 12px 10px; height: 28px;
  padding: 0 8px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 14px; color: rgba(0, 0, 0, 0.35);
}
.st-search input {
  flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-size: 12px; color: rgba(0, 0, 0, 0.85);
}
.st-ol-scroll { flex: 1; min-height: 0; overflow: auto; }
.st-sec-h {
  display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px;
  font-size: 12px; cursor: pointer; color: rgba(0, 0, 0, 0.85);
}
.st-sec-h em { font-style: normal; color: rgba(0, 0, 0, 0.45); margin-right: auto; }
.st-tri {
  width: 0; height: 0; border: 4px solid transparent; border-left: 5px solid rgba(0, 0, 0, 0.35);
  transform: rotate(0deg); transition: transform .15s;
}
.st-tri.on { transform: rotate(90deg); }
.st-tri.nested { opacity: 0.5; margin-right: 2px; }
.st-field {
  display: flex; align-items: center; gap: 6px; min-height: 28px; padding: 2px 12px 2px 28px; font-size: 12px;
}
.st-field.measure { color: rgb(0, 168, 112); }
.st-fname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-badge { font-size: 11px; line-height: 16px; color: #23c343; flex-shrink: 0; min-width: 18px; }
.st-badge.date { color: rgb(46, 116, 255); }
.st-badge.string { color: #13c2c2; }
.st-badge.number { color: #23c343; }
.st-cal {
  width: 12px; height: 12px; border: 1px solid rgb(46, 116, 255); border-radius: 2px; flex-shrink: 0;
  background: linear-gradient(#3c7eff 0 3px, transparent 3px);
}

.st-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.st-tabs {
  box-sizing: border-box;
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 10px 12px; gap: 12px; flex-shrink: 0;
  background: #fff;
}
.st-seg {
  box-sizing: border-box;
  display: flex; align-items: center; height: 28px; padding: 2px;
  background: rgba(0, 0, 0, 0.04); border-radius: 4px;
}
.st-seg button {
  height: 24px; padding: 2px 12px; border: 0; background: transparent; cursor: pointer;
  font-size: 12px; line-height: 20px; color: rgba(0, 0, 0, 0.65); font-weight: 400; border-radius: 4px;
}
.st-seg button.on {
  background: #fff; color: rgba(0, 0, 0, 0.85); font-weight: 500;
}
.st-tabs-right { display: flex; align-items: center; }
.st-hide {
  display: flex; align-items: center; margin: 0 8px 0 0; cursor: pointer;
  font-size: 14px; line-height: 21px; color: rgba(0, 0, 0, 0.65);
}
.st-ckbox {
  width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 2px; background: #fff;
  position: relative; display: inline-block;
}
.st-ckbox.on {
  background: rgb(46, 116, 255); border-color: rgb(46, 116, 255);
}
.st-ckbox.on::after {
  content: ''; position: absolute; left: 4px; top: 1px; width: 5px; height: 9px;
  border: 2px solid #fff; border-top: 0; border-left: 0; transform: rotate(45deg);
}
.st-ckbox input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.st-refresh-btn {
  height: 28px; padding: 0 16px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px;
  background: #fff; color: rgba(0, 0, 0, 0.65); font-size: 14px; line-height: 14px;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
}
.st-refresh-btn:hover { border-color: rgb(46, 116, 255); color: rgb(46, 116, 255); }
.st-refresh-btn:disabled { opacity: 0.55; cursor: default; }
.st-preview, .st-fields { flex: 1; min-height: 0; overflow: auto; position: relative; }
.st-preview-inner { min-width: max-content; }
.st-cols { display: flex; min-height: 68px; border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.st-col {
  box-sizing: border-box;
  width: 160px; flex: 0 0 160px; padding: 10px 8px 8px;
  border-top: 3px solid #23c343; background: #fafbfc;
}
.st-col-name { font-size: 12px; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-col-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.st-gear {
  width: 12px; height: 12px; border: 1.5px solid rgba(0, 0, 0, 0.25); border-radius: 50%;
  position: relative;
}
.st-gear::before { content: ''; position: absolute; inset: 3px; border: 1.5px solid rgba(0, 0, 0, 0.25); border-radius: 50%; }
.st-empty {
  position: absolute; inset: 80px 0 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: rgba(0, 0, 0, 0.45); font-size: 12px; text-align: center; line-height: 20px;
}
.st-illu { position: relative; width: 88px; height: 72px; margin-bottom: 16px; }
.st-cal-box {
  display: block; width: 64px; height: 56px; margin: 8px auto 0; border-radius: 8px;
  background: #eef2f6; box-shadow: inset 0 10px 0 #d9e2ec;
}
.st-clock {
  position: absolute; right: 8px; top: 0; width: 28px; height: 28px; border-radius: 50%;
  background: rgb(46, 116, 255); box-shadow: 0 0 0 3px #fff;
}
.st-clock::after { content: ''; position: absolute; left: 13px; top: 7px; width: 2px; height: 9px; background: #fff; }
.st-clock::before { content: ''; position: absolute; left: 13px; top: 12px; width: 7px; height: 2px; background: #fff; }
.st-refresh {
  margin-top: 16px; height: 32px; padding: 0 16px; border: 0; border-radius: 4px; cursor: pointer;
  background: rgb(46, 116, 255); color: #fff; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;
}
.st-refresh:disabled { opacity: 0.7; cursor: default; }
.st-table { border-collapse: collapse; table-layout: fixed; font-size: 12px; }
.st-table td {
  box-sizing: border-box;
  width: 160px; min-width: 160px; max-width: 160px;
  padding: 8px; border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.65); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.st-fhead, .st-frow {
  display: grid;
  grid-template-columns: 36px minmax(140px, 1fr) minmax(180px, 1.4fr) 90px 80px 110px minmax(140px, 1fr);
  align-items: center; min-height: 44px; padding: 0 12px; gap: 8px; font-size: 12px;
}
.st-fhead { color: rgba(0, 0, 0, 0.45); border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.st-frow { border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.st-fphy { color: rgba(0, 0, 0, 0.45); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.st-fin {
  height: 26px; padding: 0 8px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px;
  background: rgba(255, 255, 255, 0.1); font-size: 12px; color: rgba(0, 0, 0, 0.85); outline: none; min-width: 0; width: 100%;
}
.st-fin:focus { border-color: rgb(46, 116, 255); }
.st-ck { display: flex; align-items: center; justify-content: center; }
.st-ph-mark {
  flex-shrink: 0; font-size: 11px; line-height: 16px; color: rgb(114, 46, 209); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.st-field.ph { color: rgb(114, 46, 209); }

.ph-mask {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}
.ph-sheet {
  width: 800px;
  background: #fff;
  border-radius: 8px;
  color: rgba(0, 0, 0, 0.85);
  font-size: 12px;
  line-height: 18px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 9px 28px rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03);
}
.ph-head {
  position: relative; height: 56px; padding: 16px 47px 16px 20px;
  display: flex; align-items: center;
}
.ph-head span { font-size: 16px; font-weight: 500; line-height: 22px; }
.ph-x {
  position: absolute; top: 0; right: 0; width: 47px; height: 56px;
  border: 0; background: transparent; cursor: pointer; color: rgba(0, 0, 0, 0.45);
  font-size: 16px; display: flex; align-items: center; justify-content: center;
}
.ph-x:hover { color: rgba(0, 0, 0, 0.75); }
.ph-body { padding: 20px; }
.ph-cols, .ph-row {
  display: grid;
  grid-template-columns: 185px 185px 370px;
  gap: 0;
  align-items: center;
}
.ph-cols { padding-bottom: 12px; border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.ph-col-h { font-size: 14px; line-height: 21px; color: rgba(0, 0, 0, 0.45); }
.ph-col-h.on { color: rgba(0, 0, 0, 0.85); }
.ph-row { padding-top: 11px; }
.ph-in {
  box-sizing: border-box; height: 28px; width: 169px; padding: 2.5px 9px;
  border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 2px;
  background: rgba(255, 255, 255, 0.1); font-size: 14px; line-height: 21px;
  color: rgba(0, 0, 0, 0.65); outline: none;
}
.ph-in.wide { width: 100%; max-width: 330px; border-radius: 4px; }
.ph-in:focus { border-color: rgb(46, 116, 255); }
.ph-in.err, .ph-in.err:focus { border-color: rgba(239, 59, 59, 0.94); }
.ph-in::placeholder { color: rgba(0, 0, 0, 0.25); }
.ph-err { margin-top: 4px; font-size: 12px; line-height: 18px; color: rgb(255, 116, 116); }
.ph-foot {
  height: 56px; padding: 0 16px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;
}
.ph-btn {
  height: 28px; min-width: 66px; padding: 0 16px; border-radius: 4px; cursor: pointer;
  font-size: 14px; line-height: 14px; letter-spacing: 2px;
  background: #fff; color: rgba(0, 0, 0, 0.65); border: 1px solid rgba(0, 0, 0, 0.15);
}
.ph-btn.primary {
  background: rgb(46, 116, 255); border-color: rgb(46, 116, 255); color: #fff; letter-spacing: 2px;
}
.ph-btn:hover { border-color: rgb(46, 116, 255); color: rgb(46, 116, 255); }
.ph-btn.primary:hover { background: rgb(64, 128, 255); border-color: rgb(64, 128, 255); color: #fff; }
.ph-type { width: 169px; }
.ph-type :deep(.arco-select-view) {
  height: 28px; min-height: 28px; border-radius: 2px; background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.15); font-size: 14px; color: rgba(0, 0, 0, 0.65);
}
.ph-type :deep(.arco-select-view-value) { line-height: 26px; }
.ph-btn.primary:disabled {
  background: rgba(46, 116, 255, 0.3); border-color: transparent; color: #fff; cursor: default;
}
.ph-btn.primary:disabled:hover { background: rgba(46, 116, 255, 0.3); border-color: transparent; color: #fff; }

.grp-sheet {
  width: 760px; background: #fff; border-radius: 8px; color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 9px 28px rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03);
}
.grp-head { position: relative; padding: 16px 47px 16px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.grp-head-row { display: flex; align-items: center; gap: 12px; }
.grp-name {
  box-sizing: border-box; width: 300px; height: 28px; padding: 2.5px 9px;
  border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px; font-size: 14px; font-weight: 500;
  color: rgba(0, 0, 0, 0.65); outline: none; background: rgba(255, 255, 255, 0.1);
}
.grp-name:focus { border-color: rgb(46, 116, 255); }
.grp-name::placeholder { color: rgba(0, 0, 0, 0.25); font-weight: 400; }
.grp-desc-btn {
  display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0;
  border: 0; background: transparent; cursor: pointer; color: rgba(0, 0, 0, 0.65); font-size: 14px;
}
.grp-desc-btn.on, .grp-desc-btn:hover { color: rgb(46, 116, 255); }
.grp-desc {
  display: block; width: 100%; margin-top: 10px; min-height: 56px; padding: 8px 10px;
  border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px; font-size: 13px; resize: vertical; outline: none;
}
.grp-body { padding: 16px 20px 20px; }
.grp-line { display: flex; align-items: center; gap: 12px; height: 28px; }
.grp-label { font-size: 14px; color: rgba(0, 0, 0, 0.85); flex-shrink: 0; }
.grp-select { width: 280px; max-width: 280px; flex: 0 0 280px; }
.grp-select :deep(.arco-select-view) {
  width: 280px; height: 28px; min-height: 28px; border-radius: 4px; font-size: 12px; border: 1px solid rgba(0, 0, 0, 0.15);
}
.grp-setup-title { margin: 24px 0 10px; font-size: 14px; }
.grp-empty {
  height: 188px; border-radius: 8px; background: rgb(247, 247, 247);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: rgba(0, 0, 0, 0.45); font-size: 14px;
}
.grp-empty-ico { width: 48px; height: 48px; margin-bottom: 12px; display: block; }
.grp-setup { display: grid; grid-template-columns: 240px 1fr; gap: 12px; min-height: 188px; }
.grp-unassigned, .grp-bucket {
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; padding: 10px; background: #fafafa;
}
.grp-col-h { font-size: 12px; margin-bottom: 8px; color: rgba(0, 0, 0, 0.65); }
.grp-col-h em { font-style: normal; color: rgba(0, 0, 0, 0.45); }
.grp-chip, .grp-tag {
  display: inline-flex; align-items: center; margin: 0 6px 6px 0; padding: 2px 8px;
  border-radius: 4px; font-size: 12px; cursor: pointer; border: 1px solid rgba(0, 0, 0, 0.08); background: #fff;
}
.grp-chip:hover, .grp-tag:hover { border-color: rgb(46, 116, 255); color: rgb(46, 116, 255); }
.grp-chip:disabled { opacity: 0.5; cursor: default; }
.grp-buckets { display: flex; flex-direction: column; gap: 8px; }
.grp-bucket-h { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.grp-bucket-name {
  flex: 1; height: 26px; padding: 0 8px; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px; font-size: 12px; outline: none;
}
.grp-bucket-x { border: 0; background: transparent; cursor: pointer; color: rgba(0, 0, 0, 0.45); }
.grp-hint { font-size: 12px; color: rgba(0, 0, 0, 0.35); margin: 0; }
.grp-add {
  height: 28px; border: 1px dashed rgba(0, 0, 0, 0.15); border-radius: 4px; background: #fff;
  cursor: pointer; color: rgb(46, 116, 255); font-size: 12px;
}
.grp-help {
  border: 0; background: transparent; cursor: pointer; color: rgb(46, 116, 255); font-size: 14px; padding: 0; margin-right: auto;
}
.grp-help-txt { margin: 12px 0 0; font-size: 12px; line-height: 20px; color: rgba(0, 0, 0, 0.45); }
.grp-foot {
  height: 56px; padding: 12px 16px; display: flex; align-items: center; gap: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.st-field.grouped, .st-field.grouped .st-badge { color: rgb(114, 46, 209); }
.st-field.miss { color: rgb(247, 114, 52); }

.miss-sheet {
  width: 700px; background: #fff; border-radius: 8px; color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 9px 28px rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03);
}
.miss-body { padding: 20px; }
.miss-line { display: flex; align-items: center; gap: 12px; height: 28px; }
.miss-label { font-size: 14px; color: rgba(0, 0, 0, 0.85); flex-shrink: 0; }
.miss-name {
  box-sizing: border-box; width: 300px; height: 28px; padding: 2.5px 9px;
  border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px; font-size: 14px;
  color: rgba(0, 0, 0, 0.65); outline: none; background: rgba(255, 255, 255, 0.1);
}
.miss-name:focus { border-color: rgb(46, 116, 255); }
.miss-name::placeholder { color: rgba(0, 0, 0, 0.25); }
.miss-setup-h {
  display: flex; align-items: center; justify-content: space-between;
  margin: 24px 0 10px; font-size: 14px;
}
.miss-types { display: flex; gap: 4px; }
.miss-type {
  height: 24px; padding: 0 8px; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 12px; color: rgba(0, 0, 0, 0.65);
}
.miss-type.on, .miss-type:hover { color: rgb(46, 116, 255); border-color: rgb(46, 116, 255); background: rgba(46, 116, 255, 0.06); }
.miss-table { border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 8px; overflow: hidden; }
.miss-th, .miss-td {
  display: grid; grid-template-columns: 200px 202px 202px; gap: 12px; align-items: center; padding: 10px 16px;
}
.miss-th { background: rgb(247, 247, 247); font-size: 14px; color: rgba(0, 0, 0, 0.45); }
.miss-td { padding-bottom: 16px; }
.miss-sel { width: 200px; }
.miss-sel :deep(.arco-select-view) { height: 28px; min-height: 28px; border-radius: 4px; font-size: 12px; }
.miss-rep {
  box-sizing: border-box; height: 28px; width: 202px; padding: 2.5px 9px;
  border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px; font-size: 14px; outline: none;
}
.miss-rep:focus { border-color: rgb(46, 116, 255); }
.miss-opt { display: inline-flex; align-items: center; gap: 6px; }
.miss-opt i { width: 6px; height: 6px; border-radius: 50%; background: #13c2c2; }
.miss-opt i.date { background: rgb(46, 116, 255); }
.miss-opt i.number { background: #23c343; }

.flt-sheet {
  width: 800px; background: #fff; border-radius: 8px; overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 9px 28px rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03);
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: rgba(0, 0, 0, 0.85);
}
.flt-head {
  display: flex; align-items: center; height: 48px; padding: 0 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.flt-title { font-size: 14px; font-weight: 600; }
.flt-help {
  margin-left: 12px; border: none; background: none; color: rgb(46, 116, 255);
  font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 2px;
}
.flt-x {
  margin-left: auto; width: 24px; height: 24px; border: none; background: transparent;
  color: rgba(0, 0, 0, 0.45); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;
}
.flt-x:hover { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.85); }
.flt-banner {
  display: flex; align-items: center; min-height: 40px; padding: 8px 16px;
  background: #e8f3ff; color: rgba(0, 0, 0, 0.65); font-size: 12px; line-height: 18px;
}
.flt-body { display: grid; grid-template-columns: 200px minmax(0, 1fr); min-height: 320px; }
.flt-side { padding: 12px; background: #f7f8fa; border-right: 1px solid rgba(0, 0, 0, 0.06); }
.flt-side-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 12px; color: rgba(0, 0, 0, 0.65); }
.flt-add {
  width: 20px; height: 20px; border: none; background: transparent; color: rgb(46, 116, 255);
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;
}
.flt-add:hover { background: rgba(46, 116, 255, 0.08); }
.flt-chip {
  display: flex; align-items: center; gap: 4px; width: 100%; height: 32px; margin-bottom: 8px;
  padding: 0 4px 0 8px; border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 4px; background: #fff; cursor: pointer; text-align: left;
}
.flt-chip.on { border-color: rgb(46, 116, 255); }
.flt-chip-del { display: none; color: rgba(0, 0, 0, 0.35); line-height: 0; }
.flt-chip:hover .flt-chip-del { display: inline-flex; }
.flt-ico {
  flex-shrink: 0; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: rgb(46, 116, 255); line-height: 1;
}
.flt-ico.date { color: rgb(46, 116, 255); }
.flt-ico.num { color: #00b42a; }
.flt-ico.str { color: #165dff; font-size: 11px; font-style: italic; }
.flt-empty, .flt-main-empty { color: rgba(0, 0, 0, 0.35); font-size: 12px; padding: 16px 0; text-align: center; }
.flt-main { padding: 20px 24px; }
.flt-main-empty { display: flex; align-items: flex-start; }
.flt-row { display: flex; align-items: center; gap: 16px; min-height: 32px; margin-bottom: 18px; }
.flt-row-top { align-items: flex-start; }
.flt-date-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-width: 0; }
.flt-date-pair.one { grid-template-columns: minmax(220px, 1fr); }
.flt-date-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.flt-date-k { font-size: 12px; color: rgba(0, 0, 0, 0.65); }
.flt-rel { display: flex; align-items: center; gap: 8px; }
.flt-label { width: 72px; flex-shrink: 0; font-size: 13px; color: rgba(0, 0, 0, 0.65); }
.flt-kind { font-size: 13px; color: rgba(0, 0, 0, 0.85); }
.flt-opts { display: flex; align-items: center; gap: 24px; }
.flt-radio {
  display: inline-flex; align-items: center; gap: 6px; border: none; background: none; padding: 0;
  cursor: pointer; font-size: 13px; color: rgba(0, 0, 0, 0.85);
}
.flt-radio i {
  width: 14px; height: 14px; border-radius: 50%; border: 1px solid #c9cdd4; position: relative; box-sizing: border-box;
}
.flt-radio.on i { border-color: rgb(46, 116, 255); }
.flt-radio.on i::after {
  content: ''; position: absolute; left: 3px; top: 3px; width: 6px; height: 6px; border-radius: 50%; background: rgb(46, 116, 255);
}
.flt-chip :deep(.arco-select-view) { padding: 0; background: transparent; }
.flt-help-txt { margin: 8px 0 0; font-size: 12px; line-height: 20px; color: rgba(0, 0, 0, 0.45); }
</style>
