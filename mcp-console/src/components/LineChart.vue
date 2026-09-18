<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { fmt } from '../utils'

const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  height: { type: Number, default: 260 },
})

const cv = ref(null)
const tip = ref(null)
const visible = ref(props.series.map(() => true))
const hover = ref(null)
let geo = null

watch(() => props.series, () => { visible.value = props.series.map(() => true); draw() }, { deep: true })
watch(() => props.labels, draw)

function toggle(i) {
  visible.value[i] = !visible.value[i]
  draw()
}

function draw() {
  const el = cv.value
  if (!el) return
  const dpr = window.devicePixelRatio || 1
  const w = el.clientWidth
  const h = el.clientHeight
  if (!w) return
  el.width = w * dpr
  el.height = h * dpr
  const c = el.getContext('2d')
  c.scale(dpr, dpr)
  c.clearRect(0, 0, w, h)
  const pad = { l: 44, r: 12, t: 10, b: 24 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const vis = props.series.filter((_, i) => visible.value[i])
  const max = Math.max(10, ...vis.flatMap((s) => s.data)) * 1.15
  const x = (i) => pad.l + (iw * i) / (props.labels.length - 1)
  const y = (v) => pad.t + ih * (1 - v / max)
  c.strokeStyle = '#e5e6eb'
  c.fillStyle = '#86909c'
  c.font = '10px Menlo, Consolas, monospace'
  c.textAlign = 'right'
  c.lineWidth = 1
  for (let g = 0; g <= 4; g++) {
    const v = (max * g) / 4
    const yy = y(v)
    c.beginPath(); c.moveTo(pad.l, yy); c.lineTo(w - pad.r, yy); c.stroke()
    c.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v), pad.l - 6, yy + 3)
  }
  c.textAlign = 'center'
  props.labels.forEach((lb, i) => { if (i % 3 === 0) c.fillText(lb, x(i), h - 8) })
  props.series.forEach((s, si) => {
    if (!visible.value[si]) return
    c.beginPath()
    s.data.forEach((v, i) => (i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v))))
    c.lineTo(x(s.data.length - 1), pad.t + ih)
    c.lineTo(pad.l, pad.t + ih)
    c.closePath()
    c.fillStyle = s.color + '22'
    c.fill()
    c.beginPath()
    s.data.forEach((v, i) => (i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v))))
    c.strokeStyle = s.color
    c.lineWidth = 2
    c.lineJoin = 'round'
    c.stroke()
  })
  if (hover.value != null) {
    const i = hover.value
    c.strokeStyle = '#c9cdd4'
    c.setLineDash([4, 4])
    c.beginPath(); c.moveTo(x(i), pad.t); c.lineTo(x(i), pad.t + ih); c.stroke()
    c.setLineDash([])
    props.series.forEach((s, si) => {
      if (!visible.value[si]) return
      c.beginPath(); c.arc(x(i), y(s.data[i]), 3.5, 0, 7)
      c.fillStyle = '#fff'; c.fill()
      c.strokeStyle = s.color; c.lineWidth = 2; c.stroke()
    })
  }
  geo = { pad, iw, n: props.labels.length }
}

function onMove(e) {
  if (!geo || !tip.value) return
  const r = cv.value.getBoundingClientRect()
  let i = Math.round(((e.clientX - r.left - geo.pad.l) / geo.iw) * (geo.n - 1))
  i = Math.max(0, Math.min(geo.n - 1, i))
  hover.value = i
  draw()
  tip.value.style.display = 'block'
  const rows = props.series.map((s, si) => visible.value[si]
    ? `<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-right:6px"></span>${s.name}：<b>${fmt(s.data[i])}</b></div>`
    : '').join('')
  tip.value.innerHTML = `<div style="color:rgba(255,255,255,.6);margin-bottom:2px">${props.labels[i]}</div>${rows}`
  tip.value.style.left = Math.min(e.clientX - r.left + 14, r.width - 190) + 'px'
  tip.value.style.top = (e.clientY - r.top - 10) + 'px'
}
function onLeave() {
  hover.value = null
  if (tip.value) tip.value.style.display = 'none'
  draw()
}

let ro
onMounted(() => {
  draw()
  ro = new ResizeObserver(draw)
  if (cv.value) ro.observe(cv.value)
})
onBeforeUnmount(() => ro && ro.disconnect())
</script>

<template>
  <div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--color-text-2);margin-bottom:4px">
      <span
        v-for="(s, i) in series" :key="s.name"
        :style="{ opacity: visible[i] ? 1 : 0.35, cursor: 'pointer', userSelect: 'none' }"
        @click="toggle(i)"
      >
        <i class="swd" :style="{ background: s.color, verticalAlign: '-1px', marginRight: '6px' }"></i>{{ s.name }}
      </span>
    </div>
    <div style="position:relative">
      <canvas ref="cv" :style="{ width: '100%', height: height + 'px', display: 'block' }" @mousemove="onMove" @mouseleave="onLeave" />
      <div ref="tip" class="chart-tip"></div>
    </div>
  </div>
</template>
