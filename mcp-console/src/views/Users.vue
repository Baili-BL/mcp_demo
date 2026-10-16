<script setup>
import { computed, onDeactivated, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { store, USER_ROLES, kindMeta, WECOM_DEPTS, WECOM_MEMBERS, wecomMemberStatus, importStaffFromWecom, registerUsers, PHONE_RE, EMAIL_RE, gotoIssueKey } from '../store'
import { buildUserImportXlsx, buildUserExportXlsx, parseUserImportFile, downloadBlob } from '../excel'

const emit = defineEmits(['goto'])
const statusTab = ref('all')
const kindTab = ref('all')
const regVisible = ref(false)
const regMode = ref('wecom')
const staffRoles = USER_ROLES.filter((r) => r.value !== '客户')
const wecomRole = ref('研究员')
const impRows = ref([])
const pasteOpen = ref(false)
const pasteText = ref('')
const excelInput = ref(null)
const excelBusy = ref(false)
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

function blankRow() {
  return { key: Math.random().toString(36).slice(2), phone: '', name: '', email: '' }
}
function resetReg() {
  regMode.value = 'wecom'
  wecomRole.value = '研究员'
  wecomDepts.value = []
  wecomKw.value = ''
  wecomPicked.value = []
  wecomLoading.value = false
  wecomReady.value = false
  impRows.value = [blankRow()]
  pasteOpen.value = false
  pasteText.value = ''
  excelBusy.value = false
}
function loadWecom() {
  wecomLoading.value = true
  wecomReady.value = false
  setTimeout(() => {
    wecomLoading.value = false
    wecomReady.value = true
  }, 480)
}
function openReg() {
  resetReg()
  regVisible.value = true
  loadWecom()
}
function addRow() {
  impRows.value.push(blankRow())
}
function removeRow(key) {
  impRows.value = impRows.value.filter((r) => r.key !== key)
  if (!impRows.value.length) impRows.value = [blankRow()]
}
function applyPaste() {
  const parsed = pasteText.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [phone = '', name = '', email = ''] = line.split(/[,，\t]/).map((x) => x.trim())
    return { ...blankRow(), phone, name, email }
  })
  if (!parsed.length) { Message.warning('没有可识别的行'); return }
  const kept = impRows.value.filter((r) => r.phone || r.name || r.email)
  impRows.value = [...kept, ...parsed]
  pasteText.value = ''
  pasteOpen.value = false
  Message.success(`已识别 ${parsed.length} 行，请核对后注册`)
}
function appendImportRows(parsed) {
  if (!parsed.length) { Message.warning('没有可识别的行'); return }
  const kept = impRows.value.filter((r) => r.phone || r.name || r.email)
  impRows.value = [...kept, ...parsed.map((r) => ({ ...blankRow(), phone: r.phone, name: r.name, email: r.email }))]
  Message.success(`已识别 ${parsed.length} 行，请核对后注册`)
}
function downloadExcelTpl() {
  downloadBlob(buildUserImportXlsx(), '用户注册模板.xlsx')
}
function downloadUsers() {
  const list = rows.value.map((u) => ({
    ...u,
    groups: groupsOf(u).map((g) => g.name),
  }))
  if (!list.length) { Message.warning('当前没有可下载的用户'); return }
  downloadBlob(buildUserExportXlsx(list), '用户数据.xlsx')
  Message.success(`已导出 ${list.length} 人`)
}
async function onExcelFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  excelBusy.value = true
  try {
    const parsed = await parseUserImportFile(file)
    appendImportRows(parsed)
  } catch (err) {
    Message.error(err?.message || '无法读取该 Excel，请用模板另存后重试')
  } finally {
    excelBusy.value = false
  }
}
function rowError(r) {
  if (!r.phone && !r.name && !r.email) return ''
  if (!PHONE_RE.test(r.phone)) return '手机号需为 11 位'
  if (!r.name) return '请填写名称'
  if (r.email && !EMAIL_RE.test(r.email)) return '邮箱格式不正确'
  if (impRows.value.filter((x) => x.phone && x.phone === r.phone).length > 1) return '手机号重复'
  return ''
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
  if (s.bound) return '已注册'
  if (s.status) return s.status
  return '可注册'
}
function wecomStatusColor(m) {
  const label = wecomStatusLabel(m)
  if (label === '已注册') return 'green'
  if (label === '待注册') return 'orangered'
  if (label === '待审批') return 'arcoblue'
  return 'gray'
}
const wecomRowSelection = {
  type: 'checkbox',
  showCheckedAll: true,
  onlyCurrent: false,
}
const filledRows = computed(() => impRows.value.filter((r) => r.phone || r.name || r.email))
const regOkText = computed(() => {
  if (regMode.value === 'wecom') return wecomPicked.value.length ? `注册所选 ${wecomPicked.value.length} 人` : '注册'
  return filledRows.value.length ? `注册 ${filledRows.value.length} 人` : '注册'
})
function submitWecom() {
  const members = WECOM_MEMBERS.filter((m) => wecomPicked.value.includes(m.userid) && !wecomDisabled(m))
  if (!members.length) { Message.warning('请从企业微信通讯录选择要注册的同事'); return false }
  const { created, updated } = importStaffFromWecom(members, wecomRole.value)
  const n = created.length + updated.length
  if (!n) { Message.warning('所选同事均已注册'); return false }
  Message.success(`已注册 ${n} 名企业用户`)
  return true
}
function submitImport() {
  const rows = filledRows.value
  if (!rows.length) { Message.warning('请至少填写一行：手机号、名称'); return false }
  const bad = rows.map((r, i) => ({ i, err: rowError(r) })).find((x) => x.err)
  if (bad) { Message.warning(`第 ${bad.i + 1} 行：${bad.err}`); return false }
  const { created, skipped } = registerUsers(rows)
  if (!created.length) { Message.warning('所填手机号均已注册'); return false }
  Message.success(`已注册 ${created.length} 人${skipped.length ? `，跳过 ${skipped.length} 个已注册手机号` : ''}`)
  return true
}
function submitReg() {
  return regMode.value === 'wecom' ? submitWecom() : submitImport()
}
function onRegOk() {
  if (submitReg()) regVisible.value = false
}
function groupsOf(u) {
  const ids = new Set(u.groupIds || [])
  return store.userGroups.filter((g) => ids.has(g.id))
}
function gotoIssue(u) {
  gotoIssueKey({ userId: u.id })
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
  regVisible.value = false
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>用户管理</h2>
        <div class="desc">账号统一由管理员注册：添加企业用户（从企业微信通讯录选人），或导入注册（填写 / Excel 批量导入手机号、名称，邮箱选填）。</div>
      </div>
      <a-space>
        <a-button @click="downloadUsers">下载用户数据</a-button>
        <a-button type="primary" @click="openReg">
          <template #icon><icon-plus /></template>注册用户
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
      <a-table :data="rows" :pagination="false" row-key="id" hoverable stripe :scroll="{ x: 1440 }">
        <template #columns>
          <a-table-column title="姓名" :width="140">
            <template #cell="{ record }">
              {{ record.name }}
              <a-tag v-if="record.wecomUserId || record.source === 'wecom'" size="small" color="arcoblue" style="margin-left:6px">企微</a-tag>
              <a-tag v-else-if="record.source === 'import'" size="small" style="margin-left:6px">导入</a-tag>
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
          <a-table-column title="用户组" :width="160">
            <template #cell="{ record }">
              <a-space v-if="groupsOf(record).length" :size="4" wrap>
                <a-tag v-for="g in groupsOf(record)" :key="g.id" size="small">{{ g.name }}</a-tag>
              </a-space>
              <a-button v-else type="text" size="mini" @click="emit('goto', 'groups')">未入组</a-button>
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }"><a-tag :color="ST[record.status]?.tag || 'gray'">{{ record.status }}</a-tag></template>
          </a-table-column>
          <a-table-column title="注册时间" data-index="created" :width="110" />
          <a-table-column title="操作" :width="240" :fixed="'right'">
            <template #cell="{ record }">
              <a-button v-if="record.status === '待审批'" type="text" size="mini" @click="approve(record)">通过</a-button>
              <a-button v-if="record.status === '正常'" type="text" size="mini" @click="gotoIssue(record)">去签发</a-button>
              <a-button v-if="record.status !== '停用'" type="text" status="danger" size="mini" @click="disable(record)">停用</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
    <a-row :gutter="16">
      <a-col :xs="24" :md="12" style="margin-bottom:16px">
        <a-card title="注册规则" :bordered="false">
          <div class="kv">
            <span class="k">添加企业用户</span><span>从企业微信通讯录选人，手机号 / 企业邮箱由 API 返回，自动加入部门用户组</span>
            <span class="k">导入注册</span><span>填写手机号、名称，邮箱选填；可下载 Excel 模板批量导入，已注册手机号会跳过</span>
            <span class="k">密钥</span><span>注册后状态即为「正常」，再到「接入与密钥」签发</span>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="12" style="margin-bottom:16px">
        <a-card title="角色权限" :bordered="false">
          <div class="kv">
            <span class="k">管理员</span><span>用户、服务上线、签发与调额</span>
            <span class="k">开发 / 研究员</span><span>内部员工：登记工具或使用可用工具集</span>
            <span class="k">客户</span><span>外部客户：仅自己的配置与可用工具集</span>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-drawer
      :visible="regVisible"
      title="注册用户"
      :width="780"
      unmount-on-close
      popup-container="body"
      :ok-text="regOkText"
      @ok="onRegOk"
      @cancel="regVisible = false"
      @update:visible="regVisible = $event"
    >
        <div class="kind-grid">
          <button type="button" class="kind-card" :class="{ on: regMode === 'wecom' }" @click="regMode = 'wecom'">
            <div class="kind-t">添加企业用户</div>
            <div class="kind-d">从企业微信通讯录选择同事，手机号与企业邮箱由企微返回</div>
          </button>
          <button type="button" class="kind-card" :class="{ on: regMode === 'import' }" @click="regMode = 'import'">
            <div class="kind-t">导入注册</div>
            <div class="kind-d">填写手机号、名称，邮箱选填；支持 Excel 批量导入</div>
          </button>
        </div>

        <template v-if="regMode === 'wecom'">
          <a-form layout="vertical" style="margin-top:16px">
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="预置角色" required>
                  <a-select v-model="wecomRole" placeholder="选择角色">
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
          <a-alert style="margin-bottom:12px">调用企业微信通讯录 API（addressbook）按部门拉人。已注册同事不可再选；待注册 / 待审批选中后直接变为正常。</a-alert>
          <div class="wecom-toolbar">
            <a-input-search
              v-model="wecomKw"
              allow-clear
              placeholder="姓名 / 手机 / 邮箱 / userid"
              :style="{ width: '260px' }"
            />
          </div>
          <a-spin :loading="wecomLoading" tip="正在调用企业微信通讯录 API…" class="wecom-spin">
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
          <p class="imp-lead">按人填写手机号、名称，邮箱选填。大批量请下载 Excel 模板，填好后上传。</p>
          <div class="imp-head">
            <span class="imp-col phone">手机号 <i>*</i></span>
            <span class="imp-col name">名称 <i>*</i></span>
            <span class="imp-col email">邮箱（选填）</span>
            <span class="imp-col op" />
          </div>
          <div class="imp-body">
            <div v-for="(r, i) in impRows" :key="r.key" class="imp-row">
              <a-input v-model="r.phone" class="imp-col phone mono" :max-length="11" placeholder="11 位手机号" />
              <a-input v-model="r.name" class="imp-col name" placeholder="姓名" />
              <a-input v-model="r.email" class="imp-col email mono" placeholder="name@example.com" />
              <span class="imp-col op">
                <a-button type="text" size="mini" status="danger" @click="removeRow(r.key)">删除</a-button>
              </span>
              <div v-if="rowError(r)" class="imp-err">第 {{ i + 1 }} 行：{{ rowError(r) }}</div>
            </div>
          </div>
          <a-space style="margin-top:10px">
            <a-button size="small" @click="addRow"><template #icon><icon-plus /></template>添加一行</a-button>
            <a-button size="small" @click="downloadExcelTpl">下载 Excel 模板</a-button>
            <a-button size="small" :loading="excelBusy" @click="excelInput?.click()">上传 Excel</a-button>
            <a-button size="small" @click="pasteOpen = !pasteOpen">批量粘贴</a-button>
          </a-space>
          <input ref="excelInput" type="file" accept=".xlsx,.xls,.csv" hidden @change="onExcelFile">
          <div v-if="pasteOpen" class="imp-paste">
            <a-textarea
              v-model="pasteText"
              :auto-size="{ minRows: 4, maxRows: 8 }"
              placeholder="每行一人：手机号,名称,邮箱（邮箱可省略）&#10;13900003001,张三,zhangsan@example.com&#10;13900003002,李四"
            />
            <a-button type="primary" size="small" style="margin-top:8px" @click="applyPaste">识别并填入</a-button>
          </div>
        </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.kind-grid {
  display: grid;
  grid-template-columns: 1fr;
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
.imp-head,
.imp-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.imp-head {
  padding: 0 0 6px;
  font-size: 12px;
  color: var(--color-text-3);
}
.imp-head i { color: rgb(var(--danger-6)); font-style: normal; }
.imp-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}
.imp-col.phone { width: 180px; }
.imp-col.name { width: 160px; }
.imp-col.email { flex: 1; min-width: 200px; }
.imp-col.op { width: 52px; text-align: right; }
.imp-err {
  width: 100%;
  font-size: 12px;
  color: rgb(var(--danger-6));
}
.imp-lead {
  margin: 16px 0 12px;
  font-size: 13px;
  color: var(--color-text-3);
  line-height: 1.6;
}
.imp-paste { margin-top: 10px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.wecom-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.wecom-spin { display: block; width: 100%; }
.wecom-placeholder { min-height: 160px; }
:deep(.wecom-bound) {
  color: var(--color-text-3);
  background: #f7f8fa;
}
</style>
