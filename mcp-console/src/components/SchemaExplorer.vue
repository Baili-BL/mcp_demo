<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, updateColumn } from '../store'

const props = defineProps({
  dataset: { type: Object, default: null },
})
const visible = defineModel('visible', { type: Boolean, default: false })

const editingId = ref('')
const form = reactive({ semantic_hint: '', description: '' })

const columns = computed(() => {
  const cols = props.dataset?.columns || []
  return [...cols].sort((a, b) => (a.ordinal_position || 0) - (b.ordinal_position || 0))
})

watch(() => visible.value, (v) => {
  if (!v) editingId.value = ''
})

function startEdit(col) {
  editingId.value = col.id
  form.semantic_hint = col.semantic_hint || ''
  form.description = col.description || ''
}
function cancelEdit() {
  editingId.value = ''
}
function saveEdit() {
  const col = updateColumn(store, editingId.value, {
    semantic_hint: form.semantic_hint.trim() || null,
    description: form.description.trim() || null,
  })
  if (!col) {
    Message.warning('字段不存在')
    return
  }
  Message.success('语义标注已保存')
  editingId.value = ''
}
</script>

<template>
  <a-modal
    v-model:visible="visible"
    :title="dataset ? `Schema · ${dataset.display_name}` : 'Schema'"
    :width="720"
    :footer="false"
    unmount-on-close
  >
    <template v-if="dataset">
      <div class="muted" style="margin-bottom: 12px">
        <span class="mono">{{ dataset.table_name }}</span>
        · 约 {{ (dataset.row_count_estimate || 0).toLocaleString() }} 行
        · schema_v{{ dataset.schema_version || 1 }}
      </div>
      <a-alert type="info" style="margin-bottom: 12px">
        对齐 vibeBI SchemaExplorer：此处只编辑 semantic_hint / description，不是行列权限。
      </a-alert>
      <div class="schema-list">
        <div v-for="col in columns" :key="col.id" class="schema-row">
          <div class="schema-main">
            <div class="schema-name">
              <span class="mono">{{ col.column_name }}</span>
              <a-tag size="small" color="gray">{{ col.data_type }}</a-tag>
              <a-tag v-if="col.is_nullable" size="small">可空</a-tag>
              <a-tag v-if="col.semantic_hint" size="small" color="arcoblue">{{ col.semantic_hint }}</a-tag>
            </div>
            <div class="muted">{{ col.description || '暂无描述' }}</div>
            <div v-if="editingId === col.id" class="schema-edit">
              <a-input v-model="form.semantic_hint" placeholder="semantic_hint，如 dimension / measure" style="margin-bottom: 8px" />
              <a-textarea v-model="form.description" placeholder="字段业务说明" :auto-size="{ minRows: 2, maxRows: 4 }" />
              <a-space style="margin-top: 8px">
                <a-button type="primary" size="mini" @click="saveEdit">保存</a-button>
                <a-button size="mini" @click="cancelEdit">取消</a-button>
              </a-space>
            </div>
          </div>
          <a-button v-if="editingId !== col.id" type="text" size="mini" @click="startEdit(col)">编辑</a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<style scoped>
.schema-list { max-height: 480px; overflow: auto; }
.schema-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--color-bg-1);
}
.schema-main { flex: 1; min-width: 0; }
.schema-name { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 4px; }
.schema-edit { margin-top: 10px; }
</style>
