<script setup>
import { computed, onDeactivated, onMounted, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  store, inferConnector, isDbKind,
  detachSource, datasetsOfSource, testSourceConnection, syncSchema,
  forgetDatasets,
} from '../store'
import CreateSourceWizard from '../components/CreateSourceWizard.vue'
import DbTypeIcon from '../components/DbTypeIcon.vue'

const emit = defineEmits(['goto'])

const sourceQuery = ref('')
const tableQuery = ref('')
const activeId = ref(store.sources.find((s) => s.kind === 'mysql')?.id || store.sources[0]?.id || '')
const busyId = ref('')
const tip = ref(null)
const wizardOpen = ref(false)
const editingSource = ref(null)
const moreId = ref('')

const selected = computed(() => store.sources.find((s) => s.id === activeId.value) || null)
const sourceList = computed(() => {
  const q = sourceQuery.value.trim().toLowerCase()
  return store.sources.filter((s) => {
    if (!q) return true
    return `${s.name} ${s.code} ${s.host || ''} ${s.database || ''} ${s.user || ''}`.toLowerCase().includes(q)
  })
})
const sourceDatasets = computed(() => {
  const rows = selected.value ? datasetsOfSource(selected.value.id) : []
  const q = tableQuery.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((d) => `${d.display_name || ''} ${d.table_name || ''} ${d.description || ''}`.toLowerCase().includes(q))
})

function sourceMeta(s) {
  const who = s.user || inferConnector(s).label
  const when = s.lastCheck || '尚未检查'
  return `${who} · ${when}`
}
function mcpToolsOfSource(src) {
  const ids = new Set(datasetsOfSource(src.id).map((d) => d.id))
  const names = new Set()
  store.tools.forEach((t) => {
    const published = t.dataset?.sourceId === src.id || (t.dataset?.datasetId && ids.has(t.dataset.datasetId))
    const reads = (t.reads || []).some((id) => ids.has(id))
    if (published || reads) names.add(t.cn ? `${t.cn}（${t.name}）` : t.name)
  })
  store.readRequests.forEach((r) => {
    if (r.status === 'rejected' || !ids.has(r.datasetId)) return
    const tool = store.tools.find((t) => t.name === r.tool)
    names.add(tool?.cn ? `${tool.cn}（${tool.name}）` : r.tool)
  })
  return [...names]
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

function onSourceMore(key, src) {
  activeId.value = src.id
  if (key === 'delete') onDelete(src)
}
function onDelete(src) {
  const tools = mcpToolsOfSource(src)
  if (tools.length) {
    Modal.warning({
      title: `无法删除「${src.name}」`,
      content: `该数据源仍被 MCP 工具使用：${tools.join('、')}。请先删除这些 MCP 工具，再删除数据源。`,
      okText: '知道了',
      hideCancel: true,
    })
    return
  }
  const n = datasetsOfSource(src.id).length
  Modal.confirm({
    title: `删除数据源「${src.name}」？`,
    content: n ? `将移除该连接，以及尚未发布成工具的 ${n} 个数据集。` : '将移除该连接。',
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
function createSql() {
  if (!selected.value || !isDbKind(selected.value.kind)) {
    Message.warning('请先选择数据库连接')
    return
  }
  store.editDatasetId = ''
  store.datasetFlt.sourceId = selected.value.id
  emit('goto', 'dataset-sql')
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
    </div>

    <a-alert v-if="tip" :type="tip.ok ? 'success' : 'error'" style="margin-bottom: 12px" closable @close="tip = null">
      {{ tip.text }}
    </a-alert>

    <div class="ds-layout">
      <aside class="ds-side">
        <div class="ds-side-hd">
          <span>我的数据源</span>
          <a-input-search v-model="sourceQuery" allow-clear size="small" placeholder="搜索" />
        </div>
        <div v-if="sourceList.length" class="ds-list">
          <div
            v-for="s in sourceList"
            :key="s.id"
            class="ds-item"
            :class="{ active: s.id === activeId, 'ops-on': moreId === s.id }"
            role="button"
            tabindex="0"
            @click="activeId = s.id"
            @keydown.enter="activeId = s.id"
          >
            <DbTypeIcon :type="s.kind" />
            <span class="ds-item-body">
              <span class="ds-item-name ellipsis">{{ s.name }}</span>
              <span class="ds-item-meta ellipsis">{{ sourceMeta(s) }}</span>
            </span>
            <span class="ds-item-ops" @click.stop>
              <button type="button" :aria-label="`编辑 ${s.name}`" title="编辑" @click.stop="openEdit(s)"><icon-edit /></button>
              <a-dropdown trigger="click" position="br" @popup-visible-change="(v) => { moreId = v ? s.id : '' }" @select="(k) => onSourceMore(k, s)">
                <button type="button" :aria-label="`更多 ${s.name}`" title="更多"><icon-more-vertical /></button>
                <template #content>
                  <a-doption value="delete">
                    <template #icon><icon-delete /></template>
                    删除
                  </a-doption>
                </template>
              </a-dropdown>
            </span>
          </div>
        </div>
        <a-empty v-else description="暂无数据源" />
      </aside>

      <div class="ds-main-col">
        <button type="button" class="ds-create-bar" @click="openWizard">新建数据源</button>
        <section v-if="selected" class="ds-main">
        <div class="ds-main-bar">
          <div class="ds-tabs">数据表</div>
          <div class="ds-toolbar">
            <a-input-search v-model="tableQuery" allow-clear placeholder="搜索表名" style="width: 200px" />
            <a-button :disabled="!isDbKind(selected.kind)" @click="createSql">SQL 创建数据集</a-button>
            <a-button :loading="busyId === selected.id" @click="onTest(selected)">测试连接</a-button>
            <a-button v-if="isDbKind(selected.kind)" type="outline" :loading="busyId === selected.id" @click="onSync(selected)">同步 Schema</a-button>
          </div>
        </div>

        <a-table :data="sourceDatasets" row-key="id" :pagination="{ pageSize: 8 }" hoverable :bordered="false">
          <template #columns>
            <a-table-column title="名称" data-index="display_name" />
            <a-table-column title="备注">
              <template #cell="{ record }">
                <span class="muted">{{ record.description || record.table_name || '—' }}</span>
              </template>
            </a-table-column>
          </template>
          <template #empty>
            <a-empty description="暂无数据表">
              <a-button v-if="isDbKind(selected.kind)" type="primary" size="small" @click="onSync(selected)">同步 Schema</a-button>
            </a-empty>
          </template>
        </a-table>
        </section>
        <a-empty v-else class="ds-main" description="请选择左侧数据源" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ds-page .page-head { margin-bottom: 16px; }
.ds-main-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.ds-create-bar {
  width: 100%;
  height: 36px;
  border: none;
  border-radius: 2px;
  background: rgb(22, 100, 255);
  color: #fff;
  font-size: 14px;
  line-height: 36px;
  cursor: pointer;
}
.ds-create-bar:hover { background: rgb(64, 128, 255); }
.ds-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  min-height: 560px;
  align-items: stretch;
}
.ds-side,
.ds-main {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background: #fff;
}
.ds-side { min-height: 560px; }
.ds-main { flex: 1; }
.ds-side {
  padding: 12px 8px 8px;
  overflow: auto;
}
.ds-side-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px 10px;
  font-size: 14px;
  color: var(--color-text-1);
}
.ds-side-hd :deep(.arco-input-search) { width: 132px; }
.ds-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  border-radius: 6px;
  padding: 8px 8px;
  cursor: pointer;
  margin-bottom: 2px;
}
.ds-item:hover { background: var(--color-fill-2); }
.ds-item.active { background: #e8f3ff; }
.ds-item :deep(.db-ico) {
  width: 18px;
  height: 18px;
  margin: 0;
  flex: none;
}
.ds-item :deep(.db-ico svg) {
  width: 18px;
  height: 18px;
}
.ds-item-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ds-item-name {
  font-size: 13px;
  color: var(--color-text-1);
  line-height: 20px;
}
.ds-item-meta {
  font-size: 12px;
  line-height: 18px;
  color: var(--color-text-3);
}
.ds-item-ops {
  display: none;
  flex: none;
  gap: 2px;
}
.ds-item:hover .ds-item-ops,
.ds-item.active .ds-item-ops,
.ds-item.ops-on .ds-item-ops,
.ds-item:focus-within .ds-item-ops { display: inline-flex; }
.ds-item-ops button {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--color-text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ds-item-ops button:hover { background: rgba(255, 255, 255, 0.8); color: rgb(var(--primary-6)); }
.ds-main { padding: 8px 16px 16px; }
.ds-main-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  margin-bottom: 4px;
}
.ds-tabs {
  height: 32px;
  padding: 0 12px;
  line-height: 32px;
  border-radius: 4px;
  background: var(--color-fill-2);
  color: var(--color-text-1);
  font-weight: 500;
}
.ds-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 960px) {
  .ds-layout { grid-template-columns: 1fr; }
  .ds-main-bar { align-items: flex-start; flex-direction: column; }
}
</style>
