<script setup>
import { computed, onDeactivated, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import G2LineChart from '../components/G2LineChart.vue'
import {
  store, SCHEMA_TPL, SECTOR_TAG, openPlayground, tagColor, keyForEndpoint, findSource,
  requestToolReads, readRequestsOf, isReadControlled, uncontrolledReason,
} from '../store'
import { fmt, srColor } from '../utils'

const emit = defineEmits(['goto'])
const toolVisible = ref(false)
const drawerVisible = ref(false)
const readsEditing = ref(false)
const readsDraft = ref([])
const dataFlt = ref('all')
const current = ref(null)
const upstreamServices = computed(() => store.services.filter((s) => !s.builtin))
const form = reactive({
  name: '', cn: '', svc: upstreamServices.value[0]?.id, sector: '', version: 'v1.0.0', on: true, desc: '', schema: SCHEMA_TPL, reads: [],
})

const datasetOptions = computed(() => store.datasets
  .filter((d) => !d.deleted)
  .map((d) => ({ value: d.id, label: `${findSource(d.data_source_id)?.name || '未知数据源'} · ${d.display_name}` })))
function readsOf(t) {
  return (t?.reads || []).map((id) => store.datasets.find((d) => d.id === id)).filter(Boolean)
}
function dsLabel(d) {
  return `${findSource(d.data_source_id)?.name || ''} · ${d.display_name}`
}
function pendingOf(t) {
  return readRequestsOf({ tool: t?.name, status: 'pending' })
    .map((r) => store.datasets.find((d) => d.id === r.datasetId)).filter(Boolean)
}
function hasUncontrolled(t) {
  return readsOf(t).some((d) => !isReadControlled(t, d.id))
}
const READ_STATUS = {
  ok: { color: 'green', text: '受控' },
  warn: { color: 'orange', text: '未受控' },
  pending: { color: 'gray', text: '待授权' },
  rejected: { color: 'red', text: '已拒绝' },
  revoked: { color: 'red', text: '已撤销' },
}
function readRows(t) {
  if (!t) return []
  const rows = readsOf(t).map((d) => (isReadControlled(t, d.id)
    ? { d, status: 'ok', note: `经 ${d.sec_view.name} 查询，按调用人用户组过滤` }
    : { d, status: 'warn', note: `直连原表，行列权限不生效：${uncontrolledReason(t, d.id)}` }))
  readRequestsOf({ tool: t.name }).filter((r) => r.status !== 'approved').forEach((r) => {
    const d = store.datasets.find((x) => x.id === r.datasetId)
    if (!d) return
    const note = r.status === 'pending'
      ? `${r.requestedBy || ''} 于 ${r.requestedAt} 提交，等待数据集负责人审批`
      : `${r.decidedAt}${r.reason ? `：${r.reason}` : ''}`
    rows.push({ d, status: r.status, note })
  })
  return rows
}

const tagOpts = computed(() => {
  const set = new Set(Object.keys(SECTOR_TAG))
  store.tools.forEach((t) => { if (t.sector) set.add(t.sector) })
  return [...set]
})
const platformOpts = computed(() => {
  const set = new Set()
  store.services.forEach((s) => (s.sources || []).forEach((x) => { if (x) set.add(x) }))
  return [...set]
})

const filtered = computed(() => store.tools.filter((t) => {
  if (store.flt.svc !== 'all' && t.svc !== store.flt.svc) return false
  if (store.flt.sector !== 'all' && t.sector !== store.flt.sector) return false
  if (store.flt.platform !== 'all') {
    const src = store.services.find((s) => s.id === t.svc)?.sources || []
    if (!src.includes(store.flt.platform)) return false
  }
  if (dataFlt.value === 'bound' && !t.dataset?.datasetId) return false
  if (dataFlt.value === 'reads' && !readsOf(t).length) return false
  if (dataFlt.value === 'uncontrolled' && !hasUncontrolled(t)) return false
  if (dataFlt.value === 'pending' && !pendingOf(t).length) return false
  if (dataFlt.value === 'none' && (t.dataset || readsOf(t).length || pendingOf(t).length)) return false
  const kw = store.flt.kw
  if (kw) {
    const names = [t.dataset?.objectName || '', ...readsOf(t).map((d) => d.table_name), ...pendingOf(t).map((d) => d.table_name)].join(' ')
    if (!t.name.includes(kw) && !t.cn.includes(kw) && !t.desc.includes(kw) && !names.includes(kw)) return false
  }
  return true
}))

function kindTag(t) {
  const k = t?.dataset?.objectType
  if (k === 'view') return { color: 'purple', text: '视图' }
  if (k === 'sql') return { color: 'cyan', text: 'SQL' }
  if (k) return { color: 'arcoblue', text: '表' }
  return null
}
function toggle(t) {
  t.on = !t.on
  Message[t.on ? 'success' : 'warning'](`工具 ${t.name} 已${t.on ? '启用' : '停用'}（模拟）`)
}
function openDrawer(t) {
  current.value = t
  readsEditing.value = false
  drawerVisible.value = true
}
function startEditReads() {
  readsDraft.value = [...(current.value?.reads || []), ...pendingOf(current.value).map((d) => d.id)]
  readsEditing.value = true
}
function readsResultText({ requested, withdrawn }) {
  const parts = []
  if (requested) parts.push(`已提交 ${requested} 个读取申请，等待数据集负责人审批`)
  if (withdrawn) parts.push(`已撤回 ${withdrawn} 个读取`)
  return parts.join('；')
}
function saveReads() {
  const res = requestToolReads(current.value, readsDraft.value)
  readsEditing.value = false
  Message.success(readsResultText(res) || '读取的数据集没有变化')
}
function openReadDataset(d) {
  drawerVisible.value = false
  store.datasetFlt.sourceId = d.data_source_id
  emit('goto', 'datasets')
}
function gotoPerm(t) {
  drawerVisible.value = false
  store.securityFlt.kw = t?.dataset?.displayName || ''
  emit('goto', 'security')
}
function openDataset(t) {
  if (!t?.dataset?.datasetId) return
  drawerVisible.value = false
  const ds = store.datasets.find((d) => d.id === t.dataset.datasetId)
  if (ds) {
    store.datasetFlt.sourceId = ds.data_source_id
    store.studioDatasetId = ds.id
  }
  emit('goto', 'datasets')
}
function debugTool(t) {
  const svc = store.services.find((s) => s.id === t.svc)
  openPlayground({
    endpoint: svc?.endpoint,
    proto: svc?.proto,
    toolName: t.name,
    apiKey: keyForEndpoint(svc?.endpoint),
  })
}
const DAYS = 30
const dayLabels = computed(() => {
  const end = new Date()
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(end)
    d.setDate(d.getDate() - (DAYS - 1 - i))
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
})
function series30(seed) {
  const src = seed?.length ? seed : [0]
  const first = src[0]
  const last = src[src.length - 1]
  return Array.from({ length: DAYS }, (_, i) => {
    const t = DAYS === 1 ? 1 : i / (DAYS - 1)
    const si = Math.min(src.length - 1, Math.floor(t * (src.length - 1)))
    const base = src[si] * 0.35 + first * (1 - t) + last * t * 0.65
    const wave = Math.sin(i / 3.6) * (last || 1) * 0.08
    return Math.max(0, Math.round(base + wave))
  })
}

function openRegister() {
  form.name = ''
  form.cn = ''
  form.svc = upstreamServices.value[0]?.id
  form.sector = ''
  form.version = 'v1.0.0'
  form.on = true
  form.desc = ''
  form.schema = SCHEMA_TPL
  form.reads = []
  toolVisible.value = true
}

function submitTool() {
  const name = form.name.trim(), cn = form.cn.trim()
  if (!/^[a-z][a-z0-9_]*$/.test(name)) { Message.warning('工具名称需为 snake_case（小写字母/数字/下划线）'); return false }
  if (store.tools.some((t) => t.name === name)) { Message.warning(`工具 ${name} 已存在`); return false }
  if (!cn) { Message.warning('请填写中文名称'); return false }
  if (!form.svc) { Message.warning('请选择所属服务'); return false }
  let schema
  try { schema = JSON.parse(form.schema) } catch { Message.warning('inputSchema 不是合法 JSON，请检查'); return false }
  store.tools.push({
    name, cn, svc: form.svc, sector: form.sector || '', version: form.version.trim() || 'v1.0.0',
    desc: form.desc.trim() || '（暂无描述）', schema,
    calls: 0, sr: 100, lat: 0, on: form.on, reads: [],
    week: [0, 0, 0, 0, 0, 0, 0], errs: [{ t: '—', code: '—', msg: '暂无错误记录' }],
  })
  const tool = store.tools[store.tools.length - 1]
  const res = requestToolReads(tool, form.reads)
  toolVisible.value = false
  const tail = res.requested ? `；${readsResultText(res)}` : ''
  Message.success(`工具 ${name} 注册成功，已加入${store.svcMeta[form.svc].n}${tail}`)
  return true
}
function gotoDatasets() {
  toolVisible.value = false
  emit('goto', 'datasets')
}
onDeactivated(() => {
  toolVisible.value = false
  drawerVisible.value = false
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>工具目录</h2>
        <div class="desc">全部已登记 MCP 工具。上游服务工具由「MCP 中心」探测或在此注册，读取数据集需向数据集负责人申请；数据集工具在「数据集 → 发布工具」生成，行列权限统一在「数据权限」配置。</div>
      </div>
      <a-button type="primary" @click="openRegister">
        <template #icon><icon-plus /></template>注册工具
      </a-button>
    </div>
    <a-card :bordered="false">
      <div class="filter-bar">
        <a-space wrap>
          <a-select v-model="store.flt.svc" :style="{ width: '200px' }" allow-search>
            <a-option value="all">所属服务：全部</a-option>
            <a-option v-for="s in store.services" :key="s.id" :value="s.id">{{ s.name }}</a-option>
          </a-select>
          <a-select v-model="store.flt.platform" :style="{ width: '180px' }" allow-search>
            <a-option value="all">所属系统：全部</a-option>
            <a-option v-for="p in platformOpts" :key="p" :value="p">{{ p }}</a-option>
          </a-select>
          <a-select v-model="store.flt.sector" :style="{ width: '160px' }" allow-search>
            <a-option value="all">标签：全部</a-option>
            <a-option v-for="k in tagOpts" :key="k" :value="k">{{ k }}</a-option>
          </a-select>
          <a-select v-model="dataFlt" :style="{ width: '160px' }">
            <a-option value="all">数据集：全部</a-option>
            <a-option value="bound">由数据集发布</a-option>
            <a-option value="reads">读取数据集</a-option>
            <a-option value="uncontrolled">有未受控读取</a-option>
            <a-option value="pending">读取待授权</a-option>
            <a-option value="none">未关联数据集</a-option>
          </a-select>
          <a-input-search v-model="store.flt.kw" allow-clear placeholder="搜索工具名 / 描述 / 表名" :style="{ width: '260px' }" />
        </a-space>
        <span class="muted">共 {{ filtered.length }} 个工具 · 点击行查看详情</span>
      </div>
      <a-table
        :data="filtered"
        :pagination="{ pageSize: 8, showTotal: true, showPageSize: true }"
        row-key="name"
        :scroll="{ x: 1100 }"
        hoverable
        stripe
        column-resizable
        @row-click="openDrawer"
      >
        <template #columns>
          <a-table-column title="工具" :width="280">
            <template #cell="{ record }">
              <div class="mono tool-name">{{ record.name }}</div>
              <div class="muted">{{ record.cn }} — {{ record.desc }}</div>
              <div v-if="record.dataset" class="muted">
                <a-tag color="green" size="small" style="margin-right: 4px">发布自</a-tag>
                <a-tag v-if="kindTag(record)" :color="kindTag(record).color" size="small" style="margin-right: 4px">{{ kindTag(record).text }}</a-tag>
                {{ record.dataset.sourceName }} · {{ record.dataset.objectName }}
              </div>
              <div v-else-if="readsOf(record).length || pendingOf(record).length" class="muted reads-line">
                <a-tag color="arcoblue" size="small">读取</a-tag>
                <a-tooltip
                  v-for="d in readsOf(record)"
                  :key="d.id"
                  :content="isReadControlled(record, d.id) ? `受控：经 ${d.sec_view.name} 按调用人用户组过滤` : `未受控：${uncontrolledReason(record, d.id)}`"
                >
                  <span :class="['read-item', { warn: !isReadControlled(record, d.id) }]">
                    {{ dsLabel(d) }}<template v-if="!isReadControlled(record, d.id)">（未受控）</template>
                  </span>
                </a-tooltip>
                <span v-for="d in pendingOf(record)" :key="'p-' + d.id" class="read-item pending">{{ dsLabel(d) }}（待授权）</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="所属服务" :width="140">
            <template #cell="{ record }">{{ store.svcMeta[record.svc]?.n }}</template>
          </a-table-column>
          <a-table-column title="标签" :width="110">
            <template #cell="{ record }">
              <a-tag v-if="record.sector" :color="tagColor(record.sector)">{{ record.sector }}</a-tag>
              <span v-else class="muted">—</span>
            </template>
          </a-table-column>
          <a-table-column title="版本" :width="90">
            <template #cell="{ record }"><a-tag color="arcoblue">{{ record.version }}</a-tag></template>
          </a-table-column>
          <a-table-column title="今日调用" :width="100" align="right">
            <template #cell="{ record }">{{ fmt(record.calls) }}</template>
          </a-table-column>
          <a-table-column title="P95 延迟" :width="100" align="right">
            <template #cell="{ record }">{{ record.lat ? record.lat + ' ms' : '—' }}</template>
          </a-table-column>
          <a-table-column title="成功率" :width="90">
            <template #cell="{ record }"><a-tag :color="srColor(record.sr)">{{ record.sr }}%</a-tag></template>
          </a-table-column>
          <a-table-column title="状态" :width="80">
            <template #cell="{ record }">
              <a-switch :model-value="record.on" @change="() => toggle(record)" @click.stop />
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="140">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click.stop="debugTool(record)">调试</a-button>
              <a-button type="text" size="mini" @click.stop="openDrawer(record)">详情</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-drawer v-model:visible="drawerVisible" :width="640" unmount-on-close :ok-text="'关闭'" :hide-cancel="true">
      <template #title>
        <a-space>
          <span class="mono">{{ current?.name }}</span>
          <a-tag v-if="current" :color="current.on ? 'green' : 'gray'" size="small">{{ current.on ? '已启用' : '已停用' }}</a-tag>
        </a-space>
      </template>
      <template v-if="current">
        <a-typography-title :heading="6">基本信息</a-typography-title>
        <a-descriptions :column="1" size="medium" bordered>
          <a-descriptions-item label="中文名称">{{ current.cn }}</a-descriptions-item>
          <a-descriptions-item label="描述">{{ current.desc }}</a-descriptions-item>
          <a-descriptions-item label="所属服务">{{ store.svcMeta[current.svc]?.n }} <span class="mono" style="font-size:12px;color:var(--color-text-3)">{{ store.services.find(s => s.id === current.svc)?.code }}</span></a-descriptions-item>
          <a-descriptions-item label="标签">
            <a-tag v-if="current.sector" :color="tagColor(current.sector)">{{ current.sector }}</a-tag>
            <span v-else class="muted">未标注</span>
          </a-descriptions-item>
          <a-descriptions-item label="版本"><a-tag color="arcoblue">{{ current.version }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="调用方式"><span class="mono" style="font-size:12px">tools/call → {{ current.name }}</span></a-descriptions-item>
          <a-descriptions-item v-if="current.dataset" label="来源数据集">
            <a-tag v-if="kindTag(current)" :color="kindTag(current).color" size="small">{{ kindTag(current).text }}</a-tag>
            <span class="mono" style="margin-left: 6px">{{ current.dataset.displayName || current.dataset.objectName }}</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="current.dataset" label="数据源">{{ current.dataset.sourceName }}</a-descriptions-item>
          <a-descriptions-item v-if="current.dataset" label="查询参数">
            <span class="mono">{{ (current.dataset.filterFields || Object.keys(current.schema?.properties || {}).filter((k) => k !== 'limit')).join(', ') || '—' }}</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="current.dataset" label="行列权限">
            <span class="muted">按调用人所在用户组实时生效，在「数据权限」统一配置</span>
          </a-descriptions-item>
        </a-descriptions>
        <a-space v-if="current.dataset" style="margin-top: 12px">
          <a-button size="small" type="primary" @click="openDataset(current)">打开数据集（修改 / 重新发布）</a-button>
          <a-button size="small" type="outline" @click="gotoPerm(current)">去数据权限</a-button>
        </a-space>
        <template v-else>
          <div class="reads-head">
            <a-typography-title :heading="6" style="margin: 20px 0 8px">读取的数据集</a-typography-title>
            <a-button v-if="!readsEditing" type="text" size="mini" @click="startEditReads">编辑</a-button>
          </div>
          <template v-if="readsEditing">
            <a-select v-model="readsDraft" :options="datasetOptions" multiple allow-search allow-clear placeholder="勾选该工具要查询的数据集" />
            <div class="muted" style="margin-top: 6px">新增的数据集需数据集负责人在「数据集 → 读取授权」批准；取消勾选会撤回申请或放弃已授权的读取。</div>
            <a-space style="margin-top: 8px">
              <a-button size="small" type="primary" @click="saveReads">提交</a-button>
              <a-button size="small" @click="readsEditing = false">取消</a-button>
            </a-space>
          </template>
          <template v-else>
            <div v-if="readRows(current).length" class="read-rows">
              <div v-for="r in readRows(current)" :key="r.status + r.d.id" class="read-row">
                <a-tag :color="READ_STATUS[r.status].color" size="small">{{ READ_STATUS[r.status].text }}</a-tag>
                <a-link class="read-name" @click="openReadDataset(r.d)">{{ dsLabel(r.d) }}</a-link>
                <div class="muted read-note">{{ r.note }}</div>
              </div>
            </div>
            <div v-else class="muted">未关联。申请读取并获批后，调用这个工具时由中间视图按调用人用户组过滤行和列。</div>
          </template>
        </template>
        <a-typography-title :heading="6" style="margin-top:20px">输入参数 Schema（inputSchema）</a-typography-title>
        <pre class="schema-pre">{{ JSON.stringify(current.schema, null, 2) }}</pre>
        <a-typography-title :heading="6" style="margin-top:20px">近 30 天调用量</a-typography-title>
        <G2LineChart :labels="dayLabels" :values="series30(current.week)" :height="220" name="调用量" />
        <a-typography-title :heading="6" style="margin-top:20px">调用统计（今日）</a-typography-title>
        <a-descriptions :column="1" size="medium">
          <a-descriptions-item label="调用量">{{ fmt(current.calls) }} 次</a-descriptions-item>
          <a-descriptions-item label="成功率"><a-tag :color="srColor(current.sr)">{{ current.sr }}%</a-tag></a-descriptions-item>
          <a-descriptions-item label="P95 延迟">{{ current.lat }} ms</a-descriptions-item>
          <a-descriptions-item label="限流策略">继承接入端 QPS 配额，无工具级限额</a-descriptions-item>
        </a-descriptions>
        <a-typography-title :heading="6" style="margin-top:20px">最近错误样例</a-typography-title>
        <div v-for="e in current.errs" :key="e.t + e.code" class="alert-row">
          <span class="tm">{{ e.t }}</span>
          <a-tag color="red" size="small">{{ e.code }}</a-tag>
          <div class="ct">{{ e.msg }}</div>
        </div>
        <a-button type="primary" long style="margin-top:16px" @click="debugTool(current)">调试该工具</a-button>
      </template>
    </a-drawer>

    <a-modal v-model:visible="toolVisible" title="注册上游服务工具" :width="760" :on-before-ok="submitTool" :ok-text="'注册'" unmount-on-close>
      <a-alert style="margin-bottom: 16px">
        这里登记上游 MCP 服务已实现的工具。要把数据表 / 视图开放成工具，请到
        <a-link @click="gotoDatasets">数据集 → 发布工具</a-link>。
      </a-alert>
      <a-form :model="form" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="工具名称（snake_case）" required><a-input v-model="form.name" placeholder="get_warehouse_receipt" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="中文名称" required><a-input v-model="form.cn" placeholder="如：仓单日报查询" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="所属服务" required>
              <a-select v-model="form.svc">
                <a-option v-for="s in upstreamServices" :key="s.id" :value="s.id">{{ s.name }}（{{ s.code }}）</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="标签（可选）">
              <a-select v-model="form.sector" allow-clear allow-create allow-search placeholder="可输入，如黑色、客户、合同">
                <a-option v-for="k in tagOpts" :key="k" :value="k">{{ k }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12"><a-form-item label="版本"><a-input v-model="form.version" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="初始状态"><a-switch v-model="form.on" /><span style="margin-left:8px;font-size:12px;color:var(--color-text-3)">启用后立即对接入端可见</span></a-form-item></a-col>
        </a-row>
        <a-form-item label="工具描述"><a-input v-model="form.desc" placeholder="一句话说明工具能力与数据口径" /></a-form-item>
        <a-form-item label="申请读取的数据集（可选）" extra="提交后由数据集负责人审批；批准后数据源自动关联到所属服务，调用时经中间视图按用户组过滤。">
          <a-select v-model="form.reads" :options="datasetOptions" multiple allow-search allow-clear placeholder="选择数据集" />
        </a-form-item>
        <a-form-item label="输入参数 Schema（inputSchema，JSON）"><a-textarea v-model="form.schema" :auto-size="{ minRows: 8, maxRows: 12 }" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.reads-head { display: flex; align-items: center; justify-content: space-between; }
.reads-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.read-item.warn { color: rgb(var(--orange-6)); }
.read-item.pending { color: var(--color-text-4); }
.read-rows { display: flex; flex-direction: column; gap: 8px; }
.read-row { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: center; }
.read-name { justify-self: start; }
.read-note { grid-column: 2; font-size: 12px; }
</style>
