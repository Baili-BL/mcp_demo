<script setup>
import { computed, nextTick, onDeactivated, reactive, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  store, findSource, findGrant, getOrCreateGrant, previewDataset,
  saveDatasetGrant, toolsOfDataset, readerToolsOfDataset, readRequestsOf, forgetDatasets, isReadControlled, colPolicyColumns,
  ROOT_FOLDER_ID, folderPath, flattenFolders, folderChildren, findFolder, rowLeaves,
} from '../store'
import SchemaExplorer from '../components/SchemaExplorer.vue'
import PublishToolModal from '../components/PublishToolModal.vue'
import RowPermStudio from '../components/RowPermStudio.vue'
import ColPermStudio from '../components/ColPermStudio.vue'
import ReadAccessDrawer from '../components/ReadAccessDrawer.vue'
import Icon1 from '../components/icons/Icon1.vue'
import Icon2 from '../components/icons/Icon2.vue'
import Icon3 from '../components/icons/Icon3.vue'
import Icon4 from '../components/icons/Icon4.vue'
import Icon5 from '../components/icons/Icon5.vue'
import Icon6 from '../components/icons/Icon6.vue'
import Icon7 from '../components/icons/Icon7.vue'
import DsMark from '../components/icons/DsMark.vue'
import IconEye from '../components/icons/IconEye.vue'

const emit = defineEmits(['goto'])
const ME = 'u-admin'

const mineOnly = ref(false)
const sortKey = ref('updated')
const expandedKeys = ref(store.datasetFolders.map((f) => f.id))
const folderOpen = ref(false)
const folderMode = ref('create')
const folderForm = reactive({ name: '', parent_id: ROOT_FOLDER_ID, id: '' })
const moveOpen = ref(false)
const moveTargets = ref([])
const moveFolderId = ref(ROOT_FOLDER_ID)
const moveKw = ref('')
const moveExpandedKeys = ref([ROOT_FOLDER_ID])
const selectedIds = ref([])
const schemaDs = ref(null)
const schemaOpen = ref(false)
const preview = ref(null)
const previewOpen = ref(false)
const publishOpen = ref(false)
const publishDsId = ref('')
const collabOpen = ref(false)
const rowStudioOpen = ref(false)
const colStudioOpen = ref(false)
const permDsId = ref('')
const propOpen = ref(false)
const currentDs = ref(null)
const collabDraft = ref([])
const collabAdd = reactive({ userId: '', perm: 'use' })
const propDraft = reactive({ display_name: '', description: '', creator_id: '' })
const dragItem = ref(null)
const dropTargetId = ref('')
const dropOk = ref(false)
const previewTab = ref('fields')
const previewKw = ref('')
const previewTarget = ref(null)

const sourceMap = computed(() => new Map(store.sources.map((s) => [s.id, s])))
const userMap = computed(() => new Map(store.users.map((u) => [u.id, u])))
const staffUsers = computed(() => store.users.filter((u) => u.kind === 'staff' && u.status === '正常'))
function sortByKey(list, nameOf) {
  return [...list].sort((a, b) => {
    if (sortKey.value === 'name') return String(nameOf(a)).localeCompare(String(nameOf(b)), 'zh')
    return String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
  })
}

function datasetMatches(d) {
  if (mineOnly.value && d.creator_id && d.creator_id !== ME) return false
  const sid = store.datasetFlt.sourceId
  if (sid && d.data_source_id !== sid) return false
  const type = store.datasetFlt.type
  const kind = d.extra?.source_kind || (d.source_type === 'sql' ? 'sql' : 'table')
  if (type === 'table' && d.source_type === 'sql') return false
  if (type === 'view' && kind !== 'view') return false
  if (type === 'sql' && d.source_type !== 'sql') return false
  const q = store.datasetFlt.kw.trim().toLowerCase()
  if (!q) return true
  const src = sourceMap.value.get(d.data_source_id)
  const owner = userMap.value.get(d.creator_id)
  return `${d.display_name} ${d.table_name} ${d.description || ''} ${src?.name || ''} ${owner?.name || ''}`.toLowerCase().includes(q)
}

function datasetsIn(folderId) {
  return sortByKey(
    store.datasets.filter((d) => (d.folder_id || ROOT_FOLDER_ID) === folderId && datasetMatches(d)),
    (d) => d.display_name,
  )
}

function folderVisible(folder) {
  const q = store.datasetFlt.kw.trim().toLowerCase()
  if (!q) return true
  if (String(folder.name).toLowerCase().includes(q)) return true
  if (datasetsIn(folder.id).length) return true
  return folderChildren(store, folder.id).some((f) => folderVisible(f))
}

function appendFolderRows(out, folder, depth) {
  if (!folderVisible(folder)) return
  const childDatasets = datasetsIn(folder.id)
  const expanded = searching.value || expandedKeys.value.includes(folder.id)
  out.push({
    id: folder.id,
    rowType: 'folder',
    name: folder.name,
    display_name: folder.name,
    parent_id: folder.parent_id,
    creator_id: folder.creator_id,
    modifier_id: folder.creator_id,
    created_at: folder.created_at || folder.updated_at,
    updated_at: folder.updated_at,
    childrenCount: childDatasets.length,
    depth,
    expanded,
  })
  if (!expanded) return
  sortByKey(folderChildren(store, folder.id), (f) => f.name).forEach((child) => {
    appendFolderRows(out, child, depth + 1)
  })
  childDatasets.forEach((d) => {
    out.push({
      ...d,
      rowType: 'dataset',
      nested: true,
      depth: depth + 1,
    })
  })
}

const searching = computed(() => !!store.datasetFlt.kw.trim())
const folderTree = computed(() => flattenFolders(store, ROOT_FOLDER_ID))
const folderOptions = computed(() => [
  { id: ROOT_FOLDER_ID, path: '根目录' },
  ...folderTree.value.map((f) => ({ id: f.id, path: folderPath(store, f.id) })),
])
const tableRows = computed(() => {
  const rows = datasetsIn(ROOT_FOLDER_ID).map((d) => ({ ...d, rowType: 'dataset', depth: 0 }))
  sortByKey(folderChildren(store, ROOT_FOLDER_ID), (f) => f.name).forEach((folder) => {
    appendFolderRows(rows, folder, 0)
  })
  return rows
})
const visibleIds = computed(() => tableRows.value.map((r) => r.id))
const selectedSet = computed(() => new Set(selectedIds.value))
const selectedRecords = computed(() => tableRows.value.filter((r) => selectedSet.value.has(r.id)))
const allSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every((id) => selectedSet.value.has(id)))
const someSelected = computed(() => visibleIds.value.some((id) => selectedSet.value.has(id)))
const batchOpen = computed({
  get: () => selectedIds.value.length > 0,
  set: (open) => { if (!open) selectedIds.value = [] },
})
const flatFolders = computed(() => {
  const names = {}
  store.datasetFolders.forEach((f) => {
    names[f.name] = (names[f.name] || 0) + 1
  })
  return store.datasetFolders.map((f) => {
    const parent = findFolder(store, f.parent_id)
    return {
      id: f.id,
      name: names[f.name] > 1 && parent ? `${f.name}（${parent.name}）` : f.name,
    }
  })
})
const moveBlocked = computed(() => {
  const blocked = new Set()
  moveTargets.value.forEach((t) => {
    if (t.rowType !== 'folder') return
    blocked.add(t.id)
    store.datasetFolders.forEach((f) => {
      if (isSelfOrDescendant(t.id, f.id)) blocked.add(f.id)
    })
  })
  return blocked
})
const moveDestOptions = computed(() => [
  { id: ROOT_FOLDER_ID, name: '根目录' },
  ...flatFolders.value.filter((f) => !moveBlocked.value.has(f.id)),
])
const moveTreeRows = computed(() => {
  const q = moveKw.value.trim().toLowerCase()
  const blocked = moveBlocked.value
  const opened = new Set(moveExpandedKeys.value)
  function visible(id, name) {
    if (!q) return true
    if (String(name).toLowerCase().includes(q)) return true
    return folderChildren(store, id).some((c) => visible(c.id, c.name))
  }
  function expanded(id) {
    return q ? true : opened.has(id)
  }
  const out = []
  function walk(parentId, depth) {
    folderChildren(store, parentId).forEach((f) => {
      if (!visible(f.id, f.name)) return
      const kids = folderChildren(store, f.id).filter((c) => visible(c.id, c.name))
      out.push({
        id: f.id,
        name: f.name,
        depth,
        hasKids: kids.length > 0,
        expanded: kids.length > 0 && expanded(f.id),
        blocked: blocked.has(f.id),
      })
      if (kids.length && expanded(f.id)) walk(f.id, depth + 1)
    })
  }
  const rootKids = folderChildren(store, ROOT_FOLDER_ID).filter((c) => visible(c.id, c.name))
  if (!q || '根目录'.includes(q) || rootKids.length) {
    out.push({
      id: ROOT_FOLDER_ID,
      name: '根目录',
      depth: 0,
      hasKids: rootKids.length > 0,
      expanded: rootKids.length > 0 && expanded(ROOT_FOLDER_ID),
      blocked: false,
    })
    if (rootKids.length && expanded(ROOT_FOLDER_ID)) walk(ROOT_FOLDER_ID, 1)
  }
  return out
})

watch(visibleIds, (ids) => {
  const allow = new Set(ids)
  selectedIds.value = selectedIds.value.filter((id) => allow.has(id))
})

watch(searching, (on) => {
  if (on) expandedKeys.value = store.datasetFolders.map((f) => f.id)
})

function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
function toggleFolder(id) {
  if (expandedKeys.value.includes(id)) {
    expandedKeys.value = expandedKeys.value.filter((k) => k !== id)
  } else {
    expandedKeys.value = [...expandedKeys.value, id]
  }
}
function openCreateFolder(parentId) {
  folderMode.value = 'create'
  folderForm.name = ''
  folderForm.parent_id = parentId || ROOT_FOLDER_ID
  folderForm.id = ''
  folderOpen.value = true
}
function openRenameFolder(f) {
  folderMode.value = 'rename'
  folderForm.name = f.name
  folderForm.parent_id = f.parent_id || ROOT_FOLDER_ID
  folderForm.id = f.id
  folderOpen.value = true
}
function saveFolder() {
  const name = folderForm.name.trim()
  if (!name) {
    Message.warning('请填写目录名称')
    return false
  }
  const parent = folderForm.parent_id || ROOT_FOLDER_ID
  const dup = store.datasetFolders.some((f) =>
    f.id !== folderForm.id && (f.parent_id || ROOT_FOLDER_ID) === parent && f.name === name,
  )
  if (dup) {
    Message.warning('同一层级已有同名目录')
    return false
  }
  if (folderMode.value === 'rename') {
    const f = findFolder(store, folderForm.id)
    if (!f) return false
    f.name = name
    f.updated_at = nowStamp()
    Message.success('目录已重命名')
  } else {
    const id = `fld-${Date.now().toString(36)}`
    store.datasetFolders.push({
      id,
      name,
      parent_id: parent,
      creator_id: ME,
      created_at: nowStamp(),
      updated_at: nowStamp(),
    })
    if (parent && parent !== ROOT_FOLDER_ID && !expandedKeys.value.includes(parent)) {
      expandedKeys.value = [...expandedKeys.value, parent]
    }
    Message.success('目录已创建')
  }
  return true
}
function onDeleteFolder(f) {
  const childFolders = store.datasetFolders.filter((x) => x.parent_id === f.id)
  const childDs = store.datasets.filter((d) => d.folder_id === f.id)
  Modal.confirm({
    title: `删除目录「${f.name}」？`,
    content: (childFolders.length || childDs.length)
      ? `子目录将上移到上一级，目录内 ${childDs.length} 个数据集一并移到上一级。`
      : '目录为空，确认删除。',
    okText: '删除',
    onOk: () => {
      removeFolder(f)
      selectedIds.value = selectedIds.value.filter((id) => id !== f.id)
      Message.success('目录已删除')
    },
  })
}
function onFolderMore(key, f) {
  nextTick(() => {
    if (key === 'create') openCreateFolder(f.id)
    else if (key === 'rename') openRenameFolder(f)
    else if (key === 'move') openMove(f)
    else if (key === 'delete') onDeleteFolder(f)
  })
}
function toggleSelect(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id]
  } else {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }
}
function toggleSelectAll(checked) {
  selectedIds.value = checked ? [...visibleIds.value] : []
}
function clearSelect() {
  selectedIds.value = []
}
function batchTransfer() {
  Message.info('转让所有人功能即将开放')
}
function batchClearCache() {
  if (!selectedIds.value.length) return
  Message.success(`已提交清除 ${selectedIds.value.length} 项缓存`)
}
function openMove(record) {
  const targets = record ? [record] : selectedRecords.value
  if (!targets.length) {
    Message.warning('请先勾选要移动的文件或目录')
    return
  }
  moveTargets.value = targets
  const first = targets[0]
  moveFolderId.value = first.rowType === 'folder'
    ? (first.parent_id || ROOT_FOLDER_ID)
    : (first.folder_id || ROOT_FOLDER_ID)
  moveKw.value = ''
  moveExpandedKeys.value = [ROOT_FOLDER_ID, ...store.datasetFolders.map((f) => f.id)]
  moveOpen.value = true
}
function toggleMoveExpand(id) {
  if (moveExpandedKeys.value.includes(id)) {
    moveExpandedKeys.value = moveExpandedKeys.value.filter((k) => k !== id)
  } else {
    moveExpandedKeys.value = [...moveExpandedKeys.value, id]
  }
}
function confirmMove() {
  if (saveMove()) moveOpen.value = false
}
function moveOne(record, dest) {
  if (record.rowType === 'folder') {
    const f = findFolder(store, record.id)
    if (!f) return { ok: false, msg: '目录不存在' }
    if (isSelfOrDescendant(f.id, dest)) return { ok: false, msg: '不能移动到自身或子目录内' }
    if ((f.parent_id || ROOT_FOLDER_ID) === dest) return { ok: false, msg: '已在该目录' }
    const dup = store.datasetFolders.some((x) => (
      x.id !== f.id && (x.parent_id || ROOT_FOLDER_ID) === dest && x.name === f.name
    ))
    if (dup) return { ok: false, msg: '目标位置已有同名目录' }
    f.parent_id = dest
    f.updated_at = nowStamp()
    return { ok: true, name: f.name }
  }
  const d = store.datasets.find((x) => x.id === record.id)
  if (!d) return { ok: false, msg: '数据集不存在' }
  if ((d.folder_id || ROOT_FOLDER_ID) === dest) return { ok: false, msg: '已在该目录' }
  d.folder_id = dest
  d.modifier_id = ME
  d.updated_at = nowStamp()
  return { ok: true, name: d.display_name }
}
function saveMove() {
  const dest = moveFolderId.value || ROOT_FOLDER_ID
  let ok = 0
  let lastErr = ''
  moveTargets.value.forEach((t) => {
    const res = moveOne(t, dest)
    if (res.ok) ok += 1
    else lastErr = res.msg
  })
  if (dest !== ROOT_FOLDER_ID && !expandedKeys.value.includes(dest)) {
    expandedKeys.value = [...expandedKeys.value, dest]
  }
  if (ok) {
    Message.success(ok === 1 ? `已移动到「${moveDestOptions.value.find((f) => f.id === dest)?.name || '根目录'}」` : `已移动 ${ok} 项`)
    selectedIds.value = []
    return true
  }
  Message.warning(lastErr || '无法移动')
  return false
}

function destFolderOf(record) {
  if (!record) return ROOT_FOLDER_ID
  if (record.rowType === 'folder') return record.id
  return record.folder_id || ROOT_FOLDER_ID
}

function isSelfOrDescendant(movingId, targetFolderId) {
  if (!movingId || !targetFolderId || targetFolderId === ROOT_FOLDER_ID) return false
  if (movingId === targetFolderId) return true
  const seen = new Set()
  let cur = findFolder(store, targetFolderId)
  while (cur && !seen.has(cur.id)) {
    if (cur.id === movingId) return true
    seen.add(cur.id)
    cur = findFolder(store, cur.parent_id)
  }
  return false
}

function canDropOn(record) {
  const drag = dragItem.value
  if (!drag || !record) return false
  if (drag.id === record.id) return false
  if (drag.type === 'folder' && isSelfOrDescendant(drag.id, destFolderOf(record))) return false
  return true
}

function onDragStart(e, record) {
  if (e.target.closest('.ds-row-ops, .arco-dropdown, button, input, .arco-checkbox, .ds-check')) {
    e.preventDefault()
    return
  }
  dragItem.value = {
    type: record.rowType === 'folder' ? 'folder' : 'dataset',
    id: record.id,
    name: record.display_name || record.name,
  }
  dropTargetId.value = ''
  dropOk.value = false
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', record.id)
  const row = e.currentTarget
  const ghost = document.createElement('div')
  ghost.style.cssText = [
    'position:fixed', 'top:-1000px', 'left:0', `width:${row.offsetWidth}px`, 'height:52px',
    'display:flex', 'align-items:center', 'gap:8px', 'padding:0 16px 0 72px', 'box-sizing:border-box',
    'background:#fff', 'border:1px solid rgb(var(--primary-6))', 'border-radius:4px',
    'box-shadow:0 6px 16px rgba(0,0,0,.12)', 'font-size:14px', 'color:rgb(11,11,15)', 'white-space:nowrap',
  ].join(';')
  ghost.innerHTML = `<span>${record.rowType === 'folder' ? '📁' : '▦'}</span><span></span><span style="margin-left:auto;font-size:12px;color:var(--color-text-3)">拖到文件夹以移动</span>`
  ghost.children[1].textContent = dragItem.value.name
  document.body.appendChild(ghost)
  e.dataTransfer.setDragImage(ghost, 80, 26)
  setTimeout(() => ghost.remove(), 0)
}

function onDragEnd() {
  dragItem.value = null
  dropTargetId.value = ''
  dropOk.value = false
}

function onDragOver(e, record) {
  if (!dragItem.value) return
  const ok = canDropOn(record)
  dropTargetId.value = record.id
  dropOk.value = ok
  if (!ok) {
    e.dataTransfer.dropEffect = 'none'
    return
  }
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

function onDrop(e, record) {
  e.preventDefault()
  if (!canDropOn(record)) return
  applyMove(destFolderOf(record))
}

function onRootOver(e) {
  if (!dragItem.value) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dropTargetId.value = ROOT_FOLDER_ID
  dropOk.value = true
}

function onRootDrop(e) {
  e.preventDefault()
  applyMove(ROOT_FOLDER_ID)
}

function applyMove(destFolderId) {
  const drag = dragItem.value
  if (!drag) return
  const dest = destFolderId || ROOT_FOLDER_ID
  if (drag.type === 'folder') {
    const f = findFolder(store, drag.id)
    if (!f) return
    if (isSelfOrDescendant(f.id, dest)) {
      Message.warning('不能移动到自身或子目录内')
      return
    }
    if ((f.parent_id || ROOT_FOLDER_ID) === dest) {
      Message.info('已在该目录')
      return
    }
    const dup = store.datasetFolders.some((x) => (
      x.id !== f.id && (x.parent_id || ROOT_FOLDER_ID) === dest && x.name === f.name
    ))
    if (dup) {
      Message.warning('目标目录已有同名文件夹')
      return
    }
    f.parent_id = dest
    f.updated_at = nowStamp()
    if (dest !== ROOT_FOLDER_ID && !expandedKeys.value.includes(dest)) {
      expandedKeys.value = [...expandedKeys.value, dest]
    }
    Message.success(`「${f.name}」已移动到 ${folderPath(store, dest)}`)
    return
  }
  const d = store.datasets.find((x) => x.id === drag.id)
  if (!d) return
  if ((d.folder_id || ROOT_FOLDER_ID) === dest) {
    Message.info('已在该目录')
    return
  }
  d.folder_id = dest
  d.modifier_id = ME
  d.updated_at = nowStamp()
  if (dest !== ROOT_FOLDER_ID && !expandedKeys.value.includes(dest)) {
    expandedKeys.value = [...expandedKeys.value, dest]
  }
  Message.success(`「${d.display_name}」已移动到 ${folderPath(store, dest)}`)
}

function tableLabel(id) {
  return store.datasets.find((d) => d.id === id)?.display_name || id || '数据表'
}
function sourceLabel(id) {
  return sourceMap.value.get(id)?.name || id
}
function userName(id) {
  return userMap.value.get(id)?.name || '-'
}
function userMail(id) {
  const u = userMap.value.get(id)
  if (!u) return '-'
  return u.email || u.name || '-'
}
function boundTools(d) {
  return toolsOfDataset(store, d.id)
}
const readAccessOpen = ref(false)
const readAccessDsId = ref('')
const pendingReadTotal = computed(() => readRequestsOf({ status: 'pending' }).length)
function pendingReads(d) {
  return readRequestsOf({ datasetId: d.id, status: 'pending' }).length
}
function openReadAccess(d) {
  readAccessDsId.value = d?.id || ''
  readAccessOpen.value = true
}
function readerTools(d) {
  return readerToolsOfDataset(store, d.id)
}
function uncontrolledReaders(d) {
  return readerTools(d).filter((t) => !isReadControlled(t, d.id))
}
function readerTip(d) {
  const bad = uncontrolledReaders(d).map((t) => t.name)
  return `读取此数据集的工具：${readerTools(d).map((t) => t.name).join('、')}${bad.length ? `。未受控（行列权限不生效）：${bad.join('、')}` : ''}。点击管理读取授权`
}
function grantOf(d) {
  return findGrant(store, d.id)
}
function hasRowAcl(d) {
  const g = grantOf(d)
  if (!g?.row_enabled) return false
  if (g.row_filter) return true
  if ((g.row_policies || []).some((p) => rowLeaves(p).some((c) => c.column))) return true
  return (g.row_rules || []).some((r) => r.column && String(r.value || '').trim())
}
function hasColAcl(d) {
  const g = grantOf(d)
  if (!g?.col_enabled) return false
  if ((g.col_policies || []).some((p) => colPolicyColumns(p).length && p.on !== false)) return true
  return (g.columns || []).some((c) => c.allowed === false || c.mask === 'hide' || c.mask === 'mask')
}

function openSchema(d) {
  schemaDs.value = d
  schemaOpen.value = true
}
function openPreview(d) {
  store.editDatasetId = ''
  store.studioDatasetId = d.id
  emit('goto', 'dataset-studio')
}
function openEdit(d) {
  const live = store.datasets.find((x) => x.id === d.id) || d
  store.studioDatasetId = live.id
  store.editDatasetId = live.id
  if (live.source_type === 'sql') {
    emit('goto', 'dataset-sql')
    return
  }
  store.openModelDrawer = !!(live.extra?.model && (live.extra.tableIds || []).length)
  emit('goto', 'dataset-studio')
}
function gotoCreate(mode) {
  store.editDatasetId = ''
  store.studioDatasetId = ''
  if (mode === 'dataset-sql') {
    emit('goto', 'dataset-sql')
    return
  }
  store.openModelDrawer = true
  emit('goto', 'dataset-studio')
}
function datasetType(d) {
  if (d.source_type === 'sql') return 'SQL'
  if (d.extra?.model) return '模型'
  return '数据表'
}
function joinTypeLabel(type) {
  return { inner: '内连接', left: '左连接', right: '右连接', full: '全连接' }[type] || '左连接'
}
function formatTime(v) {
  if (!v) return '-'
  const s = String(v).replace('T', ' ').replace(/-/g, '/')
  return s.slice(0, 19)
}
function rowCountText(d) {
  if (d.row_count_estimate == null) return '—'
  return `约 ${Number(d.row_count_estimate).toLocaleString()} 行`
}
function sqlTextOf(d) {
  return d?.sql || d?.extra?.sql || d?.description || '暂无 SQL 内容'
}
function colKindLabel(col) {
  const type = `${col.semantic_hint || col.data_type || ''}`.toLowerCase()
  if (type.includes('date') || type.includes('time')) return 'Cal'
  if (type.includes('int') || type.includes('num') || type.includes('decimal') || type.includes('double') || type.includes('float')) return 'No'
  return 'Str.'
}
function colKindClass(col) {
  const label = colKindLabel(col)
  if (label === 'Cal') return 'cal'
  if (label === 'No') return 'num'
  return 'str'
}
function normalizeColType(type = '') {
  const t = String(type).toLowerCase()
  if (t.includes('date') || t.includes('time')) return '日期'
  if (t.includes('int') || t.includes('decimal') || t.includes('double') || t.includes('float') || t.includes('number')) return '数值'
  return '文本'
}
function formatCell(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
const previewFields = computed(() => {
  const cols = previewTarget.value?.columns || []
  const q = previewKw.value.trim().toLowerCase()
  if (!q || previewTab.value !== 'fields') return cols
  return cols.filter((c) => `${c.column_name} ${c.data_type} ${c.description || ''}`.toLowerCase().includes(q))
})
const previewRows = computed(() => {
  const rows = preview.value?.rows || []
  const q = previewKw.value.trim().toLowerCase()
  if (!q || previewTab.value !== 'data') return rows
  return rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(q))
})
const previewCols = computed(() => preview.value?.columns || (previewTarget.value?.columns || []).map((c) => c.column_name))
function openPublish(d) {
  publishDsId.value = d.id
  publishOpen.value = true
}
function removeDataset(d) {
  const bound = boundTools(d)
  const i = store.datasets.findIndex((x) => x.id === d.id)
  if (i >= 0) store.datasets.splice(i, 1)
  const gi = store.datasetGrants.findIndex((g) => g.dataset_id === d.id)
  if (gi >= 0) store.datasetGrants.splice(gi, 1)
  bound.forEach((t) => { t.on = false })
  forgetDatasets([d.id])
}
function removeFolder(f) {
  const parent = f.parent_id || ROOT_FOLDER_ID
  store.datasetFolders.filter((x) => x.parent_id === f.id).forEach((c) => { c.parent_id = parent })
  store.datasets.filter((d) => d.folder_id === f.id).forEach((d) => { d.folder_id = parent })
  const i = store.datasetFolders.findIndex((x) => x.id === f.id)
  if (i >= 0) store.datasetFolders.splice(i, 1)
  expandedKeys.value = expandedKeys.value.filter((k) => k !== f.id)
}
function onDelete(d) {
  const bound = boundTools(d)
  const readers = readerTools(d)
  const parts = []
  if (bound.length) parts.push(`将同时停用发布的工具：${bound.map((t) => t.name).join('、')}。`)
  if (readers.length) parts.push(`以下上游工具读取此数据集，删除后可能取数失败：${readers.map((t) => t.name).join('、')}。`)
  Modal.confirm({
    title: `删除数据集「${d.display_name}」？`,
    content: parts.length ? parts.join('') : '仅从数据集列表移除。数据源连接不会删除。',
    okText: '删除',
    onOk: () => {
      removeDataset(d)
      selectedIds.value = selectedIds.value.filter((id) => id !== d.id)
      Message.success('已删除')
    },
  })
}
function batchDelete() {
  const rows = selectedRecords.value
  if (!rows.length) {
    Message.warning('请先勾选要删除的文件或目录')
    return
  }
  const folders = rows.filter((r) => r.rowType === 'folder')
  const datasets = rows.filter((r) => r.rowType === 'dataset')
  Modal.confirm({
    title: `删除已选 ${rows.length} 项？`,
    content: [
      datasets.length ? `${datasets.length} 个数据集将从列表移除` : '',
      folders.length ? `${folders.length} 个目录将被删除，目录内未勾选的内容会移到上一级` : '',
    ].filter(Boolean).join('。') + '。',
    okText: '删除',
    onOk: () => {
      datasets.forEach((d) => {
        const hit = store.datasets.find((x) => x.id === d.id)
        if (hit) removeDataset(hit)
      })
      const depthOf = (id) => {
        let n = 0
        let cur = findFolder(store, id)
        const seen = new Set()
        while (cur && !seen.has(cur.id)) {
          seen.add(cur.id)
          n += 1
          cur = findFolder(store, cur.parent_id)
        }
        return n
      }
      [...folders].sort((a, b) => depthOf(b.id) - depthOf(a.id)).forEach((f) => {
        const hit = findFolder(store, f.id)
        if (hit) removeFolder(hit)
      })
      selectedIds.value = []
      Message.success('已删除所选内容')
    },
  })
}
function openCollab(d) {
  currentDs.value = d
  const g = getOrCreateGrant(store, d)
  collabDraft.value = (g.collab || []).map((c) => ({ ...c }))
  collabAdd.userId = ''
  collabAdd.perm = 'use'
  collabOpen.value = true
}
function addCollab() {
  if (!collabAdd.userId) {
    Message.warning('请选择用户')
    return
  }
  if (collabDraft.value.some((c) => c.userId === collabAdd.userId)) {
    Message.warning('该用户已是协作者')
    return
  }
  collabDraft.value.push({ userId: collabAdd.userId, perm: collabAdd.perm })
  collabAdd.userId = ''
}
function removeCollab(userId) {
  collabDraft.value = collabDraft.value.filter((x) => x.userId !== userId)
}
function saveCollab() {
  const err = saveDatasetGrant(store, { dataset_id: currentDs.value.id, collab: collabDraft.value })
  if (err) { Message.warning(err); return }
  Message.success('协作者已保存')
  collabOpen.value = false
}

function openPermStudio(kind, d) {
  permDsId.value = d.id
  if (kind === 'col') colStudioOpen.value = true
  else rowStudioOpen.value = true
}

function openProps(d) {
  currentDs.value = d
  propDraft.display_name = d.display_name
  propDraft.description = d.description || ''
  propDraft.creator_id = d.creator_id || ME
  propOpen.value = true
}
function saveProps() {
  if (!propDraft.display_name.trim()) {
    Message.warning('请填写名称')
    return
  }
  currentDs.value.display_name = propDraft.display_name.trim()
  currentDs.value.description = propDraft.description.trim()
  currentDs.value.creator_id = propDraft.creator_id
  currentDs.value.modifier_id = ME
  currentDs.value.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
  Message.success('属性已更新')
  propOpen.value = false
}

function onMore(key, d) {
  nextTick(() => {
    if (key === 'preview') openPreview(d)
    else if (key === 'collab') openCollab(d)
    else if (key === 'row') openPermStudio('row', d)
    else if (key === 'col') openPermStudio('col', d)
    else if (key === 'move') openMove(d)
    else if (key === 'prop') openProps(d)
    else if (key === 'publish') openPublish(d)
    else if (key === 'reads') openReadAccess(d)
    else if (key === 'delete') onDelete(d)
  })
}

onDeactivated(() => {
  readAccessOpen.value = false
  rowStudioOpen.value = false
  colStudioOpen.value = false
  publishOpen.value = false
  collabOpen.value = false
  previewOpen.value = false
  schemaOpen.value = false
  propOpen.value = false
  folderOpen.value = false
  moveOpen.value = false
})
</script>

<template>
  <div class="ds-page">
    <div class="ds-page-body">
    <div class="page-head ds-head">
      <div>
        <h2>数据集</h2>
        <div class="desc">管理同步表、CSV 数据集和 SQL 创建的数据集。数据集工具只在这里「发布工具」；上游工具读取数据集需在「读取授权」批准；谁能看哪些行列在「数据权限」配置。</div>
      </div>
      <a-space>
        <a-badge :count="pendingReadTotal">
          <a-button @click="openReadAccess(null)">读取授权</a-button>
        </a-badge>
        <a-button @click="openCreateFolder(ROOT_FOLDER_ID)">新建文件夹</a-button>
        <a-button @click="gotoCreate('dataset-sql')">SQL 数据集</a-button>
        <a-button type="primary" @click="gotoCreate('dataset-create')">
          <icon-plus /> 创建数据集
        </a-button>
      </a-space>
    </div>

    <section class="ds-filters">
      <a-checkbox v-model="mineOnly">仅展示我的</a-checkbox>
      <a-input-search v-model="store.datasetFlt.kw" allow-clear placeholder="搜索数据集名称、表名或 SQL..." :style="{ width: '280px' }" />
      <a-select v-model="store.datasetFlt.sourceId" allow-clear placeholder="筛选数据源" :style="{ width: '160px' }">
        <a-option value="">全部数据源</a-option>
        <a-option v-for="s in store.sources.filter((x) => x.kind !== 'http')" :key="s.id" :value="s.id">{{ s.name }}</a-option>
      </a-select>
      <a-select v-model="store.datasetFlt.type" :style="{ width: '140px' }">
        <a-option value="all">全部类型</a-option>
        <a-option value="table">真实数据表</a-option>
        <a-option value="sql">SQL 数据集</a-option>
      </a-select>
      <a-select v-model="sortKey" :style="{ width: '140px' }">
        <a-option value="updated">按修改时间</a-option>
        <a-option value="name">按名称</a-option>
      </a-select>
    </section>

    <div
      class="ds-drop-root"
      :class="{ show: !!dragItem, active: dropTargetId === ROOT_FOLDER_ID && dropOk }"
      @dragover.prevent="onRootOver"
      @drop.prevent="onRootDrop"
    >
      拖到此处，移到根目录
    </div>

    <section class="ds-list">
      <div v-if="batchOpen" class="ds-batch-bar">
        <label class="ds-batch-check">
          <a-checkbox
            :model-value="allSelected"
            :indeterminate="someSelected && !allSelected"
            @update:model-value="toggleSelectAll"
          />
          <span>全选</span>
        </label>
        <div class="ds-batch-count">
          已选<span>{{ selectedIds.length }}</span>项
        </div>
        <button type="button" class="ds-batch-act" @click="clearSelect">取消选择</button>
        <div class="ds-batch-ops">
          <button type="button" class="ds-batch-act" @click="batchTransfer">转让所有人</button>
          <button type="button" class="ds-batch-act" @click="openMove()">移动到...</button>
          <button type="button" class="ds-batch-act" @click="batchClearCache">清除缓存</button>
          <button type="button" class="ds-batch-act danger" @click="batchDelete">删除</button>
        </div>
      </div>
      <div v-else class="ds-list-head">
        <div />
        <div class="ds-check">
          <a-checkbox
            :model-value="allSelected"
            :indeterminate="someSelected && !allSelected"
            @update:model-value="toggleSelectAll"
          />
        </div>
        <div>名称</div>
        <div>创建人</div>
        <div>修改人</div>
        <div>创建时间</div>
        <div>修改时间</div>
        <div>操作</div>
      </div>
      <div v-if="!tableRows.length" class="ds-empty">
        <a-empty>
          <div>{{ searching ? '没有匹配的数据集或文件夹' : '还没有数据集。请先同步数据源 Schema。' }}</div>
          <a-button v-if="!searching" type="primary" size="small" style="margin-top: 8px" @click="emit('goto', 'sources')">去数据源</a-button>
        </a-empty>
      </div>
      <div
        v-for="record in tableRows"
        :key="record.id"
        class="ds-row"
        :class="{
          nested: record.nested,
          'is-selected': selectedSet.has(record.id),
          'is-dragging': dragItem?.id === record.id,
          'is-drop': dropTargetId === record.id && dropOk,
          'is-drop-bad': dropTargetId === record.id && !dropOk,
        }"
        draggable="true"
        @dragstart="onDragStart($event, record)"
        @dragend="onDragEnd"
        @dragover="onDragOver($event, record)"
        @drop="onDrop($event, record)"
      >
        <i class="ds-grip" title="拖拽整行">
          <Icon1 :size="16" />
        </i>
        <label class="ds-check" @click.stop>
          <a-checkbox
            :model-value="selectedSet.has(record.id)"
            @update:model-value="(v) => toggleSelect(record.id, v)"
          />
        </label>
        <div class="ds-cell">
          <span
            class="ds-indent"
            :style="{ width: `${(record.rowType === 'folder' ? 30 : 0) + (record.depth || 0) * 30}px` }"
          />
          <a
            v-if="record.rowType === 'folder'"
            class="ds-folder-name"
            href="javascript:void(0)"
            @click.prevent="toggleFolder(record.id)"
          >
            <i class="ds-chevron" :class="{ 'is-open': record.expanded }">
              <Icon2 :size="14" />
            </i>
            <i class="ds-folder-svg">
              <Icon3 :size="20" />
            </i>
            <span class="ds-title">{{ record.name }}</span>
          </a>
          <div v-else class="ds-name-wrap">
            <a
              class="ds-name"
              href="javascript:void(0)"
              @click.prevent="openPreview(record)"
            >
              <DsMark />
              <span class="ds-title">{{ record.display_name }}</span>
              <a-tag v-if="hasRowAcl(record) || hasColAcl(record)" size="small" color="orangered">行列权限</a-tag>
              <a-tag v-if="boundTools(record).length" size="small" color="green">已发布 {{ boundTools(record).map((t) => t.name).join('、') }}</a-tag>
              <a-tooltip v-if="readerTools(record).length" :content="readerTip(record)">
                <a-tag size="small" :color="uncontrolledReaders(record).length ? 'orange' : 'arcoblue'" @click.stop.prevent="openReadAccess(record)">
                  被 {{ readerTools(record).length }} 个工具读取<template v-if="uncontrolledReaders(record).length"> · {{ uncontrolledReaders(record).length }} 个未受控</template>
                </a-tag>
              </a-tooltip>
              <a-tag v-if="pendingReads(record)" size="small" color="orangered" @click.stop.prevent="openReadAccess(record)">{{ pendingReads(record) }} 个读取申请</a-tag>
            </a>
            <button type="button" class="ds-eye" title="预览" @click.stop="openPreview(record)">
              <IconEye :size="14" />
            </button>
          </div>
        </div>
        <div class="ds-col muted">{{ userMail(record.creator_id) }}</div>
        <div class="ds-col muted">{{ userMail(record.modifier_id || record.creator_id) }}</div>
        <div class="ds-col muted ds-time">{{ formatTime(record.created_at) }}</div>
        <div class="ds-col muted ds-time">{{ formatTime(record.updated_at) }}</div>
        <div class="ds-row-ops" @click.stop @mousedown.stop>
          <template v-if="record.rowType === 'folder'">
            <button type="button" class="ds-ico-btn" title="重命名" @click="openRenameFolder(record)">
              <Icon4 :size="14" />
            </button>
            <button type="button" class="ds-ico-btn" title="新建子目录" @click="openCreateFolder(record.id)">
              <Icon5 :size="14" />
            </button>
            <a-dropdown @select="(k) => onFolderMore(k, record)">
              <button type="button" class="ds-ico-btn" title="更多">
                <Icon7 :size="16" />
              </button>
              <template #content>
                <a-doption value="create">新建子目录</a-doption>
                <a-doption value="rename">重命名</a-doption>
                <a-doption value="move">移动</a-doption>
                <a-doption value="delete">删除</a-doption>
              </template>
            </a-dropdown>
          </template>
          <template v-else>
            <button type="button" class="ds-ico-btn" title="编辑" @click="openEdit(record)">
              <Icon4 :size="14" />
            </button>
            <button type="button" class="ds-ico-btn" title="协作者" @click="openCollab(record)">
              <Icon6 :size="14" />
            </button>
            <a-dropdown @select="(k) => onMore(k, record)">
              <button type="button" class="ds-ico-btn" title="更多">
                <Icon7 :size="16" />
              </button>
              <template #content>
                <a-doption value="preview">预览</a-doption>
                <a-doption value="collab">协作者</a-doption>
                <a-doption value="row">数据权限 · 行</a-doption>
                <a-doption value="col">数据权限 · 列</a-doption>
                <a-doption value="move">移动到</a-doption>
                <a-doption value="prop">属性</a-doption>
                <a-doption value="publish">{{ boundTools(record).length ? '更新工具' : '发布工具' }}</a-doption>
                <a-doption value="reads">读取授权</a-doption>
                <a-doption value="delete">删除</a-doption>
              </template>
            </a-dropdown>
          </template>
        </div>
      </div>
    </section>
    </div>

    <SchemaExplorer v-model:visible="schemaOpen" :dataset="schemaDs" />
    <ReadAccessDrawer v-model:visible="readAccessOpen" v-model:dataset-id="readAccessDsId" />

    <a-modal v-model:visible="collabOpen" title="协作者" :width="560" unmount-on-close :footer="false">
      <p class="hint" style="margin-top:0">协作者可在控制台使用 / 编辑该数据集，不影响 MCP 调用时能看到的数据范围（那部分在「数据权限」配置）。</p>
      <a-space style="margin-bottom: 12px; width: 100%">
        <a-select v-model="collabAdd.userId" placeholder="选择用户" allow-search :style="{ width: '200px' }">
          <a-option v-for="u in staffUsers" :key="u.id" :value="u.id">{{ u.name }} · {{ u.role }}</a-option>
        </a-select>
        <a-select v-model="collabAdd.perm" :style="{ width: '120px' }">
          <a-option value="use">使用</a-option>
          <a-option value="edit">编辑</a-option>
        </a-select>
        <a-button type="primary" @click="addCollab">添加</a-button>
      </a-space>
      <a-table :data="collabDraft" :pagination="false" size="small" row-key="userId">
        <template #columns>
          <a-table-column title="用户">
            <template #cell="{ record }">{{ userName(record.userId) }}</template>
          </a-table-column>
          <a-table-column title="权限" :width="120">
            <template #cell="{ record }">{{ record.perm === 'edit' ? '编辑' : '使用' }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="80">
            <template #cell="{ record }">
              <a-button type="text" size="mini" status="danger" @click="removeCollab(record.userId)">移除</a-button>
            </template>
          </a-table-column>
        </template>
        <template #empty><a-empty description="尚未添加协作者" /></template>
      </a-table>
      <div style="text-align:right; margin-top: 16px">
        <a-space>
          <a-button @click="collabOpen = false">取消</a-button>
          <a-button type="primary" @click="saveCollab">确定</a-button>
        </a-space>
      </div>
    </a-modal>

    <RowPermStudio v-model:visible="rowStudioOpen" :dataset-id="permDsId" />
    <ColPermStudio v-model:visible="colStudioOpen" :dataset-id="permDsId" />

    <a-modal v-model:visible="propOpen" title="属性" :width="480" unmount-on-close :footer="false">
      <a-form :model="propDraft" layout="vertical">
        <a-form-item label="名称" required>
          <a-input v-model="propDraft.display_name" />
        </a-form-item>
        <a-form-item label="所有者">
          <a-select v-model="propDraft.creator_id">
            <a-option v-for="u in staffUsers" :key="u.id" :value="u.id">{{ u.name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model="propDraft.description" :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
      </a-form>
      <div style="text-align:right">
        <a-space>
          <a-button @click="propOpen = false">取消</a-button>
          <a-button type="primary" @click="saveProps">确定</a-button>
        </a-space>
      </div>
    </a-modal>

    <a-modal
      v-model:visible="previewOpen"
      :width="1080"
      :footer="false"
      unmount-on-close
      class="ds-preview-modal"
      :title="previewTarget ? previewTarget.display_name : '预览'"
    >
      <template v-if="previewTarget">
        <div class="pv-head">
          <div>
            <div class="pv-meta">
              <span>来源 {{ sourceLabel(previewTarget.data_source_id) }}</span>
              <span class="pv-dot" />
              <span>创建于 {{ formatTime(previewTarget.created_at) }}</span>
              <span class="pv-dot" />
              <span>最近修改于 {{ formatTime(previewTarget.updated_at) }}</span>
              <span class="pv-dot" />
              <span>{{ rowCountText(previewTarget) }}</span>
            </div>
            <div class="pv-id">
              <span>数据集 ID</span>
              <code class="mono">{{ previewTarget.id }}</code>
            </div>
            <p class="pv-desc">描述：{{ previewTarget.description || '无' }}</p>
          </div>
          <a-space>
            <a-button @click="openEdit(previewTarget); previewOpen = false">编辑</a-button>
          </a-space>
        </div>
        <div class="pv-tabs">
          <a-radio-group v-model="previewTab" type="button" size="small">
            <a-radio value="fields">字段详情</a-radio>
            <a-radio value="data">数据预览</a-radio>
            <a-radio value="model">模型结构</a-radio>
          </a-radio-group>
          <a-input-search v-model="previewKw" allow-clear placeholder="搜索" :style="{ width: '240px' }" />
        </div>
        <div v-if="previewTab === 'fields'" class="pv-body">
          <div class="pv-field-head">
            <span>字段名称</span>
            <span>类型</span>
            <span>物理字段名 / 表达式</span>
            <span>字段描述</span>
          </div>
          <div v-if="!previewFields.length" class="muted" style="padding: 32px; text-align: center">暂无字段信息</div>
          <div v-for="c in previewFields" :key="c.id || c.column_name" class="pv-field-row">
            <div class="pv-field-name">
              <span class="pv-kind" :class="colKindClass(c)">{{ colKindLabel(c) }}</span>
              <span>{{ c.semantic_hint || c.column_name }}</span>
            </div>
            <span>{{ normalizeColType(c.data_type) }}</span>
            <span class="mono muted">{{ c.column_name }}</span>
            <span class="muted">{{ c.description || '—' }}</span>
          </div>
        </div>
        <div v-else-if="previewTab === 'data'" class="pv-body">
          <template v-if="previewTarget.source_type === 'sql'">
            <div class="pv-sql-label">SQL</div>
            <pre class="pv-sql">{{ sqlTextOf(previewTarget) }}</pre>
            <a-alert type="info">SQL 数据集按查询结果抽样预览；已套用行列权限。</a-alert>
            <a-table v-if="previewRows.length" :data="previewRows" :pagination="false" :scroll="{ x: true, y: 320 }" size="small" style="margin-top: 12px">
              <template #columns>
                <a-table-column v-for="c in previewCols" :key="c" :title="c" :data-index="c">
                  <template #cell="{ record }">{{ formatCell(record[c]) }}</template>
                </a-table-column>
              </template>
            </a-table>
          </template>
          <template v-else>
            <a-alert v-if="preview?.applied_row_filter || preview?.applied_columns" type="info" style="margin-bottom: 10px">
              已套用行列权限
              <template v-if="preview.applied_row_filter"> · row_filter: <span class="mono">{{ preview.applied_row_filter }}</span></template>
            </a-alert>
            <a-empty v-if="!previewRows.length" description="暂无可预览数据" />
            <a-table v-else :data="previewRows" :pagination="false" :scroll="{ x: true, y: 360 }" size="small">
              <template #columns>
                <a-table-column v-for="c in previewCols" :key="c" :title="c" :data-index="c">
                  <template #cell="{ record }">{{ formatCell(record[c]) }}</template>
                </a-table-column>
              </template>
            </a-table>
          </template>
        </div>
        <div v-else class="pv-model">
          <div class="pv-graph">
            <div v-if="previewTarget.extra?.joins?.length" class="pv-join-row">
              <template v-for="(j, i) in previewTarget.extra.joins" :key="j.id">
                <div v-if="i === 0" class="pv-node-card">
                  <div class="ds-title"><icon-file /> {{ tableLabel(j.leftTableId) }}</div>
                  <div class="muted">{{ sourceLabel(previewTarget.data_source_id) }}</div>
                </div>
                <div class="pv-join-badge">{{ joinTypeLabel(j.type) }} · {{ (j.conditions || []).map((c) => `${c.leftField} ${c.op || '='} ${c.rightField}`).join(' AND ') }}</div>
                <div class="pv-node-card">
                  <div class="ds-title"><icon-file /> {{ tableLabel(j.rightTableId) }}</div>
                  <div class="muted">{{ sourceLabel(previewTarget.data_source_id) }}</div>
                </div>
              </template>
            </div>
            <div v-else class="pv-node-card">
              <div class="ds-title"><icon-file /> {{ previewTarget.display_name }}</div>
              <div class="muted">{{ sourceLabel(previewTarget.data_source_id) }} · 单表模型</div>
            </div>
            <pre v-if="previewTarget.extra?.sql" class="pv-sql">{{ previewTarget.extra.sql }}</pre>
          </div>
          <div class="pv-rels">
            <div class="pv-node-title">字段</div>
            <div class="pv-rel-grid">
              <div v-for="c in (previewTarget.columns || [])" :key="c.id || c.column_name" class="pv-rel-card">
                <div class="ds-title">{{ c.column_name }}</div>
                <div class="muted">{{ normalizeColType(c.data_type) }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </a-modal>

    <PublishToolModal v-model:visible="publishOpen" :dataset-id="publishDsId" @goto="emit('goto', $event)" />

    <a-modal
      v-model:visible="folderOpen"
      :title="folderMode === 'rename' ? '重命名目录' : '新建文件夹'"
      :width="420"
      unmount-on-close
      :on-before-ok="saveFolder"
    >
      <a-form :model="folderForm" layout="vertical">
        <a-form-item label="目录名称" required>
          <a-input v-model="folderForm.name" placeholder="如 销售、行情" />
        </a-form-item>
        <a-form-item v-if="folderMode === 'create'" label="上级目录">
          <a-select v-model="folderForm.parent_id">
            <a-option v-for="f in folderOptions" :key="f.id || 'root'" :value="f.id">{{ f.path }}</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:visible="moveOpen"
      placement="right"
      :width="400"
      :header="false"
      :footer="false"
      :closable="false"
      unmount-on-close
      body-class="mv-drawer-body"
      :body-style="{ padding: 0, height: '100%' }"
    >
      <div class="mv-sheet">
        <div class="mv-head">
          <span>资源移动到</span>
          <button type="button" class="mv-x" title="关闭" @click="moveOpen = false"><icon-close /></button>
        </div>
        <div class="mv-body">
          <label class="mv-search">
            <input v-model="moveKw" placeholder="搜索" />
            <icon-search />
          </label>
          <div class="mv-tree">
            <div
              v-for="row in moveTreeRows"
              :key="row.id"
              class="mv-node"
              :class="{ on: moveFolderId === row.id, blocked: row.blocked }"
              :style="{ paddingLeft: `${8 + row.depth * 16}px` }"
              @click="!row.blocked && (moveFolderId = row.id)"
            >
              <button
                v-if="row.hasKids"
                type="button"
                class="mv-chevron"
                :class="{ open: row.expanded }"
                @click.stop="toggleMoveExpand(row.id)"
              >
                <span />
              </button>
              <span v-else class="mv-chevron-ph" />
              <span class="mv-name">{{ row.name }}</span>
            </div>
          </div>
        </div>
        <div class="mv-foot">
          <button type="button" class="mv-cancel" @click="moveOpen = false">取消</button>
          <button type="button" class="mv-ok" @click="confirmMove">确定</button>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<style scoped>
.ds-page {
  position: relative;
  height: 100%;
  min-height: 0;
}
.ds-page-body {
  height: 100%;
  overflow: auto;
}
.ds-list {
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 2px;
  background: #fff;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', helvetica, arial, sans-serif;
}
.ds-list-head,
.ds-row {
  display: grid;
  grid-template-columns: 16px 40px minmax(164px, 1.4fr) minmax(90px, 0.8fr) minmax(90px, 0.8fr) 176px 176px 144px;
  align-items: center;
  column-gap: 0;
  min-width: 980px;
  padding: 0;
}
.ds-list-head {
  height: 44px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  font-size: 14px;
  line-height: 21px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}
.ds-list-head > div {
  padding: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ds-list-head > div:nth-child(1),
.ds-list-head > div:nth-child(2) { padding: 0; }
.ds-list-head .ds-check { height: 44px; }
.ds-row {
  height: 52px;
  background: transparent;
  cursor: grab;
  font-size: 14px;
  line-height: 21px;
  color: rgba(0, 0, 0, 0.45);
  transition: background-color 0.3s linear;
}
.ds-row:hover { background: rgba(0, 0, 0, 0.04); }
.ds-row:last-child { border-bottom: none; }
.ds-row:active { cursor: grabbing; }
.ds-row.nested { background: transparent; }
.ds-row.nested:hover { background: rgba(0, 0, 0, 0.04); }
.ds-row.is-selected,
.ds-row.nested.is-selected { background: #f0f7ff; }
.ds-row.is-selected:hover,
.ds-row.nested.is-selected:hover { background: #e8f3ff; }
.ds-row { position: relative; }
.ds-row.is-dragging { opacity: 0.45; }
.ds-row.is-drop::after,
.ds-row.is-drop-bad::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  border: 1px dashed rgb(var(--primary-6));
  background: rgba(var(--primary-6), 0.08);
}
.ds-row.is-drop-bad::after {
  border-color: rgb(var(--danger-6));
  background: rgba(var(--danger-6), 0.06);
}.ds-check {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  padding: 12px;
  box-sizing: border-box;
}
.ds-check :deep(.arco-checkbox-icon),
.ds-batch-check :deep(.arco-checkbox-icon) {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border-color: rgba(0, 0, 0, 0.15);
  background: #fff;
}
.ds-check :deep(.arco-checkbox-checked .arco-checkbox-icon),
.ds-batch-check :deep(.arco-checkbox-checked .arco-checkbox-icon) {
  background: rgb(46, 116, 255);
  border-color: rgb(46, 116, 255);
}
.ds-check :deep(.arco-checkbox-checked .arco-checkbox-icon-check),
.ds-batch-check :deep(.arco-checkbox-checked .arco-checkbox-icon-check) {
  color: #fff;
}
.ds-check :deep(.arco-checkbox-indeterminate .arco-checkbox-icon),
.ds-batch-check :deep(.arco-checkbox-indeterminate .arco-checkbox-icon) {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.15);
}
.ds-check :deep(.arco-checkbox-indeterminate .arco-checkbox-icon-check),
.ds-batch-check :deep(.arco-checkbox-indeterminate .arco-checkbox-icon-check) {
  display: none;
}
.ds-check :deep(.arco-checkbox-indeterminate .arco-checkbox-icon::after),
.ds-batch-check :deep(.arco-checkbox-indeterminate .arco-checkbox-icon::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: rgb(46, 116, 255);
  transform: translate(-50%, -50%);
}
.ds-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 52px;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
  color: rgba(0, 0, 0, 0.85);
}
.ds-indent {
  flex: 0 0 auto;
  height: 1px;
}
.ds-col {
  min-width: 0;
  height: 52px;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgba(0, 0, 0, 0.45);
}
.ds-time { font-size: 14px; white-space: nowrap; }
.ds-empty { padding: 48px 16px; }
.mv-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  color: rgba(0, 0, 0, 0.85);
}
.mv-head {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 48px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.mv-x {
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
.mv-x:hover { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.85); }
.mv-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 8px;
}
.mv-search {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px 0 12px;
  margin-bottom: 8px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  color: rgba(0, 0, 0, 0.45);
}
.mv-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
}
.mv-tree { flex: 1; min-height: 0; overflow: auto; }
.mv-node {
  display: flex;
  align-items: center;
  height: 32px;
  gap: 2px;
  cursor: pointer;
}
.mv-node.on { background: #e8f3ff; }
.mv-node.blocked .mv-name { color: rgba(0, 0, 0, 0.25); cursor: not-allowed; }
.mv-node:hover:not(.blocked) { background: rgba(0, 0, 0, 0.04); }
.mv-node.on:hover { background: #e8f3ff; }
.mv-chevron,
.mv-chevron-ph {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.mv-chevron span {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 4px 0 4px 5px;
  border-color: transparent transparent transparent rgba(0, 0, 0, 0.45);
  transform: rotate(0deg);
  transition: transform 0.15s ease;
}
.mv-chevron.open span { transform: rotate(90deg); }
.mv-name {
  flex: 1;
  min-width: 0;
  height: 32px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mv-node.on .mv-name { color: rgb(46, 116, 255); }
.mv-foot {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.mv-cancel,
.mv-ok {
  height: 32px;
  padding: 0 16px;
  border-radius: 2px;
  font-size: 14px;
  cursor: pointer;
}
.mv-cancel {
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #fff;
  color: rgba(0, 0, 0, 0.65);
}
.mv-cancel:hover { background: rgba(0, 0, 0, 0.04); }
.mv-ok {
  border: none;
  background: rgb(46, 116, 255);
  color: #fff;
}
.mv-ok:hover { filter: brightness(1.05); }
.ds-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  color: rgba(0, 0, 0, 0.85);
  cursor: move;
  font-size: 16px;
  line-height: 0;
}
.ds-list-head > div:last-child,
.ds-row-ops {
  position: sticky;
  right: 0;
  z-index: 2;
  background: #fff;
}
.ds-row:hover .ds-row-ops { background: #f5f5f5; }
.ds-row-ops {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 12px;
  box-sizing: border-box;
  min-width: 0;
  white-space: nowrap;
}
.ds-ico-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 8px;
  padding: 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  transition: background-color 0.1s ease;
}
.ds-ico-btn:last-child { margin-right: 0; }
.ds-ico-btn:hover { background: rgba(0, 0, 0, 0.06); }
.ds-grip :deep(svg),
.ds-chevron :deep(svg),
.ds-folder-svg :deep(svg),
.ds-ico-btn :deep(svg) { display: block; overflow: hidden; }
.ds-drop-root {
  display: none;
  position: fixed;
  top: 72px;
  left: 50%;
  z-index: 20;
  transform: translateX(-50%);
  padding: 8px 16px;
  border: 1px dashed var(--color-border-3);
  border-radius: 8px;
  color: var(--color-text-3);
  font-size: 13px;
  text-align: center;
  background: var(--color-bg-2);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  white-space: nowrap;
}
.ds-drop-root.show { display: block; }
.ds-drop-root.active {
  border-color: rgb(var(--primary-6));
  color: rgb(var(--primary-6));
  background: rgb(var(--primary-1));
}
.ds-folder-name,
.ds-name {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  color: rgba(0, 0, 0, 0.85);
  text-decoration: none;
  cursor: pointer;
}
.ds-name-wrap {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}
.ds-name { flex: 1; }
.ds-eye {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  line-height: 0;
}
.ds-eye:hover { color: rgba(0, 0, 0, 0.65); }
.ds-eye :deep(svg) { display: block; overflow: hidden; }
.ds-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  line-height: 0;
  transform: rotate(0deg);
  transition: transform 0.15s ease;
}
.ds-chevron.is-open { transform: matrix(0, 1, -1, 0, 0, 0); }
.ds-folder-svg {
  display: inline-flex;
  margin-right: 12px;
  line-height: 0;
  cursor: pointer;
}
.ds-head { align-items: flex-end; }
.ds-head h2 { font-size: 24px; font-weight: 600; }
.ds-filters {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  background: #fff;
  overflow-x: auto;
}
.ds-link { cursor: pointer; }
.ds-link:hover { color: rgb(var(--primary-6)); }
.ds-title {
  min-width: 0;
  overflow: hidden;
  font-weight: 400;
  line-height: 21px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.pv-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.pv-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--color-text-3); font-size: 13px; }
.pv-dot { width: 1px; height: 12px; background: var(--color-border-2); }
.pv-id {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-3);
}
.pv-id code { color: var(--color-text-1); }
.pv-desc { margin: 12px 0 0; font-size: 14px; color: var(--color-text-2); }
.pv-tabs { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
.pv-body { max-height: 420px; overflow: auto; }
.pv-field-head, .pv-field-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 120px minmax(180px, 1fr) minmax(160px, 1fr);
  gap: 12px;
  padding: 10px 12px;
  align-items: center;
}
.pv-field-head { background: var(--color-fill-1); font-size: 13px; font-weight: 600; color: var(--color-text-3); }
.pv-field-row { border-top: 1px solid var(--color-border-2); font-size: 14px; }
.pv-field-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pv-kind { font-size: 12px; font-weight: 700; }
.pv-kind.cal { color: rgb(var(--primary-6)); }
.pv-kind.num { color: #00b42a; }
.pv-kind.str { color: #165dff; }
.pv-sql-label { margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.pv-sql {
  margin: 0 0 12px;
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-fill-1);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.pv-model { display: flex; flex-direction: column; gap: 16px; }
.pv-graph { display: flex; flex-direction: column; gap: 12px; }
.pv-join-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.pv-join-item { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.pv-join-badge {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgb(86, 82, 255);
  border-radius: 999px;
  color: rgb(86, 82, 255);
  font-size: 12px;
  font-weight: 600;
  background: #fff;
}
.pv-node-title { margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.pv-node-card, .pv-rel-card {
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-fill-1);
}
.pv-rel-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
</style>

<style scoped>
.ds-batch-bar {
  display: flex;
  align-items: center;
  min-width: 980px;
  height: 56px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
  line-height: 21px;
}
.ds-batch-check {
  display: inline-flex;
  align-items: baseline;
  cursor: pointer;
  margin: 0;
  color: rgba(0, 0, 0, 0.65);
}
.ds-batch-check :deep(.arco-checkbox) {
  padding: 0;
  line-height: 14px;
  position: relative;
  top: 2.8px;
}
.ds-batch-check > span {
  padding: 0 8px;
}
.ds-batch-count {
  display: flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.65);
}
.ds-batch-count span {
  color: rgb(46, 116, 255);
  margin: 0 6px;
}
.ds-batch-ops {
  display: flex;
  align-items: center;
}
.ds-batch-act {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12px;
  padding: 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgb(46, 116, 255);
  font-size: 14px;
  line-height: 21px;
  cursor: pointer;
  transition: background-color 0.1s;
}
.ds-batch-act:hover { background: rgba(0, 0, 0, 0.04); }
.ds-batch-act.danger { color: rgb(242, 60, 60); }
</style>
