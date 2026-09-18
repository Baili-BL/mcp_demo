<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, openAlertCount, toolsetAsSvc, toolsOfSet } from './store'
import { mcpConfigText, copyText } from './utils'
import Overview from './views/Overview.vue'
import Services from './views/Services.vue'
import Tools from './views/Tools.vue'
import Monitor from './views/Monitor.vue'
import Clients from './views/Clients.vue'
import Alerts from './views/Alerts.vue'
import Sequence from './views/Sequence.vue'
import McpPlayground from './components/McpPlayground.vue'
import SiderFoldIcon from './components/SiderFoldIcon.vue'
import McpMark from './components/McpMark.vue'

const CONSOLE_MENUS = [
  { id: 'overview', t: '概览' },
  { id: 'services', t: 'MCP 中心' },
  { id: 'tools', t: '工具目录' },
  { id: 'monitor', t: '调用监控' },
  { id: 'clients', t: '接入与密钥' },
  { id: 'alerts', t: '告警中心' },
]
const views = { overview: Overview, services: Services, tools: Tools, monitor: Monitor, sequence: Sequence, clients: Clients, alerts: Alerts }
const cur = ref('overview')
const lastConsole = ref('overview')
const collapsed = ref(false)
const search = ref('')
const shell = computed(() => (cur.value === 'sequence' ? 'sequence' : 'console'))

function showView(id) {
  if (id === 'sequence') {
    cur.value = 'sequence'
    history.replaceState(null, '', '#sequence')
    return
  }
  if (!CONSOLE_MENUS.some((m) => m.id === id)) return
  lastConsole.value = id
  cur.value = id
  history.replaceState(null, '', '#' + id)
}
function openConsole() {
  showView(lastConsole.value || 'overview')
}
function onMenu(key) {
  store.clientFlt.toolsetId = ''
  showView(key)
}
function syncHash() {
  const h = (location.hash || '').replace('#', '')
  if (h === 'sequence') cur.value = 'sequence'
  else if (CONSOLE_MENUS.some((m) => m.id === h)) {
    lastConsole.value = h
    cur.value = h
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

function onSearch() {
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
  <div class="app-shell">
    <header class="app-topbar">
      <button type="button" class="topbar-brand" @click="openConsole">
        <McpMark class="mark" />
        <span class="name">MCP 服务管理台</span>
      </button>
      <nav class="top-tabs">
        <button type="button" :class="{ on: shell === 'console' }" @click="openConsole">控制台</button>
        <button type="button" :class="{ on: shell === 'sequence' }" @click="showView('sequence')">时序图</button>
      </nav>
      <div class="header-right">
        <a-input-search
          v-if="shell === 'console'"
          v-model="search"
          allow-clear
          placeholder="搜索工具名 / 描述，回车跳转"
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

    <a-layout class="app-body">
      <a-layout-sider
        v-show="shell === 'console'"
        v-model:collapsed="collapsed"
        :width="220"
        :collapsed-width="64"
        collapsible
        hide-trigger
        breakpoint="lg"
        class="app-sider"
      >
        <a-menu
          :collapsed="collapsed"
          :selected-keys="[cur]"
          :auto-open="true"
          @menu-item-click="onMenu"
        >
          <a-menu-item key="overview">
            <template #icon><icon-dashboard /></template>概览
          </a-menu-item>
          <a-menu-item key="services">
            <template #icon><icon-storage /></template>MCP 中心
          </a-menu-item>
          <a-menu-item key="tools">
            <template #icon><icon-list /></template>工具目录
          </a-menu-item>
          <a-menu-item key="monitor">
            <template #icon><icon-bar-chart /></template>调用监控
          </a-menu-item>
          <a-menu-item key="alerts">
            <template #icon><icon-notification /></template>
            告警中心
            <a-badge v-if="!collapsed && openAlertCount()" :count="openAlertCount()" :max-count="99" class="menu-badge" />
          </a-menu-item>
          <a-menu-item key="clients">
            <template #icon><icon-safe /></template>接入与密钥
          </a-menu-item>
        </a-menu>
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

      <a-layout-content class="content-wrap" :class="{ full: shell === 'sequence' }">
        <div class="page-panel">
          <keep-alive>
            <component :is="views[cur]" @goto="showView" />
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
      完整说明见 <a href="/MCP工具概览.md" target="_blank">MCP 工具概览</a>。
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
