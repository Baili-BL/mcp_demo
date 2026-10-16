<script setup>
import { computed, reactive, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, findSource, publishDatasetTool, toolsOfDataset, getOrCreateGrant, syncServiceSources } from '../store'

const props = defineProps({
  visible: { type: Boolean, default: false },
  datasetId: { type: String, default: '' },
})
const emit = defineEmits(['update:visible', 'published', 'goto'])

const form = reactive({ name: '', cn: '', filterFields: [] })
const dataset = computed(() => store.datasets.find((d) => d.id === props.datasetId) || null)
const existing = computed(() => (dataset.value ? toolsOfDataset(store, dataset.value.id)[0] : null))
const fieldOptions = computed(() => {
  const ds = dataset.value
  if (!ds) return []
  const g = getOrCreateGrant(store, ds)
  return (g.columns || []).filter((c) => c.allowed !== false).map((c) => c.column_name)
})

function reset() {
  const ds = dataset.value
  if (!ds) return
  const t = existing.value
  const slug = String(ds.table_name || ds.display_name || 'dataset').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
  form.name = t?.name || `query_${slug}`
  form.cn = t?.cn || `${findSource(ds.data_source_id)?.name || '来源表'} · ${ds.display_name}`
  form.filterFields = t
    ? Object.keys(t.schema?.properties || {}).filter((k) => k !== 'limit')
    : fieldOptions.value.slice(0, 2)
}
watch(() => [props.visible, props.datasetId], ([v]) => { if (v) reset() }, { immediate: true })

function submit() {
  const ds = dataset.value
  const { error, tool, updated } = publishDatasetTool(store, {
    dataset: ds,
    source: findSource(ds?.data_source_id),
    name: form.name,
    cn: form.cn,
    filterFields: [...form.filterFields],
  })
  if (error) {
    Message.warning(error)
    return false
  }
  syncServiceSources()
  Message.success(updated ? `工具 ${tool.name} 已更新` : `工具 ${tool.name} 已发布到「数据集服务」，可在 MCP 中心加入工具集`)
  emit('published', tool)
  return true
}
function gotoPerm() {
  emit('update:visible', false)
  emit('goto', 'security')
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="existing ? '更新 MCP 工具' : '发布为 MCP 工具'"
    :width="540"
    unmount-on-close
    :on-before-ok="submit"
    :ok-text="existing ? '更新' : '发布'"
    @update:visible="emit('update:visible', $event)"
  >
    <a-form v-if="dataset" :model="form" layout="vertical">
      <a-form-item label="工具名称" required>
        <a-input v-model="form.name" class="mono" />
      </a-form-item>
      <a-form-item label="中文名称" required>
        <a-input v-model="form.cn" />
      </a-form-item>
      <a-form-item label="所属服务">
        <a-tag color="green">数据集服务（平台托管）</a-tag>
      </a-form-item>
      <a-form-item label="查询参数" extra="勾选的字段会成为工具的入参">
        <a-checkbox-group v-model="form.filterFields">
          <a-checkbox v-for="name in fieldOptions" :key="name" :value="name">
            <span class="mono">{{ name }}</span>
          </a-checkbox>
        </a-checkbox-group>
      </a-form-item>
      <p class="pub-hint">
        谁能看哪些行、哪些列，统一在「数据权限」配置，调用时实时生效，无需重新发布。
        <a-link @click="gotoPerm">去数据权限</a-link>
      </p>
    </a-form>
  </a-modal>
</template>

<style scoped>
.pub-hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  line-height: 1.7;
}
</style>
