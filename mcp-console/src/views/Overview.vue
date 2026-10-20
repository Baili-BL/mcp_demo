<script setup>
import { computed } from 'vue'
import { store, openAlertCount } from '../store'

const emit = defineEmits(['goto'])

const grantCount = computed(() => store.datasetGrants.filter((g) => {
  const rows = (g.row_policies || []).length
  const cols = (g.col_policies || []).length || (g.columns || []).length
  return rows + cols > 0 || g.row_enabled
}).length)
const userOn = computed(() => store.users.filter((u) => u.status === '正常').length)
const keyOn = computed(() => store.clients.filter((c) => c.status !== 'revoked').length)

const ROW1 = computed(() => [
  { no: '1', title: '登记数据源', desc: `${store.sources.length} 个源`, goto: 'sources', tone: 'blue' },
  { no: '2', title: '创建数据集', desc: `${store.datasets.length} 个集`, goto: 'datasets', tone: 'cyan' },
  { no: '3', title: '配置权限', desc: `${grantCount.value} 份 Grant`, goto: 'security', tone: 'purple' },
  { no: '4', title: '创建服务', desc: `${store.services.length} 个服务`, goto: 'services', tab: 'services', tone: 'blue' },
])

const ROW2 = computed(() => [
  { no: '8', title: '签发密钥', desc: `${keyOn.value} 把 Key`, goto: 'clients', tone: 'rose' },
  { no: '7', title: '开通用户', desc: `${userOn.value} 人已开通`, goto: 'users', tone: 'orange' },
  { no: '6', title: '创建工具集', desc: `${store.toolsets.length} 个工具集`, goto: 'services', tab: 'toolsets', tone: 'green' },
  { no: '5', title: '创建工具', desc: `${store.tools.length} 个工具`, goto: 'tools', tone: 'cyan' },
])

const ROW3 = computed(() => [
  { no: '9', title: '粘贴配置', desc: 'url + Bearer', goto: 'clients', tone: 'blue' },
  { no: '10', title: '提问调用', desc: '只见工具集内', goto: 'tools', tone: 'cyan' },
  { no: '11', title: '受控结果', desc: '按人套 Grant', goto: 'security', tone: 'purple' },
  { no: '12', title: '调用监控', desc: `告警 ${openAlertCount()}`, goto: 'monitor', tone: 'blue' },
])

function go(step) {
  if (step.tab) store.hubTab = step.tab
  emit('goto', step.goto)
}
</script>

<template>
  <div class="home-guide">
    <div class="page-head">
      <div>
        <h2>首页</h2>
        <div class="desc">按 S 形走完用户旅程：配置折返到开通，再交给用户调用。</div>
      </div>
      <a-button type="outline" size="small" @click="emit('goto', 'sequence')">看时序图</a-button>
    </div>

    <div class="hf-board">
      <div class="hf-srow">
        <div class="hf-slab"><span class="hf-tag admin">管理员</span>配置</div>
        <div class="hf-track">
          <template v-for="(s, i) in ROW1" :key="s.no">
            <span v-if="i" class="hf-arr" aria-hidden="true"><i></i></span>
            <button type="button" class="hf-node" :class="'tone-' + s.tone" @click="go(s)">
              <span class="no">{{ s.no }}</span>
              <span class="ttl">{{ s.title }}</span>
              <span class="st">{{ s.desc }}</span>
            </button>
          </template>
        </div>
      </div>

      <div class="hf-srow">
        <div class="hf-slab"></div>
        <div class="hf-track hf-hook-track">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <span class="hf-arr down" aria-hidden="true"><i></i></span>
        </div>
      </div>

      <div class="hf-srow">
        <div class="hf-slab"><span class="hf-tag admin">管理员</span>开通</div>
        <div class="hf-track">
          <template v-for="(s, i) in ROW2" :key="s.no">
            <span v-if="i" class="hf-arr rev" aria-hidden="true"><i></i></span>
            <button type="button" class="hf-node" :class="'tone-' + s.tone" @click="go(s)">
              <span class="no">{{ s.no }}</span>
              <span class="ttl">{{ s.title }}</span>
              <span class="st">{{ s.desc }}</span>
            </button>
          </template>
        </div>
      </div>

      <div class="hf-srow">
        <div class="hf-slab"></div>
        <div class="hf-track hf-hook-track">
          <span class="hf-arr down" aria-hidden="true"><i></i></span>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
      </div>

      <div class="hf-srow">
        <div class="hf-slab"><span class="hf-tag user">用户</span>调用</div>
        <div class="hf-track">
          <template v-for="(s, i) in ROW3" :key="s.no">
            <span v-if="i" class="hf-arr" aria-hidden="true"><i></i></span>
            <button type="button" class="hf-node" :class="'tone-' + s.tone" @click="go(s)">
              <span class="no">{{ s.no }}</span>
              <span class="ttl">{{ s.title }}</span>
              <span class="st">{{ s.desc }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
