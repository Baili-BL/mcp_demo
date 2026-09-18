<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, toolsetEndpoint, findServiceByEndpoint, discoverToolsForService, keyForEndpoint } from '../store'

const visible = computed({
  get: () => store.playground.visible,
  set: (v) => { store.playground.visible = v },
})

const form = reactive({
  proto: 'Streamable HTTP',
  endpoint: '',
  apiKey: '',
})
const connected = ref(false)
const connecting = ref(false)
const listed = ref([])
const selected = ref(null)
const inText = ref('{\n  "arguments": {}\n}')
const outText = ref('')
const testing = ref(false)
const result = ref(null)
const resultOk = ref(false)
const batching = ref(false)
const batch = ref([])
let batchTimer = 0

function resetSession() {
  connected.value = false
  listed.value = []
  selected.value = null
  testing.value = false
  result.value = null
  resultOk.value = false
  batching.value = false
  batch.value = []
  inText.value = '{\n  "arguments": {}\n}'
  outText.value = ''
  if (batchTimer) { clearTimeout(batchTimer); batchTimer = 0 }
}

function fillBuiltinKey() {
  if (form.apiKey.trim()) return
  form.apiKey = keyForEndpoint(form.endpoint)
}

function resolveTools(endpoint) {
  const url = String(endpoint || '').trim()
  const allow = store.playground.allowTools
  const ts = store.toolsets.find((s) => toolsetEndpoint(s) === url || url.includes(`/toolsets/${s.id}`))
  if (ts) {
    const names = new Set(allow || ts.tools)
    return store.tools.filter((t) => names.has(t.name) && t.on)
  }
  const svc = findServiceByEndpoint(url) || store.services.find((s) => s.endpoint === url)
  if (svc) {
    const list = store.tools.filter((t) => t.svc === svc.id && t.on)
    if (allow?.length) return list.filter((t) => allow.includes(t.name))
    return list
  }
  if (allow?.length) return store.tools.filter((t) => allow.includes(t.name) && t.on)
  return []
}

function connect() {
  return doConnect(false)
}

function doConnect(silent) {
  if (!/^https?:\/\/.+/.test(form.endpoint.trim())) {
    Message.warning('请填写有效的 MCP 域名 / 端点 URL')
    return false
  }
  fillBuiltinKey()
  if (!form.apiKey.trim()) {
    Message.warning('请填写入站 API Key')
    return false
  }
  connecting.value = true
  let tools = resolveTools(form.endpoint)
  if (!tools.length) {
    const svc = findServiceByEndpoint(form.endpoint)
    if (svc) tools = discoverToolsForService(svc).filter((t) => t.on)
  }
  connecting.value = false
  if (!tools.length) {
    connected.value = false
    Message.error('该端点尚未登记工具。请先在 MCP 中心对服务执行「探测工具」，或到工具目录手动登记。')
    return false
  }
  connected.value = true
  listed.value = tools
  const preset = store.playground.toolName
  const hit = tools.find((t) => t.name === preset) || tools[0]
  pick(hit)
  if (!silent) Message.success(`连接成功，tools/list 返回 ${tools.length} 个工具`)
  return true
}

function sampleArgs(t) {
  const props = t.schema?.properties || {}
  const out = {}
  Object.entries(props).forEach(([k, spec]) => {
    if (spec.default != null) { out[k] = spec.default; return }
    if (spec.enum?.length) { out[k] = spec.enum[0]; return }
    if (k === 'variety') { out[k] = 'CU'; return }
    if (k === 'industry') { out[k] = '电解铝'; return }
    if (k === 'query') { out[k] = '铜库存'; return }
    if (k === 'region') { out[k] = '华东'; return }
    if (k === 'inv_type') { out[k] = 'social'; return }
    if (k === 'dataset_id') { out[k] = 'dw.ads_variety_pnl_d'; return }
    if (k === 'team') { out[k] = '全部'; return }
    if (k === 'start_date') { out[k] = '2026-09-01'; return }
    if (k === 'end_date') { out[k] = '2026-09-17'; return }
    if (spec.type === 'integer' || spec.type === 'number') { out[k] = 0; return }
    if (spec.type === 'boolean') { out[k] = false; return }
    if (spec.type === 'array') { out[k] = []; return }
    if (spec.type === 'object') { out[k] = {}; return }
    out[k] = ''
  })
  return out
}

function randomFailCase(t) {
  const svc = store.services.find((s) => s.id === t.svc)
  const src = svc?.sources?.[0] || '上游'
  const hist = (t.errs || []).filter((e) => e.code && e.code !== '—')
  if (hist.length && Math.random() < 0.45) {
    const e = hist[Math.floor(Math.random() * hist.length)]
    return { code: e.code, message: e.msg }
  }
  const cases = [
    { code: 'MCP_ERR_UPSTREAM_TIMEOUT', message: `${src} 响应超时（>3s），tools/call 中止` },
    { code: 'MCP_ERR_UPSTREAM_502', message: `${src} 网关返回 502，上游暂时不可用` },
    { code: 'MCP_ERR_RATE_LIMITED', message: `触发 QPS 限流，请降低 ${t.name} 调用频率后重试` },
    { code: 'MCP_ERR_SCHEMA_MISMATCH', message: `入参校验失败：${t.name} 字段与 inputSchema 不一致` },
    { code: 'MCP_ERR_NOT_FOUND', message: `${t.cn} 未查到对应数据，上游返回空集` },
    { code: 'MCP_ERR_UNAUTHORIZED', message: 'API Key 无效、已停用或未绑定该工具集' },
    { code: 'MCP_ERR_UPSTREAM_DELAY', message: `${src} 数据同步延迟，暂不可读最新批次` },
  ]
  return cases[Math.floor(Math.random() * cases.length)]
}

function pickFailNames(tools) {
  const n = tools.length
  if (!n) return new Set()
  const degraded = (t) => store.services.find((s) => s.id === t.svc)?.health === 'degraded'
  let want
  if (n === 1) want = Math.random() < (degraded(tools[0]) ? 0.7 : 0.4) ? 1 : 0
  else want = Math.max(1, Math.min(n - 1, Math.ceil(n * (0.28 + Math.random() * 0.22))))
  const scored = tools.map((t, i) => ({
    i,
    w: (degraded(t) ? 2.4 : 1) * (1.15 - (t.sr || 99) / 100) * (0.6 + Math.random()),
  }))
  scored.sort((a, b) => b.w - a.w)
  return new Set(scored.slice(0, want).map((x) => tools[x.i].name))
}

function failLatency(t, failed) {
  const base = t.lat || 120
  if (!failed) return Math.max(40, Math.round(base * (0.7 + Math.random() * 0.5)))
  return Math.min(4800, Math.round(base * (2.1 + Math.random() * 2.4)))
}

function applyResult(t, params, fail) {
  if (fail) {
    const body = {
      isError: true,
      content: [{ type: 'text', text: fail.message }],
      structuredContent: {
        code: fail.code,
        message: fail.message,
        tool: t.name,
        retryable: /TIMEOUT|502|RATE|DELAY/.test(fail.code),
      },
    }
    result.value = body
    resultOk.value = false
    outText.value = JSON.stringify(body, null, 2)
    return
  }
  const data = mockPayload(t, params)
  const body = {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    structuredContent: { result: data },
  }
  result.value = body
  resultOk.value = true
  outText.value = JSON.stringify(body, null, 2)
}

function writeInJson(t, params) {
  inText.value = JSON.stringify({
    name: t.name,
    arguments: params || sampleArgs(t),
  }, null, 2)
}

function parseInJson() {
  try {
    const obj = JSON.parse(inText.value)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      Message.warning('入参 JSON 必须是对象')
      return null
    }
    const arguments_ = obj.arguments && typeof obj.arguments === 'object' && !Array.isArray(obj.arguments)
      ? obj.arguments
      : obj
    return { name: obj.name || selected.value?.name, arguments: arguments_ }
  } catch {
    Message.warning('入参不是合法 JSON，请检查括号与逗号')
    return null
  }
}

function pick(t) {
  selected.value = t
  const preset = sampleArgs(t)
  writeInJson(t, preset)
  const row = batch.value.find((x) => x.name === t.name)
  if (row && row.ok != null) applyResult(t, preset, row.ok ? null : row.err)
  else {
    result.value = null
    outText.value = ''
  }
}

function batchOf(name) {
  return batch.value.find((x) => x.name === name)
}

function selfTest() {
  if (batching.value) return
  if (!doConnect(true)) return
  const tools = listed.value
  batching.value = true
  batch.value = tools.map((t) => ({ name: t.name, cn: t.cn, ok: null, ms: 0, err: null }))
  const failNames = pickFailNames(tools)
  let i = 0
  const tick = () => {
    if (!store.playground.visible) return
    if (i >= tools.length) {
      batching.value = false
      const ok = batch.value.filter((x) => x.ok).length
      const fail = batch.value.length - ok
      if (fail) Message.warning(`系统自测完成：${ok}/${batch.value.length} 个工具可用，${fail} 个失败`)
      else Message.success(`系统自测完成：${ok}/${batch.value.length} 个工具调用成功`)
      const firstFail = tools.find((t) => batchOf(t.name)?.ok === false)
      pick(firstFail || tools[0])
      return
    }
    const t = tools[i]
    const row = batch.value[i]
    const fail = failNames.has(t.name) ? randomFailCase(t) : null
    row.ok = !fail
    row.err = fail
    row.ms = failLatency(t, !!fail)
    i += 1
    batchTimer = setTimeout(tick, 160)
  }
  tick()
}

function runTest() {
  if (!selected.value) return
  const parsed = parseInJson()
  if (!parsed) return
  const required = selected.value.schema?.required || []
  const miss = required.find((k) => parsed.arguments[k] === '' || parsed.arguments[k] == null)
  if (miss) {
    Message.warning(`入参 arguments 缺少必填字段 ${miss}`)
    return
  }
  testing.value = true
  result.value = null
  outText.value = ''
  setTimeout(() => {
    const t = selected.value
    const svc = store.services.find((s) => s.id === t.svc)
    const bias = svc?.health === 'degraded' ? 0.55 : 0.32
    const fail = Math.random() < bias ? randomFailCase(t) : null
    applyResult(t, parsed.arguments, fail)
    const row = batchOf(t.name)
    if (row) {
      row.ok = !fail
      row.err = fail
      row.ms = failLatency(t, !!fail)
    }
    testing.value = false
    if (fail) Message.error(`${fail.code}：${fail.message}`)
    else Message.success('调用成功')
  }, 640)
}

function mockPayload(t, params) {
  if (t.name === 'get_spot_price') {
    return {
      variety: params.variety || 'CU',
      region: params.region || '华东',
      date: '2026-09-16',
      spot: 78420,
      basis: -180,
      unit: '元/吨',
    }
  }
  if (t.name === 'get_futures_quote') {
    return {
      variety: params.variety || 'RB',
      contract: params.contract || 'main',
      last: 3184,
      settle: 3179,
      oi: 1823341,
    }
  }
  if (t.name === 'search_reports') {
    return {
      query: params.query,
      hits: [
        { report_id: 'R-20260912-CU', score: 0.86, snippet: '电解铜社会库存连续三周去化…' },
      ],
    }
  }
  if (t.name === 'list_datasets') {
    const src = params.source && params.source !== 'all' ? params.source : null
    const all = [
      { dataset_id: 'crm.account', source: 'crm', name: '客户主数据', rows: 12840 },
      { dataset_id: 'crm.opportunity', source: 'crm', name: '商机漏斗', rows: 3622 },
      { dataset_id: 'dw.ads_variety_pnl_d', source: 'warehouse', name: '品种日盈亏', rows: 890112 },
      { dataset_id: 'dw.dwd_crm_touch_d', source: 'warehouse', name: '客户触达明细', rows: 210445 },
    ]
    return { datasets: src ? all.filter((d) => d.source === src) : all, keyword: params.keyword || '' }
  }
  if (t.name === 'query_warehouse') {
    return {
      dataset_id: params.dataset_id || 'dw.ads_variety_pnl_d',
      limit: params.limit || 500,
      columns: ['dt', 'variety', 'pnl', 'volume'],
      preview: [
        { dt: '2026-09-17', variety: 'CU', pnl: 128.4, volume: 32011 },
        { dt: '2026-09-17', variety: 'RB', pnl: -36.2, volume: 88120 },
      ],
    }
  }
  if (t.name === 'search_crm_accounts') {
    return {
      query: params.query,
      hits: [
        { account_id: 'A-8821', name: '某铜业集团', industry: '有色', owner: '李研', status: 'active' },
        { account_id: 'A-9104', name: '华东贸易', industry: '贸易', owner: '王策', status: 'active' },
      ],
    }
  }
  if (t.name === 'get_crm_pipeline') {
    return {
      team: params.team || '全部',
      start_date: params.start_date || '2026-09-01',
      end_date: params.end_date || '2026-09-17',
      stages: [
        { stage: '线索', count: 86, amount: 4200 },
        { stage: '方案', count: 31, amount: 1860 },
        { stage: '成交', count: 9, amount: 640 },
      ],
      win_rate: 0.29,
    }
  }
  if (t.name === 'run_stat_analysis') {
    return {
      dataset_id: params.dataset_id,
      method: params.method || 'describe',
      summary: { n: 5000, pnl_mean: 12.4, pnl_std: 48.1, corr_pnl_volume: 0.37 },
    }
  }
  return { ok: true, tool: t.name, params, note: '模拟 tools/call 返回（未连接真实上游）' }
}

watch(visible, (v) => {
  if (!v) {
    resetSession()
    return
  }
  form.proto = store.playground.proto || 'Streamable HTTP'
  form.endpoint = store.playground.endpoint || store.services[0]?.endpoint || ''
  form.apiKey = store.playground.apiKey || ''
  fillBuiltinKey()
  resetSession()
  nextTick(() => selfTest())
})
</script>

<template>
  <a-modal
    v-model:visible="visible"
    title="调试 MCP 工具"
    :width="1180"
    :footer="false"
    unmount-on-close
    :mask-closable="false"
  >
    <div class="pg-grid">
      <div class="pg-col">
        <div class="pg-step"><span>Step 1</span> 选择域名并连接测试</div>
        <a-form :model="form" layout="vertical" size="small">
          <a-form-item label="协议">
            <div>Streamable HTTP</div>
          </a-form-item>
          <a-form-item label="域名" required>
            <a-input v-model="form.endpoint" class="mono" placeholder="https://mcp.futures-data.cn/..." />
          </a-form-item>
          <a-form-item label="API Key" required>
            <a-input-password v-model="form.apiKey" placeholder="管理台内置密钥，可替换" />
          </a-form-item>
          <a-space direction="vertical" fill :size="8">
            <a-button type="primary" long :loading="batching || connecting" @click="selfTest">系统自测</a-button>
            <a-button long :loading="connecting" @click="connect">仅连接</a-button>
          </a-space>
        </a-form>
        <a-alert v-if="batching" type="info" style="margin-top:12px">正在对 {{ listed.length }} 个相关工具做连通性检测…</a-alert>
        <a-alert v-else-if="batch.length && connected" :type="batch.filter(x => x.ok).length === batch.length ? 'success' : 'warning'" style="margin-top:12px">
          系统自测 {{ batch.filter(x => x.ok).length }}/{{ batch.length }} 个工具可用
          <template v-if="batch.some(x => x.ok === false)">，失败 {{ batch.filter(x => !x.ok).length }} 个</template>
        </a-alert>
        <a-alert v-else-if="connected" type="success" style="margin-top:12px">已建立 Streamable HTTP 会话</a-alert>
      </div>
      <div class="pg-col">
        <div class="pg-step"><span>Step 2</span> 相关工具自测结果</div>
        <template v-if="connected">
          <div
            v-for="t in listed"
            :key="t.name"
            class="tool-pick"
            :class="{ on: selected?.name === t.name }"
            @click="pick(t)"
          >
            <div class="tool-pick-top">
              <div class="mono">{{ t.name }}</div>
              <a-tag v-if="batchOf(t.name)?.ok === true" color="green" size="small">通过</a-tag>
              <a-tag v-else-if="batchOf(t.name)?.ok === false" color="red" size="small">失败</a-tag>
              <a-tag v-else-if="batching" color="orangered" size="small">检测中</a-tag>
            </div>
            <div class="muted">
              {{ t.cn }}{{ batchOf(t.name)?.ms ? ` · ${batchOf(t.name).ms}ms` : '' }}
              <template v-if="batchOf(t.name)?.err"> · {{ batchOf(t.name).err.code }}</template>
            </div>
          </div>
        </template>
        <a-empty v-else description="打开后会用内置密钥自动检测" />
      </div>
      <div class="pg-col">
        <div class="pg-step"><span>Step 3</span> JSON 入参 / 出参</div>
        <template v-if="selected">
          <div class="pg-json-lab">入参 · tools/call</div>
          <a-textarea v-model="inText" class="pg-json-in" :auto-size="{ minRows: 8, maxRows: 14 }" />
          <div v-if="resultOk && result" class="pg-ok">
            <icon-check-circle-fill /> 测试成功
          </div>
          <div v-else-if="result && !resultOk" class="pg-fail">
            <icon-close-circle-fill /> 测试失败 · {{ result.structuredContent?.code }}
          </div>
          <div class="pg-json-lab">出参 · result</div>
          <pre v-if="outText" class="schema-pre pg-json-out">{{ outText }}</pre>
          <a-empty v-else-if="batching" description="正在检测该工具…" />
          <a-empty v-else description="调用后在此展示出参 JSON" />
          <div class="pg-actions">
            <a-button type="primary" :loading="testing || batching" @click="runTest">按入参调用</a-button>
          </div>
        </template>
        <a-empty v-else description="请选择工具" />
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.pg-json-in :deep(textarea) {
  font-family: Menlo, Consolas, ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.6;
}
</style>
