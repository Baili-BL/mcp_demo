<script setup>
import { computed, onDeactivated, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { store, USER_KINDS, USER_ROLES, kindMeta, createInvite, inviteUrl, WECOM_DEPTS, WECOM_MEMBERS, wecomMemberStatus, importStaffFromWecom } from '../store'
import { copyText } from '../utils'

const emit = defineEmits(['goto'])
const statusTab = ref('all')
const kindTab = ref('all')
const inviteVisible = ref(false)
const inviteStep = ref('form')
const lastInvite = ref(null)
const staffRoles = USER_ROLES.filter((r) => r.value !== '客户')
const invite = reactive({ kind: 'staff', name: '', role: '研究员', org: '数智中心' })
const wecomDepts = ref([])
const wecomKw = ref('')
const wecomPicked = ref([])
const wecomLoading = ref(false)
const wecomReady = ref(false)

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
  Object.assign(invite, { kind: 'staff', name: '', role: '研究员', org: '数智中心' })
  inviteStep.value = 'form'
  lastInvite.value = null
  wecomDepts.value = []
  wecomKw.value = ''
  wecomPicked.value = []
  wecomLoading.value = false
  wecomReady.value = false
}
function loadWecom() {
  wecomLoading.value = true
  wecomReady.value = false
  setTimeout(() => {
    wecomLoading.value = false
    wecomReady.value = true
  }, 480)
}
function onKind(k) {
  invite.kind = k
  if (k === 'customer') {
    invite.role = '客户'
    if (!invite.org || invite.org === '数智中心') invite.org = ''
  } else {
    if (invite.role === '客户') invite.role = '研究员'
    if (!invite.org) invite.org = '数智中心'
    if (!wecomReady.value && !wecomLoading.value) loadWecom()
  }
}
function openInvite() {
  resetInvite()
  invite.org = '数智中心'
  inviteVisible.value = true
  loadWecom()
}
const wecomRows = computed(() => {
  const kw = wecomKw.value.trim()
  return WECOM_MEMBERS.filter((m) => {
    if (wecomDepts.value.length && !wecomDepts.value.includes(m.dept)) return false
    if (!kw) return true
    return [m.name, m.mobile, m.email, m.userid, m.dept, m.title].join(' ').includes(kw)
  }).map((m) => ({ ...m, disabled: wecomMemberStatus(m).bound }))
})
function wecomDisabled(m) {
  return wecomMemberStatus(m).bound
}
function wecomStatusLabel(m) {
  const s = wecomMemberStatus(m)
  if (s.bound) return '已开通'
  if (s.status) return s.status
  return '可开通'
}
function wecomStatusColor(m) {
  const label = wecomStatusLabel(m)
  if (label === '已开通') return 'green'
  if (label === '待注册') return 'orangered'
  if (label === '待审批') return 'arcoblue'
  return 'gray'
}
const wecomRowSelection = {
  type: 'checkbox',
  showCheckedAll: true,
  onlyCurrent: false,
}
const inviteOkText = computed(() => {
  if (invite.kind === 'staff') return '开通所选员工'
  return inviteStep.value === 'done' ? '完成' : '生成邀请链接'
})
function submitInvite() {
  if (invite.kind === 'staff') {
    const members = WECOM_MEMBERS.filter((m) => wecomPicked.value.includes(m.userid) && !wecomDisabled(m))
    if (!members.length) { Message.warning('请从企业微信通讯录选择要开通的同事'); return false }
    const { created, updated } = importStaffFromWecom(members, invite.role)
    const n = created.length + updated.length
    if (!n) { Message.warning('所选同事均已开通'); return false }
    Message.success(`已通过企业微信开通 ${n} 名内部员工`)
    wecomPicked.value = []
    return true
  }
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
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>用户管理</h2>
        <div class="desc">内部员工从企业微信通讯录选择开通，手机号与企业邮箱由企微返回；外部客户仍持邀请链接，用手机号注册，登录邮箱选填。</div>
      </div>
      <a-button type="primary" @click="openInvite">
        <template #icon><icon-plus /></template>开通用户
      </a-button>
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
          <a-table-column title="姓名" :width="140">
            <template #cell="{ record }">
              {{ record.name }}
              <a-tag v-if="record.wecomUserId || record.source === 'wecom'" size="small" color="arcoblue" style="margin-left:6px">企微</a-tag>
            </template>
          </a-table-column>
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
              <a-button v-if="record.status === '待注册' && record.kind === 'customer'" type="text" size="mini" @click="copyInvite(record)">复制链接</a-button>
              <a-button
                v-if="record.status === '待注册' && record.kind === 'customer'"
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
            <span class="k">内部</span><span>企业微信通讯录选人开通，手机号 / 企业邮箱由 API 返回</span>
            <span class="k">外部</span><span>只能持邀请链接注册，7 天内填写姓名与手机号，登录邮箱选填，默认 90 天低配额</span>
            <span class="k">密钥</span><span>账号「正常」后再到「接入与密钥」签发</span>
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
      title="开通用户"
      :width="invite.kind === 'staff' ? 760 : 520"
      @before-ok="submitInvite"
      :ok-text="inviteOkText"
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

        <template v-if="invite.kind === 'staff'">
          <a-form :model="invite" layout="vertical" style="margin-top:16px">
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="预置角色" required>
                  <a-select v-model="invite.role" placeholder="选择角色">
                    <a-option v-for="r in staffRoles" :key="r.value" :value="r.value">{{ r.value }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="内部团队">
                  <a-select
                    v-model="wecomDepts"
                    multiple
                    allow-clear
                    allow-search
                    placeholder="下拉勾选团队，不选则全部"
                    :max-tag-count="2"
                  >
                    <a-option v-for="d in WECOM_DEPTS" :key="d" :value="d">{{ d }}</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
          <a-alert style="margin-bottom:12px">调用企业微信通讯录 API（addressbook）按部门拉人。已开通同事不可再选；待注册 / 待审批选中后直接变为正常。</a-alert>
          <div class="wecom-toolbar">
            <a-input-search
              v-model="wecomKw"
              allow-clear
              placeholder="姓名 / 手机 / 邮箱 / userid"
              :style="{ width: '260px' }"
            />
          </div>
          <a-spin :loading="wecomLoading" tip="正在调用企业微信通讯录 API…">
            <a-table
              v-if="wecomReady"
              :data="wecomRows"
              :pagination="false"
              row-key="userid"
              size="small"
              hoverable
              :scroll="{ y: 280 }"
              :row-selection="wecomRowSelection"
              :row-class="(record) => record.disabled ? 'wecom-bound' : undefined"
              v-model:selectedKeys="wecomPicked"
            >
              <template #columns>
                <a-table-column title="姓名" data-index="name" :width="90" />
                <a-table-column title="部门" data-index="dept" :width="100" />
                <a-table-column title="职务" data-index="title" :width="110" />
                <a-table-column title="手机" :width="120">
                  <template #cell="{ record }"><span class="mono" style="font-size:12px">{{ record.mobile }}</span></template>
                </a-table-column>
                <a-table-column title="企业邮箱" :width="180">
                  <template #cell="{ record }"><span class="mono" style="font-size:12px">{{ record.email }}</span></template>
                </a-table-column>
                <a-table-column title="状态" :width="90">
                  <template #cell="{ record }">
                    <a-tag :color="wecomStatusColor(record)" size="small">{{ wecomStatusLabel(record) }}</a-tag>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <div v-else class="wecom-placeholder" />
          </a-spin>
          <p class="muted" style="margin-top:8px">已选 {{ wecomPicked.length }} 人 · 共 {{ wecomRows.length }} 人</p>
        </template>

        <template v-else>
          <a-form :model="invite" layout="vertical" style="margin-top:16px">
            <a-form-item label="客户公司" required>
              <a-input v-model="invite.org" placeholder="如 某铜业集团" />
            </a-form-item>
            <a-form-item label="受邀人姓名（选填）">
              <a-input v-model="invite.name" placeholder="可不填，对方注册时自己填写" />
            </a-form-item>
          </a-form>
          <a-alert>外部客户不在企业微信通讯录。把链接发给对方，7 天内用姓名和手机号注册即可，登录邮箱选填。</a-alert>
        </template>
      </template>
      <template v-else>
        <a-alert type="success" style="margin-bottom:14px">已生成外部客户注册链接，发给对方即可。</a-alert>
        <div class="invite-url">{{ lastInvite?.url }}</div>
        <a-space style="margin-top:12px">
          <a-button type="primary" @click="copyLast">
            <template #icon><icon-copy /></template>复制链接
          </a-button>
          <a-button :href="lastInvite?.url" target="_blank" rel="noopener noreferrer">打开注册页</a-button>
        </a-space>
        <p class="muted" style="margin-top:12px">对方提交姓名、手机号后，状态变为「正常」，再在「接入与密钥」签发。登录邮箱选填。</p>
      </template>
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
.wecom-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.wecom-placeholder { min-height: 160px; }
:deep(.wecom-bound) {
  color: var(--color-text-3);
  background: #f7f8fa;
}
</style>
