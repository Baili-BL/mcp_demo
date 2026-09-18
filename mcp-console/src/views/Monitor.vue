<script setup>
import { computed, onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, ERR_DIST, totalCalls, ensureLogs, randLog } from '../store'
import { fmt, srColor, copyText } from '../utils'
import LineChart from '../components/LineChart.vue'
import DonutChart from '../components/DonutChart.vue'

const totalErr = computed(() => ERR_DIST.reduce((a, e) => a + e.n, 0))
const errTop = computed(() => [...store.tools]
  .map((t) => ({ ...t, err: Math.round(t.calls * (100 - t.sr) / 100), er: 100 - t.sr }))
  .sort((a, b) => b.er - a.er)
  .slice(0, 6))
const filteredLogs = computed(() => store.logs.filter((l) =>
  store.logFilter === 'all' ||
  (store.logFilter === 'fail' && l.st >= 500) ||
  (store.logFilter === 'limited' && l.st === 429)
))

let timer
function startLogStream() {
  if (timer) return
  ensureLogs()
  timer = setInterval(() => {
    if (store.logPause) return
    store.logs.unshift(randLog())
    if (store.logs.length > 40) store.logs.length = 40
  }, 2500)
}
function stopLogStream() {
  clearInterval(timer)
  timer = null
}
onMounted(startLogStream)
onActivated(startLogStream)
onDeactivated(stopLogStream)
onBeforeUnmount(stopLogStream)

async function copyTrace(id) {
  await copyText(id)
  Message.success('已复制 Trace ID')
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>调用监控</h2>
        <div class="desc">网关埋点：调用量与延迟趋势、错误画像、实时调用日志（近 24 小时）</div>
      </div>
    </div>
    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :xs="12" :md="6" style="margin-bottom: 16px">
        <a-card class="stat-card tone-green" :bordered="false">
          <div class="stat-ico"><icon-dashboard /></div>
          <a-statistic title="P50 延迟" :value="182" suffix="ms" :value-style="{ color: '#00b42a' }" />
          <a-progress :percent="0.18" status="success" :show-text="false" style="margin-top:8px" />
        </a-card>
      </a-col>
      <a-col :xs="12" :md="6" style="margin-bottom: 16px">
        <a-card class="stat-card tone-orange" :bordered="false">
          <div class="stat-ico"><icon-bar-chart /></div>
          <a-statistic title="P95 延迟" :value="486" suffix="ms" :value-style="{ color: '#f77234' }" />
          <a-progress :percent="0.49" status="warning" :show-text="false" style="margin-top:8px" />
        </a-card>
      </a-col>
      <a-col :xs="12" :md="6" style="margin-bottom: 16px">
        <a-card class="stat-card tone-red" :bordered="false">
          <div class="stat-ico"><icon-notification /></div>
          <a-statistic title="P99 延迟" :value="912" suffix="ms" :value-style="{ color: '#f53f3f' }" />
          <a-progress :percent="0.91" status="danger" :show-text="false" style="margin-top:8px" />
        </a-card>
      </a-col>
      <a-col :xs="12" :md="6" style="margin-bottom: 16px">
        <a-card class="stat-card tone-rose" :bordered="false">
          <div class="stat-ico"><icon-exclamation-circle /></div>
          <a-statistic title="今日错误" :value="totalErr" suffix="次" :value-style="{ color: '#f53f3f' }" />
          <div class="stat-foot">错误率 {{ (totalErr / totalCalls() * 100).toFixed(2) }}%</div>
        </a-card>
      </a-col>
    </a-row>
    <a-row :gutter="16">
      <a-col :xs="24" :lg="12" style="margin-bottom: 16px">
        <a-card title="24 小时调用趋势" :bordered="false">
          <template #extra><span style="font-size:12px;color:var(--color-text-3)">次 / 小时</span></template>
          <LineChart :labels="store.trend.labels" :series="store.trend.series" :height="240" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12" style="margin-bottom: 16px">
        <a-card title="24 小时延迟趋势" :bordered="false">
          <template #extra><span style="font-size:12px;color:var(--color-text-3)">P50 / P95 / P99 · ms</span></template>
          <LineChart :labels="store.lat.labels" :series="store.lat.series" :height="240" />
        </a-card>
      </a-col>
    </a-row>
    <a-row :gutter="16">
      <a-col :xs="24" :lg="16" style="margin-bottom: 16px">
        <a-card :bordered="false">
          <template #title>
            实时调用日志
            <span style="font-size:12px;font-weight:400;color:var(--color-text-3);margin-left:8px">tools/call · 每 2.5s 模拟新调用</span>
          </template>
          <div class="filter-bar">
            <a-radio-group v-model="store.logFilter" type="button" size="small">
              <a-radio value="all">全部</a-radio>
              <a-radio value="fail">失败 5xx</a-radio>
              <a-radio value="limited">限流 429</a-radio>
            </a-radio-group>
            <a-space>
              <span class="muted">暂停滚动</span>
              <a-switch v-model="store.logPause" size="small" />
              <span class="muted">最新在前 · 保留 40 条 · 点击 Trace 复制</span>
            </a-space>
          </div>
          <a-table :data="filteredLogs" :pagination="false" :scroll="{ y: 360 }" row-key="trace" size="small" hoverable stripe>
            <template #columns>
              <a-table-column title="时间" data-index="ts" :width="100" />
              <a-table-column title="Trace ID" :width="110">
                <template #cell="{ record }">
                  <span class="mono tiny trace-id" @click.stop="copyTrace(record.trace)">{{ record.trace }}</span>
                </template>
              </a-table-column>
              <a-table-column title="接入端" data-index="client" :width="120" />
              <a-table-column title="工具" :width="160">
                <template #cell="{ record }"><span class="mono" style="font-size:12px">{{ record.tool }}</span></template>
              </a-table-column>
              <a-table-column title="状态" :width="110">
                <template #cell="{ record }">
                  <a-tag v-if="record.st === 200" color="green">200 成功</a-tag>
                  <a-tag v-else-if="record.st === 429" color="gold">429 限流</a-tag>
                  <a-tag v-else color="red">500 失败</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="延迟" :width="80" align="right">
                <template #cell="{ record }">{{ record.lat }} ms</template>
              </a-table-column>
              <a-table-column title="错误码">
                <template #cell="{ record }"><span class="mono" style="font-size:12px;color:var(--color-text-3)">{{ record.err || '—' }}</span></template>
              </a-table-column>
            </template>
          </a-table>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8" style="margin-bottom: 16px">
        <a-card title="错误码分布" :bordered="false">
          <template #extra><span style="font-size:12px;color:var(--color-text-3)">今日累计 {{ totalErr }} 次</span></template>
          <DonutChart :items="ERR_DIST" />
          <div v-for="e in ERR_DIST" :key="e.code" class="err-legend">
            <i class="swd" :style="{ background: e.c }"></i>
            <span class="mono" style="font-size:11px">{{ e.code }}</span>
            <span style="flex:1;text-align:right;color:var(--color-text-3);font-size:12px">{{ e.note }}</span>
            <span>{{ e.n }}</span>
            <span style="width:36px;text-align:right;color:var(--color-text-3);font-size:12px">{{ ((e.n / totalErr) * 100).toFixed(0) }}%</span>
          </div>
        </a-card>
      </a-col>
    </a-row>
    <a-card title="错误率 Top 工具" :bordered="false">
      <a-table :data="errTop" :pagination="false" row-key="name" hoverable stripe>
        <template #columns>
          <a-table-column title="工具">
            <template #cell="{ record }"><span class="mono" style="color:rgb(var(--primary-6))">{{ record.name }}</span></template>
          </a-table-column>
          <a-table-column title="所属服务">
            <template #cell="{ record }">{{ store.svcMeta[record.svc]?.n }}</template>
          </a-table-column>
          <a-table-column title="错误数" align="right" data-index="err" />
          <a-table-column title="错误率" align="right">
            <template #cell="{ record }"><a-tag :color="srColor(100 - record.er)">{{ record.er.toFixed(1) }}%</a-tag></template>
          </a-table-column>
          <a-table-column title="主要错误码">
            <template #cell="{ record }"><span class="mono" style="font-size:12px">{{ record.errs[0].code }}</span></template>
          </a-table-column>
          <a-table-column title="最近错误信息" data-index="errs">
            <template #cell="{ record }">{{ record.errs[0].msg }}</template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>
