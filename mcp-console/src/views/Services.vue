<script setup>
import { Message, Modal } from '@arco-design/web-vue'
import {
  store, showMcpConfig, showToolsetConfig, openPlayground, CALL_MODES,
  toolsetEndpoint, platformOptions, rememberPlatforms, ensureSvcMeta,
  toolsOfService, toolsetsUsingService, servicesOfSet, platformsOfSet,
  discoverToolsForService, appendToolsToSet, createToolsetFromService,
  clientsOfToolset, keyOfToolset, keyForEndpoint,
} from '../store'
import { fmt, keyExpireMeta, keyStatus } from '../utils'
import { computed, reactive, ref } from 'vue'

const emit = defineEmits(['goto'])
const svcVisible = ref(false)
const setVisible = ref(false)
const addVisible = ref(false)
const discVisible = ref(false)
const joinVisible = ref(false)
const discBusy = ref(false)
const discSvc = ref(null)
const discTools = ref([])
const joinSetId = ref('')
const currentSet = ref(null)
const keyDrawerVisible = ref(false)
const keyDrawerSet = ref(null)
const form = reactive({
  name: '', code: '', proto: 'Streamable HTTP', version: 'v1.0.0',
  endpoint: '', sources: [], discover: true,
})
const setForm = reactive({
  name: 'mcp_toolset_' + Math.random().toString(36).slice(2, 8),
  mode: 'all',
})
const addKw = ref('')
const addToolKw = ref('')
const hubKw = ref('')
const sourceCustom = ref('')
const addSvc = ref(store.services[0]?.id || '')
const picked = ref([])
const sourceChoices = computed(() => platformOptions())

const addSvcList = computed(() => store.services.filter((s) =>
  !addKw.value || s.name.includes(addKw.value) || s.code.includes(addKw.value)
))
const addToolList = computed(() => {
  const kw = addToolKw.value.trim().toLowerCase()
  return store.tools.filter((t) => {
    if (t.svc !== addSvc.value || !t.on) return false
    if (!kw) return true
    return t.name.toLowerCase().includes(kw)
      || (t.cn || '').toLowerCase().includes(kw)
      || (t.desc || '').toLowerCase().includes(kw)
  })
})
const addPickedOfSvc = computed(() =>
  store.tools.filter((t) => t.svc === addSvc.value && t.on && picked.value.includes(t.name)).length
)
const addSvcToolTotal = computed(() => store.tools.filter((t) => t.svc === addSvc.value && t.on).length)
const shownServices = computed(() => {
  const kw = hubKw.value.trim().toLowerCase()
  if (!kw) return store.services
  return store.services.filter((s) =>
    s.name.toLowerCase().includes(kw)
    || s.code.toLowerCase().includes(kw)
    || s.id.toLowerCase().includes(kw)
    || (s.sources || []).some((x) => String(x).toLowerCase().includes(kw))
  )
})
const shownSets = computed(() => {
  const kw = hubKw.value.trim().toLowerCase()
  if (!kw) return store.toolsets
  return store.toolsets.filter((s) => {
    if (s.name.toLowerCase().includes(kw) || s.id.toLowerCase().includes(kw)) return true
    return servicesOfSet(s).some((svc) => svc.name.toLowerCase().includes(kw) || svc.code.toLowerCase().includes(kw))
      || platformsOfSet(s).some((p) => p.toLowerCase().includes(kw))
  })
})

function svcToolCount(id) { return toolsOfService(id).length }
function svcSets(id) { return toolsetsUsingService(id) }
function confirmAct(title, content, okMsg) {
  Modal.confirm({ title, content, onOk: () => Message.success(okMsg) })
}
function resetSvcForm() {
  Object.assign(form, { name: '', code: '', proto: 'Streamable HTTP', version: 'v1.0.0', endpoint: '', sources: [], discover: true })
  sourceCustom.value = ''
}
function addCustomSource() {
  const t = sourceCustom.value.trim()
  if (!t) return
  if (!form.sources.includes(t)) form.sources = [...form.sources, t]
  rememberPlatforms([t])
  sourceCustom.value = ''
}
function openCreateSvc() {
  resetSvcForm()
  svcVisible.value = true
}
function beforeCreateSvc() {
  const name = form.name.trim(), code = form.code.trim(), endpoint = form.endpoint.trim()
  if (!name) { Message.warning('请填写服务名称'); return false }
  if (!/^[a-z][a-z0-9-]*$/.test(code)) { Message.warning('服务标识需为 kebab-case（小写字母/数字/中划线）'); return false }
  if (store.services.some((s) => s.code === code)) { Message.warning(`服务标识 ${code} 已存在`); return false }
  if (!/^https?:\/\/.+/.test(endpoint)) { Message.warning('端点需为 http(s) URL'); return false }
  rememberPlatforms(form.sources)
  const id = 'svc' + Date.now().toString(36)
  const svc = {
    id, name, code, version: form.version.trim() || 'v1.0.0',
    proto: form.proto, endpoint, sources: [...form.sources],
    health: 'healthy', inst: '1/1', calls1h: 0, err1h: 0, sla: '100.00%',
  }
  const doDiscover = form.discover
  store.services.push(svc)
  ensureSvcMeta(svc)
  resetSvcForm()
  if (doDiscover) runDiscover(svc)
  else Message.success('服务已登记。可稍后探测 tools/list，或到工具目录手动登记。')
  return true
}
function runDiscover(svc) {
  if (!svc) return
  discSvc.value = svc
  discTools.value = toolsOfService(svc.id)
  discBusy.value = true
  discVisible.value = true
  setTimeout(() => {
    discTools.value = discoverToolsForService(svc)
    discBusy.value = false
    if (discTools.value.length) Message.success(`已从 ${svc.endpoint} 探测并登记 ${discTools.value.length} 个工具`)
    else Message.warning('未探测到工具，可手动在工具目录登记')
  }, 640)
}
function gotoToolsOf(svcId) {
  store.flt.svc = svcId
  store.flt.sector = 'all'
  store.flt.platform = 'all'
  emit('goto', 'tools')
}
function openJoin(svc) {
  discSvc.value = svc
  discTools.value = toolsOfService(svc.id)
  if (!discTools.value.length) {
    runDiscover(svc)
    return
  }
  if (!store.toolsets.length) {
    bindNewSet()
    return
  }
  joinSetId.value = store.toolsets[0].id
  joinVisible.value = true
}
function confirmJoin() {
  const ts = store.toolsets.find((s) => s.id === joinSetId.value)
  const svc = discSvc.value
  if (!ts || !svc) return
  const names = toolsOfService(svc.id).map((t) => t.name)
  if (!names.length) { Message.warning('该服务还没有工具，请先探测或手动登记'); return }
  appendToolsToSet(ts, names)
  joinVisible.value = false
  discVisible.value = false
  store.hubTab = 'toolsets'
  Message.success(`已将「${svc.name}」的 ${names.length} 个工具加入「${ts.name}」`)
}
function bindNewSet() {
  const svc = discSvc.value
  if (!svc) return
  const names = (discTools.value.length ? discTools.value : toolsOfService(svc.id)).map((t) => t.name)
  if (!names.length) { Message.warning('请先探测或登记工具'); return }
  const ts = createToolsetFromService(svc, names)
  discVisible.value = false
  joinVisible.value = false
  store.hubTab = 'toolsets'
  Message.success(`已创建工具集「${ts.name}」，并在接入与密钥中签发绑定 Key`)
  showToolsetConfig(ts, { fullKey: keyOfToolset(ts), expire: null })
}
function resetSetForm() {
  setForm.name = 'mcp_toolset_' + Math.random().toString(36).slice(2, 8)
  setForm.mode = 'all'
}
function gotoKeys(ts) {
  store.clientFlt.toolsetId = ts.id
  emit('goto', 'clients')
}
function ownerName(id) {
  return store.users.find((u) => u.id === id)?.name || '—'
}
function openKeyDetail(ts) {
  keyDrawerSet.value = ts
  keyDrawerVisible.value = true
}
function gotoKeysFromDrawer() {
  if (!keyDrawerSet.value) return
  keyDrawerVisible.value = false
  gotoKeys(keyDrawerSet.value)
}
function openCreateSet() {
  store.hubTab = 'toolsets'
  resetSetForm()
  setVisible.value = true
}
function submitSet() {
  const name = setForm.name.trim()
  if (!name) { Message.warning('请填写 MCP 工具集名称'); return }
  const id = 'ts-' + Date.now().toString(36)
  const ts = {
    id, name, path: '/mcp',
    auth: 'apikey',
    mode: setForm.mode, status: 'running',
    created: new Date().toISOString().slice(0, 19).replace('T', ' '),
    tools: [],
  }
  store.toolsets.unshift(ts)
  setVisible.value = false
  Message.success('工具集已创建，请勾选要归集的工具。密钥请到「接入与密钥」签发。')
  openAdd(ts)
}
function openAdd(ts, svcId) {
  currentSet.value = ts
  const prefer = svcId || (discSvc.value && toolsOfService(discSvc.value.id).length ? discSvc.value.id : '')
  addSvc.value = prefer || store.services.find((s) => toolsOfService(s.id).length)?.id || store.services[0]?.id || ''
  addKw.value = ''
  addToolKw.value = ''
  picked.value = [...(ts.tools || [])]
  addVisible.value = true
}
function toggleAllCurrent() {
  const names = store.tools.filter((t) => t.svc === addSvc.value && t.on).map((t) => t.name)
  if (!names.length) return
  const allOn = names.every((n) => picked.value.includes(n))
  picked.value = allOn
    ? picked.value.filter((n) => !names.includes(n))
    : [...new Set([...picked.value, ...names])]
}
function confirmAdd() {
  if (!currentSet.value) return
  if (!picked.value.length) { Message.warning('请至少选择 1 个工具'); return }
  currentSet.value.tools = [...picked.value]
  addVisible.value = false
  Message.success(`已为「${currentSet.value.name}」绑定 ${picked.value.length} 个工具`)
}
function debugSet(ts) {
  openPlayground({
    endpoint: toolsetEndpoint(ts),
    apiKey: keyOfToolset(ts),
    proto: 'Streamable HTTP',
    allowTools: ts.tools,
  })
}
function debugSvc(s) {
  openPlayground({ endpoint: s.endpoint, proto: s.proto, apiKey: keyForEndpoint(s.endpoint) })
}
function modeName(id) {
  return CALL_MODES.find((m) => m.id === id)?.title || id
}
</script>

<template>
  <div>
    <div class="page-head mcp-hub-head">
      <h2>MCP 中心</h2>
      <div class="hub-intro">
        <div class="desc">MCP 服务登记 Remote 端点；工具集只负责把各服务里的工具归集后下发给 Agent。密钥在「接入与密钥」签发并绑定工具集。备注：新服务请联系 MCP 服务人员。</div>
        <a-button type="text" class="tutorial-link" @click="emit('goto', 'sequence')">
          查看教程 <icon-caret-down />
        </a-button>
      </div>
    </div>

    <div class="hub-tabs">
      <button type="button" :class="{ on: store.hubTab === 'services' }" @click="store.hubTab = 'services'">MCP 服务</button>
      <button type="button" :class="{ on: store.hubTab === 'toolsets' }" @click="store.hubTab = 'toolsets'">MCP 工具集</button>
    </div>

    <div class="hub-toolbar">
      <div class="hub-toolbar-left">
        <a-button v-if="store.hubTab === 'services'" type="primary" @click="openCreateSvc">创建 MCP 服务</a-button>
        <a-button v-else type="primary" @click="openCreateSet">创建 MCP 工具集</a-button>
        <a-input-search v-model="hubKw" allow-clear placeholder="搜索名称、ID" :style="{ width: '236px' }" />
      </div>
      <a-button class="hub-refresh" @click="hubKw = ''">
        <icon-refresh />
      </a-button>
    </div>

    <div class="hub-table">
      <template v-if="store.hubTab === 'services'">
        <a-table :data="shownServices" :pagination="false" row-key="id" :scroll="{ x: 1280 }" hoverable>
          <template #columns>
            <a-table-column title="名称 / ID" :width="200">
              <template #cell="{ record }">
                <div style="font-weight:500">{{ record.name }}</div>
                <div class="mono" style="font-size:12px;color:var(--color-text-3)">{{ record.code }}</div>
              </template>
            </a-table-column>
            <a-table-column title="状态" :width="90">
              <template #cell="{ record }">
                <a-tag :color="record.health === 'healthy' ? 'green' : 'orangered'">
                  {{ record.health === 'healthy' ? '运行中' : '降级' }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="协议" :width="140" data-index="proto" />
            <a-table-column title="端点" :width="260">
              <template #cell="{ record }"><span class="mono" style="font-size:12px">{{ record.endpoint }}</span></template>
            </a-table-column>
            <a-table-column title="所属系统" :width="160">
              <template #cell="{ record }">
                <a-space wrap>
                  <a-tag v-for="x in record.sources" :key="x" color="cyan">{{ x }}</a-tag>
                  <span v-if="!record.sources.length" class="muted">未标注</span>
                </a-space>
              </template>
            </a-table-column>
            <a-table-column title="工具" :width="80" align="right">
              <template #cell="{ record }">
                <a-button type="text" size="mini" @click="gotoToolsOf(record.id)">{{ svcToolCount(record.id) }}</a-button>
              </template>
            </a-table-column>
            <a-table-column title="工具集" :width="180">
              <template #cell="{ record }">
                <a-space wrap>
                  <a-tag v-for="ts in svcSets(record.id)" :key="ts.id" color="arcoblue" size="small">{{ ts.name }}</a-tag>
                  <span v-if="!svcSets(record.id).length" class="muted">未加入</span>
                </a-space>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="280" :fixed="'right'">
              <template #cell="{ record }">
                <a-button type="text" size="mini" @click="runDiscover(record)">探测工具</a-button>
                <a-button type="text" size="mini" @click="openJoin(record)">加入工具集</a-button>
                <a-button type="text" size="mini" @click="showMcpConfig(record.id)">调用示例</a-button>
                <a-dropdown>
                  <a-button type="text" size="mini">更多 <icon-down /></a-button>
                  <template #content>
                    <a-doption @click="debugSvc(record)">调试</a-doption>
                    <a-doption @click="confirmAct('重启服务', `确认重启 ${record.name}（${record.code}）？滚动重启不影响在途调用。`, '重启指令已下发（模拟）')">重启</a-doption>
                    <a-doption @click="confirmAct('下线服务', `下线后网关将停止向 ${record.name} 路由流量，确认？`, '已切流并下线（模拟）')">
                      <span style="color: rgb(var(--danger-6))">下线</span>
                    </a-doption>
                  </template>
                </a-dropdown>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>

      <template v-else>
        <a-table :data="shownSets" :pagination="false" row-key="id" hoverable :scroll="{ x: 1280 }">
          <template #empty>
            <a-empty description="暂无 MCP 工具集">
              <a-button type="primary" size="small" @click="openCreateSet">创建 MCP 工具集</a-button>
            </a-empty>
          </template>
          <template #columns>
            <a-table-column title="名称 / ID" :width="200">
              <template #cell="{ record }">
                <div style="font-weight:500">{{ record.name }}</div>
                <div class="mono" style="font-size:12px;color:var(--color-text-3)">{{ record.id }}</div>
              </template>
            </a-table-column>
            <a-table-column title="状态" :width="90">
              <template #cell="{ record }"><a-tag color="green">运行中</a-tag></template>
            </a-table-column>
            <a-table-column title="来源服务" :width="200">
              <template #cell="{ record }">
                <a-space wrap>
                  <a-tag v-for="s in servicesOfSet(record)" :key="s.id" size="small">{{ s.name }}</a-tag>
                  <span v-if="!servicesOfSet(record).length" class="muted">未绑定工具</span>
                </a-space>
              </template>
            </a-table-column>
            <a-table-column title="所属系统" :width="160">
              <template #cell="{ record }">
                <a-space wrap>
                  <a-tag v-for="p in platformsOfSet(record)" :key="p" color="cyan" size="small">{{ p }}</a-tag>
                  <span v-if="!platformsOfSet(record).length" class="muted">—</span>
                </a-space>
              </template>
            </a-table-column>
            <a-table-column title="调用模式" :width="100">
              <template #cell="{ record }">{{ modeName(record.mode) }}</template>
            </a-table-column>
            <a-table-column title="接入密钥" :width="120">
              <template #cell="{ record }">
                <a-button type="text" size="mini" @click="openKeyDetail(record)">
                  {{ clientsOfToolset(record.id).length ? '查看详情' : '未绑定' }}
                </a-button>
              </template>
            </a-table-column>
            <a-table-column title="工具数" :width="80" align="right">
              <template #cell="{ record }">{{ record.tools.length }}</template>
            </a-table-column>
            <a-table-column title="操作" :width="280" :fixed="'right'">
              <template #cell="{ record }">
                <a-button type="text" size="mini" @click="openAdd(record)">添加工具</a-button>
                <a-button type="text" size="mini" @click="gotoKeys(record)">密钥</a-button>
                <a-button type="text" size="mini" @click="debugSet(record)">调试</a-button>
                <a-button type="text" size="mini" @click="showToolsetConfig(record)">调用示例</a-button>
              </template>
            </a-table-column>
          </template>
        </a-table>
      </template>
    </div>

    <a-modal
      v-model:visible="svcVisible"
      title="创建 MCP 服务"
      :width="620"
      ok-text="创建"
      unmount-on-close
      @before-ok="beforeCreateSvc"
    >
      <a-form :model="form" layout="vertical">
        <a-alert type="warning" style="margin-bottom:12px">备注：请联系 MCP 服务人员。</a-alert>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="服务名称" field="name" required><a-input v-model="form.name" placeholder="如：test-my-mcp、CRM 查询服务" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="服务标识（kebab-case）" field="code" required><a-input v-model="form.code" placeholder="test-my-mcp" class="mono" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="传输协议" field="proto" required>
              <a-select v-model="form.proto">
                <a-option>Streamable HTTP</a-option>
                <a-option>SSE</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12"><a-form-item label="版本" field="version"><a-input v-model="form.version" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="MCP 端点 URL" field="endpoint" required>
          <a-input v-model="form.endpoint" placeholder="https://mcp.futures-data.cn/test/mcp" class="mono" />
        </a-form-item>
        <a-form-item label="所属系统">
          <a-select
            v-model="form.sources"
            multiple
            allow-clear
            allow-create
            allow-search
            placeholder="勾选已有系统"
            style="width:100%"
          >
            <a-option v-for="p in sourceChoices" :key="p" :value="p">{{ p }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="其他">
          <div class="src-other">
            <a-input
              v-model="sourceCustom"
              allow-clear
              placeholder="没有合适的，可自己命名，如 OA、风控"
              @press-enter="addCustomSource"
            />
            <a-button type="primary" @click="addCustomSource">添加</a-button>
          </div>
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model="form.discover">创建后探测 tools/list，把工具挂到本服务（之后才能加入工具集）</a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="discVisible" :title="discSvc ? `探测工具 — ${discSvc.name}` : '探测工具'" :width="640" :footer="false" unmount-on-close>
      <div v-if="discBusy" class="muted">正在请求 {{ discSvc?.endpoint }} 的 tools/list …</div>
      <template v-else>
        <a-alert type="success" style="margin-bottom:12px">
          工具已挂到本服务，会出现在「工具目录」。勾进某个工具集后，Agent 才能通过工具集端点调用。
        </a-alert>
        <div v-for="t in discTools" :key="t.name" class="disc-tool">
          <div class="mono">{{ t.name }}</div>
          <div class="muted">{{ t.cn }} — {{ t.desc }}</div>
        </div>
        <a-empty v-if="!discTools.length" description="未探测到工具" />
        <a-space style="margin-top:16px">
          <a-button type="primary" :disabled="!discTools.length" @click="openJoin(discSvc)">加入已有工具集</a-button>
          <a-button :disabled="!discTools.length" @click="bindNewSet">创建并绑定工具集</a-button>
          <a-button @click="showMcpConfig(discSvc.id); discVisible = false">调用示例</a-button>
          <a-button @click="discVisible = false">稍后</a-button>
        </a-space>
      </template>
    </a-modal>

    <a-modal v-model:visible="joinVisible" title="加入工具集" :width="480" @ok="confirmJoin" :ok-text="'加入'" unmount-on-close>
      <p class="muted" style="margin-top:0">将「{{ discSvc?.name }}」当前 {{ discTools.length || svcToolCount(discSvc?.id) }} 个工具追加到所选工具集（不会覆盖集内原有工具）。</p>
      <a-select v-model="joinSetId" style="width:100%">
        <a-option v-for="ts in store.toolsets" :key="ts.id" :value="ts.id">{{ ts.name }}（已有 {{ ts.tools.length }} 个）</a-option>
      </a-select>
    </a-modal>

    <a-modal v-model:visible="setVisible" title="创建 MCP 工具集" :width="520" @ok="submitSet" ok-text="创建" unmount-on-close>
      <a-form :model="setForm" layout="vertical">
        <a-form-item label="工具集名称" required>
          <a-input v-model="setForm.name" placeholder="如 mcp_toolset_market" />
        </a-form-item>
        <a-form-item label="调用模式" required :extra="CALL_MODES.find(m => m.id === setForm.mode)?.desc">
          <a-select v-model="setForm.mode">
            <a-option v-for="m in CALL_MODES" :key="m.id" :value="m.id">{{ m.title }}</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="addVisible"
      title="添加工具"
      :width="920"
      modal-class="add-tools-modal"
      unmount-on-close
      :ok-text="'确认'"
      @ok="confirmAdd"
    >
      <div class="add-tools">
        <div class="pane">
          <div class="pane-hd">
            <span>1. 选择 MCP 服务</span>
            <a-button type="text" size="mini" @click="openCreateSvc">创建 MCP 服务</a-button>
          </div>
          <div class="pane-search">
            <a-input-search v-model="addKw" allow-clear placeholder="搜索服务名称 / 标识" />
          </div>
          <div class="pane-body">
            <button
              v-for="s in addSvcList"
              :key="s.id"
              type="button"
              class="svc-pick"
              :class="{ on: addSvc === s.id }"
              @click="addSvc = s.id"
            >
              <div class="svc-pick-top">
                <span class="svc-pick-name">{{ s.name }}</span>
                <span class="svc-pick-count">{{ svcToolCount(s.id) }}</span>
              </div>
              <div class="svc-pick-code mono">{{ s.code }}</div>
              <div v-if="s.sources?.length" class="svc-pick-tags">
                <span v-for="p in s.sources" :key="p">{{ p }}</span>
              </div>
            </button>
            <a-empty v-if="!addSvcList.length" description="请先创建 MCP 服务" />
          </div>
        </div>
        <div class="pane">
          <div class="pane-hd">
            <span>2. 选择工具</span>
            <a-button
              v-if="addSvcToolTotal"
              type="text"
              size="mini"
              @click="toggleAllCurrent"
            >
              {{ addPickedOfSvc === addSvcToolTotal ? '取消全选' : '全选本服务' }}
            </a-button>
          </div>
          <div class="pane-search">
            <a-input-search v-model="addToolKw" allow-clear placeholder="搜索工具名称 / 说明" />
          </div>
          <div class="pane-body">
            <a-checkbox-group v-if="addToolList.length" v-model="picked" class="tool-checks">
              <a-checkbox
                v-for="t in addToolList"
                :key="t.name"
                :value="t.name"
                class="tool-row"
              >
                <span class="tool-row-body">
                  <span class="tool-row-head">
                    <span class="tool-row-name mono">{{ t.name }}</span>
                    <span class="tool-row-cn">{{ t.cn }}</span>
                  </span>
                  <span class="tool-row-desc">{{ t.desc }}</span>
                </span>
              </a-checkbox>
            </a-checkbox-group>
            <a-empty v-else-if="addSvc && addSvcToolTotal && addToolKw" description="没有匹配的工具" />
            <a-empty v-else-if="addSvc" description="该服务还没有工具">
              <a-space>
                <a-button type="primary" size="small" @click="runDiscover(store.services.find(s => s.id === addSvc))">探测 tools/list</a-button>
                <a-button size="small" @click="gotoToolsOf(addSvc)">手动登记</a-button>
              </a-space>
            </a-empty>
            <a-empty v-else description="请先选择 MCP 服务" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="add-tools-ft">
          <span class="muted">已选 {{ picked.length }} 个工具，可跨服务勾选</span>
          <a-space>
            <a-button @click="addVisible = false">取消</a-button>
            <a-button type="primary" @click="confirmAdd">确认</a-button>
          </a-space>
        </div>
      </template>
    </a-modal>

    <a-drawer
      v-model:visible="keyDrawerVisible"
      :width="520"
      unmount-on-close
      :ok-text="'关闭'"
      :hide-cancel="true"
    >
      <template #title>
        <span>接入密钥 · {{ keyDrawerSet?.name }}</span>
      </template>
      <template v-if="keyDrawerSet">
        <div
          v-for="c in clientsOfToolset(keyDrawerSet.id)"
          :key="c.id"
          class="key-detail-card"
        >
          <div class="key-detail-hd">
            <span class="key-detail-name">{{ c.name }}</span>
            <a-tag :color="keyStatus(c).tag" size="small">{{ keyStatus(c).text }}</a-tag>
          </div>
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="API Key">
              <span class="mono tiny">{{ c.key }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="归属用户">{{ ownerName(c.userId) }}</a-descriptions-item>
            <a-descriptions-item label="类型">{{ c.type }}</a-descriptions-item>
            <a-descriptions-item label="日配额">{{ fmt(c.calls) }} / {{ fmt(c.quota) }}</a-descriptions-item>
            <a-descriptions-item label="QPS">{{ c.qps }}</a-descriptions-item>
            <a-descriptions-item label="到期">{{ keyExpireMeta(c).label }}</a-descriptions-item>
          </a-descriptions>
        </div>
        <a-empty v-if="!clientsOfToolset(keyDrawerSet.id).length" description="尚未绑定接入密钥" />
        <a-button type="primary" long style="margin-top:8px" @click="gotoKeysFromDrawer">前往接入与密钥</a-button>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.src-other {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.src-other :deep(.arco-input-wrapper) {
  flex: 1;
  min-width: 0;
}
.key-detail-card { margin-bottom: 16px; }
.key-detail-card:last-of-type { margin-bottom: 12px; }
.key-detail-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.key-detail-name {
  font-weight: 600;
  font-size: 14px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
