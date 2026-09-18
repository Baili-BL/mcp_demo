<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
  totalLabel: { type: String, default: '今日错误（次）' },
})
const cv = ref(null)

function draw() {
  const el = cv.value
  if (!el) return
  const dpr = window.devicePixelRatio || 1
  const w = 170, h = 170
  el.width = w * dpr
  el.height = h * dpr
  el.style.width = w + 'px'
  el.style.height = h + 'px'
  const c = el.getContext('2d')
  c.scale(dpr, dpr)
  c.clearRect(0, 0, w, h)
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6, r0 = R * 0.62
  const total = props.items.reduce((a, e) => a + e.n, 0) || 1
  let a = -Math.PI / 2
  props.items.forEach((e) => {
    const a2 = a + (e.n / total) * Math.PI * 2
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a, a2); c.closePath()
    c.fillStyle = e.c; c.fill()
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke()
    a = a2
  })
  c.beginPath(); c.arc(cx, cy, r0, 0, 7); c.fillStyle = '#fff'; c.fill()
  c.fillStyle = '#1d2129'; c.font = '600 22px Menlo, Consolas, monospace'
  c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText(String(props.items.reduce((a, e) => a + e.n, 0)), cx, cy - 6)
  c.font = '11px sans-serif'; c.fillStyle = '#86909c'
  c.fillText(props.totalLabel, cx, cy + 16)
}
onMounted(draw)
watch(() => props.items, draw, { deep: true })
</script>
<template>
  <canvas ref="cv" style="display:block;margin:8px auto 4px" />
</template>
