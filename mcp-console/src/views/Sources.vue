<script setup>
import { computed, onDeactivated, onMounted, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  store, DATABASE_TYPES, VENDOR_LABELS, inferConnector, isDbKind, servicesBoundTo,
  detachSource, datasetsOfSource, testSourceConnection, syncSchema, linkedToolsOfDataset,
  forgetDatasets, isReadControlled,
} from '../store'
import CreateSourceWizard from '../components/CreateSourceWizard.vue'

const emit = defineEmits(['goto'])

const sourceQuery = ref('')
const activeId = ref(store.sources.find((s) => s.kind === 'mysql')?.id || store.sources[0]?.id || '')
const busyId = ref('')
const tip = ref(null)
const wizardOpen = ref(false)
const editingSource = ref(null)

const selected = computed(() => store.sources.find((s) => s.id === activeId.value) || null)
const grouped = computed(() => {
  const q = sourceQuery.value.trim().toLowerCase()
  const cats = [
    { category: '数据库', kinds: DATABASE_TYPES.map((t) => t.type) },
    { category: '接口', kinds: ['http'] },
  ]
  return cats.map((c) => ({
    category: c.category,
    items: store.sources.filter((s) => {
      if (!c.kinds.includes(s.kind)) return false
      if (!q) return true
      return `${s.name} ${s.code} ${s.host || ''} ${s.database || ''}`.toLowerCase().includes(q)
    }),
  })).filter((g) => g.items.length)
})
const sourceDatasets = computed(() => (selected.value ? datasetsOfSource(selected.value.id) : []))
const selectedConnector = computed(() => inferConnector(selected.value))

function targetOf(s) {
  if (!s) return '—'
  if (s.kind === 'http') return s.baseUrl || '—'
  const db = s.database ? `/${s.database}` : ''
  return s.host ? `${s.host}:${s.port || 3306}${db}` : '—'
}
function statusText(s) {
  if (!s.enabled || s.status === 'disabled') return '已停用'
  if (s.status === 'connected') return '已连通'
  if (s.status === 'failed') return '连接失败'
  return '未探测'
}
function statusColor(s) {
  const t = statusText(s)
  if (t === '已连通') return 'green'
  if (t === '连接失败') return 'red'
  return 'gray'
}
watch(selected, (s) => {
  if (!s && store.sources[0]) activeId.value = store.sources[0].id
})

function openWizard() {
  editingSource.value = null
  wizardOpen.value = true
}
function openEdit(src) {
  editingSource.value = src
  wizardOpen.value = true
}
function onWizardSaved(src) {
  if (src?.id) activeId.value = src.id
}
function tryOpenFromStore() {
  if (!store.ui.openSourceWizard) return
  store.ui.openSourceWizard = false
  openWizard()
}
onMounted(tryOpenFromStore)
watch(() => store.ui.openSourceWizard, tryOpenFromStore)

async function onTest(src) {
  busyId.value = src.id
  tip.value = null
  try {
    await new Promise((r) => setTimeout(r, 600))
    const result = testSourceConnection(src)
    tip.value = {
      ok: result.success,
      text: result.success ? `连接成功，发现 ${result.tables_found ?? 0} 张表/视图。` : `连接失败：${result.message}`,
    }
    if (result.success) Message.success(tip.value.text)
    else Message.error(tip.value.text)
  } finally {
    busyId.value = ''
  }
}

async function onSync(src) {
  busyId.value = src.id
  tip.value = null
  try {
    await new Promise((r) => setTimeout(r, 700))
    const result = syncSchema(store, src)
    tip.value = {
      ok: true,
      text: `Schema 同步完成：新建 ${result.datasets_created}、更新 ${result.datasets_updated}，共 ${result.tables_found} 个对象。`,
    }
    Message.success(tip.value.text)
  } finally {
    busyId.value = ''
  }
}

function onDelete(src) {
  const bound = servicesBoundTo(src)
  const n = datasetsOfSource(src.id).length
  Modal.confirm({
    title: `删除数据源「${src.name}」？`,
    content: `将解除服务绑定${bound.length ? `（${bound.map((s) => s.name).join('、')}）` : ''}，并移除关联的 ${n} 个数据集。`,
    okText: '删除',
    onOk: () => {
      const removedIds = new Set(store.datasets.filter((d) => d.data_source_id === src.id).map((d) => d.id))
      store.datasets = store.datasets.filter((d) => d.data_source_id !== src.id)
      store.datasetGrants = store.datasetGrants.filter((g) => !removedIds.has(g.dataset_id))
      forgetDatasets([...removedIds])
      detachSource(src)
      if (activeId.value === src.id) activeId.value = store.sources[0]?.id || ''
      Message.success('已删除')
    },
  })
}
function goDatasets(sourceId) {
  store.datasetFlt.sourceId = sourceId || ''
  emit('goto', 'datasets')
}
onDeactivated(() => {
  wizardOpen.value = false
})
</script>

<template>
  <CreateSourceWizard :visible="wizardOpen" :editing="editingSource" @update:visible="wizardOpen = $event" @saved="onWizardSaved" />

  <div class="ds-page">
    <div class="page-head mcp-hub-head">
      <div>
        <h2>数据源</h2>
        <div class="desc">选择数据源类型 → 配置连接 → 连接测试 → 确定。测通后同步 Schema，生成数据集。</div>
      </div>
      <a-button type="primary" @click="openWizard">新建数据源</a-button>
    </div>

    <a-alert v-if="tip" :type="tip.ok ? 'success' : 'error'" style="margin-bottom: 12px" closable @close="tip = null">
      {{ tip.text }}
    </a-alert>

    <div class="ds-layout">
      <aside class="ds-side">
        <a-input-search v-model="sourceQuery" allow-clear placeholder="搜索数据源" style="margin-bottom: 12px" />
        <div v-for="g in grouped" :key="g.category" class="ds-group">
          <div class="ds-group-title">{{ g.category }}</div>
          <button
            v-for="s in g.items"
            :key="s.id"
            type="button"
            class="ds-item"
            :class="{ active: s.id === activeId }"
            @click="activeId = s.id"
          >
            <div class="ds-item-name">{{ s.name }}</div>
            <div class="muted mono">{{ inferConnector(s).label }} · {{ statusText(s) }}</div>
          </button>
        </div>
        <a-empty v-if="!grouped.length" description="暂无数据源" />
      </aside>

      <section v-if="selected" class="ds-main">
        <div class="ds-main-head">
          <div>
            <h3>{{ selected.name }}</h3>
            <div class="muted mono">{{ targetOf(selected) }}</div>
          </div>
          <a-space wrap>
            <a-tag :color="statusColor(selected)">{{ statusText(selected) }}</a-tag>
            <a-button size="small" :loading="busyId === selected.id" @click="onTest(selected)">测试连接</a-button>
            <a-button v-if="isDbKind(selected.kind)" size="small" type="outline" :loading="busyId === selected.id" @click="onSync(selected)">同步 Schema</a-button>
            <a-button size="small" @click="openEdit(selected)">编辑</a-button>
            <a-button size="small" status="danger" @click="onDelete(selected)">删除</a-button>
          </a-space>
        </div>

        <a-descriptions :column="2" size="medium" bordered style="margin-bottom: 16px">
          <a-descriptions-item label="数据源类型">{{ selectedConnector.label }}</a-descriptions-item>
          <a-descriptions-item v-if="VENDOR_LABELS[selectedConnector.vendor]" label="来源">{{ VENDOR_LABELS[selectedConnector.vendor] }}</a-descriptions-item>
          <a-descriptions-item v-if="selected.kind === 'mysql'" label="数据库版本">{{ selected.dbVersion || '—' }}</a-descriptions-item>
          <a-descriptions-item label="账号">{{ selected.user || '—' }}</a-descriptions-item>
          <a-descriptions-item label="环境变量"><span class="mono">{{ selected.envKey }}</span></a-descriptions-item>
          <a-descriptions-item v-if="selected.kind === 'mysql'" label="SSL">{{ selected.ssl ? '已开启' : '关闭' }}</a-descriptions-item>
          <a-descriptions-item label="最近同步">{{ selected.lastSyncedAt || '尚未同步' }}</a-descriptions-item>
          <a-descriptions-item label="关联 MCP 服务" :span="2">
            <a-space wrap>
              <a-tag v-for="s in servicesBoundTo(selected)" :key="s.id" color="cyan" size="small">{{ s.name }}</a-tag>
              <span v-if="!servicesBoundTo(selected).length" class="muted">未关联</span>
              <a-link @click="emit('goto', 'services')">在 MCP 中心维护</a-link>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>

        <div class="ds-table-head">
          <h4>表 / 视图（数据集）</h4>
          <a-button type="text" size="small" @click="goDatasets(selected.id)">去数据集 →</a-button>
        </div>
        <a-table :data="sourceDatasets" row-key="id" :pagination="{ pageSize: 8 }" hoverable>
          <template #columns>
            <a-table-column title="显示名" data-index="display_name" :width="180" />
            <a-table-column title="表名" :width="200">
              <template #cell="{ record }"><span class="mono">{{ record.table_name }}</span></template>
            </a-table-column>
            <a-table-column title="类型" :width="90">
              <template #cell="{ record }">
                <a-tag :color="record.extra?.source_kind === 'view' ? 'purple' : 'arcoblue'" size="small">
                  {{ record.extra?.source_kind === 'view' ? '视图' : '表' }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column title="字段数" :width="90" align="right">
              <template #cell="{ record }">{{ (record.columns || []).length }}</template>
            </a-table-column>
            <a-table-column title="估计行数" :width="110" align="right">
              <template #cell="{ record }">{{ record.row_count_estimate?.toLocaleString?.() || '—' }}</template>
            </a-table-column>
            <a-table-column title="联动工具" :width="220">
              <template #cell="{ record }">
                <a-space v-if="linkedToolsOfDataset(store, record.id).length" wrap :size="4">
                  <a-tag
                    v-for="t in linkedToolsOfDataset(store, record.id)"
                    :key="t.name"
                    size="small"
                    :color="t.dataset ? 'green' : (isReadControlled(t, record.id) ? 'arcoblue' : 'orange')"
                    class="mono"
                  >{{ t.dataset ? '发布' : (isReadControlled(t, record.id) ? '读取' : '读取·未受控') }} · {{ t.name }}</a-tag>
                </a-space>
                <span v-else class="muted">无</span>
              </template>
            </a-table-column>
            <a-table-column title="说明">
              <template #cell="{ record }">
                <span class="muted">{{ record.description || '—' }}</span>
              </template>
            </a-table-column>
          </template>
          <template #empty>
            <a-empty>
              <div>尚未同步 Schema</div>
              <a-button v-if="isDbKind(selected.kind)" type="primary" size="small" style="margin-top: 8px" @click="onSync(selected)">同步 Schema</a-button>
            </a-empty>
          </template>
        </a-table>
      </section>
      <a-empty v-else class="ds-main" description="请选择左侧数据源" />
    </div>
  </div>
</template>

<style scoped>
.ds-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  min-height: 520px;
}
.ds-side {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
  padding: 12px;
  overflow: auto;
}
.ds-group-title {
  font-size: 12px;
  color: var(--color-text-3);
  margin: 8px 0 6px;
}
.ds-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  margin-bottom: 4px;
}
.ds-item:hover { background: var(--color-fill-2); }
.ds-item.active { background: rgb(var(--primary-1)); }
.ds-item-name { font-weight: 500; }
.ds-main {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: var(--color-bg-2);
  padding: 16px 18px;
}
.ds-main-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}
.ds-main-head h3 { margin: 0 0 4px; font-size: 18px; }
.ds-table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 10px;
}
.ds-table-head h4 { margin: 0; font-size: 15px; }
@media (max-width: 960px) {
  .ds-layout { grid-template-columns: 1fr; }
}
</style>
