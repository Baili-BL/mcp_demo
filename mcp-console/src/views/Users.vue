<script setup>
import { computed, onDeactivated, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { store, USER_KINDS, USER_ROLES, kindMeta, roleTag, createInvite, inviteUrl } from '../store'
import { copyText } from '../utils'

const emit = defineEmits(['goto'])
const statusTab = ref('all')
const kindTab = ref('all')
const inviteVisible = ref(false)
const applyVisible = ref(false)
const inviteStep = ref('form')
const lastInvite = ref(null)
const staffRoles = USER_ROLES.filter((r) => r.value !== '客户')
const invite = reactive({ kind: 'staff', name: '', role: '研究员', org: '数智中心' })
const apply = reactive({ name: '', phone: '', email: '', role: '开发工程师', team: '数智中心', note: '' })

const ST = {
  正常: { tag: 'green' },
  待注册: { tag: 'orangered' },
  待审批: { tag: 'arcoblue' },
  停用: { tag: 'gray' },
}

const rows = computed(() => {
  const q = store.userFlt.kw.trim().toLowerCase()
  return store.users.filter((u) => {
    if (kindTab.value !== 'all' && u.kind !== kindTab.value) return false
    if (statusTab.value !== 'all' && u.status !== statusTab.value) return false
    if (!q) return true
    const kind = kindMeta(u.kind).label
    const blob = [u.name, u.phone, u.email, u.role, u.team, u.status, u.note, kind, u.kind === 'customer' ? '外部客户 合作方' : '内部员工 分公司'].join(' ')
    return blob.toLowerCase().includes(q)
  })
})

function resetInvite() {
  Object.assign(invite, { kind: 'staff', name: '', role: '研究员', org: invite.kind === 'customer' ? '客户公司' : '数智中心' })
  inviteStep.value = 'form'
  lastInvite.value = null
}
function onKind(k) {
  invite.kind = k
  if (k === 'customer') {
    invite.role = '客户'
    if (!invite.org || invite.org === '数智中心') invite.org = ''
  } else {
    if (invite.role === '客户') invite.role = '研究员'
    if (!invite.org) invite.org = '数智中心'
  }
}
function openInvite() {
  resetInvite()
  invite.org = '数智中心'
  inviteVisible.value = true
}
function submitInvite() {
  if (inviteStep.value === 'done') {
    resetInvite()
    return true
  }
  const { url, user } = createInvite({
    kind: invite.kind,
    name: invite.name,
    role: invite.role,
    org: invite.org,
  })
  lastInvite.value = { url, user, kind: invite.kind }
  inviteStep.value = 'done'
  copyText(url)
  Message.success('邀请链接已生成并复制')
  return false
}
async function copyLast() {
  if (!lastInvite.value?.url) return
  await copyText(lastInvite.value.url)
  Message.success('注册链接已复制')
}
async function copyInvite(u) {
  if (!u.inviteToken) { Message.warning('该用户没有邀请链接'); return }
  await copyText(inviteUrl(u.inviteToken))
  Message.success('注册链接已复制')
}
function registerHref(u) {
  return u?.inviteToken ? inviteUrl(u.inviteToken) : undefined
}
function submitApply() {
  const name = apply.name.trim()
  const phone = apply.phone.trim()
  const email = apply.email.trim()
  if (!name || !phone || !email) { Message.warning('请填写姓名、手机号与登录邮箱'); return false }
  if (!/^1\d{10}$/.test(phone)) { Message.warning('请填写 11 位手机号'); return false }
  store.users.unshift({
    id: 'u-' + Date.now().toString(36),
    name, phone, email,
    kind: 'staff',
    role: apply.role, tag: roleTag(apply.role),
    team: apply.team.trim() || '数智中心', status: '待审批',
    created: new Date().toISOString().slice(0, 10), last: '—',
    note: apply.note.trim(),
  })
  Object.assign(apply, { name: '', phone: '', email: '', role: '开发工程师', team: '数智中心', note: '' })
  Message.success('申请已提交，等待管理员审批')
  return true
}
function gotoIssue(u) {
  store.clientFlt.userId = u.id
  store.clientFlt.openIssue = true
  emit('goto', 'clients')
}
function approve(u) {
  const t = store.users.find((x) => x.id === u.id)
  if (!t) return
  t.status = '正常'
  t.last = '刚刚'
  Message.success(`${t.name} 已通过`)
}
function disable(u) {
  const t = store.users.find((x) => x.id === u.id)
  if (!t) return
  Modal.confirm({
    title: '停用账号',
    content: `停用 ${t.name} 后，其名下 API Key 将全部失效。`,
    onOk: () => {
      t.status = '停用'
      Message.success('账号已停用')
    },
  })
}
onDeactivated(() => {
  inviteVisible.value = false
  applyVisible.value = false
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>用户管理</h2>
        <div class="desc">邀请时生成注册链接。对方用手机号 + 登录邮箱完成注册；身份分为内部员工与外部客户。</div>
      </div>
      <a-space>
        <a-button @click="applyVisible = true">内部自助申请</a-button>
        <a-button type="primary" @click="openInvite">
          <template #icon><icon-plus /></template>邀请用户
        </a-button>
      </a-space>
    </div>
    <a-card :bordered="false" style="margin-bottom:16px">
      <div class="filter-bar">
        <a-space wrap>
          <a-radio-group v-model="kindTab" type="button" size="small">
            <a-radio value="all">全部身份</a-radio>
            <a-radio value="staff">内部员工</a-radio>
            <a-radio value="customer">外部客户</a-radio>
          </a-radio-group>
          <a-radio-group v-model="statusTab" type="button" size="small">
            <a-radio value="all">全部状态</a-radio>
            <a-radio value="正常">正常</a-radio>
            <a-radio value="待注册">待注册</a-radio>
            <a-radio value="待审批">待审批</a-radio>
            <a-radio value="停用">停用</a-radio>
          </a-radio-group>
          <a-input-search
            v-model="store.userFlt.kw"
            allow-clear
            placeholder="搜索姓名 / 手机 / 登录邮箱 / 公司"
            :style="{ width: '280px' }"
          />
        </a-space>
        <span class="muted">{{ rows.length }} 人</span>
      </div>
      <a-table :data="rows" :pagination="false" row-key="id" hoverable stripe :scroll="{ x: 1280 }">
        <template #columns>
          <a-table-column title="姓名" data-index="name" :width="110" />
          <a-table-column title="身份" :width="110">
            <template #cell="{ record }">
              <a-tag :color="kindMeta(record.kind).tag" size="small">{{ kindMeta(record.kind).label }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="手机" :width="130">
            <template #cell="{ record }"><span class="mono" style="font-size:12px">{{ record.phone || '—' }}</span></template>
          </a-table-column>
          <a-table-column title="登录邮箱" data-index="email" :width="200">
            <template #cell="{ record }"><span class="mono" style="font-size:12px">{{ record.email || '—' }}</span></template>
          </a-table-column>
          <a-table-column title="角色" :width="120">
            <template #cell="{ record }"><a-tag :color="record.tag">{{ record.role }}</a-tag></template>
          </a-table-column>
          <a-table-column title="团队 / 公司" data-index="team" :width="130" />
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }"><a-tag :color="ST[record.status]?.tag || 'gray'">{{ record.status }}</a-tag></template>
          </a-table-column>
          <a-table-column title="开通" data-index="created" :width="110" />
          <a-table-column title="操作" :width="240" :fixed="'right'">
            <template #cell="{ record }">
              <a-button v-if="record.status === '待审批'" type="text" size="mini" @click="approve(record)">通过</a-button>
              <a-button v-if="record.status === '待注册'" type="text" size="mini" @click="copyInvite(record)">复制链接</a-button>
              <a-button
                v-if="record.status === '待注册'"
                type="text"
                size="mini"
                :href="registerHref(record)"
                target="_blank"
                rel="noopener noreferrer"
              >打开注册</a-button>
              <a-button v-if="record.status === '正常'" type="text" size="mini" @click="gotoIssue(record)">去签发</a-button>
              <a-button v-if="record.status !== '停用'" type="text" status="danger" size="mini" @click="disable(record)">停用</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
    <a-row :gutter="16">
      <a-col :xs="24" :md="12" style="margin-bottom:16px">
        <a-card title="开通规则" :bordered="false">
          <div class="kv">
            <span class="k">邀请</span><span>生成链接发给对方，7 天内用手机号 + 登录邮箱注册</span>
            <span class="k">内部</span><span>员工走邀请或自助申请；自助需管理员审批</span>
            <span class="k">外部</span><span>客户只能持邀请链接注册，默认 90 天、低配额</span>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="12" style="margin-bottom:16px">
        <a-card title="角色权限" :bordered="false">
          <div class="kv">
            <span class="k">管理员</span><span>用户、服务上线、签发与调额</span>
            <span class="k">开发 / 研究员</span><span>内部员工：登记工具或使用已授权工具集</span>
            <span class="k">客户</span><span>外部客户：仅自己的配置与已授权工具集</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      v-model:visible="inviteVisible"
      title="邀请用户"
      :width="520"
      @before-ok="submitInvite"
      :ok-text="inviteStep === 'done' ? '完成' : '生成邀请链接'"
      unmount-on-close
      @cancel="resetInvite"
    >
      <template v-if="inviteStep === 'form'">
        <div class="kind-grid">
          <button
            v-for="k in USER_KINDS"
            :key="k.value"
            type="button"
            class="kind-card"
            :class="{ on: invite.kind === k.value }"
            @click="onKind(k.value)"
          >
            <div class="kind-t">{{ k.label }}</div>
            <div class="kind-d">{{ k.desc }}</div>
          </button>
        </div>
        <a-form :model="invite" layout="vertical" style="margin-top:16px">
          <a-form-item :label="invite.kind === 'customer' ? '客户公司' : '所属团队'" required>
            <a-input v-model="invite.org" :placeholder="invite.kind === 'customer' ? '如 某铜业集团' : '如 数智中心'" />
          </a-form-item>
          <a-form-item v-if="invite.kind === 'staff'" label="预置角色" required>
            <a-select v-model="invite.role">
              <a-option v-for="r in staffRoles" :key="r.value" :value="r.value">{{ r.value }}</a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="受邀人姓名（选填）">
            <a-input v-model="invite.name" placeholder="可不填，对方注册时自己填写" />
          </a-form-item>
        </a-form>
        <a-alert v-if="invite.kind === 'customer'">外部客户不能自助申请。把链接发给对方，用手机号和登录邮箱注册即可。</a-alert>
        <a-alert v-else>链接 7 天有效。对方打开后填写手机号与登录邮箱，无需管理员再录入联系方式。</a-alert>
      </template>
      <template v-else>
        <a-alert type="success" style="margin-bottom:14px">
          已生成{{ lastInvite?.kind === 'customer' ? '外部客户' : '内部员工' }}注册链接，发给对方即可。
        </a-alert>
        <div class="invite-url">{{ lastInvite?.url }}</div>
        <a-space style="margin-top:12px">
          <a-button type="primary" @click="copyLast">
            <template #icon><icon-copy /></template>复制链接
          </a-button>
          <a-button :href="lastInvite?.url" target="_blank" rel="noopener noreferrer">打开注册页</a-button>
        </a-space>
        <p class="muted" style="margin-top:12px">对方提交姓名、手机号、登录邮箱后，状态变为「正常」，再在「接入与密钥」签发。</p>
      </template>
    </a-modal>

    <a-modal v-model:visible="applyVisible" title="内部员工自助申请" :width="480" @before-ok="submitApply" ok-text="提交申请" unmount-on-close>
      <a-form :model="apply" layout="vertical">
        <a-form-item label="姓名" required><a-input v-model="apply.name" /></a-form-item>
        <a-form-item label="手机号" required><a-input v-model="apply.phone" placeholder="11 位手机号" maxlength="11" /></a-form-item>
        <a-form-item label="登录邮箱" required><a-input v-model="apply.email" placeholder="企业邮箱" /></a-form-item>
        <a-form-item label="申请角色" required>
          <a-select v-model="apply.role">
            <a-option v-for="r in staffRoles" :key="r.value" :value="r.value">{{ r.value }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="团队"><a-input v-model="apply.team" /></a-form-item>
        <a-form-item label="用途"><a-textarea v-model="apply.note" placeholder="需要哪些 MCP 服务、预计 QPS" :auto-size="{ minRows: 3 }" /></a-form-item>
      </a-form>
      <a-alert>仅分公司内部员工可自助申请。外部客户请走「邀请用户」链接。</a-alert>
    </a-modal>
  </div>
</template>

<style scoped>
.kind-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.kind-card {
  text-align: left;
  border: 1px solid var(--color-border-2);
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
}
.kind-card.on {
  border-color: rgb(var(--primary-6));
  background: rgb(var(--primary-1));
}
.kind-t { font-weight: 600; font-size: 14px; color: var(--color-text-1); }
.kind-d { margin-top: 4px; font-size: 12px; color: var(--color-text-3); line-height: 1.45; }
.invite-url {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
  background: #f6f6f9;
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--color-text-1);
}
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
</style>
