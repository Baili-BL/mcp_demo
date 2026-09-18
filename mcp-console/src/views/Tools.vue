<script setup>
import { computed, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import G2LineChart from '../components/G2LineChart.vue'
import { store, SCHEMA_TPL, SECTOR_TAG, openPlayground, tagColor, platformOptions } from '../store'
import { fmt, srColor } from '../utils'

const toolVisible = ref(false)
const drawerVisible = ref(false)
const current = ref(null)
const form = reactive({
  name: '', cn: '', svc: store.services[0]?.id, sector: '', version: 'v1.0.0', on: true, desc: '', schema: SCHEMA_TPL,
})
const tagOpts = computed(() => {
  const set = new Set(Object.keys(SECTOR_TAG))
  store.tools.forEach((t) => { if (t.sector) set.add(t.sector) })
  return [...set]
})
const platformOpts = computed(() => platformOptions())

const filtered = computed(() => store.tools.filter((t) => {
  if (store.flt.svc !== 'all' && t.svc !== store.flt.svc) return false
  if (store.flt.sector !== 'all' && t.sector !== store.flt.sector) return false
  if (store.flt.platform !== 'all') {
    const src = store.services.find((s) => s.id === t.svc)?.sources || []
    if (!src.includes(store.flt.platform)) return false
  }
  const kw = store.flt.kw
  if (kw && !t.name.includes(kw) && !t.cn.includes(kw) && !t.desc.includes(kw)) return false
  return true
}))

function toggle(t) {
  t.on = !t.on
  Message[t.on ? 'success' : 'warning'](`工具 ${t.name} 已${t.on ? '启用' : '停用'}（模拟）`)
}
function openDrawer(t) { current.value = t; drawerVisible.value = true }
function debugTool(t) {
  const svc = store.services.find((s) => s.id === t.svc)
  openPlayground({
    endpoint: svc?.endpoint,
    proto: svc?.proto,
    toolName: t.name,
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

function submitTool() {
  const name = form.name.trim(), cn = form.cn.trim()
  if (!/^[a-z][a-z0-9_]*$/.test(name)) { Message.warning('工具名称需为 snake_case（小写字母/数字/下划线）'); return }
  if (store.tools.some((t) => t.name === name)) { Message.warning(`工具 ${name} 已存在`); return }
  if (!cn) { Message.warning('请填写中文名称'); return }
  let schema
  try { schema = JSON.parse(form.schema) } catch { Message.warning('inputSchema 不是合法 JSON，请检查'); return }
  store.tools.push({
    name, cn, svc: form.svc, sector: form.sector || '', version: form.version.trim() || 'v1.0.0',
    desc: form.desc.trim() || '（暂无描述）', schema, calls: 0, sr: 100, lat: 0, on: form.on,
    week: [0, 0, 0, 0, 0, 0, 0], errs: [{ t: '—', code: '—', msg: '暂无错误记录' }],
  })
  toolVisible.value = false
  Message.success(`工具 ${name} 注册成功，已加入${store.svcMeta[form.svc].n}`)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>工具目录</h2>
        <div class="desc">全部已登记 MCP 工具。工具属于某个服务；所属系统来自服务标签，可扩展（行情平台、CRM、数仓等）。</div>
      </div>
      <a-button type="primary" @click="toolVisible = true">
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
          <a-input-search v-model="store.flt.kw" allow-clear placeholder="搜索工具名 / 描述" :style="{ width: '260px' }" />
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
        </a-descriptions>
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

    <a-modal v-model:visible="toolVisible" title="注册新工具" :width="580" @ok="submitTool" :ok-text="'注册'" unmount-on-close>
      <a-form :model="form" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="工具名称 *（snake_case）"><a-input v-model="form.name" placeholder="get_warehouse_receipt" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="中文名称 *"><a-input v-model="form.cn" placeholder="如：仓单日报查询" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="所属服务 *">
              <a-select v-model="form.svc">
                <a-option v-for="s in store.services" :key="s.id" :value="s.id">{{ s.name }}（{{ s.code }}）</a-option>
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
        <a-form-item label="输入参数 Schema（inputSchema，JSON）"><a-textarea v-model="form.schema" :auto-size="{ minRows: 8, maxRows: 12 }" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
