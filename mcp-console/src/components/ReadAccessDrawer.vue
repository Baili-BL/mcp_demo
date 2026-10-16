<script setup>
import { computed, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  store, findSource, readRequestsOf, approveReadRequest, rejectReadRequest, revokeToolRead,
  isReadControlled, uncontrolledReason, generateSecView, dropSecView, secViewDDL, secViewName,
} from '../store'

const props = defineProps({
  visible: { type: Boolean, default: false },
  datasetId: { type: String, default: '' },
})
const emit = defineEmits(['update:visible', 'update:datasetId'])

const rejectingId = ref('')
const rejectReason = ref('')
const revokingKey = ref('')
const revokeReason = ref('')
const showDDL = ref(false)

watch(() => [props.visible, props.datasetId], () => {
  rejectingId.value = ''
  revokingKey.value = ''
  showDDL.value = false
})

const ds = computed(() => store.datasets.find((d) => d.id === props.datasetId) || null)
const title = computed(() => (ds.value ? `读取授权 · ${ds.value.display_name}` : '读取授权 · 全部待审批'))
const pending = computed(() => readRequestsOf({ datasetId: props.datasetId || undefined, status: 'pending' }))
const readers = computed(() => (ds.value
  ? store.tools.filter((t) => !t.dataset && (t.reads || []).includes(ds.value.id))
  : []))
const history = computed(() => (ds.value
  ? readRequestsOf({ datasetId: ds.value.id }).filter((r) => r.status === 'rejected' || r.status === 'revoked')
  : []))
const ddl = computed(() => secViewDDL(ds.value))

function close() {
  emit('update:visible', false)
}
function toolOf(name) {
  return store.tools.find((t) => t.name === name)
}
function svcName(tool) {
  return store.svcMeta[tool?.svc]?.n || '—'
}
function dsOf(id) {
  return store.datasets.find((d) => d.id === id)
}
function dsLabel(d) {
  return d ? `${findSource(d.data_source_id)?.name || ''} · ${d.display_name}` : '已删除的数据集'
}
function focusDataset(id) {
  emit('update:datasetId', id)
}

function approve(r) {
  const tool = toolOf(r.tool)
  const linked = approveReadRequest(r.id)
  const parts = [`已批准 ${r.tool} 读取 ${dsOf(r.datasetId)?.display_name || ''}`]
  if (linked) parts.push(`已把 ${linked} 关联到「${svcName(tool)}」`)
  const uncontrolled = tool && !isReadControlled(tool, r.datasetId)
  if (uncontrolled) parts.push(`注意该读取未受控：${uncontrolledReason(tool, r.datasetId)}`)
  Message[uncontrolled ? 'warning' : 'success'](parts.join('；'))
}
function startReject(r) {
  rejectingId.value = r.id
  rejectReason.value = ''
}
function confirmReject(r) {
  if (!rejectReason.value.trim()) {
    Message.warning('请填写拒绝原因，工具方会在工具目录看到')
    return
  }
  rejectReadRequest(r.id, rejectReason.value)
  rejectingId.value = ''
  Message.success(`已拒绝 ${r.tool} 的读取申请`)
}
function startRevoke(tool) {
  revokingKey.value = tool.name
  revokeReason.value = ''
}
function confirmRevoke(tool) {
  revokeToolRead(tool.name, ds.value.id, revokeReason.value)
  revokingKey.value = ''
  Message.success(`已撤销 ${tool.name} 对该数据集的读取`)
}

function createView() {
  generateSecView(ds.value)
  const n = readers.value.filter((t) => isReadControlled(t, ds.value.id)).length
  Message.success(`已生成 ${ds.value.sec_view.name}${n ? `，${n} 个工具的读取转为受控` : ''}`)
}
function removeView() {
  const name = ds.value.sec_view?.name
  dropSecView(ds.value)
  Message.warning(`已删除 ${name}，读取此数据集的工具变为未受控`)
}
function copyDDL() {
  navigator.clipboard?.writeText(ddl.value)
  Message.success('已复制建视图 SQL')
}
</script>

<template>
  <a-drawer :visible="visible" :width="720" :title="title" unmount-on-close :footer="false" @cancel="close">
    <template v-if="ds">
      <a-typography-title :heading="6" style="margin-top: 0">中间视图</a-typography-title>
      <div class="ra-view">
        <template v-if="ds.sec_view">
          <a-space>
            <a-tag color="green" size="small">已生成</a-tag>
            <span class="mono">{{ ds.sec_view.name }}</span>
          </a-space>
          <div class="muted ra-sub">规则最近同步 {{ ds.sec_view.syncedAt }}。在「数据权限」保存行列规则时自动同步。</div>
        </template>
        <template v-else>
          <a-space>
            <a-tag color="orange" size="small">未生成</a-tag>
            <span class="mono muted">{{ secViewName(ds) }}</span>
          </a-space>
          <div class="muted ra-sub">未生成时，上游工具只能直连原表，行列权限对它们不生效。</div>
        </template>
        <a-space style="margin-top: 8px">
          <a-button v-if="!ds.sec_view" size="small" type="primary" @click="createView">生成中间视图</a-button>
          <a-button v-else size="small" @click="createView">重新生成</a-button>
          <a-button size="small" @click="showDDL = !showDDL">{{ showDDL ? '收起 SQL' : '查看建视图 SQL' }}</a-button>
          <a-popconfirm v-if="ds.sec_view" content="删除后读取此数据集的工具都变为未受控，确定？" @ok="removeView">
            <a-button size="small" status="danger">删除视图</a-button>
          </a-popconfirm>
        </a-space>
        <template v-if="showDDL">
          <pre class="ra-ddl">{{ ddl }}</pre>
          <a-button size="mini" @click="copyDDL">复制</a-button>
        </template>
      </div>
    </template>

    <a-typography-title :heading="6" :style="{ marginTop: ds ? '20px' : 0 }">
      待审批申请 <span class="muted">{{ pending.length }}</span>
    </a-typography-title>
    <div v-if="!pending.length" class="muted">没有待审批的读取申请。</div>
    <div v-for="r in pending" :key="r.id" class="ra-item">
      <div class="ra-main">
        <div>
          <span class="mono">{{ r.tool }}</span>
          <span class="muted"> · {{ svcName(toolOf(r.tool)) }}</span>
        </div>
        <div class="muted ra-sub">
          <template v-if="!ds">申请读取 <a-link @click="focusDataset(r.datasetId)">{{ dsLabel(dsOf(r.datasetId)) }}</a-link> · </template>
          {{ r.requestedBy }} 于 {{ r.requestedAt }} 提交
        </div>
        <div v-if="toolOf(r.tool) && !isReadControlled(toolOf(r.tool), r.datasetId)" class="ra-warn">
          批准后为未受控读取：{{ uncontrolledReason(toolOf(r.tool), r.datasetId) }}
        </div>
      </div>
      <a-space v-if="rejectingId !== r.id">
        <a-button size="small" type="primary" @click="approve(r)">批准</a-button>
        <a-button size="small" @click="startReject(r)">拒绝</a-button>
      </a-space>
      <div v-else class="ra-reason">
        <a-input v-model="rejectReason" size="small" placeholder="拒绝原因（必填）" />
        <a-space>
          <a-button size="small" status="danger" @click="confirmReject(r)">确认拒绝</a-button>
          <a-button size="small" @click="rejectingId = ''">取消</a-button>
        </a-space>
      </div>
    </div>

    <template v-if="ds">
      <a-typography-title :heading="6" style="margin-top: 20px">
        已授权工具 <span class="muted">{{ readers.length }}</span>
      </a-typography-title>
      <div v-if="!readers.length" class="muted">暂无工具读取此数据集。</div>
      <div v-for="t in readers" :key="t.name" class="ra-item">
        <div class="ra-main">
          <div>
            <span class="mono">{{ t.name }}</span>
            <span class="muted"> · {{ svcName(t) }}</span>
          </div>
          <div class="ra-sub">
            <a-tag v-if="isReadControlled(t, ds.id)" color="green" size="small">受控</a-tag>
            <template v-else>
              <a-tag color="orange" size="small">未受控</a-tag>
              <span class="ra-warn">{{ uncontrolledReason(t, ds.id) }}</span>
            </template>
          </div>
        </div>
        <a-button v-if="revokingKey !== t.name" size="small" @click="startRevoke(t)">撤销</a-button>
        <div v-else class="ra-reason">
          <a-input v-model="revokeReason" size="small" placeholder="撤销原因（选填）" />
          <a-space>
            <a-button size="small" status="danger" @click="confirmRevoke(t)">确认撤销</a-button>
            <a-button size="small" @click="revokingKey = ''">取消</a-button>
          </a-space>
        </div>
      </div>

      <template v-if="history.length">
        <a-typography-title :heading="6" style="margin-top: 20px">已拒绝 / 已撤销</a-typography-title>
        <div v-for="r in history" :key="r.id" class="ra-item">
          <div class="ra-main">
            <div>
              <a-tag color="red" size="small">{{ r.status === 'rejected' ? '已拒绝' : '已撤销' }}</a-tag>
              <span class="mono" style="margin-left: 6px">{{ r.tool }}</span>
            </div>
            <div class="muted ra-sub">{{ r.decidedAt }}{{ r.reason ? ` · ${r.reason}` : '' }}</div>
          </div>
        </div>
      </template>
    </template>
  </a-drawer>
</template>

<style scoped>
.ra-view { padding: 12px; border: 1px solid var(--color-border-2); border-radius: 8px; }
.ra-sub { margin-top: 4px; font-size: 12px; }
.ra-ddl {
  margin: 10px 0 6px;
  padding: 12px;
  border-radius: 6px;
  background: var(--color-fill-1);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: Menlo, Consolas, monospace;
}
.ra-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-1);
}
.ra-main { min-width: 0; flex: 1; }
.ra-warn { font-size: 12px; color: rgb(var(--orange-6)); }
.ra-reason { display: flex; flex-direction: column; gap: 6px; width: 220px; }
</style>
