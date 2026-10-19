<script setup>
import { computed, onDeactivated, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  store, findDataset, findGrant, getOrCreateGrant, saveDatasetGrant,
  hydrateRowPolicies, describeRowPolicy, hydrateColPolicies, colPolicyColumns, describeColSubject, rowLeaves,
} from '../store'
import RowPermStudio from '../components/RowPermStudio.vue'
import ColPermStudio from '../components/ColPermStudio.vue'

const tab = ref('row')
const pickOpen = ref(false)
const pickDs = ref('')
const studioDs = ref('')
const studioPolicy = ref('')
const studioAdd = ref(false)
const rowStudioOpen = ref(false)
const colStudioOpen = ref(false)

const userMap = computed(() => new Map(store.users.map((u) => [u.id, u])))
const datasets = computed(() => store.datasets.filter((d) => !d.deleted))

function userName(id) {
  return userMap.value.get(id)?.name || id
}
function userNames(ids) {
  const list = (ids || []).map(userName).filter(Boolean)
  return list.length ? list.join('、') : ''
}
function groupName(id) {
  return store.userGroups.find((g) => g.id === id)?.name || id
}
function groupNames(ids) {
  return (ids || []).map(groupName).filter(Boolean)
}
function modifierOf(ds) {
  const id = ds?.modifier_id || ds?.creator_id
  return userMap.value.get(id)?.name || '—'
}
function maskLabel(mask) {
  if (mask === 'hide' || mask === false) return '不展示'
  if (mask === 'mask') return '脱敏'
  return '可见'
}
function whoText(record) {
  if (record.kind === 'col') {
    const label = describeColSubject(record)
    if (record.subject === 'only' || record.subject === 'except') {
      const names = [...userNames(record.users).split('、').filter(Boolean), ...groupNames(record.groups)]
      return names.length ? `${label} · ${names.join('、')}` : label
    }
    return label
  }
  if (record.subject === 'groups') return record.groups?.length ? `用户组 ${groupNames(record.groups).join('、')}` : '用户组'
  if (record.subject === 'users') return record.users.length ? `指定用户 ${userNames(record.users)}` : '指定用户'
  return '所有成员'
}

function policyFields(p) {
  return [...new Set(rowLeaves(p).map((c) => c.column).filter(Boolean))]
}

function rowItems() {
  const kw = (store.securityFlt.kw || '').trim().toLowerCase()
  const out = []
  for (const d of datasets.value) {
    const g = findGrant(store, d.id)
    const policies = hydrateRowPolicies(g)
    if (policies.length) {
      policies.forEach((p) => {
        const fields = policyFields(p)
        out.push({
          id: `${d.id}:pol:${p.id}`,
          kind: 'row',
          datasetId: d.id,
          datasetName: d.display_name,
          name: p.name || `${d.display_name} 行权限`,
          fields: fields.join('、') || '—',
          ruleText: describeRowPolicy(p),
          users: p.subject === 'users' ? (p.users || []) : [],
          groups: p.groups || [],
          subject: p.subject || 'all',
          modifier: modifierOf(d),
          updated: g.updated_at || d.updated_at || '—',
          enabled: g.row_enabled !== false && p.on !== false,
          policyId: p.id,
          sqlOnly: false,
        })
      })
      continue
    }
    const sqlDef = g ? (g.row_filter_def ?? g.row_filter) : ''
    if (sqlDef) {
      out.push({
        id: `${d.id}:row:sql`,
        kind: 'row',
        datasetId: d.id,
        datasetName: d.display_name,
        name: `${d.display_name} 行权限`,
        fields: '—',
        ruleText: sqlDef,
        users: [],
        groups: [],
        subject: 'all',
        modifier: modifierOf(d),
        updated: g.updated_at || d.updated_at || '—',
        enabled: g.row_enabled !== false,
        policyId: '',
        sqlOnly: true,
      })
    }
  }
  return out.filter((r) => {
    if (!kw) return true
    return [r.name, r.fields, r.ruleText, r.datasetName, userNames(r.users), (r.groups || []).join(' ')].join(' ').toLowerCase().includes(kw)
  })
}

function colItems() {
  const kw = (store.securityFlt.kw || '').trim().toLowerCase()
  const out = []
  for (const d of datasets.value) {
    const g = findGrant(store, d.id)
    if (!g) continue
    const policies = hydrateColPolicies(g)
    policies.forEach((p) => {
      const mask = p.mask === 'mask' ? 'mask' : 'hide'
      out.push({
        id: `${d.id}:col:${p.id || p.column}`,
        kind: 'col',
        datasetId: d.id,
        datasetName: d.display_name,
        name: `${d.display_name} 列权限`,
        fields: colPolicyColumns(p).join('、'),
        ruleText: maskLabel(mask),
        mask,
        users: p.users || [],
        groups: p.groups || [],
        subject: p.subject || 'all_on',
        modifier: modifierOf(d),
        updated: g.updated_at || d.updated_at || '—',
        enabled: g.col_enabled !== false && p.on !== false,
        policyId: p.id,
        columnName: p.column,
      })
    })
  }
  return out.filter((r) => {
    if (!kw) return true
    return [r.name, r.fields, r.ruleText, r.datasetName, userNames(r.users), describeColSubject(r)].join(' ').toLowerCase().includes(kw)
  })
}

const rows = computed(() => (tab.value === 'row' ? rowItems() : colItems()))

function openStudio(kind, datasetId, policyId, add) {
  studioDs.value = datasetId
  studioPolicy.value = policyId || ''
  studioAdd.value = !!add
  if (kind === 'col') colStudioOpen.value = true
  else rowStudioOpen.value = true
}

function openCreate() {
  pickDs.value = datasets.value[0]?.id || ''
  if (!pickDs.value) {
    Message.warning('请先创建数据集')
    return
  }
  if (datasets.value.length === 1) {
    openStudio(tab.value, pickDs.value, '', true)
    return
  }
  pickOpen.value = true
}

function confirmPick() {
  if (!pickDs.value) {
    Message.warning('请选择数据集')
    return
  }
  pickOpen.value = false
  openStudio(tab.value, pickDs.value, '', true)
}

onDeactivated(() => {
  rowStudioOpen.value = false
  colStudioOpen.value = false
  pickOpen.value = false
})

function openEdit(record) {
  openStudio(record.kind, record.datasetId, record.policyId || record.columnName || '', false)
}

function toggleRow(record, on) {
  const ds = findDataset(store, record.datasetId)
  if (!ds) return
  const g = getOrCreateGrant(store, ds)
  if (record.sqlOnly) {
    saveDatasetGrant(store, { dataset_id: ds.id, row_enabled: on })
    return
  }
  const policies = hydrateRowPolicies(g).map((p) => (
    p.id === record.policyId ? { ...p, on } : p
  ))
  saveDatasetGrant(store, {
    dataset_id: ds.id,
    row_enabled: on || policies.some((p) => p.on !== false),
    row_policies: policies,
  })
}

function toggleCol(record, on) {
  const ds = findDataset(store, record.datasetId)
  if (!ds) return
  const g = getOrCreateGrant(store, ds)
  const policies = hydrateColPolicies(g).map((p) => (
    (p.id === record.policyId || p.column === record.columnName) ? { ...p, on } : p
  ))
  saveDatasetGrant(store, {
    dataset_id: ds.id,
    col_enabled: on || policies.some((p) => p.on !== false),
    col_policies: policies,
  })
}

function removeRow(record) {
  Modal.confirm({
    title: '删除行权限？',
    content: `将删除「${record.name}」。`,
    okText: '删除',
    okButtonProps: { status: 'danger' },
    onOk() {
      const ds = findDataset(store, record.datasetId)
      if (!ds) return
      const g = getOrCreateGrant(store, ds)
      if (record.sqlOnly) {
        saveDatasetGrant(store, { dataset_id: ds.id, row_enabled: false, row_filter: '', row_rules: [], row_policies: [] })
      } else {
        const policies = hydrateRowPolicies(g).filter((p) => p.id !== record.policyId)
        saveDatasetGrant(store, {
          dataset_id: ds.id,
          row_enabled: policies.some((p) => p.on !== false),
          row_policies: policies,
        })
      }
      Message.success('已删除')
    },
  })
}

function removeCol(record) {
  Modal.confirm({
    title: '删除列权限？',
    content: `将取消字段「${record.fields}」的限制。`,
    okText: '删除',
    okButtonProps: { status: 'danger' },
    onOk() {
      const ds = findDataset(store, record.datasetId)
      if (!ds) return
      const g = getOrCreateGrant(store, ds)
      const policies = hydrateColPolicies(g).filter((p) => !(p.id === record.policyId || p.column === record.columnName))
      saveDatasetGrant(store, {
        dataset_id: ds.id,
        col_enabled: policies.some((p) => p.on !== false),
        col_policies: policies,
      })
      Message.success('已删除')
    },
  })
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>数据权限</h2>
        <div class="desc">行列权限只在这里维护：按数据集配置，绑定到用户组（或个人）。由该数据集发布的 MCP 工具调用时实时生效，无需重新发布。</div>
      </div>
    </div>

    <div class="hub-tabs">
      <button type="button" :class="{ on: tab === 'row' }" @click="tab = 'row'">行权限</button>
      <button type="button" :class="{ on: tab === 'col' }" @click="tab = 'col'">列权限</button>
    </div>

    <a-card :bordered="false">
      <a-table
        :data="rows"
        :pagination="false"
        row-key="id"
        hoverable
        :scroll="{ x: 1100 }"
      >
        <template #columns>
          <a-table-column title="规则名称" :width="220">
            <template #cell="{ record }">
              <div>{{ record.name }}</div>
              <div class="muted">{{ record.datasetName }}</div>
            </template>
          </a-table-column>
          <a-table-column title="字段" :width="160">
            <template #cell="{ record }"><span class="mono">{{ record.fields }}</span></template>
          </a-table-column>
          <a-table-column title="权限规则" :width="240">
            <template #cell="{ record }">
              <div>{{ record.ruleText }}</div>
              <div class="muted">{{ record.kind === 'col' ? (record.mask === 'mask' ? '数据脱敏' : '不展示') : '行值过滤' }}</div>
            </template>
          </a-table-column>
          <a-table-column title="对谁有效" :width="220">
            <template #cell="{ record }">
              <div>{{ whoText(record) }}</div>
            </template>
          </a-table-column>
          <a-table-column title="修改人" :width="100">
            <template #cell="{ record }">{{ record.modifier }}</template>
          </a-table-column>
          <a-table-column title="修改时间" :width="160" data-index="updated" />
          <a-table-column title="状态" :width="80">
            <template #cell="{ record }">
              <a-switch
                :model-value="record.enabled"
                size="small"
                @change="(v) => record.kind === 'row' ? toggleRow(record, v) : toggleCol(record, v)"
              />
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="90" :fixed="'right'">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="openEdit(record)">
                <template #icon><icon-edit /></template>
              </a-button>
              <a-button type="text" size="mini" status="danger" @click="record.kind === 'row' ? removeRow(record) : removeCol(record)">
                <template #icon><icon-delete /></template>
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <button type="button" class="add-rule" @click="openCreate">+ 添加规则</button>
    </a-card>

    <a-modal v-model:visible="pickOpen" title="选择数据集" :ok-text="'下一步'" @ok="confirmPick">
      <a-form layout="vertical">
        <a-form-item label="数据集" required>
          <a-select v-model="pickDs" allow-search :placeholder="tab === 'row' ? '请选择要配置行级权限的数据集' : '请选择要配置列级权限的数据集'">
            <a-option v-for="d in datasets" :key="d.id" :value="d.id">{{ d.display_name }} · {{ d.table_name }}</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <RowPermStudio
      v-model:visible="rowStudioOpen"
      :dataset-id="studioDs"
      :policy-id="studioPolicy"
      :open-add="studioAdd"
    />
    <ColPermStudio
      v-model:visible="colStudioOpen"
      :dataset-id="studioDs"
      :policy-id="studioPolicy"
      :open-add="studioAdd"
    />
  </div>
</template>

<style scoped>
.add-rule {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  padding: 0;
  border: none;
  background: none;
  color: rgb(22, 100, 255);
  font-size: 14px;
  cursor: pointer;
}
.add-rule:hover { color: rgb(14, 82, 224); }
:deep(.arco-table-td) { vertical-align: top; }
</style>
