<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  store, DATABASE_TYPES, ACCESS_MODES, inferConnector,
  whitelistText, testSourceConnection, syncSourceBinding, rememberPlatforms, isDbKind,
} from '../store'
import { copyText } from '../utils'
import DbTypeIcon from './DbTypeIcon.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  editing: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const step = ref(1)
const typeQuery = ref('')
const selected = ref(null)
const formTesting = ref(false)
const testedOk = ref(false)
const testedCatalog = ref([])
const tip = ref(null)

const blank = () => ({
  name: '', code: '', kind: 'mysql', envKey: 'MYSQL_DSN',
  host: '', port: 3306, database: '', user: '', password: '', passwordSet: false,
  accessMode: 'read',
  connectMode: 'manual', dbVersion: '8.0',
  ssl: false, sshEnabled: false, sshHost: '', sshUser: '', sshPassword: '', sshPasswordSet: false, sshPort: 22,
  initSqlEnabled: false, initSql: '', uploadEnabled: false,
  baseUrl: '', timeout: 10, enabled: true, note: '', svcIds: [],
  connectorId: '', vendor: 'self',
})
const form = reactive(blank())

const visibleTypes = computed(() => {
  const q = typeQuery.value.trim().toLowerCase()
  return DATABASE_TYPES.filter((t) => {
    if (!q) return true
    return `${t.label} ${t.type} ${t.desc}`.toLowerCase().includes(q)
  })
})
const isMysql = computed(() => form.kind === 'mysql')
const isDb = computed(() => isDbKind(form.kind))
const typeModal = computed(() => props.visible && !props.editing && step.value === 1)
const formModal = computed(() => props.visible && (props.editing || step.value === 2))
const formTitle = computed(() => {
  const label = selected.value?.label || form.kind
  return props.editing ? `编辑数据源 · ${form.name || props.editing.name}` : `配置连接 · ${label}`
})

function defaultName(label) {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const prefix = String(label || 'DB').replace(/\s+/g, '')
  return `${prefix}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
function slugFromName(name) {
  const raw = String(name || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  if (/^[a-z][a-z0-9_]*$/.test(raw)) return raw.slice(0, 48)
  return `ds_${Date.now().toString(36)}`
}

function resetForCreate() {
  Object.assign(form, blank())
  selected.value = null
  typeQuery.value = ''
  step.value = 1
  testedOk.value = false
  testedCatalog.value = []
  tip.value = null
}
function fillFromSource(src) {
  const c = inferConnector(src)
  selected.value = c
  Object.assign(form, blank(), {
    name: src.name,
    code: src.code,
    kind: src.kind,
    envKey: src.envKey || (src.kind === 'http' ? 'HTTP_BASE_URL' : 'MYSQL_DSN'),
    host: src.host || '',
    port: src.port || c.port || 3306,
    database: src.database || '',
    user: src.user || '',
    password: '',
    passwordSet: !!src.passwordSet,
    accessMode: src.accessMode || (src.readonly === false ? 'write' : 'read'),
    connectMode: src.connectMode === 'auto' ? 'auto' : 'manual',
    dbVersion: src.dbVersion || '8.0',
    ssl: !!src.ssl,
    sshEnabled: !!src.sshEnabled,
    sshHost: src.sshHost || '',
    sshUser: src.sshUser || '',
    sshPassword: '',
    sshPasswordSet: !!src.sshPasswordSet,
    sshPort: src.sshPort || 22,
    initSqlEnabled: !!src.initSqlEnabled,
    initSql: src.initSql || '',
    uploadEnabled: !!src.uploadEnabled,
    baseUrl: src.baseUrl || '',
    timeout: src.timeout || 10,
    enabled: src.enabled !== false,
    note: src.note || '',
    svcIds: [...(src.svcIds || [])],
    connectorId: c.id,
    vendor: c.vendor,
  })
  step.value = 2
  testedOk.value = false
  testedCatalog.value = []
  tip.value = null
}

watch(() => [props.visible, props.editing], ([vis]) => {
  if (!vis) return
  if (props.editing) fillFromSource(props.editing)
  else resetForCreate()
}, { immediate: true })

function chooseType(t) {
  if (!t.enabled) {
    Message.warning(`${t.label} 暂未开放`)
    return
  }
  selected.value = t
  form.kind = t.type
  form.port = t.port
  form.envKey = t.envKey
  form.connectorId = `self-${t.type}`
  form.vendor = 'self'
  form.name = defaultName(t.label)
  form.code = slugFromName(form.name)
  testedOk.value = false
  tip.value = null
  step.value = 2
}

function validate() {
  const name = form.name.trim()
  const code = form.code.trim()
  if (!name) return '请填写显示名称'
  if (/^\s|\s$/.test(form.name) || /[<>"'\\]/.test(name)) return '显示名称请勿使用特殊字符，前后不能包含空格'
  if (!/^[a-z][a-z0-9_]*$/.test(code)) return '标识需为小写字母开头'
  if (store.sources.some((s) => s.code === code && s.id !== props.editing?.id)) return `标识 ${code} 已存在`
  if (isDbKind(form.kind)) {
    if (!form.host.trim()) return '请填写数据库地址'
    if (!form.port) return '请填写端口'
    if (!form.database.trim()) return '请填写数据库'
    if (!form.user.trim()) return '请填写用户名'
    if (!form.passwordSet && !String(form.password || '').trim()) return '请填写密码'
    if (form.sshEnabled) {
      if (!form.sshHost.trim()) return '请填写 SSH Host'
      if (!form.sshUser.trim()) return '请填写 SSH 用户名'
      if (!form.sshPasswordSet && !String(form.sshPassword || '').trim()) return '请填写 SSH 密码'
      if (!form.sshPort) return '请填写 SSH 端口'
    }
    if (form.initSqlEnabled) {
      const sql = String(form.initSql || '').trim()
      if (!sql) return '请填写初始化 SQL'
      if (!/^set\b/i.test(sql)) return '初始化 SQL 只允许 SET 语句，多条以分号分隔'
    }
  } else if (form.kind === 'http') {
    if (!/^https?:\/\/\S+$/.test(form.baseUrl.trim())) return '接口地址需为 http(s) URL'
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(form.envKey.trim())) return '环境变量名需为大写字母开头'
  return ''
}

function payloadFromForm() {
  const accessMode = form.accessMode === 'write' ? 'write' : 'read'
  const db = isDbKind(form.kind)
  return {
    name: form.name.trim(),
    code: form.code.trim(),
    kind: form.kind,
    connectorId: form.connectorId || selected.value?.type || '',
    vendor: form.vendor || 'self',
    envKey: form.envKey.trim(),
    host: db ? form.host.trim() : '',
    port: db ? Number(form.port) : (form.kind === 'http' ? 443 : null),
    database: db ? form.database.trim() : '',
    user: db ? form.user.trim() : '',
    passwordSet: form.kind === 'http' ? false : (form.passwordSet || !!String(form.password || '').trim()),
    accessMode: db ? accessMode : 'read',
    vpcMode: false,
    vpcId: '',
    vpcAccessKeyId: '',
    vpcAkSet: false,
    vpcInstanceId: '',
    vpcRegion: '',
    connectMode: db ? form.connectMode : '',
    dbVersion: db ? form.dbVersion : '',
    ssl: db ? !!form.ssl : false,
    sshEnabled: db ? !!form.sshEnabled : false,
    sshHost: db && form.sshEnabled ? form.sshHost.trim() : '',
    sshUser: db && form.sshEnabled ? form.sshUser.trim() : '',
    sshPasswordSet: db && form.sshEnabled ? (form.sshPasswordSet || !!String(form.sshPassword || '').trim()) : false,
    sshPort: db && form.sshEnabled ? Number(form.sshPort) || 22 : 22,
    initSqlEnabled: db ? !!form.initSqlEnabled : false,
    initSql: db && form.initSqlEnabled ? form.initSql.trim() : '',
    uploadEnabled: db ? !!form.uploadEnabled : false,
    baseUrl: form.kind === 'http' ? form.baseUrl.trim() : '',
    timeout: Number(form.timeout) || 10,
    readonly: accessMode !== 'write',
    enabled: !!form.enabled,
    metricSource: props.editing?.metricSource ?? null,
    note: form.note.trim(),
    svcIds: [...form.svcIds],
  }
}

async function testForm() {
  const err = validate()
  if (err) { Message.warning(err); return }
  formTesting.value = true
  testedOk.value = false
  try {
    await new Promise((r) => setTimeout(r, 500))
    const probe = {
      ...payloadFromForm(),
      enabled: true,
      catalog: props.editing?.catalog ? [...props.editing.catalog] : [],
    }
    const result = testSourceConnection(probe)
    tip.value = result.success
      ? { ok: true, text: `连接成功，发现 ${result.tables_found} 张表/视图。测试通过后可确定保存。` }
      : { ok: false, text: `连接失败：${result.message}` }
    testedOk.value = !!result.success
    testedCatalog.value = result.success ? (probe.catalog || []) : []
    if (result.success) Message.success('连接测试通过')
    else Message.error(tip.value.text)
  } finally {
    formTesting.value = false
  }
}

function save() {
  const err = validate()
  if (err) { Message.warning(err); return }
  if (isDb.value && !testedOk.value) {
    Message.warning('请先单击「连接测试」，测试成功后再确定')
    return
  }
  const data = payloadFromForm()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  if (props.editing) {
    const cur = store.sources.find((s) => s.id === props.editing.id)
    if (!cur) return
    const prev = cur.name
    Object.assign(cur, data)
    if (testedOk.value) {
      cur.status = 'connected'
      cur.lastCheck = now
      cur.lastError = ''
      if (testedCatalog.value.length) cur.catalog = testedCatalog.value
    }
    syncSourceBinding(cur, prev)
    Message.success('数据源已更新')
    emit('saved', cur)
    close()
    return
  }
  const src = {
    id: 'src-' + Date.now().toString(36),
    ...data,
    catalog: testedOk.value ? [...testedCatalog.value] : [],
    objects: [],
    status: testedOk.value ? 'connected' : (data.enabled ? 'idle' : 'disabled'),
    latency: testedOk.value ? 32 : null,
    lastCheck: testedOk.value ? now : '',
    lastError: '',
    lastSyncedAt: '',
  }
  store.sources.unshift(src)
  syncSourceBinding(src, '')
  rememberPlatforms([src.name])
  Message.success(`已创建数据源「${src.name}」`)
  emit('saved', src)
  close()
}

function close() {
  emit('update:visible', false)
}
function backToTypes() {
  step.value = 1
  testedOk.value = false
  testedCatalog.value = []
  tip.value = null
}
async function copyWhitelist() {
  await copyText(whitelistText())
  Message.success('白名单已复制，请添加到数据库安全组 / IP 白名单')
}
</script>

<template>
  <a-modal
    v-if="typeModal"
    :visible="true"
    title="选择数据库类型"
    modal-class="type-picker-modal"
    :width="1080"
    :footer="false"
    unmount-on-close
    :mask-closable="false"
    @cancel="close"
  >
    <a-input-search
      v-model="typeQuery"
      allow-clear
      placeholder="搜索类型，如 MySQL / ClickHouse / Hive"
      class="type-search"
    />
    <div class="type-board">
      <button
        v-for="t in visibleTypes"
        :key="t.type"
        type="button"
        class="type-card"
        :class="{ disabled: !t.enabled }"
        @click="chooseType(t)"
      >
        <DbTypeIcon :type="t.type" />
        <span class="type-name">{{ t.label }}</span>
      </button>
      <a-empty v-if="!visibleTypes.length" description="没有匹配的数据库类型" />
    </div>
  </a-modal>

  <a-modal
    v-if="formModal"
    :visible="true"
    :title="formTitle"
    :width="720"
    :footer="false"
    unmount-on-close
    :mask-closable="false"
    @cancel="close"
  >
    <a-form :model="form" layout="vertical">
      <div v-if="isDb" class="form-toolbar">
        <a-button type="text" size="small" @click="copyWhitelist">复制白名单</a-button>
      </div>
      <a-alert v-if="isDb" type="info" style="margin-bottom: 16px">
        通过公网连接时，需将控制台 IP 加入数据库白名单。配置完成后请先连接测试，再确定保存。
      </a-alert>

      <template v-if="isDb">
        <a-form-item label="显示名称" required>
          <a-input v-model="form.name" placeholder="数据源配置列表的显示名称" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="16">
            <a-form-item label="数据库地址" required>
              <a-input v-model="form.host" class="mono" placeholder="IP 或域名" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="端口" required>
              <a-input-number v-model="form.port" :min="1" :max="65535" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="数据库" required>
          <a-input v-model="form.database" class="mono" placeholder="数据库名称" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="用户名" required>
              <a-input v-model="form.user" class="mono" placeholder="登录数据库的用户名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="密码" :required="!form.passwordSet">
              <a-input-password v-model="form.password" :placeholder="form.passwordSet ? '已配置，留空不修改' : '登录数据库的密码'" />
            </a-form-item>
          </a-col>
        </a-row>

        <template v-if="isMysql">
          <a-form-item>
            <a-checkbox v-model="form.ssl">SSL</a-checkbox>
            <span class="muted" style="margin-left: 8px">目标库已开启 SSL 时勾选</span>
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model="form.sshEnabled">SSH</a-checkbox>
            <span class="muted" style="margin-left: 8px">通过跳板机隧道访问</span>
          </a-form-item>
          <template v-if="form.sshEnabled">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="SSH Host" required>
                  <a-input v-model="form.sshHost" class="mono" placeholder="跳板机 IP 或域名" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="SSH 端口" required>
                  <a-input-number v-model="form.sshPort" :min="1" :max="65535" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="SSH 用户名" required>
                  <a-input v-model="form.sshUser" class="mono" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="SSH 密码" :required="!form.sshPasswordSet">
                  <a-input-password v-model="form.sshPassword" :placeholder="form.sshPasswordSet ? '已配置，留空不修改' : '跳板机密码'" />
                </a-form-item>
              </a-col>
            </a-row>
          </template>
          <a-form-item>
            <a-checkbox v-model="form.initSqlEnabled">初始化 SQL</a-checkbox>
          </a-form-item>
          <a-form-item v-if="form.initSqlEnabled" label="SET 语句">
            <a-textarea v-model="form.initSql" :auto-size="{ minRows: 2, maxRows: 5 }" placeholder="SET NAMES utf8mb4; 仅允许 SET，多条以分号分隔" />
          </a-form-item>
        </template>

        <a-collapse :bordered="false">
          <a-collapse-item header="高级" key="adv">
            <a-form-item label="权限模式">
              <a-radio-group v-model="form.accessMode">
                <a-radio v-for="m in ACCESS_MODES" :key="m.value" :value="m.value">{{ m.label }}</a-radio>
              </a-radio-group>
            </a-form-item>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="标识" required>
                  <a-input v-model="form.code" class="mono" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="环境变量" required>
                  <a-input v-model="form.envKey" class="mono" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-collapse-item>
        </a-collapse>
      </template>

      <template v-else>
        <a-form-item label="显示名称" required><a-input v-model="form.name" /></a-form-item>
        <a-form-item label="标识" required><a-input v-model="form.code" class="mono" /></a-form-item>
        <a-form-item label="接口地址" required><a-input v-model="form.baseUrl" class="mono" /></a-form-item>
        <a-form-item label="环境变量" required><a-input v-model="form.envKey" class="mono" /></a-form-item>
      </template>

      <a-alert v-if="tip" :type="tip.ok ? 'success' : 'error'" style="margin: 8px 0 12px">{{ tip.text }}</a-alert>
      <div class="form-actions">
        <a-button v-if="!editing" @click="backToTypes">上一步</a-button>
        <a-button v-if="isDb" :loading="formTesting" @click="testForm">连接测试</a-button>
        <a-button @click="close">取消</a-button>
        <a-button type="primary" @click="save">确定</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<style scoped>
.type-search { margin-bottom: 16px; }
.type-board {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  max-height: 460px;
  overflow: auto;
  padding: 4px 2px 8px;
  margin: 0 -4px;
  background: #f5f8fc;
  border-radius: 8px;
}
.type-card {
  display: flex;
  align-items: center;
  height: 70px;
  padding: 0;
  margin: 0;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  cursor: pointer;
}
.type-card:hover:not(.disabled) { border-color: rgb(46, 116, 255); }
.type-card.disabled { opacity: 0.55; cursor: not-allowed; }
.type-card :deep(.db-ico) {
  width: 24px;
  height: 24px;
  margin: 0 12px 0 16px;
}
.type-card :deep(.db-ico svg) {
  width: 24px;
  height: 24px;
}
.type-name {
  flex: 1;
  min-width: 0;
  padding-right: 12px;
  font-size: 14px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.85);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}
.form-toolbar { display: flex; justify-content: flex-end; margin: -8px 0 4px; }
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}
@media (max-width: 1100px) {
  .type-board { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 700px) {
  .type-board { grid-template-columns: 1fr 1fr; }
}
</style>

<style>
.type-picker-modal .arco-modal-header {
  border-bottom: none;
}
.type-picker-modal .arco-modal-title {
  width: 100%;
  justify-content: center;
  font-weight: 500;
}
.type-picker-modal .arco-modal-body {
  padding-top: 4px;
  background: #fff;
}
</style>
