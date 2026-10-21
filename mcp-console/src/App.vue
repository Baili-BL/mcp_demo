<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, openAlertCount, toolsetAsSvc, toolsOfSet } from './store'
import { mcpConfigText, copyText } from './utils'
import Overview from './views/Overview.vue'
import Services from './views/Services.vue'
import Tools from './views/Tools.vue'
import Monitor from './views/Monitor.vue'
import Analytics from './views/Analytics.vue'
import Clients from './views/Clients.vue'
import Users from './views/Users.vue'
import UserGroups from './views/UserGroups.vue'
import Alerts from './views/Alerts.vue'
import Sources from './views/Sources.vue'
import Datasets from './views/Datasets.vue'
import DataSecurity from './views/DataSecurity.vue'
import DatasetCreate from './views/DatasetCreate.vue'
import DatasetStudio from './views/DatasetStudio.vue'
import Sequence from './views/Sequence.vue'
import Relations from './views/Relations.vue'
import Docs from './views/Docs.vue'
import McpPlayground from './components/McpPlayground.vue'
import SiderFoldIcon from './components/SiderFoldIcon.vue'
import McpMark from './components/McpMark.vue'

const MENU = [
  { key: 'data', title: '数据准备', short: '数据', icon: 'icon-apps', items: [
    { key: 'sources', label: '数据源', icon: 'icon-link' },
    { key: 'datasets', label: '数据集', icon: 'icon-file' },
    { key: 'security', label: '数据权限', icon: 'icon-lock' },
  ] },
  { key: 'mcp', title: 'MCP 服务', short: 'MCP', icon: 'icon-storage', items: [
    { key: 'services', label: 'MCP 中心', icon: 'icon-cloud' },
    { key: 'tools', label: '工具目录', icon: 'icon-list' },
  ] },
  { key: 'org', title: '用户与接入', short: '用户', icon: 'icon-user-group', items: [
    { key: 'users', label: '用户管理', icon: 'icon-user' },
    { key: 'groups', label: '用户组管理', icon: 'icon-user-group' },
    { key: 'clients', label: '接入与密钥', icon: 'icon-safe' },
  ] },
  { key: 'ops', title: '运行监控', short: '监控', icon: 'icon-dashboard', items: [
    { key: 'monitor', label: '调用监控', icon: 'icon-bar-chart' },
    { key: 'analytics', label: '数据分析', icon: 'icon-arrow-rise' },
    { key: 'alerts', label: '告警中心', icon: 'icon-notification', badge: true },
    { key: 'relations', label: '关系树', icon: 'icon-mind-mapping' },
  ] },
]
const DATA_IDS = new Set(['sources', 'datasets', 'security'])
const MCP_IDS = new Set(['services', 'tools'])
const OPS_IDS = new Set(['monitor', 'analytics', 'alerts', 'relations'])
const ORG_IDS = new Set(['users', 'groups', 'clients'])
const CONSOLE_IDS = new Set(['services', 'tools', 'monitor', 'analytics', 'users', 'groups', 'clients', 'alerts', 'relations'])
const TOP_VIEWS = new Set(['docs', 'sequence'])
const CREATE_IDS = new Set(['dataset-create', 'dataset-sql', 'dataset-studio'])
const LIST_IDS = new Set([...CONSOLE_IDS, ...DATA_IDS])
const views = { overview: Overview, sources: Sources, datasets: Datasets, security: DataSecurity, 'dataset-create': DatasetCreate, 'dataset-sql': DatasetCreate, 'dataset-studio': DatasetStudio, services: Services, tools: Tools, relations: Relations, monitor: Monitor, analytics: Analytics, sequence: Sequence, docs: Docs, clients: Clients, users: Users, groups: UserGroups, alerts: Alerts }
const cur = ref('sources')
const collapsed = ref(false)
const search = ref('')
const noticeClosed = ref(false)
const openKeys = ref(['org', 'data', 'mcp', 'ops'])
const openNotices = computed(() => store.alerts.filter((a) => a.st === '未处理'))
const shell = computed(() => {
  if (TOP_VIEWS.has(cur.value)) return cur.value
  return 'app'
})
const siderOn = computed(() => LIST_IDS.has(cur.value))
const selectedMenu = computed(() => (CREATE_IDS.has(cur.value) ? 'datasets' : cur.value))

function hashView() {
  return (location.hash || '').replace(/^#/, '').split('?')[0]
}
function showView(id) {
  if (id === 'workbench' || id === 'data' || id === 'overview' || !id) {
    showView('sources')
    return
  }
  if (TOP_VIEWS.has(id)) {
    cur.value = id
    history.replaceState(null, '', '#' + id)
    return
  }
  if (id === 'dataset-create' || id === 'dataset-studio') {
    if (!store.editDatasetId && store.studioDatasetId) store.editDatasetId = store.studioDatasetId
    store.openModelDrawer = false
    cur.value = 'dataset-sql'
    history.replaceState(null, '', '#dataset-sql')
    return
  }
  if (CREATE_IDS.has(id) || LIST_IDS.has(id)) {
    if (DATA_IDS.has(id) || CREATE_IDS.has(id)) ensureDataMenuOpen()
    if (MCP_IDS.has(id)) ensureMcpMenuOpen()
    if (OPS_IDS.has(id)) ensureOpsMenuOpen()
    if (ORG_IDS.has(id)) ensureOrgMenuOpen()
    cur.value = id
    history.replaceState(null, '', '#' + id)
  }
}
function ensureDataMenuOpen() {
  if (!openKeys.value.includes('data')) openKeys.value = [...openKeys.value, 'data']
}
function ensureMcpMenuOpen() {
  if (!openKeys.value.includes('mcp')) openKeys.value = [...openKeys.value, 'mcp']
}
function ensureOpsMenuOpen() {
  if (!openKeys.value.includes('ops')) openKeys.value = [...openKeys.value, 'ops']
}
function ensureOrgMenuOpen() {
  if (!openKeys.value.includes('org')) openKeys.value = [...openKeys.value, 'org']
}
function openHome() {
  showView('sources')
}
function onMenu(key) {
  store.clientFlt.toolsetId = ''
  store.clientFlt.userId = ''
  store.clientFlt.openIssue = false
  showView(key)
}
function syncHash() {
  const h = hashView()
  if (!h || h === 'workbench' || h === 'data' || h === 'overview') {
    cur.value = 'sources'
    ensureDataMenuOpen()
    history.replaceState(null, '', '#sources')
    return
  }
  if (TOP_VIEWS.has(h)) cur.value = h
  else if (h === 'dataset-create' || h === 'dataset-studio') {
    if (!store.editDatasetId && store.studioDatasetId) store.editDatasetId = store.studioDatasetId
    store.openModelDrawer = false
    cur.value = 'dataset-sql'
    ensureDataMenuOpen()
    history.replaceState(null, '', '#dataset-sql')
  } else if (CREATE_IDS.has(h)) {
    cur.value = h
    ensureDataMenuOpen()
  } else if (DATA_IDS.has(h)) {
    cur.value = h
    ensureDataMenuOpen()
  } else if (CONSOLE_IDS.has(h)) {
    cur.value = h
    if (MCP_IDS.has(h)) ensureMcpMenuOpen()
    if (OPS_IDS.has(h)) ensureOpsMenuOpen()
    if (ORG_IDS.has(h)) ensureOrgMenuOpen()
  }
}

const cfgSvc = computed(() => {
  if (store.mcpConfig.toolsetId) {
    const ts = store.toolsets.find((s) => s.id === store.mcpConfig.toolsetId)
    return ts ? toolsetAsSvc(ts) : store.services[0]
  }
  return store.services.find((s) => s.id === store.mcpConfig.svcId) || store.services[0]
})
const cfgTools = computed(() => {
  if (store.mcpConfig.toolsetId) {
    const ts = store.toolsets.find((s) => s.id === store.mcpConfig.toolsetId)
    return ts ? toolsOfSet(ts) : []
  }
  return store.tools.filter((t) => t.svc === cfgSvc.value?.id)
})
const expLabel = computed(() => {
  const expire = store.mcpConfig.expire
  if (expire === undefined) return '以密钥签发时的到期时间为准'
  return expire ? String(expire).slice(0, 16).replace('T', ' ') : '长期有效'
})
function onUserAction() {
  Message.info('账号设置（原型占位）')
}
async function copyCfg() {
  const text = cfgSvc.value ? mcpConfigText(cfgSvc.value, store.mcpConfig.apiKey) : ''
  await copyText(text)
  Message.success('配置已复制')
}

const searchPh = computed(() => {
  if (cur.value === 'users') return '搜索姓名 / 手机 / 登录邮箱'
  if (cur.value === 'groups') return '搜索用户组 / 成员 / 说明'
  if (cur.value === 'clients') return '搜索 Key / 归属用户'
  if (cur.value === 'sources') return '搜索数据源 / 主机 / 环境变量'
  if (cur.value === 'datasets') return '搜索数据集 / 表名 / 数据源'
  if (cur.value === 'security') return '搜索规则名称 / 字段 / 数据集'
  return '搜索工具名 / 描述，回车跳转'
})
const headerKw = computed({
  get() {
    if (cur.value === 'users') return store.userFlt.kw
    if (cur.value === 'groups') return store.groupFlt.kw
    if (cur.value === 'clients') return store.clientFlt.kw
    if (cur.value === 'sources') return store.sourceFlt.kw
    if (cur.value === 'datasets') return store.datasetFlt.kw
    if (cur.value === 'security') return store.securityFlt.kw
    return search.value
  },
  set(v) {
    if (cur.value === 'users') store.userFlt.kw = v
    else if (cur.value === 'groups') store.groupFlt.kw = v
    else if (cur.value === 'clients') store.clientFlt.kw = v
    else if (cur.value === 'sources') store.sourceFlt.kw = v
    else if (cur.value === 'datasets') store.datasetFlt.kw = v
    else if (cur.value === 'security') store.securityFlt.kw = v
    else search.value = v
  },
})
function onSearch() {
  if (cur.value === 'users' || cur.value === 'groups' || cur.value === 'clients' || cur.value === 'sources' || cur.value === 'datasets' || cur.value === 'security') return
  const kw = search.value.trim()
  store.flt.kw = kw
  store.flt.svc = 'all'
  store.flt.sector = 'all'
  store.flt.platform = 'all'
  showView('tools')
  if (kw) Message.success(`已在工具目录中筛选「${kw}」`)
}

onMounted(() => {
  syncHash()
  window.addEventListener('hashchange', syncHash)
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncHash)
})
</script>

<template>
  <div class="app-shell" :class="{ 'is-editor': CREATE_IDS.has(cur) }">
    <header v-show="!CREATE_IDS.has(cur)" class="app-topbar">
      <button type="button" class="topbar-brand" @click="openHome">
        <McpMark class="mark" />
        <span class="name">MCP 服务管理台</span>
      </button>
      <nav class="top-tabs">
        <button type="button" :class="{ on: shell === 'docs' }" @click="showView('docs')">文档</button>
        <button type="button" :class="{ on: shell === 'sequence' }" @click="showView('sequence')">时序图</button>
      </nav>
      <div class="header-right">
        <a-input-search
          v-if="siderOn"
          v-model="headerKw"
          allow-clear
          :placeholder="searchPh"
          :style="{ width: '240px' }"
          @search="onSearch"
          @press-enter="onSearch"
        />
        <a-dropdown @select="onUserAction">
          <a-space class="user-chip" :size="8">
            <a-avatar :size="28" style="background: rgb(var(--primary-6))">数</a-avatar>
            <span class="user-name">数智中心</span>
            <icon-down />
          </a-space>
          <template #content>
            <a-doption value="settings">账号设置</a-doption>
          </template>
        </a-dropdown>
      </div>
    </header>

    <div v-if="openNotices.length && !noticeClosed" class="sys-notice" role="status">
      <icon-exclamation-circle-fill class="sys-notice-ico" />
      <div class="sys-notice-body">
        <button
          v-for="(a, i) in openNotices"
          :key="`${a.t}-${a.obj}-${i}`"
          type="button"
          class="sys-notice-line"
          @click="showView('alerts')"
        >
          <span class="sys-notice-lv">{{ a.level }}</span>
          <span class="sys-notice-obj">{{ a.obj }}</span>
          <span class="sys-notice-ct">{{ a.ct }}</span>
        </button>
      </div>
      <button type="button" class="sys-notice-x" aria-label="关闭通知" @click="noticeClosed = true">
        <icon-close />
      </button>
    </div>

    <a-layout class="app-body" :class="{ 'arco-layout-has-sider': siderOn }">
      <a-layout-sider
        v-show="siderOn"
        v-model:collapsed="collapsed"
        :width="220"
        :collapsed-width="64"
        collapsible
        hide-trigger
        breakpoint="lg"
        class="app-sider"
      >
        <a-menu
          v-if="!collapsed"
          :selected-keys="[selectedMenu]"
          v-model:open-keys="openKeys"
          :auto-open="true"
          @menu-item-click="onMenu"
        >
          <template v-for="g in MENU" :key="g.key">
            <a-menu-item v-if="g.single" :key="g.key">
              <template #icon><component :is="g.icon" /></template>
              {{ g.label }}
            </a-menu-item>
            <a-sub-menu v-else :key="g.key">
              <template #icon><component :is="g.icon" /></template>
              <template #title>{{ g.title }}</template>
              <a-menu-item v-for="it in g.items" :key="it.key">
                <template #icon><component :is="it.icon" /></template>
                {{ it.label }}
                <a-badge v-if="it.badge && openAlertCount()" :count="openAlertCount()" :max-count="99" class="menu-badge" />
              </a-menu-item>
            </a-sub-menu>
          </template>
        </a-menu>
        <nav v-else class="sider-rail">
          <template v-for="g in MENU" :key="g.key">
            <div v-if="g.single" class="rail-group">
              <a-tooltip :content="g.label" position="right" mini>
                <button
                  type="button"
                  class="rail-item"
                  :class="{ on: selectedMenu === g.key }"
                  :aria-label="g.label"
                  @click="onMenu(g.key)"
                >
                  <component :is="g.icon" />
                </button>
              </a-tooltip>
            </div>
            <div v-else class="rail-group">
              <div class="rail-cap">{{ g.short }}</div>
              <a-tooltip v-for="it in g.items" :key="it.key" :content="`${g.title} · ${it.label}`" position="right" mini>
                <button
                  type="button"
                  class="rail-item"
                  :class="{ on: selectedMenu === it.key }"
                  :aria-label="it.label"
                  @click="onMenu(it.key)"
                >
                  <component :is="it.icon" />
                  <span v-if="it.badge && openAlertCount()" class="rail-dot" />
                </button>
              </a-tooltip>
            </div>
          </template>
        </nav>
        <div class="sider-fold-bar" :class="{ collapsed }">
          <button
            type="button"
            class="sider-fold"
            :title="collapsed ? '展开菜单' : '折叠菜单'"
            @click="collapsed = !collapsed"
          >
            <SiderFoldIcon />
            <span v-if="!collapsed">收起</span>
          </button>
        </div>
      </a-layout-sider>

      <a-layout-content class="content-wrap" :class="{ full: !siderOn, create: CREATE_IDS.has(cur) }">
        <div class="page-panel" :class="{ flush: shell === 'docs' || CREATE_IDS.has(cur) }">
          <keep-alive exclude="DatasetCreate,DatasetStudio,Overview">
            <component :is="views[cur]" :key="cur" :create-mode="cur === 'dataset-sql' ? 'sql' : 'canvas'" @goto="showView" />
          </keep-alive>
        </div>
      </a-layout-content>
    </a-layout>
  </div>

  <a-modal
    v-model:visible="store.mcpConfig.visible"
    :title="(store.mcpConfig.toolsetId ? 'MCP 工具集调用示例 — ' : 'MCP 接入配置 — ') + (cfgSvc?.name || '')"
    :width="680"
    unmount-on-close
    :mask-closable="false"
  >
    <a-descriptions :column="2" size="medium" bordered class="cfg-desc">
      <a-descriptions-item label="服务端点" :span="2">
        <span class="mono tiny">{{ cfgSvc?.endpoint }}</span>
      </a-descriptions-item>
      <a-descriptions-item label="协议">{{ cfgSvc?.proto }}（Streamable HTTP）</a-descriptions-item>
      <a-descriptions-item label="到期时间">
        <span class="mono tiny">{{ expLabel }}</span>
      </a-descriptions-item>
      <a-descriptions-item label="鉴权" :span="2">
        <span class="mono tiny">Authorization: Bearer &lt;API Key&gt;</span>
      </a-descriptions-item>
      <a-descriptions-item label="可用工具" :span="2">
        <a-space wrap>
          <a-tag v-for="t in cfgTools" :key="t.name" color="arcoblue" size="small">{{ t.name }}</a-tag>
          <span v-if="!cfgTools.length" class="muted">注册工具后自动可见（tools/list）</span>
        </a-space>
      </a-descriptions-item>
    </a-descriptions>
    <p v-if="store.mcpConfig.expire" class="hint">过期后网关拒绝调用，与日配额 / QPS 相互独立。</p>

    <p class="hint" style="margin-top:12px">把下面 JSON 写入 MCP 客户端配置文件即可。远程 HTTP 服务使用 <span class="mono">type: http</span>（SSE 则为 <span class="mono">sse</span>），鉴权为 Bearer API Key。</p>
    <pre class="cfg-pre">{{ mcpConfigText(cfgSvc, store.mcpConfig.apiKey) }}</pre>
    <div class="guide-copy">
      常见配置文件：Claude Desktop →
      <span class="mono">~/Library/Application Support/Claude/claude_desktop_config.json</span>；
      Cursor → <span class="mono">~/.cursor/mcp.json</span>。
      保存后重启客户端，<span class="mono">tools/list</span> 即可拉取工具。
      完整说明见 <a href="/docs/mcp-tools.html" target="_blank">MCP 工具概览</a>。
    </div>
    <a-alert v-if="store.mcpConfig.once" type="warning" style="margin-top: 12px">
      API Key 仅此一次完整展示，请立即复制保存；遗失请吊销后重新创建。
    </a-alert>
    <template #footer>
      <a-space>
        <a-button @click="store.mcpConfig.visible = false">关闭</a-button>
        <a-button type="primary" @click="copyCfg">
          <template #icon><icon-copy /></template>复制配置
        </a-button>
      </a-space>
    </template>
  </a-modal>
  <McpPlayground />
</template>
