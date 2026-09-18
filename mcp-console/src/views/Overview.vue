<script setup>
import { computed } from 'vue'
import { store, totalCalls, weightedSR, openAlertCount } from '../store'
import { fmt } from '../utils'
import LineChart from '../components/LineChart.vue'

const emit = defineEmits(['goto'])
const onSvc = computed(() => store.services.filter((s) => s.health === 'healthy').length)
const onTools = computed(() => store.tools.filter((t) => t.on).length)
const top = computed(() => {
  const list = [...store.tools].sort((a, b) => b.calls - a.calls).slice(0, 10)
  const mx = list[0]?.calls || 1
  return list.map((t) => ({ ...t, pct: (t.calls / mx) * 100 }))
})
const stColor = (st) => (st === '未处理' ? 'red' : st === '已确认' ? 'arcoblue' : 'gray')
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>概览</h2>
        <div class="desc">MCP 数据面运行全貌：服务健康、工具目录、调用与告警</div>
      </div>
      <a-button type="outline" @click="emit('goto', 'sequence')">
        <template #icon><icon-mind-mapping /></template>时序图
      </a-button>
    </div>
    <a-row :gutter="16" style="margin-bottom: 8px">
      <a-col :xs="24" :sm="12" :lg="8" :flex="1" style="margin-bottom: 16px; min-width: 180px">
        <a-card class="stat-card" :bordered="false" hoverable @click="emit('goto', 'services')">
          <a-statistic title="在线服务" :value="onSvc" :value-style="{ fontWeight: 600 }">
            <template #suffix><span style="font-size:15px;color:var(--color-text-3)"> / {{ store.services.length }}</span></template>
          </a-statistic>
          <div class="stat-foot"><a-badge status="warning" /> 研报知识服务降级中</div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="8" :flex="1" style="margin-bottom: 16px; min-width: 180px">
        <a-card class="stat-card" :bordered="false" hoverable @click="emit('goto', 'tools')">
          <a-statistic title="注册工具" :value="store.tools.length" />
          <div class="stat-foot"><a-badge status="success" /> 启用 {{ onTools }} · 停用 {{ store.tools.length - onTools }}</div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="8" :flex="1" style="margin-bottom: 16px; min-width: 180px">
        <a-card class="stat-card" :bordered="false" hoverable @click="emit('goto', 'monitor')">
          <a-statistic title="今日调用量" :value="totalCalls()" :value-style="{ fontWeight: 600 }" />
          <div class="stat-foot">较昨日 <span class="up">▲ 8.6%</span></div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="8" :flex="1" style="margin-bottom: 16px; min-width: 180px">
        <a-card class="stat-card" :bordered="false" hoverable @click="emit('goto', 'monitor')">
          <a-statistic title="调用成功率" :precision="1" :value="weightedSR()" suffix="%" />
          <div class="stat-foot">SLA 目标 ≥ 99.0%</div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="8" :flex="1" style="margin-bottom: 16px; min-width: 180px">
        <a-card class="stat-card" :bordered="false" hoverable @click="emit('goto', 'monitor')">
          <a-statistic title="P95 延迟" :value="486" suffix="ms" />
          <div class="stat-foot">较昨日 <span class="up">▼ 32ms</span></div>
        </a-card>
      </a-col>
    </a-row>
    <a-row :gutter="16">
      <a-col :xs="24" :lg="16" style="margin-bottom: 16px">
        <a-card title="24 小时调用趋势" :bordered="false">
          <template #extra>
            <a-button type="text" size="mini" @click="emit('goto', 'monitor')">查看监控</a-button>
          </template>
          <LineChart :labels="store.trend.labels" :series="store.trend.series" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8" style="margin-bottom: 16px">
        <a-card title="工具调用 Top 10" :bordered="false">
          <template #extra><span class="muted">今日累计</span></template>
          <div v-for="t in top" :key="t.name" class="hbar" @click="emit('goto', 'tools')">
            <span class="nm" :title="t.name">{{ t.name }}</span>
            <span class="tr"><i :style="{ width: t.pct.toFixed(0) + '%' }"></i></span>
            <span class="vl">{{ fmt(t.calls) }}</span>
          </div>
        </a-card>
      </a-col>
    </a-row>
    <a-card title="最近告警" :bordered="false">
      <template #extra><a-button type="text" @click="emit('goto', 'alerts')">查看全部 →</a-button></template>
      <div class="muted" style="margin-bottom: 4px">未处理 {{ openAlertCount() }} 条 · 点击进入告警中心</div>
      <div v-for="a in store.alerts.slice(0, 4)" :key="a.t + a.obj" class="alert-row" @click="emit('goto', 'alerts')">
        <span class="tm">{{ a.t }}</span>
        <a-tag :color="a.tag" size="small">{{ a.level }}</a-tag>
        <div class="ct"><b>{{ a.obj }}</b>　{{ a.ct }}</div>
        <a-tag :color="stColor(a.st)" size="small">{{ a.st }}</a-tag>
      </div>
    </a-card>
  </div>
</template>
