<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { store, toolsetEndpoint, findServiceByEndpoint, discoverToolsForService } from '../store'

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
const args = reactive({})
const testing = ref(false)
const result = ref(null)
const resultOk = ref(false)

function resetSession() {
  connected.value = false
  listed.value = []
  selected.value = null
  testing.value = false
  result.value = null
  resultOk.value = false
  Object.keys(args).forEach((k) => delete args[k])
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
  if (!/^https?:\/\/.+/.test(form.endpoint.trim())) {
    Message.warning('请填写有效的 MCP 域名 / 端点 URL')
    return
  }
  if (!form.apiKey.trim()) {
    Message.warning('请填写入站 API Key')
    return
  }
  connecting.value = true
  setTimeout(() => {
    connecting.value = false
    let tools = resolveTools(form.endpoint)
    if (!tools.length) {
      const svc = findServiceByEndpoint(form.endpoint)
      if (svc) tools = discoverToolsForService(svc).filter((t) => t.on)
    }
    if (!tools.length) {
      connected.value = false
      Message.error('该端点尚未登记工具。请先在 MCP 中心对服务执行「探测工具」，或到工具目录手动登记。')
      return
    }
    connected.value = true
    listed.value = tools
    const preset = store.playground.toolName
    const hit = tools.find((t) => t.name === preset) || tools[0]
    pick(hit)
    Message.success(`连接成功，tools/list 返回 ${tools.length} 个工具`)
  }, 520)
}

function pick(t) {
  selected.value = t
  Object.keys(args).forEach((k) => delete args[k])
  const props = t.schema?.properties || {}
  Object.entries(props).forEach(([k, v]) => {
    args[k] = v.default != null ? v.default : ''
  })
  result.value = null
}

function fieldsOf(schema) {
  const props = schema?.properties || {}
  const required = schema?.required || []
  return Object.entries(props).map(([key, spec]) => ({
    key,
    spec,
    required: required.includes(key),
  }))
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

function runTest() {
  if (!selected.value) return
  const required = selected.value.schema?.required || []
  const miss = required.find((k) => args[k] === '' || args[k] == null)
  if (miss) {
    Message.warning(`请填写必填参数 ${miss}`)
    return
  }
  testing.value = true
  result.value = null
  setTimeout(() => {
    const data = mockPayload(selected.value, { ...args })
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    result.value = {
      content: [{ type: 'text', text }],
      structuredContent: { result: data },
    }
    resultOk.value = true
    testing.value = false
  }, 640)
}

watch(visible, (v) => {
  if (!v) {
    resetSession()
    return
  }
  form.proto = store.playground.proto || 'Streamable HTTP'
  form.endpoint = store.playground.endpoint || store.services[0]?.endpoint || ''
  form.apiKey = store.playground.apiKey || ''
  resetSession()
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
            <a-input-password v-model="form.apiKey" placeholder="Bearer 入站密钥" />
          </a-form-item>
          <a-button type="primary" long :loading="connecting" @click="connect">连接测试</a-button>
        </a-form>
        <a-alert v-if="connected" type="success" style="margin-top:12px">已建立 Streamable HTTP 会话</a-alert>
      </div>
      <div class="pg-col">
        <div class="pg-step"><span>Step 2</span> 选择需要调试的工具</div>
        <template v-if="connected">
          <div
            v-for="t in listed"
            :key="t.name"
            class="tool-pick"
            :class="{ on: selected?.name === t.name }"
            @click="pick(t)"
          >
            <div class="mono">{{ t.name }}</div>
            <div class="muted">{{ t.cn }} · {{ t.desc }}</div>
          </div>
        </template>
        <a-empty v-else description="请先完成连接测试" />
      </div>
      <div class="pg-col">
        <div class="pg-step"><span>Step 3</span> 输入参数进行调试</div>
        <template v-if="selected">
          <a-form :model="args" layout="vertical" size="small">
            <a-form-item
              v-for="f in fieldsOf(selected.schema)"
              :key="f.key"
              :label="f.key"
              :required="f.required"
            >
              <a-select v-if="f.spec.enum" v-model="args[f.key]" allow-clear>
                <a-option v-for="opt in f.spec.enum" :key="opt" :value="opt">{{ opt }}</a-option>
              </a-select>
              <a-input v-else v-model="args[f.key]" :placeholder="f.spec.description || f.key" />
              <div v-if="f.spec.description" class="hint">{{ f.spec.description }}</div>
            </a-form-item>
          </a-form>
          <div v-if="resultOk && result" class="pg-ok">
            <icon-check-circle-fill /> 测试成功
          </div>
          <a-tabs v-if="result" type="line" size="small">
            <a-tab-pane key="res" title="响应结果">
              <pre class="schema-pre">{{ JSON.stringify(result, null, 2) }}</pre>
            </a-tab-pane>
            <a-tab-pane key="req" title="请求参数">
              <pre class="schema-pre">{{ JSON.stringify(args, null, 2) }}</pre>
            </a-tab-pane>
          </a-tabs>
          <a-empty v-else-if="!testing" description="测试工具查看结果" />
          <div class="pg-actions">
            <a-button type="primary" :loading="testing" @click="runTest">测试工具</a-button>
          </div>
        </template>
        <a-empty v-else description="请选择工具" />
      </div>
    </div>
  </a-modal>
</template>
