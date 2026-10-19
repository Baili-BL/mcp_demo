<script setup>
import { computed, provide, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  store, findDataset, findGrant, getOrCreateGrant, saveDatasetGrant,
  isMeasureColumn, hydrateRowPolicies, describeRowPolicy, rowRoot, rowLeaves,
} from '../store'
import DsMark from './icons/DsMark.vue'
import RowCondGroup from './RowCondGroup.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  datasetId: { type: String, default: '' },
  policyId: { type: String, default: '' },
  openAdd: { type: Boolean, default: false },
})
const emit = defineEmits(['update:visible', 'saved'])

const DIM_METHODS = [
  { value: 'enum', label: '枚举筛选' },
  { value: 'condition', label: '条件筛选' },
  { value: 'tag', label: '标签绑定' },
]
const MEA_METHODS = [
  { value: 'condition', label: '条件筛选' },
  { value: 'tag', label: '标签绑定' },
]
const ENUM_OPS = [
  { value: 'in', label: '包含' },
  { value: 'not_in', label: '不包含' },
]
const DIM_OPS = [
  { value: '=', label: '等于' },
  { value: '!=', label: '不等于' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'starts', label: '开头是' },
  { value: 'ends', label: '结尾是' },
  { value: 'empty', label: '为空' },
  { value: 'not_empty', label: '不为空' },
]
const MEA_OPS = [
  { value: '=', label: '等于' },
  { value: '!=', label: '不等于' },
  { value: '>', label: '大于' },
  { value: '>=', label: '大于等于' },
  { value: '<', label: '小于' },
  { value: '<=', label: '小于等于' },
  { value: 'between', label: '介于' },
]
const TAG_KEYS = [
  { value: 'team', label: '团队' },
  { value: 'role', label: '角色' },
  { value: 'name', label: '姓名' },
]

function uid(prefix = 'r') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
function clone(v) {
  return JSON.parse(JSON.stringify(v))
}
function emptyCond(column = '') {
  return {
    id: uid('c'),
    column,
    method: 'enum',
    op: 'in',
    values: [],
    value: '',
    value2: '',
    tagKey: 'team',
  }
}
function emptyBlock(column = '') {
  return { id: uid('b'), join: 'and', conditions: [emptyCond(column)] }
}
function emptyPolicy(name = '') {
  return {
    id: uid('p'),
    name,
    subject: 'all',
    users: [],
    groups: [],
    on: true,
    blocks: [emptyBlock()],
  }
}

const draft = reactive({
  enabled: true,
  other: 'all',
  join: 'and',
  whitelist: [],
  policies: [],
})
const editing = ref(null)
const whitelistOn = ref(false)
const reuseOpen = ref(false)

const ds = computed(() => findDataset(store, props.datasetId))
const columns = computed(() => ds.value?.columns || [])
const aclUsers = computed(() => store.users.filter((u) => u.status === '正常'))
const userMap = computed(() => new Map(store.users.map((u) => [u.id, u])))
const userGroups = computed(() => store.userGroups.map((g) => ({
  id: g.id,
  name: g.name,
  count: (g.memberIds || []).length,
})))
const reuseSources = computed(() => store.datasets.filter((d) => !d.deleted && d.id !== props.datasetId && (findGrant(store, d.id)?.row_policies || []).length))

function colOf(name) {
  return columns.value.find((c) => c.column_name === name)
}
function measureOf(name) {
  return isMeasureColumn(colOf(name) || { data_type: '' })
}
function methodsOf(name) {
  return measureOf(name) ? MEA_METHODS : DIM_METHODS
}
function opsOf(cond) {
  if (cond.method === 'enum') return ENUM_OPS
  return measureOf(cond.column) ? MEA_OPS : DIM_OPS
}
function userName(id) {
  return userMap.value.get(id)?.name || id
}
function subjectText(p) {
  if (p.subject === 'users') {
    const names = (p.users || []).map(userName).filter(Boolean)
    return names.length ? names.join('、') : '指定用户'
  }
  if (p.subject === 'groups') {
    const names = p.groups || []
    return names.length ? `用户组 ${names.join('、')}` : '用户组'
  }
  return '所有成员'
}
function fieldsText(p) {
  const names = [...new Set(rowLeaves(p).map((c) => c.column).filter(Boolean))]
  return names.join('、') || '—'
}
function visibleText(p) {
  return describeRowPolicy(p)
}
function withRoot(p) {
  const root = clone(rowRoot(p))
  if (!root.conditions.length) root.conditions.push(newCond())
  return { ...clone(p), blocks: [root] }
}

function hydrate() {
  const dataset = ds.value
  const g = dataset ? getOrCreateGrant(store, dataset) : null
  draft.enabled = props.openAdd || !g || g.row_enabled !== false
  draft.other = g?.row_other || 'all'
  draft.join = g?.row_join || 'and'
  draft.whitelist = [...(g?.row_whitelist || [])]
  draft.policies = hydrateRowPolicies(g).map((p) => clone(p))
  whitelistOn.value = draft.whitelist.length > 0
  editing.value = null
  if (props.policyId) {
    const hit = draft.policies.find((p) => p.id === props.policyId)
    if (hit) editing.value = withRoot(hit)
  }
}

watch(() => [props.visible, props.datasetId, props.policyId, props.openAdd], ([on]) => {
  if (!on) return
  hydrate()
  if (props.openAdd && !props.policyId) startAdd()
})

function close() {
  emit('update:visible', false)
}

function defaultColumn() {
  return columns.value.find((c) => !measureOf(c.column_name))?.column_name
    || columns.value[0]?.column_name
    || ''
}

function newCond(column) {
  const c = emptyCond(column || defaultColumn())
  if (c.column && measureOf(c.column)) {
    c.method = 'condition'
    c.op = '='
  }
  return c
}

function startAdd() {
  const n = draft.policies.length + 1
  const p = emptyPolicy(`规则${n}`)
  p.blocks[0].conditions = [newCond()]
  editing.value = p
}

function startEdit(p) {
  editing.value = withRoot(p)
}

function cancelEdit() {
  editing.value = null
  if (!draft.policies.length) close()
}

function onColumnChange(cond, name) {
  cond.column = name
  const measure = measureOf(name)
  if (measure && cond.method === 'enum') {
    cond.method = 'condition'
    cond.op = '='
    cond.values = []
  }
  if (!measure && cond.method === 'enum' && !['in', 'not_in'].includes(cond.op)) cond.op = 'in'
}

function onMethodChange(cond, method) {
  cond.method = method
  if (method === 'enum') {
    cond.op = 'in'
    if (!Array.isArray(cond.values)) cond.values = []
  } else if (method === 'tag') {
    cond.tagKey = cond.tagKey || 'team'
  } else {
    cond.op = measureOf(cond.column) ? '=' : '='
  }
}

provide('rowCtx', {
  columns, ENUM_OPS, TAG_KEYS, maxDepth: 4,
  uid, newCond, measureOf, methodsOf, opsOf,
  onColumnChange, onMethodChange,
})

function condValid(c) {
  if (!c.column) return false
  if (c.method === 'enum') return (c.values || []).some((v) => String(v).trim())
  if (c.method === 'tag') return !!c.tagKey
  if (c.op === 'empty' || c.op === 'not_empty') return true
  if (c.op === 'between') return String(c.value || '').trim() && String(c.value2 || '').trim()
  return String(c.value || '').trim()
}

function finishRule() {
  const p = editing.value
  if (!p) return
  if (p.subject === 'users' && !(p.users || []).length) {
    Message.warning('请选择指定用户')
    return
  }
  if (p.subject === 'groups' && !(p.groups || []).length) {
    Message.warning('请选择用户组')
    return
  }
  const ok = rowLeaves(p).some(condValid)
  if (!ok) {
    Message.warning('请设置可见内容筛选条件')
    return
  }
  p.name = String(p.name || '').trim() || `规则${draft.policies.length + 1}`
  const i = draft.policies.findIndex((x) => x.id === p.id)
  if (i >= 0) draft.policies.splice(i, 1, clone(p))
  else draft.policies.push(clone(p))
  editing.value = null
}

function removePolicy(p) {
  draft.policies = draft.policies.filter((x) => x.id !== p.id)
}

function saveAll() {
  if (!ds.value) {
    Message.warning('请选择数据集')
    return
  }
  if (editing.value) {
    finishRule()
    if (editing.value) return
  }
  if (draft.enabled && !draft.policies.length) {
    Message.warning('请先添加规则')
    return
  }
  const err = saveDatasetGrant(store, {
    dataset_id: ds.value.id,
    row_enabled: draft.enabled,
    row_mode: 'combo',
    row_other: draft.other,
    row_join: draft.join,
    row_whitelist: [...draft.whitelist],
    row_policies: clone(draft.policies),
  })
  if (err) {
    Message.warning(err)
    return
  }
  Message.success(ds.value.sec_view ? `行级权限已保存，并同步到中间视图 ${ds.value.sec_view.name}` : '行级权限已保存')
  emit('saved')
  close()
}

function reuseFrom(id) {
  if (!id) return
  const g = findGrant(store, id)
  const policies = hydrateRowPolicies(g).map((p) => ({ ...clone(p), id: uid('p') }))
  if (!policies.length) {
    Message.warning('该数据集暂无行级规则')
    return
  }
  draft.policies = policies
  draft.other = g.row_other || 'all'
  draft.join = g.row_join || 'and'
  draft.whitelist = [...(g.row_whitelist || [])]
  reuseOpen.value = false
  Message.success('已复用规则')
}
</script>

<template>
  <a-drawer
    :visible="visible"
    :width="1080"
    :footer="false"
    unmount-on-close
    popup-container="body"
    class="perm-drawer"
    @cancel="close"
    @update:visible="emit('update:visible', $event)"
  >
    <template #title>
      <div class="rs-title">
        <strong>行级权限</strong>
        <span v-if="ds" class="ds-chip">
          <DsMark />
          {{ ds.display_name }}
        </span>
      </div>
    </template>
    <div class="row-studio">
      <div class="rs-body">
        <div class="rs-toolbar">
          <label class="en">
            <a-switch v-model="draft.enabled" size="small" />
            启用行级权限
          </label>
          <span class="tb-right">
            <button type="button" class="link" @click="Message.info('行级权限：为赋权对象配置可见内容筛选，白名单用户不受规则限制。')">
              <icon-question-circle /> 查看帮助
            </button>
            <a-dropdown v-model:popup-visible="reuseOpen" :disabled="!reuseSources.length" @select="reuseFrom">
              <a-button>
                <template #icon><icon-copy /></template>
                规则复用
              </a-button>
              <template #content>
                <a-doption v-for="d in reuseSources" :key="d.id" :value="d.id">{{ d.display_name }}</a-doption>
                <a-doption v-if="!reuseSources.length" disabled>暂无可复用规则</a-doption>
              </template>
            </a-dropdown>
          </span>
        </div>

        <div class="rs-subbar">
          <div class="other">
            <icon-info-circle />
            其他用户
            <a-select v-model="draft.other" size="small" :style="{ width: '140px' }">
              <a-option value="all">拥有所有权限</a-option>
              <a-option value="none">无任何权限</a-option>
            </a-select>
          </div>
        </div>

        <template v-if="!editing">
          <section class="card">
            <div class="card-hd">
              <button type="button" class="add" @click="startAdd">+ 添加规则</button>
              <div v-if="draft.policies.length" class="join-switch">
                条件间关系
                <button type="button" :class="{ on: draft.join === 'and' }" @click="draft.join = 'and'">且</button>
                <button type="button" :class="{ on: draft.join === 'or' }" @click="draft.join = 'or'">或</button>
              </div>
            </div>
            <div v-if="!draft.policies.length" class="empty">
              <icon-empty :size="56" />
              <p>暂未添加规则，请在下方点击添加</p>
              <a-button type="primary" @click="startAdd">+ 添加规则</a-button>
            </div>
            <table v-else class="pol-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>受限用户</th>
                  <th>限定可见内容</th>
                  <th style="width:88px">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in draft.policies" :key="p.id">
                  <td>{{ p.name }}</td>
                  <td>
                    <icon-user />
                    {{ subjectText(p) }}
                  </td>
                  <td>
                    <div>{{ fieldsText(p) }}</div>
                    <div class="muted">{{ visibleText(p) }}</div>
                  </td>
                  <td>
                    <a-button type="text" size="mini" @click="startEdit(p)"><icon-edit /></a-button>
                    <a-button type="text" size="mini" status="danger" @click="removePolicy(p)"><icon-delete /></a-button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="card white">
            <div class="wl-hd">
              <strong>白名单</strong>
              <span class="muted">以上权限规则对白名单用户不生效</span>
            </div>
            <div v-if="!whitelistOn && !draft.whitelist.length" class="wl-empty">
              暂未设置白名单，点击
              <button type="button" class="link" @click="whitelistOn = true">添加</button>
            </div>
            <a-select
              v-else
              v-model="draft.whitelist"
              multiple
              allow-search
              allow-clear
              placeholder="选择白名单用户"
            >
              <a-option v-for="u in aclUsers" :key="u.id" :value="u.id">{{ u.name }} · {{ u.role }}</a-option>
            </a-select>
          </section>
        </template>

        <section v-else class="card editor">
          <div class="card-hd">{{ draft.policies.some((x) => x.id === editing.id) ? '编辑规则' : '添加规则' }}</div>
          <a-input v-model="editing.name" class="name-input" placeholder="给当前规则起个名字方便检索" allow-clear />
          <div class="editor-grid">
            <aside class="aside">
              <div class="aside-title">受限用户</div>
              <a-radio-group v-model="editing.subject" direction="vertical">
                <a-radio value="all">所有成员</a-radio>
                <a-radio value="users">指定用户</a-radio>
                <a-radio value="groups">用户组</a-radio>
              </a-radio-group>
              <a-select
                v-if="editing.subject === 'users'"
                v-model="editing.users"
                multiple
                allow-search
                placeholder="选择用户"
                style="margin-top: 10px"
              >
                <a-option v-for="u in aclUsers" :key="u.id" :value="u.id">{{ u.name }} · {{ u.team }}</a-option>
              </a-select>
              <a-select
                v-if="editing.subject === 'groups'"
                v-model="editing.groups"
                multiple
                allow-search
                placeholder="选择用户组"
                style="margin-top: 10px"
              >
                <a-option v-for="g in userGroups" :key="g.id" :value="g.id">{{ g.name }} · {{ g.count }} 人</a-option>
              </a-select>
            </aside>
            <div class="filter-pane">
              <div class="filter-hd">
                <strong>可见内容筛选</strong>
                <span class="filter-tip">
                  <icon-info-circle />
                  点击条件右侧 <icon-branch /> 可在该条件的结果中再筛选；点击左侧「且 / 或」切换本组条件间的关系
                </span>
              </div>
              <RowCondGroup :group="editing.blocks[0]" :depth="0" />
            </div>
          </div>
        </section>
      </div>

      <footer class="rs-foot">
        <a-button @click="editing ? cancelEdit() : close()">取消</a-button>
        <a-button v-if="editing" type="primary" @click="finishRule">完成</a-button>
        <a-button v-else type="primary" @click="saveAll">保存</a-button>
      </footer>
    </div>
  </a-drawer>
</template>

<style scoped>
.row-studio {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  background: #f7f8fa;
  margin: -16px -20px -20px;
  color: rgb(12, 13, 14);
}
.rs-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
}
.ds-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 6px;
  border-radius: 4px;
  background: #f3e8ff;
  color: #722ed1;
  font-size: 13px;
}
.ds-chip :deep(.ds-mark) { margin-right: 0; }
.link {
  border: none;
  background: none;
  color: rgb(22, 100, 255);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  color: #4e5969;
  border-radius: 4px;
}
.icon-btn:hover { background: #f2f3f5; }
.rs-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 24px 24px;
}
.rs-toolbar, .rs-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.en {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.rs-subbar { justify-content: flex-end; }
.tb-right { display: inline-flex; align-items: center; gap: 16px; }
.tb-right .link { display: inline-flex; align-items: center; gap: 4px; }
.other {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4e5969;
  font-size: 13px;
}
.card {
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 16px 20px 20px;
  margin-bottom: 16px;
}
.card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
}
.add {
  border: none;
  background: none;
  color: rgb(22, 100, 255);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}
.join-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 400;
  color: #4e5969;
}
.join-switch button {
  min-width: 36px;
  height: 28px;
  border: 1px solid #e5e6eb;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}
.join-switch button.on {
  border-color: rgb(22, 100, 255);
  color: rgb(22, 100, 255);
  background: #e8f3ff;
}
.empty {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #86909c;
}
.pol-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pol-table th, .pol-table td {
  text-align: left;
  padding: 12px 8px;
  border-bottom: 1px solid #f2f3f5;
  vertical-align: top;
}
.pol-table th { color: #86909c; font-weight: 500; }
.wl-hd { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.wl-empty { font-size: 13px; color: #86909c; }
.name-input { margin-bottom: 16px; }
.editor-grid {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 20px;
  min-height: 320px;
}
.aside {
  border-right: 1px solid #f2f3f5;
  padding-right: 18px;
}
.aside-title { font-weight: 600; margin-bottom: 10px; }
.filter-hd {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.filter-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #86909c;
}
.filter-pane { min-width: 0; }
.rs-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px;
  background: #fff;
  border-top: 1px solid #e5e6eb;
}
.hint { margin: 10px 0 0; font-size: 12px; color: #86909c; }
</style>
