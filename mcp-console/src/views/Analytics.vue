<script setup>
import { computed, ref } from 'vue'
import { store } from '../store'
import { srColor } from '../utils'
import G2Chart from '../components/G2Chart.vue'
import G2LineChart from '../components/G2LineChart.vue'

const emit = defineEmits(['goto'])

const range = ref(7)
const svcFlt = ref('')
const dailyDim = ref('svc')
const tableTab = ref('tool')
const focusTool = ref(null)

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEK_ORDER = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const HOUR_W = [0.6, 0.4, 0.25, 0.1, 0.06, 0.05, 0.08, 0.3, 1.2, 3.2, 3.6, 3.0, 1.1, 2.6, 3.1, 2.2, 1.4, 1.0, 0.8, 0.9, 1.2, 2.2, 2.0, 1.1]
const HOUR_SUM = HOUR_W.reduce((a, b) => a + b, 0)
const LAT_BUCKETS = ['<100ms', '100–200ms', '200–500ms', '500ms–1s', '>1s']

function hash(s) {
  let h = 2166136261
  for (const ch of String(s)) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}
function dayOf(k) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - k)
  return d
}
function mmdd(d) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toolDaily(t, k) {
  const week = t.week?.length ? t.week : [t.calls]
  const base = week[(week.length - 1 - (k % week.length) + week.length) % week.length]
  const dow = dayOf(k).getDay()
  const wk = dow === 0 || dow === 6 ? 0.42 : 1
  return Math.max(0, Math.round(base * (1 - k * 0.004) * wk * (0.92 + 0.16 * hash(t.name + k))))
}
function toolFails(t, k, calls) {
  return Math.round(calls * (100 - (t.sr ?? 100)) / 100 * (0.7 + 0.6 * hash(`${t.name}-e${k}`)))
}
function fmt(n) {
  return Number(n || 0).toLocaleString('en-US')
}
function short(n) {
  const v = Number(n || 0)
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`
  return fmt(v)
}
function pct(a, b) {
  if (!b) return null
  return ((a - b) / b) * 100
}
function deltaText(d) {
  if (d === null || !Number.isFinite(d)) return '—'
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`
}
function svcName(id) {
  return store.svcMeta[id]?.n || id
}
function svcColor(id) {
  return store.svcMeta[id]?.c || '#86909c'
}

const services = computed(() => store.services.filter((s) => store.tools.some((t) => t.svc === s.id)))
const tools = computed(() => store.tools.filter((t) => !svcFlt.value || t.svc === svcFlt.value))
const days = computed(() => Array.from({ length: range.value }, (_, i) => range.value - 1 - i))

const toolStats = computed(() => tools.value.map((t) => {
  let calls = 0
  let prev = 0
  let fails = 0
  const daily = days.value.map((k) => {
    const v = t.on === false ? 0 : toolDaily(t, k)
    calls += v
    fails += toolFails(t, k, v)
    return v
  })
  for (let k = range.value; k < range.value * 2; k++) prev += t.on === false ? 0 : toolDaily(t, k)
  return {
    name: t.name,
    cn: t.cn,
    svc: t.svc,
    sector: t.sector || '其他',
    on: t.on !== false,
    lat: t.lat || 0,
    calls,
    prev,
    fails,
    sr: calls ? ((calls - fails) / calls) * 100 : 100,
    delta: pct(calls, prev),
    avg: Math.round(calls / range.value),
    daily,
  }
}))

const total = computed(() => toolStats.value.reduce((a, t) => a + t.calls, 0))
const prevTotal = computed(() => toolStats.value.reduce((a, t) => a + t.prev, 0))
const totalFails = computed(() => toolStats.value.reduce((a, t) => a + t.fails, 0))
const dailyTotals = computed(() => days.value.map((k, i) => ({
  k,
  date: mmdd(dayOf(k)),
  week: WEEK[dayOf(k).getDay()],
  value: toolStats.value.reduce((a, t) => a + t.daily[i], 0),
})))
const peakDay = computed(() => dailyTotals.value.reduce((m, d) => (d.value > (m?.value ?? -1) ? d : m), null))
const activeTools = computed(() => toolStats.value.filter((t) => t.calls > 0).length)
const avgLat = computed(() => {
  const w = toolStats.value.reduce((a, t) => a + t.calls, 0) || 1
  return Math.round(toolStats.value.reduce((a, t) => a + t.lat * t.calls, 0) / w)
})

const kpis = computed(() => [
  { title: '调用总量', value: short(total.value), foot: `环比上一周期 ${deltaText(pct(total.value, prevTotal.value))}`, up: total.value >= prevTotal.value, tone: 'tone-blue', icon: 'icon-bar-chart' },
  { title: '日均调用', value: short(Math.round(total.value / range.value)), foot: peakDay.value ? `峰值 ${peakDay.value.date}（${peakDay.value.week}）${short(peakDay.value.value)} 次` : '—', tone: 'tone-cyan', icon: 'icon-calendar' },
  { title: '调用成功率', value: `${total.value ? (((total.value - totalFails.value) / total.value) * 100).toFixed(2) : '100.00'}%`, foot: `失败 ${fmt(totalFails.value)} 次 · 平均延迟 ${avgLat.value} ms`, tone: 'tone-green', icon: 'icon-check-circle' },
  { title: '活跃工具', value: `${activeTools.value} / ${toolStats.value.length}`, foot: `覆盖 ${new Set(toolStats.value.filter((t) => t.calls).map((t) => t.svc)).size} 个服务`, tone: 'tone-orange', icon: 'icon-tool' },
])

const dailyOptions = computed(() => {
  const data = []
  if (dailyDim.value === 'svc') {
    days.value.forEach((k, i) => {
      const date = mmdd(dayOf(k))
      const bySvc = {}
      toolStats.value.forEach((t) => { bySvc[t.svc] = (bySvc[t.svc] || 0) + t.daily[i] })
      Object.entries(bySvc).forEach(([svc, value]) => data.push({ date, group: svcName(svc), value }))
    })
  } else {
    days.value.forEach((k, i) => {
      const date = mmdd(dayOf(k))
      let ok = 0
      let bad = 0
      toolStats.value.forEach((t) => {
        const f = toolFails(store.tools.find((x) => x.name === t.name), k, t.daily[i])
        bad += f
        ok += t.daily[i] - f
      })
      data.push({ date, group: '成功', value: ok }, { date, group: '失败', value: bad })
    })
  }
  const groups = dailyDim.value === 'svc' ? [...new Set(toolStats.value.map((t) => t.svc))] : null
  return {
    type: 'interval',
    data,
    encode: { x: 'date', y: 'value', color: 'group' },
    transform: [{ type: 'stackY' }],
    scale: {
      color: groups
        ? { domain: groups.map(svcName), range: groups.map(svcColor) }
        : { domain: ['成功', '失败'], range: ['#165dff', '#f53f3f'] },
      x: { padding: range.value > 14 ? 0.25 : 0.45 },
    },
    axis: {
      x: { title: false, labelAutoHide: true },
      y: { title: false, labelFormatter: (v) => short(v) },
    },
    legend: { color: { position: 'top', layout: { justifyContent: 'flex-start' } } },
    tooltip: { items: [{ channel: 'y', valueFormatter: (v) => `${fmt(v)} 次` }] },
    style: { radiusTopLeft: 2, radiusTopRight: 2 },
  }
})

const svcStats = computed(() => {
  const map = new Map()
  toolStats.value.forEach((t) => {
    const s = map.get(t.svc) || { id: t.svc, name: svcName(t.svc), color: svcColor(t.svc), tools: 0, active: 0, calls: 0, prev: 0, fails: 0, latW: 0 }
    s.tools += 1
    if (t.calls) s.active += 1
    s.calls += t.calls
    s.prev += t.prev
    s.fails += t.fails
    s.latW += t.lat * t.calls
    map.set(t.svc, s)
  })
  return [...map.values()].map((s) => {
    const toolNames = new Set(store.tools.filter((t) => t.svc === s.id).map((t) => t.name))
    const tsIds = store.toolsets.filter((ts) => (ts.tools || []).some((n) => toolNames.has(n))).map((ts) => ts.id)
    const clients = store.clients.filter((c) => (c.toolsetIds || []).some((id) => tsIds.includes(id)))
    const svc = store.services.find((x) => x.id === s.id)
    return {
      ...s,
      share: total.value ? (s.calls / total.value) * 100 : 0,
      delta: pct(s.calls, s.prev),
      sr: s.calls ? ((s.calls - s.fails) / s.calls) * 100 : 100,
      lat: s.calls ? Math.round(s.latW / s.calls) : 0,
      clients: clients.length,
      health: svc?.health || 'healthy',
      topTool: [...toolStats.value].filter((t) => t.svc === s.id).sort((a, b) => b.calls - a.calls)[0]?.name || '—',
    }
  }).sort((a, b) => b.calls - a.calls)
})

const svcDonutOptions = computed(() => ({
  type: 'interval',
  data: svcStats.value.map((s) => ({ name: s.name, value: s.calls })),
  encode: { y: 'value', color: 'name' },
  transform: [{ type: 'stackY' }],
  coordinate: { type: 'theta', innerRadius: 0.62, outerRadius: 0.9 },
  scale: { color: { domain: svcStats.value.map((s) => s.name), range: svcStats.value.map((s) => s.color) } },
  legend: false,
  style: { stroke: '#fff', lineWidth: 2 },
  tooltip: { items: [{ channel: 'y', valueFormatter: (v) => `${fmt(v)} 次（${total.value ? ((v / total.value) * 100).toFixed(1) : 0}%）` }] },
}))

const heatData = computed(() => {
  const byWeek = {}
  dailyTotals.value.forEach((d) => {
    const w = byWeek[d.week] || { sum: 0, n: 0 }
    w.sum += d.value
    w.n += 1
    byWeek[d.week] = w
  })
  const out = []
  WEEK_ORDER.forEach((w) => {
    const avg = byWeek[w] ? byWeek[w].sum / byWeek[w].n : 0
    HOUR_W.forEach((hw, h) => {
      out.push({ week: w, hour: `${String(h).padStart(2, '0')}时`, value: Math.round((avg * hw) / HOUR_SUM * (0.9 + 0.2 * hash(`${w}${h}`))) })
    })
  })
  return out
})
const peakHour = computed(() => {
  const byHour = {}
  heatData.value.forEach((d) => { byHour[d.hour] = (byHour[d.hour] || 0) + d.value })
  const sorted = Object.entries(byHour).sort((a, b) => b[1] - a[1])
  return sorted.slice(0, 3).map(([h]) => h)
})
const heatOptions = computed(() => ({
  type: 'cell',
  data: heatData.value,
  encode: { x: 'hour', y: 'week', color: 'value' },
  scale: {
    y: { domain: WEEK_ORDER },
    color: { type: 'linear', range: ['#f2f7ff', '#165dff'] },
  },
  style: { inset: 1.5, radius: 2 },
  axis: {
    x: { title: false, labelAutoHide: true, tick: false },
    y: { title: false, tick: false },
  },
  legend: false,
  tooltip: { title: (d) => `${d.week} ${d.hour}`, items: [{ channel: 'color', name: '平均调用', valueFormatter: (v) => `${fmt(v)} 次` }] },
}))

const latOptions = computed(() => {
  const counts = LAT_BUCKETS.map(() => 0)
  toolStats.value.forEach((t) => {
    const i = t.lat < 100 ? 0 : t.lat < 200 ? 1 : t.lat < 500 ? 2 : t.lat < 1000 ? 3 : 4
    counts[i] += t.calls * 0.64
    if (i > 0) counts[i - 1] += t.calls * 0.22
    else counts[i] += t.calls * 0.22
    if (i < 4) counts[i + 1] += t.calls * 0.14
    else counts[i] += t.calls * 0.14
  })
  return {
    type: 'interval',
    data: LAT_BUCKETS.map((b, i) => ({ bucket: b, value: Math.round(counts[i]), level: i })),
    encode: { x: 'bucket', y: 'value', color: 'bucket' },
    scale: { x: { domain: LAT_BUCKETS, padding: 0.35 }, color: { domain: LAT_BUCKETS, range: ['#00b42a', '#7bc616', '#f7ba1e', '#f77234', '#f53f3f'] } },
    axis: { x: { title: false }, y: { title: false, labelFormatter: (v) => short(v) } },
    legend: false,
    labels: [{ text: (d) => `${total.value ? ((d.value / total.value) * 100).toFixed(0) : 0}%`, position: 'inside', style: { fontSize: 11, fill: '#fff', fontWeight: 600 } }],
    tooltip: { items: [{ channel: 'y', name: '调用', valueFormatter: (v) => `${fmt(v)} 次` }] },
    style: { radiusTopLeft: 3, radiusTopRight: 3 },
  }
})

const topTools = computed(() => [...toolStats.value].sort((a, b) => b.calls - a.calls).slice(0, 10))
const topOptions = computed(() => ({
  type: 'interval',
  data: topTools.value.map((t) => ({ name: t.name, value: t.calls, svc: svcName(t.svc) })),
  encode: { x: 'name', y: 'value', color: 'svc' },
  coordinate: { transform: [{ type: 'transpose' }] },
  scale: {
    x: { domain: topTools.value.map((t) => t.name), padding: 0.3 },
    color: { domain: services.value.map((s) => svcName(s.id)), range: services.value.map((s) => svcColor(s.id)) },
  },
  axis: { x: { title: false, tick: false }, y: false },
  legend: false,
  labels: [{ text: (d) => short(d.value), position: 'inside', style: { fontSize: 11, fill: '#fff', fontWeight: 600 } }],
  tooltip: { items: [{ channel: 'y', name: '调用', valueFormatter: (v) => `${fmt(v)} 次` }] },
  style: { radiusTopRight: 3, radiusBottomRight: 3 },
}))

const sectorOptions = computed(() => {
  const map = {}
  toolStats.value.forEach((t) => { map[t.sector] = (map[t.sector] || 0) + t.calls })
  const data = Object.entries(map).map(([sector, value]) => ({ sector, value })).sort((a, b) => b.value - a.value)
  return {
    type: 'interval',
    data,
    encode: { x: 'sector', y: 'value' },
    scale: { x: { domain: data.map((d) => d.sector), padding: 0.4 } },
    axis: { x: { title: false }, y: { title: false, labelFormatter: (v) => short(v) } },
    labels: [{ text: (d) => short(d.value), position: 'inside', style: { fontSize: 11, fill: '#fff', fontWeight: 600 } }],
    tooltip: { items: [{ channel: 'y', name: '调用', valueFormatter: (v) => `${fmt(v)} 次` }] },
    style: { fill: '#722ed1', fillOpacity: 0.85, radiusTopLeft: 3, radiusTopRight: 3 },
  }
})

const clientStats = computed(() => {
  const toolNames = new Set(toolStats.value.map((t) => t.name))
  const list = store.clients
    .filter((c) => c.status !== 'revoked')
    .map((c) => {
      const ts = store.toolsets.filter((x) => (c.toolsetIds || []).includes(x.id))
      const reach = new Set(ts.flatMap((x) => x.tools || []).filter((n) => toolNames.has(n)))
      return { ...c, reach: reach.size, weight: reach.size ? c.calls : 0, toolsetNames: ts.map((x) => x.name) }
    })
    .filter((c) => c.reach > 0)
  const wsum = list.reduce((a, c) => a + c.weight, 0) || 1
  return list.map((c) => {
    const u = store.users.find((x) => x.id === c.userId)
    const calls = Math.round((c.weight / wsum) * total.value)
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      tag: c.tag,
      user: u?.name || '—',
      team: u?.team || '',
      toolsets: c.toolsetNames,
      reach: c.reach,
      calls,
      share: total.value ? (calls / total.value) * 100 : 0,
      quota: c.quota,
      quotaUse: c.quota ? Math.min(100, ((calls / range.value) / (c.quota / 30)) * 100) : 0,
      status: c.status,
    }
  }).sort((a, b) => b.calls - a.calls)
})

const focus = computed(() => toolStats.value.find((t) => t.name === focusTool.value) || null)
const focusLabels = computed(() => days.value.map((k) => mmdd(dayOf(k))))
const focusClients = computed(() => {
  if (!focus.value) return []
  const tsIds = store.toolsets.filter((ts) => (ts.tools || []).includes(focus.value.name)).map((ts) => ts.id)
  return store.clients.filter((c) => (c.toolsetIds || []).some((id) => tsIds.includes(id)))
})
const focusTop = computed(() => {
  if (!focus.value) return null
  const i = focus.value.daily.indexOf(Math.max(...focus.value.daily))
  return { date: focusLabels.value[i], value: focus.value.daily[i] }
})
const focusRank = computed(() => (focus.value ? [...toolStats.value].sort((a, b) => b.calls - a.calls).findIndex((t) => t.name === focus.value.name) + 1 : 0))

function openTool(name) {
  focusTool.value = name
}
function deltaColor(d) {
  if (d === null) return 'gray'
  return d >= 0 ? 'green' : 'red'
}

function exportCsv() {
  const head = ['工具', '中文名', '所属服务', '板块', '调用量', '占比', '环比', '日均', '成功率', '平均延迟(ms)']
  const lines = [...toolStats.value].sort((a, b) => b.calls - a.calls).map((t) => [
    t.name, t.cn, svcName(t.svc), t.sector, t.calls,
    `${(total.value ? (t.calls / total.value) * 100 : 0).toFixed(2)}%`,
    deltaText(t.delta), t.avg, `${t.sr.toFixed(2)}%`, t.lat,
  ])
  const csv = [head, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `工具调用分析_近${range.value}天.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="analytics">
    <div class="page-head">
      <div>
        <h2>数据分析</h2>
        <div class="desc">按天统计 MCP 调用量与分布，从工具、服务、接入端三个维度看谁在用、用得多不多、用得好不好。</div>
      </div>
      <a-space>
        <a-select v-model="svcFlt" :style="{ width: '180px' }" placeholder="全部服务" allow-clear>
          <a-option value="">全部服务</a-option>
          <a-option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</a-option>
        </a-select>
        <a-radio-group v-model="range" type="button">
          <a-radio :value="7">近 7 天</a-radio>
          <a-radio :value="14">近 14 天</a-radio>
          <a-radio :value="30">近 30 天</a-radio>
        </a-radio-group>
      </a-space>
    </div>

    <a-row :gutter="16">
      <a-col v-for="k in kpis" :key="k.title" :xs="12" :md="6" style="margin-bottom: 16px">
        <a-card :class="['stat-card', k.tone]" :bordered="false">
          <div class="stat-ico"><component :is="k.icon" /></div>
          <div class="arco-statistic">
            <div class="arco-statistic-title">{{ k.title }}</div>
            <div class="arco-statistic-content">
              <div class="arco-statistic-value"><span class="arco-statistic-value-integer">{{ k.value }}</span></div>
            </div>
          </div>
          <div class="stat-foot" :class="{ up: k.up === true, down: k.up === false }">{{ k.foot }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="16" style="margin-bottom: 16px">
        <a-card :bordered="false" title="每日调用次数">
          <template #extra>
            <a-radio-group v-model="dailyDim" type="button" size="small">
              <a-radio value="svc">按服务</a-radio>
              <a-radio value="status">按成功 / 失败</a-radio>
            </a-radio-group>
          </template>
          <G2Chart :options="dailyOptions" :height="280" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8" style="margin-bottom: 16px">
        <a-card :bordered="false" title="服务调用占比">
          <div class="donut-wrap">
            <G2Chart :options="svcDonutOptions" :height="200" />
            <div class="donut-center">
              <strong>{{ short(total) }}</strong>
              <span>近 {{ range }} 天调用</span>
            </div>
          </div>
          <div v-for="s in svcStats" :key="s.id" class="legend-row">
            <i :style="{ background: s.color }"></i>
            <span class="lg-name">{{ s.name }}</span>
            <span class="lg-val">{{ short(s.calls) }}</span>
            <span class="lg-pct">{{ s.share.toFixed(1) }}%</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="16" style="margin-bottom: 16px">
        <a-card :bordered="false" title="调用时段分布">
          <template #extra>
            <span class="muted">高峰时段：{{ peakHour.join('、') }} · 按星期 × 小时的日均调用</span>
          </template>
          <G2Chart :options="heatOptions" :height="250" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8" style="margin-bottom: 16px">
        <a-card :bordered="false" title="响应延迟分布">
          <template #extra><span class="muted">加权平均 {{ avgLat }} ms</span></template>
          <G2Chart :options="latOptions" :height="250" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="12" style="margin-bottom: 16px">
        <a-card :bordered="false" title="工具调用 Top 10">
          <template #extra><span class="muted">点击下方明细查看单个工具趋势</span></template>
          <G2Chart :options="topOptions" :height="300" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12" style="margin-bottom: 16px">
        <a-card :bordered="false" title="板块调用分布">
          <G2Chart :options="sectorOptions" :height="300" />
        </a-card>
      </a-col>
    </a-row>

    <a-card :bordered="false" class="detail-card">
      <a-tabs v-model:active-key="tableTab">
        <template #extra>
          <a-button v-if="tableTab === 'tool'" size="small" @click="exportCsv">
            <template #icon><icon-download /></template>导出 CSV
          </a-button>
        </template>
        <a-tab-pane key="tool" :title="`工具分析（${toolStats.length}）`">
          <a-table :data="[...toolStats].sort((a, b) => b.calls - a.calls)" :pagination="{ pageSize: 10, size: 'small' }" row-key="name" hoverable size="small" @row-click="(r) => openTool(r.name)">
            <template #columns>
              <a-table-column title="工具" :width="240">
                <template #cell="{ record }">
                  <div class="mono tool-name">{{ record.name }}</div>
                  <div class="muted tiny">{{ record.cn }}<a-tag v-if="!record.on" size="small" color="gray" style="margin-left:6px">已停用</a-tag></div>
                </template>
              </a-table-column>
              <a-table-column title="所属服务" :width="150">
                <template #cell="{ record }"><span class="svc-dot" :style="{ background: svcColor(record.svc) }"></span>{{ svcName(record.svc) }}</template>
              </a-table-column>
              <a-table-column title="板块" data-index="sector" :width="90" />
              <a-table-column title="调用量" data-index="calls" align="right" :width="110" :sortable="{ sortDirections: ['descend', 'ascend'] }">
                <template #cell="{ record }">{{ fmt(record.calls) }}</template>
              </a-table-column>
              <a-table-column title="占比" :width="160">
                <template #cell="{ record }">
                  <div class="share">
                    <a-progress :percent="total ? record.calls / total : 0" :show-text="false" size="small" />
                    <span>{{ (total ? (record.calls / total) * 100 : 0).toFixed(1) }}%</span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="环比" data-index="delta" align="right" :width="100" :sortable="{ sortDirections: ['descend', 'ascend'] }">
                <template #cell="{ record }"><span :class="['delta', deltaColor(record.delta)]">{{ deltaText(record.delta) }}</span></template>
              </a-table-column>
              <a-table-column title="日均" data-index="avg" align="right" :width="90">
                <template #cell="{ record }">{{ fmt(record.avg) }}</template>
              </a-table-column>
              <a-table-column title="成功率" data-index="sr" align="right" :width="100" :sortable="{ sortDirections: ['ascend', 'descend'] }">
                <template #cell="{ record }"><a-tag size="small" :color="srColor(record.sr)">{{ record.sr.toFixed(2) }}%</a-tag></template>
              </a-table-column>
              <a-table-column title="平均延迟" data-index="lat" align="right" :width="100" :sortable="{ sortDirections: ['descend', 'ascend'] }">
                <template #cell="{ record }">{{ record.lat }} ms</template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="svc" :title="`服务分析（${svcStats.length}）`">
          <a-table :data="svcStats" :pagination="false" row-key="id" hoverable size="small">
            <template #columns>
              <a-table-column title="服务" :width="180">
                <template #cell="{ record }"><span class="svc-dot" :style="{ background: record.color }"></span>{{ record.name }}</template>
              </a-table-column>
              <a-table-column title="活跃工具" :width="100" align="right">
                <template #cell="{ record }">{{ record.active }} / {{ record.tools }}</template>
              </a-table-column>
              <a-table-column title="调用量" align="right" :width="110">
                <template #cell="{ record }">{{ fmt(record.calls) }}</template>
              </a-table-column>
              <a-table-column title="占比" :width="160">
                <template #cell="{ record }">
                  <div class="share">
                    <a-progress :percent="record.share / 100" :show-text="false" size="small" :color="record.color" />
                    <span>{{ record.share.toFixed(1) }}%</span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="环比" align="right" :width="90">
                <template #cell="{ record }"><span :class="['delta', deltaColor(record.delta)]">{{ deltaText(record.delta) }}</span></template>
              </a-table-column>
              <a-table-column title="成功率" align="right" :width="100">
                <template #cell="{ record }"><a-tag size="small" :color="srColor(record.sr)">{{ record.sr.toFixed(2) }}%</a-tag></template>
              </a-table-column>
              <a-table-column title="平均延迟" align="right" :width="100">
                <template #cell="{ record }">{{ record.lat }} ms</template>
              </a-table-column>
              <a-table-column title="接入端" align="right" :width="80" data-index="clients" />
              <a-table-column title="调用最多的工具" :width="200">
                <template #cell="{ record }">
                  <a-link v-if="record.topTool !== '—'" class="mono" @click="openTool(record.topTool)">{{ record.topTool }}</a-link>
                  <span v-else>—</span>
                </template>
              </a-table-column>
              <a-table-column title="健康" :width="90">
                <template #cell="{ record }">
                  <a-tag size="small" :color="record.health === 'healthy' ? 'green' : record.health === 'degraded' ? 'orange' : 'red'">
                    {{ record.health === 'healthy' ? '健康' : record.health === 'degraded' ? '降级' : '异常' }}
                  </a-tag>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="client" :title="`接入端分析（${clientStats.length}）`">
          <a-table :data="clientStats" :pagination="false" row-key="id" hoverable size="small">
            <template #columns>
              <a-table-column title="接入端" :width="180">
                <template #cell="{ record }">
                  <div>{{ record.name }}</div>
                  <div class="muted tiny">{{ record.type }}</div>
                </template>
              </a-table-column>
              <a-table-column title="归属用户" :width="140">
                <template #cell="{ record }">{{ record.user }}<span v-if="record.team" class="muted tiny"> · {{ record.team }}</span></template>
              </a-table-column>
              <a-table-column title="可用工具集">
                <template #cell="{ record }">
                  <a-space :size="4" wrap>
                    <a-tag v-for="n in record.toolsets" :key="n" size="small">{{ n }}</a-tag>
                  </a-space>
                </template>
              </a-table-column>
              <a-table-column title="可调工具" data-index="reach" align="right" :width="90" />
              <a-table-column title="调用量" align="right" :width="110">
                <template #cell="{ record }">{{ fmt(record.calls) }}</template>
              </a-table-column>
              <a-table-column title="占比" :width="150">
                <template #cell="{ record }">
                  <div class="share">
                    <a-progress :percent="record.share / 100" :show-text="false" size="small" />
                    <span>{{ record.share.toFixed(1) }}%</span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="配额使用" :width="150">
                <template #cell="{ record }">
                  <div class="share">
                    <a-progress :percent="record.quotaUse / 100" :show-text="false" size="small" :status="record.quotaUse > 80 ? 'danger' : record.quotaUse > 60 ? 'warning' : 'normal'" />
                    <span>{{ record.quotaUse.toFixed(0) }}%</span>
                  </div>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div class="muted tiny" style="margin-top:8px">配额使用 = 区间日均调用 ÷（月配额 ÷ 30）。</div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-drawer :visible="!!focus" :width="640" :footer="false" unmount-on-close @cancel="focusTool = null">
      <template #title>
        <span class="mono">{{ focus?.name }}</span>
        <span class="muted" style="margin-left:8px;font-weight:400">{{ focus?.cn }}</span>
      </template>
      <template v-if="focus">
        <div class="f-kpis">
          <div><span>近 {{ range }} 天调用</span><strong>{{ fmt(focus.calls) }}</strong></div>
          <div><span>环比</span><strong :class="['delta', deltaColor(focus.delta)]">{{ deltaText(focus.delta) }}</strong></div>
          <div><span>排名</span><strong>第 {{ focusRank }} / {{ toolStats.length }}</strong></div>
          <div><span>成功率</span><strong>{{ focus.sr.toFixed(2) }}%</strong></div>
        </div>
        <div class="f-sec">
          <div class="f-hd">
            每日调用
            <span class="muted tiny">峰值 {{ focusTop?.date }} · {{ fmt(focusTop?.value) }} 次</span>
          </div>
          <G2LineChart :labels="focusLabels" :values="focus.daily" :height="220" :color="svcColor(focus.svc)" />
        </div>
        <div class="f-sec">
          <div class="f-hd">基本信息</div>
          <a-descriptions :column="2" size="small" bordered>
            <a-descriptions-item label="所属服务">{{ svcName(focus.svc) }}</a-descriptions-item>
            <a-descriptions-item label="板块">{{ focus.sector }}</a-descriptions-item>
            <a-descriptions-item label="日均调用">{{ fmt(focus.avg) }}</a-descriptions-item>
            <a-descriptions-item label="平均延迟">{{ focus.lat }} ms</a-descriptions-item>
            <a-descriptions-item label="失败次数">{{ fmt(focus.fails) }}</a-descriptions-item>
            <a-descriptions-item label="服务内占比">
              {{ (() => { const s = svcStats.find((x) => x.id === focus.svc); return s && s.calls ? ((focus.calls / s.calls) * 100).toFixed(1) + '%' : '—' })() }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
        <div class="f-sec">
          <div class="f-hd">可调用该工具的接入端（{{ focusClients.length }}）</div>
          <div v-if="!focusClients.length" class="muted">暂无接入端开通了包含该工具的工具集。</div>
          <div v-for="c in focusClients" :key="c.id" class="f-client">
            <span>{{ c.name }}</span>
            <span class="muted tiny">{{ store.users.find((u) => u.id === c.userId)?.name || '—' }}</span>
          </div>
        </div>
        <a-space>
          <a-button @click="emit('goto', 'tools'); focusTool = null">前往工具目录</a-button>
          <a-button @click="emit('goto', 'monitor'); focusTool = null">查看调用监控</a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.muted { color: var(--color-text-3); font-size: 12px; }
.tiny { font-size: 12px; }
.stat-foot.up { color: #00b42a; }
.stat-foot.down { color: #f53f3f; }
.donut-wrap { position: relative; }
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.donut-center strong { font-size: 20px; font-family: Menlo, Consolas, monospace; color: #1d2129; }
.donut-center span { font-size: 12px; color: var(--color-text-3); }
.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--color-border-2);
}
.legend-row:last-child { border-bottom: none; }
.legend-row i { width: 8px; height: 8px; border-radius: 2px; flex: none; }
.lg-name { flex: 1; color: var(--color-text-2); }
.lg-val { font-family: Menlo, Consolas, monospace; }
.lg-pct { width: 48px; text-align: right; color: var(--color-text-3); font-size: 12px; }
.tool-name { color: rgb(var(--primary-6)); font-size: 12px; }
.svc-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }
.share { display: flex; align-items: center; gap: 8px; }
.share :deep(.arco-progress) { flex: 1; }
.share span { width: 44px; text-align: right; font-size: 12px; color: var(--color-text-2); }
.delta { font-family: Menlo, Consolas, monospace; font-size: 12px; }
.delta.green { color: #00b42a; }
.delta.red { color: #f53f3f; }
.delta.gray { color: var(--color-text-3); }
.detail-card :deep(.arco-table-tr) { cursor: pointer; }
.f-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.f-kpis > div {
  background: var(--color-fill-1);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.f-kpis span { font-size: 12px; color: var(--color-text-3); }
.f-kpis strong { font-size: 18px; font-family: Menlo, Consolas, monospace; }
.f-sec { margin-bottom: 18px; }
.f-hd { font-weight: 600; margin-bottom: 8px; display: flex; align-items: baseline; gap: 10px; }
.f-client {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-border-2);
  font-size: 13px;
}
</style>
