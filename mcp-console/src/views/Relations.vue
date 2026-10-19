<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  store, findSource, findGrant, clientsOfToolset, toolsetsOfClient, isReadControlled, uncontrolledReason,
  generateSecView,
} from '../store'

const emit = defineEmits(['goto'])

const VIEWS = [
  { value: 'service', label: '服务视角', hint: '服务 → 工具集 → 工具 → 数据集 → 用户' },
  { value: 'user', label: '用户视角', hint: '用户 → 接入密钥 → 工具集 → 工具 → 数据集' },
  { value: 'dataset', label: '数据集视角', hint: '数据集 → 工具 → 工具集 → 用户' },
]
const KIND = {
  service: { text: '服务', color: 'arcoblue' },
  toolset: { text: '工具集', color: 'purple' },
  tool: { text: '工具', color: 'cyan' },
  dataset: { text: '数据集', color: 'green' },
  user: { text: '用户', color: 'gold' },
  client: { text: '密钥', color: 'gray' },
  none: { text: '', color: 'gray' },
}
const GOTO = { service: 'services', toolset: 'services', tool: 'tools', dataset: 'datasets', user: 'users', client: 'clients' }

const view = ref('service')
const kw = ref('')
const riskOnly = ref(false)
const selectedKey = ref('')

function userOf(id) {
  return store.users.find((u) => u.id === id)
}
function userLabel(u) {
  return `${u.name}（${(u.groupIds || []).join('、') || '未分组'}）`
}
function usersOfToolset(ts) {
  const seen = new Map()
  clientsOfToolset(ts.id).forEach((c) => {
    const u = userOf(c.userId)
    if (!u) return
    if (!seen.has(u.id)) seen.set(u.id, { u, clients: [] })
    seen.get(u.id).clients.push(c.name)
  })
  return [...seen.values()]
}
function datasetsOfTool(t) {
  if (t.dataset?.datasetId) {
    const d = store.datasets.find((x) => x.id === t.dataset.datasetId)
    return d ? [{ d, mode: 'publish' }] : []
  }
  return (t.reads || []).map((id) => store.datasets.find((x) => x.id === id)).filter(Boolean).map((d) => ({ d, mode: 'read' }))
}
function linkControlled(t, d) {
  return !!t.dataset || isReadControlled(t, d.id)
}
function ruleText(d) {
  const g = findGrant(store, d.id)
  const parts = []
  if (g?.row_enabled && g.row_filter) parts.push(`行：${g.row_filter}`)
  const cols = (g?.columns || []).filter((c) => c.on !== false && c.mask && c.mask !== 'none').map((c) => c.column_name)
  if (cols.length) parts.push(`列：隐藏 ${cols.join('、')}`)
  return parts.join('；') || '无行列规则，全量可见'
}
function dsTitle(d) {
  return `${findSource(d.data_source_id)?.name || '未知数据源'} · ${d.display_name}`
}
function linkTags(t, d) {
  if (t.dataset) return [{ text: '发布', color: 'green' }]
  return linkControlled(t, d) ? [{ text: '受控', color: 'green' }] : [{ text: '未受控', color: 'orange' }]
}
function linkSub(t, d) {
  if (t.dataset) return `平台执行 · ${ruleText(d)}`
  return linkControlled(t, d) ? `经 ${d.sec_view.name} · ${ruleText(d)}` : `直连原表，规则不生效：${uncontrolledReason(t, d.id)}`
}
function noneNode(key, title) {
  return { key, kind: 'none', title, sub: '', tags: [], muted: true }
}

function userLeaves(prefix, ts, t, d) {
  const list = usersOfToolset(ts)
  if (!list.length) return [noneNode(`${prefix}|nouser`, '没有用户持有这个工具集的密钥')]
  const warn = d && !linkControlled(t, d)
  return list.map(({ u, clients }) => ({
    key: `${prefix}|u:${u.id}`,
    kind: 'user',
    ref: u.id,
    title: userLabel(u),
    sub: `经 ${clients.join('、')}`,
    tags: warn ? [{ text: '看到全量', color: 'orange' }] : [],
    warn,
  }))
}
function datasetNodes(prefix, t, ts) {
  const ds = datasetsOfTool(t)
  if (!ds.length) {
    if (t.svc === 'anl' && ['list_datasets', 'query_dataset'].includes(t.name)) return [noneNode(`${prefix}|dyn`, '按 dataset_id 动态取数，平台内套用数据权限')]
    return [noneNode(`${prefix}|nods`, '未关联数据集')]
  }
  return ds.map(({ d }) => ({
    key: `${prefix}|d:${d.id}`,
    kind: 'dataset',
    ref: d.id,
    link: { tool: t.name, ds: d.id },
    title: dsTitle(d),
    sub: linkSub(t, d),
    tags: linkTags(t, d),
    warn: !linkControlled(t, d),
    children: ts ? userLeaves(`${prefix}|d:${d.id}`, ts, t, d) : [noneNode(`${prefix}|d:${d.id}|nots`, '工具未加入工具集，无人可调用')],
  }))
}
function toolNode(prefix, t, ts) {
  return {
    key: `${prefix}|t:${t.name}`,
    kind: 'tool',
    ref: t.name,
    title: t.name,
    sub: t.cn,
    tags: t.on ? [] : [{ text: '已停用', color: 'gray' }],
    children: datasetNodes(`${prefix}|t:${t.name}`, t, ts),
  }
}

function buildServiceTree() {
  return store.services.map((s) => {
    const tools = store.tools.filter((t) => t.svc === s.id)
    const sets = store.toolsets.filter((ts) => ts.tools.some((n) => tools.some((t) => t.name === n)))
    const children = sets.map((ts) => ({
      key: `s:${s.id}|ts:${ts.id}`,
      kind: 'toolset',
      ref: ts.id,
      title: ts.name,
      sub: `${usersOfToolset(ts).length} 个用户可调用`,
      tags: [],
      children: tools.filter((t) => ts.tools.includes(t.name)).map((t) => toolNode(`s:${s.id}|ts:${ts.id}`, t, ts)),
    }))
    const loose = tools.filter((t) => !store.toolsets.some((ts) => ts.tools.includes(t.name)))
    if (loose.length) {
      children.push({
        key: `s:${s.id}|loose`,
        kind: 'none',
        title: '未加入工具集',
        sub: '',
        tags: [],
        muted: true,
        children: loose.map((t) => toolNode(`s:${s.id}|loose`, t, null)),
      })
    }
    if (!children.length) children.push(noneNode(`s:${s.id}|empty`, '暂无工具'))
    return {
      key: `s:${s.id}`,
      kind: 'service',
      ref: s.id,
      title: s.name,
      sub: s.code,
      tags: s.builtin ? [{ text: '平台托管', color: 'green' }] : [s.passIdentity ? { text: '透传身份', color: 'green' } : { text: '未透传身份', color: 'orange' }],
      children,
    }
  })
}

function buildUserTree() {
  return store.users.filter((u) => store.clients.some((c) => c.userId === u.id && c.status !== 'revoked')).map((u) => ({
    key: `u:${u.id}`,
    kind: 'user',
    ref: u.id,
    title: userLabel(u),
    sub: u.role,
    tags: [],
    children: store.clients.filter((c) => c.userId === u.id && c.status !== 'revoked').map((c) => ({
      key: `u:${u.id}|c:${c.id}`,
      kind: 'client',
      ref: c.id,
      title: c.name,
      sub: c.key,
      tags: [],
      children: toolsetsOfClient(c).map((ts) => ({
        key: `u:${u.id}|c:${c.id}|ts:${ts.id}`,
        kind: 'toolset',
        ref: ts.id,
        title: ts.name,
        sub: '',
        tags: [],
        children: ts.tools.map((n) => store.tools.find((t) => t.name === n)).filter(Boolean).map((t) => {
          const node = toolNode(`u:${u.id}|c:${c.id}|ts:${ts.id}`, t, ts)
          node.children.forEach((d) => { if (d.kind === 'dataset') delete d.children })
          return node
        }),
      })),
    })),
  }))
}

function buildDatasetTree() {
  return store.datasets
    .map((d) => {
      const tools = store.tools.filter((t) => t.dataset?.datasetId === d.id || (!t.dataset && (t.reads || []).includes(d.id)))
      return { d, tools }
    })
    .filter((x) => x.tools.length)
    .map(({ d, tools }) => ({
      key: `d:${d.id}`,
      kind: 'dataset',
      ref: d.id,
      title: dsTitle(d),
      sub: ruleText(d),
      tags: d.sec_view ? [{ text: '有中间视图', color: 'green' }] : [{ text: '无中间视图', color: 'orange' }],
      children: tools.map((t) => {
        const sets = store.toolsets.filter((ts) => ts.tools.includes(t.name))
        return {
          key: `d:${d.id}|t:${t.name}`,
          kind: 'tool',
          ref: t.name,
          link: { tool: t.name, ds: d.id },
          title: t.name,
          sub: `${store.svcMeta[t.svc]?.n || ''} · ${linkSub(t, d)}`,
          tags: linkTags(t, d),
          warn: !linkControlled(t, d),
          children: sets.length
            ? sets.map((ts) => ({
              key: `d:${d.id}|t:${t.name}|ts:${ts.id}`,
              kind: 'toolset',
              ref: ts.id,
              title: ts.name,
              sub: '',
              tags: [],
              children: userLeaves(`d:${d.id}|t:${t.name}|ts:${ts.id}`, ts, t, d),
            }))
            : [noneNode(`d:${d.id}|t:${t.name}|nots`, '工具未加入工具集，无人可调用')],
        }
      }),
    }))
}

const BUILDERS = { service: buildServiceTree, user: buildUserTree, dataset: buildDatasetTree }
const rawTree = computed(() => BUILDERS[view.value]())

function walk(nodes, fn, depth = 0, path = []) {
  nodes.forEach((n) => {
    const p = [...path, n]
    fn(n, depth, p)
    if (n.children) walk(n.children, fn, depth + 1, p)
  })
}
function hasWarn(n) {
  return !!n.warn || (n.children || []).some(hasWarn)
}
const q = computed(() => kw.value.trim().toLowerCase())
function hits(n) {
  return !!q.value && `${n.title} ${n.sub}`.toLowerCase().includes(q.value)
}
function prune(nodes, query) {
  return nodes.reduce((acc, n) => {
    const selfHit = !query || `${n.title} ${n.sub}`.toLowerCase().includes(query)
    const kids = n.children ? prune(n.children, selfHit ? '' : query) : undefined
    if (riskOnly.value && !hasWarn(n)) return acc
    if (selfHit || (kids && kids.length)) acc.push({ ...n, children: kids && kids.length ? kids : undefined })
    return acc
  }, [])
}
const tree = computed(() => prune(rawTree.value, q.value))
const matchCount = computed(() => {
  let n = 0
  walk(tree.value, (x) => { if (hits(x)) n += 1 })
  return n
})

const index = computed(() => {
  const map = new Map()
  walk(rawTree.value, (n, _d, p) => map.set(n.key, p))
  return map
})
const selectedPath = computed(() => index.value.get(selectedKey.value) || [])
const selected = computed(() => selectedPath.value[selectedPath.value.length - 1] || null)

const expandedKeys = ref([])
function expandTo(maxDepth) {
  const keys = []
  walk(tree.value, (n, depth) => { if (n.children?.length && depth < maxDepth) keys.push(n.key) })
  expandedKeys.value = keys
}
function resetExpand() {
  expandTo(q.value || riskOnly.value ? Infinity : 2)
}
watch([view, q, riskOnly], resetExpand, { immediate: true })
watch(tree, (nodes) => {
  if (!selectedKey.value) return
  let found = false
  walk(nodes, (n) => { if (n.key === selectedKey.value) found = true })
  if (!found) selectedKey.value = ''
})

function onSelect(keys, data) {
  const key = data?.node?.key ?? keys[0]
  if (!key) return
  selectedKey.value = key
  const n = index.value.get(key)?.at(-1)
  if (n?.children?.length && !expandedKeys.value.includes(key)) expandedKeys.value = [...expandedKeys.value, key]
}
function revealSelected() {
  const path = index.value.get(selectedKey.value) || []
  const need = path.slice(0, -1).map((p) => p.key).filter((k) => !expandedKeys.value.includes(k))
  if (need.length) expandedKeys.value = [...expandedKeys.value, ...need]
  nextTick(() => setTimeout(() => {
    document.querySelector('.rt-tree .arco-tree-node-selected')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, 50))
}

function segments(text) {
  const s = String(text || '')
  if (!q.value) return [{ t: s, hit: false }]
  const out = []
  const lower = s.toLowerCase()
  let i = 0
  while (i < s.length) {
    const j = lower.indexOf(q.value, i)
    if (j < 0) { out.push({ t: s.slice(i), hit: false }); break }
    if (j > i) out.push({ t: s.slice(i, j), hit: false })
    out.push({ t: s.slice(j, j + q.value.length), hit: true })
    i = j + q.value.length
  }
  return out
}

const summary = computed(() => {
  const n = selected.value
  if (!n) return null
  const sets = { tool: new Set(), dataset: new Set(), user: new Set() }
  const links = []
  selectedPath.value.forEach((p) => { if (p.link) links.push(p.link) })
  walk(n.children || [], (x) => {
    if (sets[x.kind]) sets[x.kind].add(x.ref)
    if (x.link) links.push(x.link)
  })
  const bad = links.filter((l) => {
    const t = store.tools.find((x) => x.name === l.tool)
    return t && !t.dataset && !isReadControlled(t, l.ds)
  })
  const missingViews = [...new Set(bad.map((l) => l.ds))]
    .map((id) => store.datasets.find((d) => d.id === id)).filter((d) => d && !d.sec_view)
  const noIdentity = [...new Set(bad.map((l) => store.tools.find((t) => t.name === l.tool)?.svc))]
    .map((id) => store.services.find((s) => s.id === id)).filter((s) => s && !s.builtin && !s.passIdentity)
  return {
    counts: [
      { label: '工具', value: sets.tool.size },
      { label: '数据集', value: sets.dataset.size },
      { label: '用户', value: sets.user.size },
    ].filter((c) => c.value),
    badCount: new Set(bad.map((l) => `${l.tool}|${l.ds}`)).size,
    missingViews,
    noIdentity,
  }
})
function fixView(d) {
  generateSecView(d)
  Message.success(`已生成 ${d.sec_view.name}`)
}
function fixIdentity(s) {
  s.passIdentity = true
  Message.success(`${s.name} 已开启透传用户身份`)
}

const otherViews = computed(() => {
  const n = selected.value
  if (!n || !['user', 'dataset', 'tool', 'toolset'].includes(n.kind)) return []
  return VIEWS.filter((v) => v.value !== view.value).map((v) => {
    let key = ''
    walk(BUILDERS[v.value](), (x) => { if (!key && x.kind === n.kind && x.ref === n.ref) key = x.key })
    return key ? { ...v, key } : null
  }).filter(Boolean)
})
function locateIn(v) {
  kw.value = ''
  riskOnly.value = false
  view.value = v.value
  nextTick(() => {
    selectedKey.value = v.key
    revealSelected()
  })
}

const stats = computed(() => {
  const exposures = new Set()
  walk(buildServiceTree(), (n, _d, p) => {
    if (n.kind === 'user' && n.warn) exposures.add(`${n.ref}|${p[p.length - 2]?.ref}`)
  })
  const readLinks = store.tools.filter((t) => !t.dataset).flatMap((t) => (t.reads || []).map((id) => ({ t, id })))
  return [
    { label: '服务', value: store.services.length },
    { label: '工具集', value: store.toolsets.length },
    { label: '工具', value: store.tools.length },
    { label: '被读取的数据集', value: new Set(readLinks.map((x) => x.id)).size },
    { label: '未受控读取', value: readLinks.filter(({ t, id }) => !isReadControlled(t, id)).length, warn: true },
    { label: '用户可看全量的数据集', value: exposures.size, warn: true, tip: '用户 × 数据集' },
  ]
})
function onStat(s) {
  if (s.warn && s.value) riskOnly.value = !riskOnly.value
}

function jump(n) {
  const page = GOTO[n.kind]
  if (!page) return
  if (n.kind === 'dataset') {
    const d = store.datasets.find((x) => x.id === n.ref)
    if (d) store.datasetFlt.sourceId = d.data_source_id
  }
  if (n.kind === 'tool') store.flt.kw = n.ref
  emit('goto', page)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>关系树</h2>
        <div class="desc">从服务、用户或数据集任一端出发，快速定位数据流经的完整链路。标橙的链路行列权限未生效，可在右侧一键调整</div>
      </div>
    </div>

    <div class="rt-stats">
      <div
        v-for="s in stats"
        :key="s.label"
        class="rt-stat"
        :class="{ warn: s.warn && s.value, clickable: s.warn && s.value, on: s.warn && riskOnly }"
        @click="onStat(s)"
      >
        <div class="rt-stat-v">{{ s.value }}</div>
        <div class="rt-stat-l">{{ s.label }}<span v-if="s.tip">（{{ s.tip }}）</span></div>
      </div>
    </div>

    <a-card :bordered="false">
      <div class="rt-toolbar">
        <a-radio-group v-model="view" type="button">
          <a-radio v-for="v in VIEWS" :key="v.value" :value="v.value">{{ v.label }}</a-radio>
        </a-radio-group>
        <a-input-search v-model="kw" allow-clear placeholder="搜索服务 / 工具 / 数据集 / 用户" :style="{ width: '260px' }" />
        <a-checkbox v-model="riskOnly">只看未受控链路</a-checkbox>
        <span v-if="q" class="muted">命中 {{ matchCount }} 个节点</span>
        <span class="rt-spacer" />
        <a-button size="small" @click="expandTo(Infinity)">全部展开</a-button>
        <a-button size="small" @click="expandTo(1)">收起</a-button>
      </div>
      <div class="rt-hint muted">{{ VIEWS.find((v) => v.value === view).hint }} · 点击节点展开并查看详情</div>

      <div class="rt-body">
        <div class="rt-tree">
          <a-tree
            v-if="tree.length"
            v-model:expanded-keys="expandedKeys"
            :data="tree"
            :selected-keys="selectedKey ? [selectedKey] : []"
            block-node
            @select="onSelect"
          >
            <template #title="node">
              <span class="rt-node" :class="{ warn: node.warn, muted: node.muted }">
                <a-tag v-if="KIND[node.kind]?.text" :color="KIND[node.kind].color" size="small">{{ KIND[node.kind].text }}</a-tag>
                <span :class="['rt-title', { mono: node.kind === 'tool' }]">
                  <template v-for="(s, i) in segments(node.title)" :key="i"><mark v-if="s.hit">{{ s.t }}</mark><template v-else>{{ s.t }}</template></template>
                </span>
                <a-tag v-for="t in node.tags" :key="t.text" :color="t.color" size="small">{{ t.text }}</a-tag>
                <span v-if="!node.warn && hasWarn(node)" class="rt-dot" title="下游有未受控链路" />
                <span v-if="node.sub" class="rt-sub" :title="node.sub">
                  <template v-for="(s, i) in segments(node.sub)" :key="i"><mark v-if="s.hit">{{ s.t }}</mark><template v-else>{{ s.t }}</template></template>
                </span>
              </span>
            </template>
          </a-tree>
          <a-empty v-else :description="riskOnly ? '没有未受控链路' : '没有匹配的链路'" />
        </div>

        <div class="rt-side">
          <template v-if="selected">
            <div class="rt-crumbs">
              <template v-for="(p, i) in selectedPath" :key="p.key">
                <a-link v-if="i < selectedPath.length - 1" class="rt-crumb" @click="selectedKey = p.key; revealSelected()">{{ p.title }}</a-link>
                <span v-else class="cur">{{ p.title }}</span>
                <icon-right v-if="i < selectedPath.length - 1" class="rt-crumb-sep" />
              </template>
            </div>
            <div class="rt-side-head">
              <a-tag v-if="KIND[selected.kind]?.text" :color="KIND[selected.kind].color">{{ KIND[selected.kind].text }}</a-tag>
              <span :class="['rt-side-title', { mono: selected.kind === 'tool' }]">{{ selected.title }}</span>
            </div>
            <div v-if="selected.tags.length" class="rt-side-tags">
              <a-tag v-for="t in selected.tags" :key="t.text" :color="t.color" size="small">{{ t.text }}</a-tag>
            </div>
            <p v-if="selected.sub" class="rt-side-sub" :class="{ warn: selected.warn }">{{ selected.sub }}</p>

            <template v-if="summary">
              <div v-if="summary.counts.length" class="rt-sum">
                <div v-for="c in summary.counts" :key="c.label" class="rt-sum-item">
                  <div class="rt-sum-v">{{ c.value }}</div>
                  <div class="rt-sum-l">下游{{ c.label }}</div>
                </div>
                <div class="rt-sum-item" :class="{ warn: summary.badCount }">
                  <div class="rt-sum-v">{{ summary.badCount }}</div>
                  <div class="rt-sum-l">未受控链路</div>
                </div>
              </div>

              <div v-if="summary.missingViews.length || summary.noIdentity.length" class="rt-fix">
                <div class="rt-fix-title">修复未受控链路</div>
                <div v-for="d in summary.missingViews" :key="d.id" class="rt-fix-row">
                  <span>{{ dsTitle(d) }} 未生成中间视图</span>
                  <a-button size="mini" type="primary" @click="fixView(d)">生成</a-button>
                </div>
                <div v-for="s in summary.noIdentity" :key="s.id" class="rt-fix-row">
                  <span>{{ s.name }} 未透传用户身份</span>
                  <a-button size="mini" type="primary" @click="fixIdentity(s)">开启</a-button>
                </div>
              </div>
            </template>

            <div v-if="otherViews.length" class="rt-other">
              <span class="muted">换个方向看：</span>
              <a-link v-for="v in otherViews" :key="v.value" @click="locateIn(v)">{{ v.label }}</a-link>
            </div>
            <a-button v-if="GOTO[selected.kind]" type="outline" size="small" long style="margin-top: 16px" @click="jump(selected)">前往管理页</a-button>
          </template>
          <div v-else class="rt-side-empty muted">
            点击左侧任意节点，查看完整链路、下游汇总，并可直接修复未受控的链路。
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.rt-stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.rt-stat { padding: 12px 16px; border-radius: 8px; background: var(--color-bg-2); border: 1px solid var(--color-border-2); transition: border-color 0.15s, background-color 0.15s; }
.rt-stat-v { font-size: 22px; font-weight: 500; color: var(--color-text-1); }
.rt-stat-l { margin-top: 2px; font-size: 12px; color: var(--color-text-3); }
.rt-stat.warn .rt-stat-v { color: rgb(var(--orange-6)); }
.rt-stat.clickable { cursor: pointer; }
.rt-stat.clickable:hover { border-color: rgb(var(--orange-4)); }
.rt-stat.on { border-color: rgb(var(--orange-6)); background: rgb(var(--orange-1)); }
.rt-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.rt-spacer { flex: 1; }
.rt-hint { margin: 8px 0 12px; font-size: 12px; }
.rt-body { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; }
.rt-tree { min-height: 420px; max-height: calc(100vh - 340px); overflow: auto; padding-right: 8px; }
.rt-tree :deep(.arco-tree-node) { border-radius: 4px; }
.rt-tree :deep(.arco-tree-node-selected) { background: rgb(var(--primary-1)); }
.rt-node { display: inline-flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; white-space: nowrap; }
.rt-title { flex-shrink: 0; }
.rt-node.muted .rt-title { color: var(--color-text-4); }
.rt-node.warn .rt-title { color: rgb(var(--orange-6)); }
.rt-sub { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 12px; color: var(--color-text-3); }
.rt-node.warn .rt-sub { color: rgb(var(--orange-5)); }
.rt-dot { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: rgb(var(--orange-6)); }
.rt-node mark, .rt-sub mark { padding: 0 1px; border-radius: 2px; background: rgb(var(--gold-2)); color: inherit; }
.rt-side { padding: 0 0 0 16px; border-left: 1px solid var(--color-border-2); align-self: start; position: sticky; top: 0; }
.rt-side-empty { padding-top: 8px; line-height: 1.7; }
.rt-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; font-size: 12px; color: var(--color-text-3); }
.rt-crumb { font-size: 12px; padding: 0; }
.rt-crumb-sep { color: var(--color-text-4); }
.rt-crumbs .cur { color: var(--color-text-1); }
.rt-side-head { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.rt-side-title { font-size: 15px; font-weight: 500; word-break: break-all; }
.rt-side-tags { display: flex; gap: 4px; margin-top: 8px; }
.rt-side-sub { margin: 10px 0 0; font-size: 13px; line-height: 1.6; color: var(--color-text-2); word-break: break-all; }
.rt-side-sub.warn { color: rgb(var(--orange-6)); }
.rt-sum { display: flex; gap: 8px; margin-top: 16px; }
.rt-sum-item { flex: 1; padding: 8px 10px; border-radius: 6px; background: var(--color-fill-1); }
.rt-sum-v { font-size: 18px; font-weight: 500; }
.rt-sum-l { font-size: 12px; color: var(--color-text-3); }
.rt-sum-item.warn .rt-sum-v { color: rgb(var(--orange-6)); }
.rt-fix { margin-top: 16px; padding: 10px 12px; border: 1px solid rgb(var(--orange-3)); border-radius: 6px; background: rgb(var(--orange-1)); }
.rt-fix-title { margin-bottom: 6px; font-size: 13px; font-weight: 500; color: rgb(var(--orange-7)); }
.rt-fix-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 12px; }
.rt-other { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 16px; font-size: 13px; }
</style>
