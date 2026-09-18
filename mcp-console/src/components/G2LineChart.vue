<script setup>
import { Chart } from '@antv/g2'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  labels: { type: Array, required: true },
  values: { type: Array, required: true },
  height: { type: Number, default: 220 },
  color: { type: String, default: '#165dff' },
  name: { type: String, default: '调用量' },
})

const el = ref(null)
let chart = null

function rows() {
  return props.labels.map((date, i) => ({ date, value: Number(props.values[i] || 0) }))
}

function yScale() {
  const vals = rows().map((d) => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pad = Math.max((max - min) * 0.35, (max || 1) * 0.04)
  return {
    nice: true,
    domainMin: Math.max(0, Math.floor(min - pad)),
    domainMax: Math.ceil(max + pad),
  }
}

function renderChart() {
  if (!el.value) return
  chart?.destroy()
  chart = new Chart({
    container: el.value,
    autoFit: true,
    height: props.height,
  })
  chart.options({
    type: 'view',
    data: rows(),
    encode: { x: 'date', y: 'value' },
    scale: { y: yScale() },
    axis: {
      x: { title: false, labelAutoHide: true, size: 28 },
      y: { title: false, labelFormatter: (v) => Number(v).toLocaleString('en-US') },
    },
    tooltip: {
      items: [{ channel: 'y', name: props.name, valueFormatter: (v) => Number(v).toLocaleString('en-US') }],
    },
    children: [
      {
        type: 'line',
        encode: { shape: 'smooth' },
        style: { stroke: props.color, lineWidth: 2 },
      },
      ...(rows().length > 14
        ? []
        : [{
            type: 'point',
            style: { fill: '#fff', stroke: props.color, lineWidth: 2, r: 3.5 },
            tooltip: false,
          }]),
    ],
  })
  chart.render()
}

async function waitForSize() {
  for (let i = 0; i < 40; i++) {
    if (el.value?.clientWidth > 0) return
    await new Promise((r) => requestAnimationFrame(r))
  }
}

onMounted(async () => {
  await nextTick()
  await waitForSize()
  renderChart()
})
watch(() => [props.labels, props.values, props.height, props.color], () => nextTick(renderChart), { deep: true })
onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>

<template>
  <div ref="el" class="g2-line"></div>
</template>

<style scoped>
.g2-line { width: 100%; background: #fff; }
</style>
