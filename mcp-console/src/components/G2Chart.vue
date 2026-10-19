<script setup>
import { Chart } from '@antv/g2'
import { nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  options: { type: Object, required: true },
  height: { type: Number, default: 260 },
})

const el = ref(null)
let chart = null

function render() {
  if (!el.value || !el.value.clientWidth) return
  chart?.destroy()
  chart = new Chart({ container: el.value, autoFit: true, height: props.height })
  chart.options(props.options)
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
  render()
})
onActivated(async () => {
  await waitForSize()
  render()
})
watch(() => [props.options, props.height], () => nextTick(render), { deep: true })
onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>

<template>
  <div ref="el" class="g2-chart" :style="{ minHeight: height + 'px' }"></div>
</template>

<style scoped>
.g2-chart { width: 100%; }
</style>
