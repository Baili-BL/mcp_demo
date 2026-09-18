<script setup>
import { computed, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, openAlertCount } from '../store'

const tab = ref('open')
const shown = computed(() => {
  if (tab.value === 'open') return store.alerts.filter((a) => a.st === '未处理')
  if (tab.value === 'acked') return store.alerts.filter((a) => a.st === '已确认')
  return store.alerts
})

function confirm(i) {
  const item = shown.value[i]
  const idx = store.alerts.indexOf(item)
  if (idx < 0) return
  store.alerts[idx].st = '已确认'
  Message.success('已确认该告警')
}
function stColor(st) {
  return st === '未处理' ? 'red' : st === '已确认' ? 'arcoblue' : 'gray'
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>告警中心</h2>
        <div class="desc">告警规则配置与事件流转（未处理 {{ openAlertCount() }} 条）</div>
      </div>
    </div>
    <a-card title="告警规则" :bordered="false" style="margin-bottom: 16px">
      <template #extra><span class="muted">作用于网关埋点指标流，变更即时生效</span></template>
      <a-table :data="store.rules" :pagination="false" row-key="name" hoverable>
        <template #columns>
          <a-table-column title="规则" data-index="name" />
          <a-table-column title="级别" :width="100">
            <template #cell="{ record }"><a-tag :color="record.tag">{{ record.level }}</a-tag></template>
          </a-table-column>
          <a-table-column title="通知方式" data-index="notify" />
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }">
              <a-switch v-model="record.on" @change="() => Message.info(record.on ? '规则已启用（模拟）' : '规则已停用（模拟）')" />
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
    <a-card title="告警事件" :bordered="false">
      <template #extra>
        <a-radio-group v-model="tab" type="button" size="small">
          <a-radio value="open">未处理 {{ openAlertCount() }}</a-radio>
          <a-radio value="acked">已确认</a-radio>
          <a-radio value="all">全部</a-radio>
        </a-radio-group>
      </template>
      <a-table :data="shown" :pagination="false" hoverable stripe>
        <template #empty>
          <a-empty description="当前筛选下没有告警事件" />
        </template>
        <template #columns>
          <a-table-column title="时间" data-index="t" :width="120" />
          <a-table-column title="级别" :width="90">
            <template #cell="{ record }"><a-tag :color="record.tag">{{ record.level }}</a-tag></template>
          </a-table-column>
          <a-table-column title="对象" :width="180">
            <template #cell="{ record }"><span style="font-weight:500">{{ record.obj }}</span></template>
          </a-table-column>
          <a-table-column title="内容" data-index="ct" />
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }"><a-tag :color="stColor(record.st)">{{ record.st }}</a-tag></template>
          </a-table-column>
          <a-table-column title="操作" :width="80">
            <template #cell="{ record, rowIndex }">
              <a-button v-if="record.st === '未处理'" type="text" size="mini" @click="confirm(rowIndex)">确认</a-button>
              <span v-else class="muted">—</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>
