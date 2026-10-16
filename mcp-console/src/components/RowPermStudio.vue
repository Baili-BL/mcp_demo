<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  store, findDataset, findGrant, getOrCreateGrant, saveDatasetGrant,
  isMeasureColumn, hydrateRowPolicies, describeRowPolicy,
} from '../store'
import DsMark from './icons/DsMark.vue'

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
function samplesOf(name) {
  const col = colOf(name)
  const raw = col?.sample_values
  let list = []
  if (Array.isArray(raw)) list = raw.map(String)
  else if (typeof raw === 'string' && raw.trim()) list = raw.split(/[,，]/).map((x) => x.trim()).filter(Boolean)
  const key = `${name || ''} ${col?.description || ''}`
  if (!list.length && /区域|地区|大区|region/i.test(key)) list = ['东北', '华北', '华东', '华南', '华中', '西南', '西北']
  if (!list.length && /frequency|频度/.test(key)) list = ['日', '周', '月', '年']
  if (!list.length && /unit|单位/.test(key)) list = ['元/吨', '%', '万吨']
  if (!list.length && /index_code|指标代码/.test(key)) list = ['CU', 'RB', 'SA', 'AL']
  if (!list.length && /variety|品种/.test(key)) list = ['CU', 'RB', 'SA', 'AL']
  if (!list.length && /industry|行业/.test(key)) list = ['有色', '黑色', '能化', '农产品']
  if (!list.length && /warehouse|仓库/.test(key)) list = ['上海', '无锡', '天津']
  if (!list.length && /team|团队/.test(key)) list = ['数智中心', '有色组', '能化组']
  return [...new Set(list)]
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
  const names = [...new Set((p.blocks || []).flatMap((b) => (b.conditions || []).map((c) => c.column).filter(Boolean)))]
  return names.join('、') || '—'
}
function visibleText(p) {
  const join = (p.blocks?.[0]?.join || 'and') === 'or' ? '并集' : '交集'
  const desc = describeRowPolicy(p)
  return desc === '未设置筛选' ? desc : `基于以上字段筛选条件取${join}`
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
    if (hit) editing.value = clone(hit)
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

function startAdd() {
  const n = draft.policies.length + 1
  const p = emptyPolicy(`规则${n}`)
  const first = defaultColumn()
  if (first) {
    p.blocks[0].conditions[0].column = first
    if (measureOf(first)) {
      p.blocks[0].conditions[0].method = 'condition'
      p.blocks[0].conditions[0].op = '='
    }
  }
  editing.value = p
}

function startEdit(p) {
  editing.value = clone(p)
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

function addCondition(block) {
  const prev = block.conditions[block.conditions.length - 1]
  const next = emptyCond(prev?.column || defaultColumn())
  if (next.column && measureOf(next.column)) {
    next.method = 'condition'
    next.op = '='
  }
  block.conditions.push(next)
}

function removeCondition(block, idx) {
  if (block.conditions.length <= 1) {
    block.conditions.splice(0, 1, emptyCond(defaultColumn()))
    return
  }
  block.conditions.splice(idx, 1)
}

function addRelation(policy) {
  const last = policy.blocks[policy.blocks.length - 1]
  const col = last?.conditions?.[0]?.column || defaultColumn()
  policy.blocks.push(emptyBlock(col))
}

function removeBlock(policy, idx) {
  if (policy.blocks.length <= 1) return
  policy.blocks.splice(idx, 1)
}

function toggleJoin(block) {
  block.join = block.join === 'and' ? 'or' : 'and'
}
function addEnumValue(cond, s) {
  const v = String(s || '').trim()
  if (!v) return
  if (!Array.isArray(cond.values)) cond.values = []
  if (!cond.values.includes(v)) cond.values.push(v)
}

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
  const ok = (p.blocks || []).some((b) => (b.conditions || []).some(condValid))
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
    :width="960"
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
      <div class="rs-head-actions in-body">
        <button type="button" class="link" @click="Message.info('行级权限：为赋权对象配置可见内容筛选，白名单用户不受规则限制。')">查看帮助</button>
      </div>

      <div class="rs-body">
        <div class="rs-toolbar">
          <label class="en">
            <a-switch v-model="draft.enabled" size="small" />
            启用行级权限
          </label>
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
          <div class="card-hd">添加规则</div>
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
                可见内容筛选
                <span class="muted">切换最外侧关系节点类型时，所有关系都会切换，内外层关系必然相反</span>
              </div>
              <div v-for="(block, bi) in editing.blocks" :key="block.id" class="block">
                <button type="button" class="join-tog" :title="'单击切换且 / 或'" @click="toggleJoin(block)">
                  <span>{{ block.join === 'and' ? '且' : '或' }}</span>
                  <icon-swap />
                </button>
                <div class="block-body">
                  <div v-for="(cond, ci) in block.conditions" :key="cond.id" class="cond">
                    <span class="lbl">筛选字段</span>
                    <a-select :model-value="cond.column" allow-search :style="{ width: '160px' }" @change="(v) => onColumnChange(cond, v)">
                      <a-option v-for="c in columns" :key="c.column_name" :value="c.column_name">
                        {{ c.column_name }}（{{ measureOf(c.column_name) ? '度量' : '维度' }}）
                      </a-option>
                    </a-select>
                    <span class="lbl">筛选方式</span>
                    <a-select :model-value="cond.method" :style="{ width: '128px' }" @change="(v) => onMethodChange(cond, v)">
                      <a-option v-for="m in methodsOf(cond.column)" :key="m.value" :value="m.value">{{ m.label }}</a-option>
                    </a-select>
                    <template v-if="cond.method === 'enum'">
                      <span class="lbl">固定值</span>
                      <a-select v-model="cond.op" :style="{ width: '88px' }">
                        <a-option v-for="o in ENUM_OPS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
                      </a-select>
                      <div class="enum-box">
                        <a-input-tag
                          v-model="cond.values"
                          allow-clear
                          unique-value
                          placeholder="输入后回车添加关键字"
                        />
                        <div v-if="samplesOf(cond.column).length" class="enum-hints">
                          <button
                            v-for="s in samplesOf(cond.column)"
                            :key="s"
                            type="button"
                            class="hint-chip"
                            @click="addEnumValue(cond, s)"
                          >{{ s }}</button>
                        </div>
                      </div>
                    </template>
                    <template v-else-if="cond.method === 'condition'">
                      <span class="lbl">固定值</span>
                      <a-select v-model="cond.op" :style="{ width: '112px' }">
                        <a-option v-for="o in opsOf(cond)" :key="o.value" :value="o.value">{{ o.label }}</a-option>
                      </a-select>
                      <template v-if="cond.op !== 'empty' && cond.op !== 'not_empty'">
                        <a-input v-model="cond.value" :placeholder="cond.op === 'between' ? '起始值' : '值'" :style="{ width: '120px' }" />
                        <template v-if="cond.op === 'between'">
                          <span class="muted">~</span>
                          <a-input v-model="cond.value2" placeholder="结束值" :style="{ width: '120px' }" />
                        </template>
                      </template>
                    </template>
                    <template v-else>
                      <span class="lbl">绑定标签</span>
                      <a-select v-model="cond.tagKey" :style="{ width: '128px' }">
                        <a-option v-for="t in TAG_KEYS" :key="t.value" :value="t.value">{{ t.label }}</a-option>
                      </a-select>
                    </template>
                    <a-button v-if="block.conditions.length > 1" type="text" size="mini" status="danger" @click="removeCondition(block, ci)">
                      <icon-delete />
                    </a-button>
                  </div>
                  <div class="cond-actions">
                    <a-button type="primary" size="small" @click="addCondition(block)">+ 添加条件</a-button>
                    <a-button type="primary" size="small" @click="addRelation(editing)">+ 添加关系</a-button>
                    <a-button v-if="editing.blocks.length > 1" type="text" size="small" status="danger" @click="removeBlock(editing, bi)">删除此关系</a-button>
                  </div>
                </div>
              </div>
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
.rs-head-actions.in-body {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 8px;
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
.rs-head-actions { display: flex; align-items: center; gap: 12px; }
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
  grid-template-columns: 220px 1fr;
  gap: 16px;
  min-height: 320px;
}
.aside {
  border-right: 1px solid #f2f3f5;
  padding-right: 16px;
}
.aside-title { font-weight: 600; margin-bottom: 10px; }
.filter-hd {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
  font-weight: 600;
}
.filter-hd .muted { font-weight: 400; }
.block {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.join-tog {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: none;
  color: rgb(22, 100, 255);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.block-body {
  border-left: 1px solid #c9cdd4;
  padding: 4px 0 4px 12px;
}
.cond {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.lbl { color: #4e5969; font-size: 13px; }
.cond-actions { display: flex; gap: 8px; margin-top: 4px; }
.enum-box { flex: 1; min-width: 200px; }
.enum-hints { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.hint-chip {
  border: 1px dashed #c9cdd4;
  background: #fff;
  color: #4e5969;
  border-radius: 4px;
  padding: 0 8px;
  height: 24px;
  font-size: 12px;
  cursor: pointer;
}
.hint-chip:hover { border-color: rgb(22, 100, 255); color: rgb(22, 100, 255); }
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
