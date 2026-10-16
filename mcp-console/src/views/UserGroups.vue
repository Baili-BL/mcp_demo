<script setup>
import { computed, onDeactivated, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { store, kindMeta, groupKindMeta, membersOfGroup, saveUserGroup, removeUserGroup } from '../store'

const kindTab = ref('all')
const visible = ref(false)
const editingId = ref('')
const form = reactive({
  name: '',
  kind: 'staff',
  memberIds: [],
  desc: '',
})

const rows = computed(() => {
  const q = store.groupFlt.kw.trim().toLowerCase()
  return store.userGroups.filter((g) => {
    if (kindTab.value !== 'all' && g.kind !== kindTab.value) return false
    if (!q) return true
    const members = membersOfGroup(g).map((u) => u.name).join(' ')
    const kind = groupKindMeta(g.kind).label
    return [g.name, g.desc, members, kind].join(' ').toLowerCase().includes(q)
  }).map((g) => ({
    ...g,
    members: membersOfGroup(g),
  }))
})

const memberOptions = computed(() => {
  return store.users.filter((u) => {
    if (form.kind === 'staff') return u.kind === 'staff'
    if (form.kind === 'customer') return u.kind === 'customer'
    return true
  })
})

function resetForm() {
  editingId.value = ''
  Object.assign(form, { name: '', kind: 'staff', memberIds: [], desc: '' })
}
function openCreate() {
  resetForm()
  visible.value = true
}
function openEdit(g) {
  editingId.value = g.id
  Object.assign(form, {
    name: g.name,
    kind: g.kind === 'customer' ? 'customer' : 'staff',
    memberIds: [...(g.memberIds || [])],
    desc: g.desc || '',
  })
  visible.value = true
}
function onKind(k) {
  form.kind = k
  const allow = new Set(memberOptions.value.map((u) => u.id))
  form.memberIds = form.memberIds.filter((id) => allow.has(id))
}
function submit() {
  const name = form.name.trim()
  if (!name) { Message.warning('请填写用户组名称'); return false }
  const saved = saveUserGroup({
    id: editingId.value,
    name,
    kind: form.kind,
    memberIds: [...form.memberIds],
    desc: form.desc,
  })
  if (!saved) { Message.error('保存失败'); return false }
  Message.success(editingId.value ? '用户组已更新' : '用户组已创建')
  visible.value = false
  resetForm()
  return true
}
function remove(g) {
  Modal.confirm({
    title: '删除用户组',
    content: `删除「${g.name}」后，行列权限里绑定该组的规则将不再匹配这些成员。`,
    onOk: () => {
      removeUserGroup(g.id)
      Message.success('用户组已删除')
    },
  })
}
function namesOf(list) {
  if (!list.length) return '—'
  const shown = list.slice(0, 3).map((u) => u.name)
  return list.length > 3 ? `${shown.join('、')} 等 ${list.length} 人` : shown.join('、')
}
onDeactivated(() => {
  visible.value = false
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>用户组管理</h2>
        <div class="desc">数据权限只认用户组（不再按「团队」字段匹配）。内部组对应团队，外部组对应合作公司；开通账号时自动加入所属组织。</div>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><icon-plus /></template>新建用户组
      </a-button>
    </div>
    <a-card :bordered="false">
      <div class="filter-bar">
        <a-space wrap>
          <a-radio-group v-model="kindTab" type="button" size="small">
            <a-radio value="all">全部类型</a-radio>
            <a-radio value="staff">内部员工组</a-radio>
            <a-radio value="customer">外部客户组</a-radio>
          </a-radio-group>
          <a-input-search
            v-model="store.groupFlt.kw"
            allow-clear
            placeholder="搜索组名 / 成员 / 说明"
            :style="{ width: '260px' }"
          />
        </a-space>
        <span class="muted">{{ rows.length }} 个组</span>
      </div>
      <a-table :data="rows" :pagination="false" row-key="id" hoverable stripe>
        <template #columns>
          <a-table-column title="用户组" :width="180">
            <template #cell="{ record }">
              <div class="g-name">{{ record.name }}</div>
            </template>
          </a-table-column>
          <a-table-column title="类型" :width="130">
            <template #cell="{ record }">
              <a-tag :color="groupKindMeta(record.kind).tag" size="small">{{ groupKindMeta(record.kind).label }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="成员" :min-width="220">
            <template #cell="{ record }">
              <span>{{ namesOf(record.members) }}</span>
            </template>
          </a-table-column>
          <a-table-column title="人数" :width="80">
            <template #cell="{ record }">{{ record.members.length }}</template>
          </a-table-column>
          <a-table-column title="说明" data-index="desc" :min-width="180">
            <template #cell="{ record }">{{ record.desc || '—' }}</template>
          </a-table-column>
          <a-table-column title="更新时间" data-index="updated" :width="170" />
          <a-table-column title="操作" :width="140" :fixed="'right'">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="openEdit(record)">编辑</a-button>
              <a-button type="text" status="danger" size="mini" @click="remove(record)">删除</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="visible"
      :title="editingId ? '编辑用户组' : '新建用户组'"
      :width="560"
      unmount-on-close
      @before-ok="submit"
      @cancel="resetForm"
    >
      <div class="kind-grid">
        <button type="button" class="kind-card" :class="{ on: form.kind === 'staff' }" @click="onKind('staff')">
          <div class="kind-t">内部员工组</div>
          <div class="kind-d">对应团队，成员来自已开通的内部员工</div>
        </button>
        <button type="button" class="kind-card" :class="{ on: form.kind === 'customer' }" @click="onKind('customer')">
          <div class="kind-t">外部客户组</div>
          <div class="kind-d">对应合作公司，成员来自外部客户账号</div>
        </button>
      </div>
      <a-form :model="form" layout="vertical" style="margin-top:16px">
        <a-form-item label="组名称" required>
          <a-input v-model="form.name" placeholder="如 有色组、某铜业集团" maxlength="32" />
        </a-form-item>
        <a-form-item label="组成员">
          <a-select
            v-model="form.memberIds"
            multiple
            allow-search
            allow-clear
            placeholder="选择成员"
            :max-tag-count="4"
          >
            <a-option v-for="u in memberOptions" :key="u.id" :value="u.id">
              {{ u.name }} · {{ kindMeta(u.kind).label }} · {{ u.team || '未标注' }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model="form.desc" placeholder="用途说明，选填" :max-length="80" allow-clear />
        </a-form-item>
      </a-form>
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
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.g-name { font-weight: 500; color: var(--color-text-1); }
</style>
