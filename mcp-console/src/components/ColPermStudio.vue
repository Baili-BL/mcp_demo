<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  store, findDataset, findGrant, getOrCreateGrant, saveDatasetGrant,
  hydrateColPolicies, describeColSubject,
} from '../store'
import DsMark from './icons/DsMark.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  datasetId: { type: String, default: '' },
  policyId: { type: String, default: '' },
  openAdd: { type: Boolean, default: false },
})
const emit = defineEmits(['update:visible', 'saved'])

const SUBJECTS = [
  { value: 'all_on', label: '所有人生效' },
  { value: 'all_off', label: '所有人不生效' },
  { value: 'only', label: '仅对TA们有效' },
  { value: 'except', label: '仅对TA们无效' },
]

function uid(prefix = 'c') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
function clone(v) {
  return JSON.parse(JSON.stringify(v))
}
function emptyPolicy() {
  return {
    id: uid('cp'),
    column: '',
    mask: 'hide',
    subject: 'only',
    users: [],
    groups: [],
    on: true,
  }
}

const draft = reactive({
  enabled: false,
  other: 'allow',
  whitelist: [],
  policies: [],
  kw: '',
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
const reuseSources = computed(() => store.datasets.filter((d) => !d.deleted && d.id !== props.datasetId && hydrateColPolicies(findGrant(store, d.id)).length))
const listed = computed(() => {
  const q = draft.kw.trim().toLowerCase()
  const list = draft.policies
  if (!q) return list
  return list.filter((p) => String(p.column || '').toLowerCase().includes(q))
})
const unusedColumns = computed(() => {
  const used = new Set(draft.policies.filter((p) => !editing.value || p.id !== editing.value.id).map((p) => p.column))
  return columns.value.filter((c) => !used.has(c.column_name))
})

function userName(id) {
  return userMap.value.get(id)?.name || id
}
function whoDetail(p) {
  if (p.subject !== 'only' && p.subject !== 'except') return ''
  const names = [...(p.users || []).map(userName), ...(p.groups || [])].filter(Boolean)
  return names.join('、')
}
function maskText(mask) {
  return mask === 'mask' ? '数据脱敏' : '不展示'
}

function hydrate() {
  const dataset = ds.value
  const g = dataset ? getOrCreateGrant(store, dataset) : null
  draft.enabled = !!(g?.col_enabled)
  draft.other = g?.col_other || 'allow'
  draft.whitelist = [...(g?.col_whitelist || [])]
  draft.policies = hydrateColPolicies(g)
  draft.kw = ''
  whitelistOn.value = draft.whitelist.length > 0
  editing.value = null
  if (props.policyId) {
    const hit = draft.policies.find((p) => p.id === props.policyId || p.column === props.policyId)
    if (hit) editing.value = clone(hit)
  } else if (props.openAdd && draft.enabled) {
    startAdd()
  }
}

watch(() => [props.visible, props.datasetId, props.policyId, props.openAdd], ([on]) => {
  if (on) hydrate()
})

function close() {
  emit('update:visible', false)
}

function onEnable(v) {
  draft.enabled = v
  if (!v) editing.value = null
  else if (props.openAdd && !draft.policies.length) startAdd()
}

function startAdd() {
  if (!draft.enabled) {
    Message.warning('请先启用列级权限')
    return
  }
  editing.value = emptyPolicy()
}

function startEdit(p) {
  editing.value = clone(p)
}

function cancelEdit() {
  editing.value = null
}

function finishRule() {
  const p = editing.value
  if (!p) return
  if (!p.column) {
    Message.warning('请选择字段')
    return
  }
  if ((p.subject === 'only' || p.subject === 'except') && !(p.users || []).length && !(p.groups || []).length) {
    Message.warning('请选择用户或用户组')
    return
  }
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
  const err = saveDatasetGrant(store, {
    dataset_id: ds.value.id,
    col_enabled: draft.enabled,
    col_other: draft.other,
    col_whitelist: [...draft.whitelist],
    col_policies: clone(draft.policies),
  })
  if (err) {
    Message.warning(err)
    return
  }
  Message.success('列级权限已保存')
  emit('saved')
  close()
}

function reuseFrom(id) {
  if (!id) return
  const g = findGrant(store, id)
  const policies = hydrateColPolicies(g).map((p) => ({ ...clone(p), id: uid('cp') }))
  if (!policies.length) {
    Message.warning('该数据集暂无列级规则')
    return
  }
  draft.policies = policies
  draft.other = g.col_other || 'allow'
  draft.whitelist = [...(g.col_whitelist || [])]
  draft.enabled = true
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
      <div class="cs-title">
        <strong>列级权限</strong>
        <span v-if="ds" class="ds-chip">
          <DsMark />
          {{ ds.display_name }}
        </span>
      </div>
    </template>
    <div class="col-studio">
      <div class="cs-head-actions in-body">
        <button type="button" class="link" @click="Message.info('列级权限用于禁止查看或脱敏指定字段，并可按用户 / 用户组控制生效范围。白名单用户不受规则限制。')">查看帮助</button>
      </div>

      <div class="cs-body">
        <div class="cs-toolbar">
          <label class="en">
            <a-switch :model-value="draft.enabled" size="small" @change="onEnable" />
            启用列级权限
          </label>
          <a-dropdown v-model:popup-visible="reuseOpen" @select="reuseFrom">
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

        <section v-if="!draft.enabled" class="intro">
          <icon-empty :size="72" />
          <p class="intro-lead">
            当前数据集暂未开启设置，在左上方
            <button type="button" class="link" @click="onEnable(true)">开启</button>
            后手动添加<br>
            或从其他数据集
            <button type="button" class="link" @click="reuseOpen = true">复制权限规则</button>
          </p>
          <div class="about">
            <div class="about-line"><span>关于列级权限</span></div>
            <ul>
              <li>当某些字段值不能透出给用户时，您可以通过配置数据集的列级权限，对手机号、身份证等敏感字段设置禁止查看或数据脱敏。</li>
              <li>同时，您还可以设置白名单用户，进行额外的权限控制。</li>
            </ul>
            <div class="demo">
              <div class="demo-card">
                <span class="who a">User A</span>
                <table>
                  <thead><tr><th>姓名</th><th>手机号</th></tr></thead>
                  <tbody>
                    <tr><td>张三</td><td>123****5678</td></tr>
                    <tr><td>李四</td><td>123****5678</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="demo-card">
                <span class="who b">User B</span>
                <table>
                  <thead><tr><th>姓名</th><th>手机号</th></tr></thead>
                  <tbody>
                    <tr><td>张**</td><td>12345675678</td></tr>
                    <tr><td>王**</td><td>12345675678</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <template v-else>
          <div class="cs-subbar">
            <a-input v-model="draft.kw" allow-clear placeholder="请按字段名称搜索" :style="{ width: '240px' }">
              <template #prefix><icon-search /></template>
            </a-input>
            <div class="other">
              <a-tooltip :content="draft.other === 'deny' ? '权限生效人员查看未配置字段时将被禁止查看' : '权限生效人员可以查看未单独配置的其他字段'">
                <icon-info-circle />
              </a-tooltip>
              其他字段
              <a-select v-model="draft.other" size="small" :style="{ width: '120px' }">
                <a-option value="allow">允许查看</a-option>
                <a-option value="deny">禁止查看</a-option>
              </a-select>
            </div>
          </div>

          <section v-if="!editing" class="card">
            <div v-if="!draft.policies.length" class="empty">
              <icon-empty :size="56" />
              <p>暂未添加规则，请在下方点击添加</p>
              <a-button type="primary" @click="startAdd">+ 添加规则</a-button>
            </div>
            <template v-else>
              <table class="pol-table">
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>权限规则</th>
                    <th>对谁有效</th>
                    <th style="width:88px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in listed" :key="p.id">
                    <td>{{ p.column }}</td>
                    <td>
                      <div>—</div>
                      <div class="muted">{{ maskText(p.mask) }}</div>
                    </td>
                    <td>
                      <div>{{ describeColSubject(p) }}</div>
                      <div v-if="whoDetail(p)" class="muted">{{ whoDetail(p) }}</div>
                    </td>
                    <td>
                      <a-button type="text" size="mini" @click="startEdit(p)"><icon-edit /></a-button>
                      <a-button type="text" size="mini" status="danger" @click="removePolicy(p)"><icon-delete /></a-button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="add" @click="startAdd">+ 添加规则</button>
            </template>
          </section>

          <section v-else class="card editor">
            <div class="card-hd">添加规则</div>
            <div class="editor-grid">
              <aside class="aside">
                <div class="aside-title">权限规则</div>
                <div class="field-block">
                  <div class="lbl">选择字段</div>
                  <a-select v-model="editing.column" allow-search placeholder="选择字段">
                    <a-option v-for="c in unusedColumns" :key="c.column_name" :value="c.column_name">{{ c.column_name }}</a-option>
                    <a-option v-if="editing.column && !unusedColumns.some((c) => c.column_name === editing.column)" :value="editing.column">{{ editing.column }}</a-option>
                  </a-select>
                </div>
                <div class="field-block">
                  <div class="lbl">设置规则</div>
                  <a-radio-group v-model="editing.mask" direction="vertical">
                    <a-radio value="hide">
                      禁止查看
                      <a-tooltip content="权限生效人员无法查看该字段">
                        <icon-info-circle />
                      </a-tooltip>
                    </a-radio>
                    <a-radio value="mask">数据脱敏</a-radio>
                  </a-radio-group>
                </div>
              </aside>
              <div class="who-pane">
                <div class="aside-title">对谁有效</div>
                <a-radio-group v-model="editing.subject">
                  <a-radio v-for="s in SUBJECTS" :key="s.value" :value="s.value">{{ s.label }}</a-radio>
                </a-radio-group>
                <a-select
                  v-if="editing.subject === 'only' || editing.subject === 'except'"
                  v-model="editing.users"
                  multiple
                  allow-search
                  placeholder="请选择用户或用户组"
                  style="margin-top: 12px"
                >
                  <a-optgroup label="用户">
                    <a-option v-for="u in aclUsers" :key="u.id" :value="u.id">{{ u.name }} · {{ u.team || u.role }}</a-option>
                  </a-optgroup>
                </a-select>
                <a-select
                  v-if="editing.subject === 'only' || editing.subject === 'except'"
                  v-model="editing.groups"
                  multiple
                  allow-search
                  placeholder="选择用户组（可选）"
                  style="margin-top: 8px"
                >
                  <a-option v-for="g in userGroups" :key="g.id" :value="g.id">用户组 · {{ g.name }}</a-option>
                </a-select>
              </div>
            </div>
          </section>

          <section v-if="!editing" class="card white">
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
      </div>

      <footer v-if="draft.enabled" class="cs-foot">
        <a-button @click="editing ? cancelEdit() : close()">取消</a-button>
        <a-button v-if="editing" type="primary" @click="finishRule">完成</a-button>
        <a-button v-else type="primary" @click="saveAll">保存</a-button>
      </footer>
    </div>
  </a-drawer>
</template>

<style scoped>
.col-studio {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  background: #f7f8fa;
  margin: -16px -20px -20px;
  color: rgb(12, 13, 14);
}
.cs-head-actions.in-body {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 8px;
}
.cs-title { display: flex; align-items: center; gap: 10px; font-size: 16px; }
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
.cs-head-actions { display: flex; align-items: center; gap: 12px; }
.link {
  border: none;
  background: none;
  color: rgb(22, 100, 255);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}
.icon-btn {
  width: 28px; height: 28px; border: none; background: none;
  cursor: pointer; color: #4e5969; border-radius: 4px;
}
.icon-btn:hover { background: #f2f3f5; }
.cs-body { flex: 1; min-height: 0; overflow: auto; padding: 16px 24px 24px; }
.cs-toolbar, .cs-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.en { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
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
.card-hd { font-weight: 600; margin-bottom: 12px; }
.add {
  border: none; background: none; color: rgb(22, 100, 255);
  cursor: pointer; font-size: 14px; padding: 8px 0 0;
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
.pol-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pol-table th, .pol-table td {
  text-align: left; padding: 12px 8px;
  border-bottom: 1px solid #f2f3f5; vertical-align: top;
}
.pol-table th { color: #86909c; font-weight: 500; }
.editor-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  min-height: 280px;
}
.aside { border-right: 1px solid #f2f3f5; padding-right: 16px; }
.aside-title { font-weight: 600; margin-bottom: 12px; }
.field-block { margin-bottom: 16px; }
.lbl { color: #4e5969; font-size: 13px; margin-bottom: 8px; }
.wl-hd { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.wl-empty { font-size: 13px; color: #86909c; }
.cs-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 24px; background: #fff; border-top: 1px solid #e5e6eb;
}
.intro {
  background: #fff;
  border-radius: 8px;
  padding: 48px 24px 56px;
  text-align: center;
}
.intro-lead { color: #4e5969; font-size: 14px; line-height: 1.8; margin: 12px 0 28px; }
.about { max-width: 760px; margin: 0 auto; text-align: left; }
.about-line {
  display: flex; align-items: center; gap: 12px;
  color: #1d2129; font-weight: 600; margin-bottom: 12px;
}
.about-line::before, .about-line::after {
  content: ''; flex: 1; height: 1px; background: #e5e6eb;
}
.about ul { margin: 0 0 20px; padding-left: 18px; color: #4e5969; font-size: 13px; line-height: 1.8; }
.demo { display: flex; justify-content: center; gap: 24px; }
.demo-card {
  position: relative;
  width: 280px;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  padding: 28px 16px 12px;
  background: #fafafa;
}
.who {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  padding: 2px 14px; border-radius: 12px; color: #fff; font-size: 12px;
}
.who.a { background: #165dff; }
.who.b { background: #ff7d00; }
.demo-card table { width: 100%; border-collapse: collapse; font-size: 13px; }
.demo-card th, .demo-card td { padding: 8px; border-bottom: 1px solid #eee; color: #4e5969; }
.demo-card th { color: #86909c; font-weight: 500; }
.muted { color: #86909c; font-size: 12px; }
</style>
