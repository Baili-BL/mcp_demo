<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { store, showToolsetConfig, issueClient, toolsetsOfClient, CLIENT_TYPES } from '../store'
import { fmt, keyExpireMeta, keyStatus, addDays, fmtDateTime, copyText } from '../utils'

const emit = defineEmits(['goto'])
const visible = ref(false)
const renewVisible = ref(false)
const renewTarget = ref(null)
const quotaVisible = ref(false)
const quotaTarget = ref(null)
const typeOpts = CLIENT_TYPES
const form = reactive({
  name: '', type: 'blue', qps: 10, quota: 20000, expPreset: '90', expire: undefined, toolsetIds: [], userId: '',
})
const renewForm = reactive({
  preset: '90',
  expire: undefined,
})
const QUOTA_PRESETS = [5000, 10000, 20000, 30000, 50000, 100000]
const QPS_PRESETS = [5, 10, 20, 50]
function formatQuota(v) {
  const n = String(v ?? '').replace(/[^\d]/g, '')
  return n ? fmt(+n) : ''
}
function parseQuota(v) {
  return String(v ?? '').replace(/[^\d]/g, '')
}
function onQuotaNumber(v) {
  const n = +v
  quotaForm.quotaPreset = QUOTA_PRESETS.includes(n) ? String(n) : 'custom'
}
const quotaForm = reactive({
  quotaPreset: '20000',
  quota: 20000,
  qps: 10,
})

const statusTab = ref('all')
const fltSet = computed(() => store.toolsets.find((s) => s.id === store.clientFlt.toolsetId) || null)
const fltUser = computed(() => store.users.find((u) => u.id === store.clientFlt.userId) || null)
const activeUsers = computed(() => store.users.filter((u) => u.status === '正常'))
function ownerOf(id) {
  return store.users.find((u) => u.id === id)
}
const rows = computed(() => {
  const q = store.clientFlt.kw.trim().toLowerCase()
  return store.clients.map((c, i) => {
    const p = c.quota ? (c.calls / c.quota) * 100 : 0
    const ex = keyExpireMeta(c)
    const st = keyStatus(c)
    return { ...c, i, p, ex, st, sets: toolsetsOfClient(c) }
  }).filter((c) => {
    if (statusTab.value !== 'all' && c.st.text !== statusTab.value) return false
    if (store.clientFlt.toolsetId && !(c.toolsetIds || []).includes(store.clientFlt.toolsetId)) return false
    if (store.clientFlt.userId && c.userId !== store.clientFlt.userId) return false
    if (!q) return true
    const owner = ownerOf(c.userId)
    const blob = [
      c.name, c.key, c.type, c.st.text, c.status,
      owner?.name, owner?.email, owner?.phone, owner?.team,
      owner?.kind === 'customer' ? '外部客户' : (owner ? '内部员工' : '未挂账号'),
      (c.sets || []).map((s) => s.name).join(' '),
    ].join(' ')
    return blob.toLowerCase().includes(q)
  })
})

function submit() {
  const name = form.name.trim() || '未命名接入端'
  if (!form.userId) { Message.warning('请选择归属用户，先有人再有 Key'); return false }
  if (!form.toolsetIds.length) { Message.warning('请选择要授权的 MCP 工具集，否则无法调用'); return false }
  let expire = null
  if (form.expPreset === 'never') expire = null
  else if (form.expPreset === 'custom') {
    if (!form.expire) { Message.warning('请选择到期时间'); return }
    expire = typeof form.expire === 'string' ? form.expire : fmtDateTime(new Date(form.expire))
  } else expire = fmtDateTime(addDays(+form.expPreset))
  const ids = [...form.toolsetIds]
  const { full } = issueClient({
    name, tag: form.type, qps: +form.qps, quota: +form.quota || 20000, expire, toolsetIds: ids, userId: form.userId,
  })
  visible.value = false
  Object.assign(form, { name: '', type: 'blue', qps: 10, quota: 20000, expPreset: '90', expire: undefined, toolsetIds: [], userId: '' })
  const first = store.toolsets.find((s) => s.id === ids[0])
  if (first) showToolsetConfig(first, { fullKey: full, expire })
  else Message.success('密钥已签发')
}
function disablePastDate(current) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return current.getTime() < start.getTime()
}
function openRenew(c) {
  renewTarget.value = store.clients.find((x) => x.id === c.id) || c
  renewForm.preset = '90'
  renewForm.expire = addDays(90)
  renewVisible.value = true
}
function onRenewPreset(v) {
  if (v !== 'never' && v !== 'custom') renewForm.expire = addDays(+v)
}
function confirmRenew() {
  const c = renewTarget.value
  if (!c) return
  let next = null
  if (renewForm.preset === 'never') {
    next = null
  } else {
    if (!renewForm.expire) { Message.warning('请选择到期时间'); return }
    next = typeof renewForm.expire === 'string' ? renewForm.expire : fmtDateTime(new Date(renewForm.expire))
  }
  c.expire = next
  if (c.status !== 'limited') c.status = 'normal'
  renewVisible.value = false
  Message.success(next ? `${c.name} 已续期至 ${String(next).slice(0, 16)}` : `${c.name} 已设为长期有效`)
}
function openQuota(c) {
  const target = store.clients.find((x) => x.id === c.id) || c
  quotaTarget.value = target
  const q = target.quota || 20000
  quotaForm.quota = q
  quotaForm.quotaPreset = QUOTA_PRESETS.includes(q) ? String(q) : 'custom'
  quotaForm.qps = QPS_PRESETS.includes(target.qps) ? target.qps : target.qps || 10
  quotaVisible.value = true
}
function onQuotaPreset(v) {
  if (v !== 'custom') quotaForm.quota = +v
}
const quotaPreview = computed(() => {
  const c = quotaTarget.value
  const q = +quotaForm.quota || 0
  if (!c || !q) return { p: 0, over: false, left: 0 }
  const p = (c.calls / q) * 100
  return { p, over: c.calls >= q, left: Math.max(0, q - c.calls) }
})
function confirmQuota() {
  const c = quotaTarget.value
  if (!c) return
  const quota = +quotaForm.quota
  const qps = +quotaForm.qps
  if (!quota || quota < 1000) { Message.warning('日配额至少 1,000 次'); return false }
  if (!qps || qps < 1) { Message.warning('QPS 至少为 1'); return false }
  c.quota = quota
  c.qps = qps
  if (c.calls >= quota) c.status = 'limited'
  else if (c.status === 'limited') c.status = 'normal'
  quotaVisible.value = false
  Message.success(`${c.name} 已调整为日配额 ${fmt(quota)} · ${qps} QPS`)
}
async function copyKey(c) {
  await copyText(c.secret || c.key)
  Message.success(c.secret ? '已复制完整 Key' : '已复制脱敏 Key（完整密钥仅创建时展示）')
}
function revoke(c) {
  const target = store.clients.find((x) => x.id === c.id) || c
  Modal.confirm({
    title: '吊销密钥',
    content: `确认吊销 ${target.name} 的 API Key？吊销后立即无法调用已绑定的工具集。`,
    onOk: () => {
      target.status = 'revoked'
      target.toolsetIds = []
      Message.success('密钥已吊销')
    },
  })
}
function gotoSet(ts) {
  store.hubTab = 'toolsets'
  emit('goto', 'services')
}
function openCreate() {
  form.toolsetIds = store.clientFlt.toolsetId ? [store.clientFlt.toolsetId] : []
  form.userId = store.clientFlt.userId || form.userId || ''
  visible.value = true
}
function clearFlt() {
  store.clientFlt.toolsetId = ''
}
function clearUserFlt() {
  store.clientFlt.userId = ''
  store.clientFlt.openIssue = false
}
watch(() => store.clientFlt.openIssue, (open) => {
  if (!open) return
  if (store.clientFlt.userId) form.userId = store.clientFlt.userId
  visible.value = true
  store.clientFlt.openIssue = false
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>接入与密钥</h2>
        <div class="desc">入站凭证统一在此签发。每把 Key 必须挂到已开通用户，并绑定工具集；配额 / QPS / 到期与工具集配置不再各记一套。</div>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><icon-plus /></template>新建密钥
      </a-button>
    </div>
    <a-card :bordered="false" style="margin-bottom: 16px">
      <div class="filter-bar">
        <a-space wrap>
          <a-radio-group v-model="statusTab" type="button" size="small">
            <a-radio value="all">全部</a-radio>
            <a-radio value="正常">正常</a-radio>
            <a-radio value="即将到期">即将到期</a-radio>
            <a-radio value="限流中">限流中</a-radio>
            <a-radio value="已过期">已过期</a-radio>
            <a-radio value="已吊销">已吊销</a-radio>
          </a-radio-group>
          <a-input-search
            v-model="store.clientFlt.kw"
            allow-clear
            placeholder="搜索接入端 / Key / 归属用户"
            :style="{ width: '260px' }"
          />
        </a-space>
        <a-space>
          <a-tag v-if="fltSet" color="arcoblue" closable @close="clearFlt">工具集：{{ fltSet.name }}</a-tag>
          <a-tag v-if="fltUser" color="green" closable @close="clearUserFlt">归属：{{ fltUser.name }}</a-tag>
          <span class="muted">{{ rows.length }} 个接入端</span>
        </a-space>
      </div>
      <a-table :data="rows" :pagination="false" row-key="id" :scroll="{ x: 1520 }" hoverable stripe>
        <template #columns>
          <a-table-column title="接入端" data-index="name" :width="140" />
          <a-table-column title="归属用户" :width="120">
            <template #cell="{ record }">
              <span v-if="ownerOf(record.userId)">
                {{ ownerOf(record.userId).name }}
                <span class="muted" style="font-size:12px"> · {{ ownerOf(record.userId).kind === 'customer' ? '外部客户' : '内部' }}</span>
              </span>
              <span v-else class="muted">未挂账号</span>
            </template>
          </a-table-column>
          <a-table-column title="绑定工具集" :width="220">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag v-for="ts in record.sets" :key="ts.id" color="arcoblue" size="small" @click="gotoSet(ts)">{{ ts.name }}</a-tag>
                <span v-if="!record.sets.length" class="muted">未绑定</span>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="类型" :width="110">
            <template #cell="{ record }"><a-tag :color="record.tag">{{ record.type }}</a-tag></template>
          </a-table-column>
          <a-table-column title="API Key" :width="180">
            <template #cell="{ record }">
              <span class="mono" style="font-size:12px">{{ record.key }}</span>
              <a-button type="text" size="mini" @click.stop="copyKey(record)">复制</a-button>
            </template>
          </a-table-column>
          <a-table-column title="今日调用" align="right" :width="100">
            <template #cell="{ record }">{{ fmt(record.calls) }}</template>
          </a-table-column>
          <a-table-column title="日配额用量" :width="220">
            <template #cell="{ record }">
              <a-progress
                :percent="Math.min(record.p / 100, 1)"
                :status="record.p > 90 ? 'danger' : record.p > 70 ? 'warning' : 'normal'"
                size="small"
                :show-text="false"
              />
              <span style="font-size:12px;color:var(--color-text-2)">{{ record.p.toFixed(0) }}%（{{ fmt(record.calls) }} / {{ fmt(record.quota) }}）</span>
            </template>
          </a-table-column>
          <a-table-column title="QPS 限流" :width="90">
            <template #cell="{ record }">{{ record.qps }} QPS</template>
          </a-table-column>
          <a-table-column title="到期时间" :width="140">
            <template #cell="{ record }"><a-tag :color="record.ex.tag">{{ record.ex.label }}</a-tag></template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }"><a-tag :color="record.st.tag">{{ record.st.text }}</a-tag></template>
          </a-table-column>
          <a-table-column title="最近活跃" data-index="last" :width="100" />
          <a-table-column title="操作" :width="200" :fixed="'right'">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="openRenew(record)">续期</a-button>
              <a-button type="text" size="mini" @click="openQuota(record)">调额</a-button>
              <a-button type="text" status="danger" size="mini" @click="revoke(record)">吊销</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
    <a-row :gutter="16">
      <a-col :xs="24" :md="8" style="margin-bottom:16px">
        <a-card title="鉴权方式" :bordered="false">
          <div class="kv">
            <span class="k">Header</span><span class="mono" style="font-size:12px">Authorization: Bearer mcp-sk-***</span>
            <span class="k">签发</span><span>挂到用户账号，支持一键吊销</span>
            <span class="k">传输</span><span>强制 TLS 1.3</span>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8" style="margin-bottom:16px">
        <a-card title="限流与到期" :bordered="false">
          <div class="kv">
            <span class="k">日配额 / QPS</span><span>超限返回 429 + Retry-After</span>
            <span class="k">到期时间</span><span>过期即 AUTH_FAIL，与配额无关</span>
            <span class="k">提前提醒</span><span>到期前 7 天飞书 + 企业微信</span>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8" style="margin-bottom:16px">
        <a-card title="接入指引" :bordered="false">
          <div class="kv">
            <span class="k">①</span><span>创建工具集时签发，或在此新建并绑定工具集</span>
            <span class="k">②</span><span>写入 mcp.json：工具集 url + Authorization Bearer</span>
            <span class="k">③</span><span>tools/list 仅返回该 Key 已授权工具集中的工具</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-modal v-model:visible="visible" title="新建接入密钥" :width="600" @ok="submit" :ok-text="'创建'" unmount-on-close>
      <a-form :model="form" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="归属用户 *" extra="停用该账号时，名下 Key 全部失效">
              <a-select v-model="form.userId" allow-search placeholder="选择已开通账号">
                <a-option v-for="u in activeUsers" :key="u.id" :value="u.id">{{ u.name }} · {{ u.role }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12"><a-form-item label="接入端名称"><a-input v-model="form.name" placeholder="如：研究助理 Bot" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="类型">
              <a-select v-model="form.type">
                <a-option v-for="o in typeOpts" :key="o.value" :value="o.value">{{ o.label }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="QPS 限流">
              <a-select v-model="form.qps" :options="[5,10,20,50].map(n => ({ value: n, label: String(n) }))" />
            </a-form-item>
          </a-col>
          <a-col :span="12"><a-form-item label="日配额（次）"><a-input-number v-model="form.quota" :min="1000" :style="{ width: '100%' }" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="有效期">
              <a-select v-model="form.expPreset">
                <a-option value="7">7 天</a-option>
                <a-option value="30">30 天</a-option>
                <a-option value="90">90 天</a-option>
                <a-option value="365">1 年</a-option>
                <a-option value="never">长期有效</a-option>
                <a-option value="custom">指定到期时间</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col v-if="form.expPreset === 'custom'" :span="12">
            <a-form-item label="到期时间">
              <a-date-picker v-model="form.expire" show-time format="YYYY-MM-DD HH:mm:ss" :style="{ width: '100%' }" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="授权工具集 *" extra="该 Key 只能调用勾选的工具集端点。可多选；配额与到期在本页统一管理。">
              <a-select v-model="form.toolsetIds" multiple allow-search placeholder="选择 MCP 工具集">
                <a-option v-for="ts in store.toolsets" :key="ts.id" :value="ts.id">{{ ts.name }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-alert>到期后网关拒绝鉴权（与日配额 / QPS 独立）。默认 90 天；到期前 7 天会触发告警。长期有效密钥仅建议内部联调使用。</a-alert>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="renewVisible"
      :title="'续期 — ' + (renewTarget?.name || '')"
      :width="480"
      @ok="confirmRenew"
      :ok-text="'确认续期'"
      unmount-on-close
    >
      <a-form :model="renewForm" layout="vertical">
        <a-form-item label="当前到期">
          <span>{{ renewTarget?.expire || '长期有效' }}</span>
        </a-form-item>
        <a-form-item label="续期方式">
          <a-select v-model="renewForm.preset" @change="onRenewPreset">
            <a-option value="30">延长 30 天</a-option>
            <a-option value="90">延长 90 天</a-option>
            <a-option value="365">延长 1 年</a-option>
            <a-option value="custom">指定到期时间</a-option>
            <a-option value="never">长期有效</a-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="renewForm.preset !== 'never'" label="到期时间">
          <a-date-picker
            v-model="renewForm.expire"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="disablePastDate"
            :style="{ width: '100%' }"
            @change="renewForm.preset = 'custom'"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="quotaVisible"
      :title="'调额 — ' + (quotaTarget?.name || '')"
      :width="560"
      @ok="confirmQuota"
      :ok-text="'确认调整'"
      unmount-on-close
    >
      <div class="quota-now">
        <div class="quota-now-hd">
          <span>今日已用</span>
          <span class="mono">{{ fmt(quotaTarget?.calls || 0) }} / {{ fmt(quotaTarget?.quota || 0) }}</span>
        </div>
        <a-progress
          :percent="Math.min((quotaTarget?.quota ? (quotaTarget.calls / quotaTarget.quota) : 0), 1)"
          :status="(quotaTarget?.quota && quotaTarget.calls / quotaTarget.quota > 0.9) ? 'danger' : 'normal'"
          size="small"
          :show-text="false"
        />
        <div class="muted" style="margin-top:8px">当前 {{ quotaTarget?.qps }} QPS · 超限返回 429，与到期时间独立</div>
      </div>
      <a-form :model="quotaForm" layout="vertical" style="margin-top:16px">
        <a-form-item label="日配额（次）">
          <div class="quota-row">
            <a-select v-model="quotaForm.quotaPreset" @change="onQuotaPreset">
              <a-option v-for="n in QUOTA_PRESETS" :key="n" :value="String(n)">{{ fmt(n) }} 次 / 日</a-option>
              <a-option value="custom">自定义</a-option>
            </a-select>
            <a-input-number
              v-model="quotaForm.quota"
              :min="1000"
              :step="1000"
              hide-button
              :formatter="formatQuota"
              :parser="parseQuota"
              placeholder="日配额"
              @change="onQuotaNumber"
            />
          </div>
        </a-form-item>
        <a-form-item label="QPS 限流">
          <a-radio-group v-model="quotaForm.qps" type="button">
            <a-radio v-for="n in QPS_PRESETS" :key="n" :value="n">{{ n }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="调整后预览">
          <a-progress
            :percent="Math.min(quotaPreview.p / 100, 1)"
            :status="quotaPreview.over ? 'danger' : quotaPreview.p > 70 ? 'warning' : 'normal'"
            size="small"
            :show-text="false"
          />
          <div class="quota-preview-cap">
            {{ fmt(quotaTarget?.calls || 0) }} / {{ fmt(quotaForm.quota || 0) }}
            <span class="muted"> · </span>
            <span :style="{ color: quotaPreview.over ? 'rgb(245, 63, 63)' : 'inherit' }">
              {{ quotaPreview.over ? '将立即限流' : `剩余 ${fmt(quotaPreview.left)} 次（${quotaPreview.p.toFixed(0)}%）` }}
            </span>
          </div>
        </a-form-item>
      </a-form>
      <a-alert v-if="quotaPreview.over" type="warning">今日调用已超过新配额，保存后立即进入限流（429），次日 0 点重置。</a-alert>
      <a-alert v-else>日配额按自然日重置；QPS 是瞬时限流。两者互不影响到期鉴权。</a-alert>
    </a-modal>
  </div>
</template>
