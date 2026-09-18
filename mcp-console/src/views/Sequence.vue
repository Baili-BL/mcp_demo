<script setup>
import { computed, ref } from 'vue'

const emit = defineEmits(['goto'])
const phase = ref('all')
const hover = ref(null)

const LANES = [
  { name: '用户 · 研究员', desc: '自然语言提问 / 接收结论', color: '#165dff', icon: 'user' },
  { name: 'MCP 客户端', desc: 'Cursor / Claude Desktop', color: '#14c9c9', icon: 'desktop' },
  { name: '开发 / 管理员', desc: '注册服务 · 签发密钥', color: '#ff7d00', icon: 'tool' },
  { name: '管理台 Console', desc: '注册中心 · 密钥 · 监控', color: '#722ed1', icon: 'apps' },
  { name: 'MCP 服务端', desc: 'FastMCP · :8600/mcp', color: '#3491fa', icon: 'cloud' },
  { name: 'MySQL · metric', desc: '4 源指标 + EDB', color: '#0fc6c2', icon: 'storage' },
]

const PHASES = [
  { id: 'all', t: '全部阶段' },
  { id: 'p1', t: '① 注册签发' },
  { id: 'p2', t: '② 客户端接入' },
  { id: 'p3', t: '③ 数据调用' },
  { id: 'p4', t: '④ 监控闭环' },
]

const ROWS = [
  { kind: 'phase', id: 'p1', t: '阶段一 · 服务注册与密钥签发（管理台操作，一次性）' },
  { kind: 'msg', phase: 'p1', no: '1', from: 2, to: 3, dir: 'f', t: '注册新服务', code: '名称 · 端点 · 上游数据源', goto: 'services' },
  { kind: 'msg', phase: 'p1', no: '2', from: 3, to: 2, dir: 'r', t: '下发客户端配置', code: 'mcpServers JSON', goto: 'services' },
  { kind: 'msg', phase: 'p1', no: '3', from: 2, to: 3, dir: 'f', t: '创建工具集并签发密钥', code: '绑定到 MCP 工具集 · QPS · 日配额 · 到期', goto: 'services' },
  { kind: 'msg', phase: 'p1', no: '4', from: 3, to: 5, dir: 'f', t: '写入密钥', code: 'INSERT INTO base_from_mcp_api_key', goto: 'clients' },
  { kind: 'msg', phase: 'p1', no: '5', from: 3, to: 2, dir: 'r', t: '完整 Key 仅展示一次', code: '含到期时间；过期后拒绝鉴权', goto: 'clients' },
  { kind: 'msg', phase: 'p1', no: '6', from: 2, to: 0, dir: 'r', t: '分发接入配置给用户', code: 'url + Bearer Key（IM / 邮件 / 工单）', goto: 'clients' },
  { kind: 'phase', id: 'p2', t: '阶段二 · 客户端接入（initialize / tools/list）' },
  { kind: 'msg', phase: 'p2', no: '7', from: 0, to: 1, dir: 'f', t: '粘贴配置并重启', code: '~/.cursor/mcp.json', goto: 'clients' },
  { kind: 'msg', phase: 'p2', no: '8', from: 1, to: 4, dir: 'f', t: 'initialize', code: '协议协商（Streamable HTTP，握手无需鉴权）' },
  { kind: 'msg', phase: 'p2', no: '9', from: 4, to: 1, dir: 'r', t: 'serverInfo', code: 'futures-metric-mcp · 工具使用说明' },
  { kind: 'msg', phase: 'p2', no: '10', from: 1, to: 4, dir: 'f', t: 'tools/list', code: 'Authorization: Bearer <api_key>', goto: 'clients' },
  { kind: 'msg', phase: 'p2', no: '11', from: 4, to: 5, dir: 'f', t: '校验 Key', code: 'base_from_mcp_api_key', goto: 'clients' },
  { kind: 'msg', phase: 'p2', no: '12', from: 4, to: 1, dir: 'r', t: '返回 8 个工具 Schema', code: 'list_metric_sources / search_source_indexes / get_source_series …', goto: 'tools' },
  { kind: 'note', phase: 'p2', lane: 5, t: '鉴权结果', em: '内存缓存 60s', rest: '，避免每次 tools/call 打库' },
  { kind: 'msg', phase: 'p2', no: '✕', from: 4, to: 1, dir: 'err', t: '无 Key / 错 Key → 拒绝', code: '记录 phase=AUTH_FAIL（IP + 时间）', goto: 'clients' },
  { kind: 'phase', id: 'p3', t: '阶段三 · 数据调用（示例：「螺纹钢最近价格？」→ 真实 SQL）' },
  { kind: 'msg', phase: 'p3', no: '13', from: 0, to: 1, dir: 'f', t: '自然语言提问', code: '「螺纹钢最近价格怎么样？」' },
  { kind: 'msg', phase: 'p3', no: '14', from: 1, to: 4, dir: 'f', t: 'tools/call', code: 'search_source_indexes{source:1, keyword:"螺纹钢"}', goto: 'tools' },
  { kind: 'msg', phase: 'p3', no: '15', from: 4, to: 5, dir: 'f', t: '路由 source=1', code: 'base_from_ths_index' },
  { kind: 'msg', phase: 'p3', no: '16', from: 5, to: 4, dir: 'r', t: '17 条指标', code: 'S012107757 期货收盘价(活跃):螺纹钢' },
  { kind: 'msg', phase: 'p3', no: '17', from: 1, to: 4, dir: 'f', t: 'tools/call', code: 'get_source_series{index_code:"S012107757"}', goto: 'tools' },
  { kind: 'msg', phase: 'p3', no: '18', from: 4, to: 5, dir: 'f', t: '取序列', code: 'base_from_ths_data' },
  { kind: 'msg', phase: 'p3', no: '19', from: 5, to: 4, dir: 'r', t: '时间序列点', code: '2026-09-16 · 3126.0 元/吨' },
  { kind: 'note', phase: 'p3', lane: 5, t: '异步写调用日志', em: 'logs/invoke_log.jsonl', rest: '（可写库时双写 invoke_log 表）' },
  { kind: 'msg', phase: 'p3', no: '20', from: 4, to: 1, dir: 'r', t: '返回结构化结果', code: 'meta + points（升序，最大 5000 点保护）', goto: 'tools' },
  { kind: 'msg', phase: 'p3', no: '21', from: 1, to: 0, dir: 'r', t: 'LLM 生成结论', code: '「螺纹钢最新 3126 元/吨（09-16）…」' },
  { kind: 'phase', id: 'p4', t: '阶段四 · 监控闭环（调用可观测 + 数据质量巡检）' },
  { kind: 'msg', phase: 'p4', no: '22', from: 5, to: 3, dir: 'r', t: '读取调用日志', code: 'base_from_mcp_invoke_log → 调用量 / 延迟 / 错误', goto: 'monitor' },
  { kind: 'msg', phase: 'p4', no: '23', from: 3, to: 2, dir: 'r', t: '监控视图 + 告警', code: '错误率 Top · 密钥配额 · 逾期指标', goto: 'alerts' },
]

const visible = computed(() => ROWS.filter((r) => {
  if (phase.value === 'all') return true
  if (r.kind === 'phase') return r.id === phase.value
  return r.phase === phase.value
}))

function arrStyle(row) {
  const a = Math.min(row.from, row.to)
  const b = Math.max(row.from, row.to)
  return {
    left: `${((a + 0.5) / 6) * 100}%`,
    width: `${((b - a) / 6) * 100}%`,
  }
}
function noteStyle(row) {
  if (row.lane >= 4) return { left: 'auto', right: '12px', transform: 'none' }
  return { left: `${((row.lane + 0.5) / 6) * 100}%` }
}
function laneOn(i) {
  return hover.value && (hover.value.from === i || hover.value.to === i)
}
function onMsg(row) {
  if (row.goto) emit('goto', row.goto)
}
const GOTO_NAME = { services: 'MCP 中心', clients: '接入与密钥', tools: '工具目录', monitor: '调用监控', alerts: '告警中心' }
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>时序图</h2>
        <div class="desc">六个角色、四阶段，与当前 MCP 实现一一对应。点击蓝色步骤可跳到对应控制台页面。</div>
      </div>
      <a-button href="/MCP时序信息流.html" target="_blank">
        <template #icon><icon-launch /></template>新窗口
      </a-button>
    </div>

    <div class="seq-legend">
      <a-radio-group v-model="phase" type="button" size="small">
        <a-radio v-for="p in PHASES" :key="p.id" :value="p.id">{{ p.t }}</a-radio>
      </a-radio-group>
      <a-divider direction="vertical" />
      <span><i class="lg f"></i>请求</span>
      <span><i class="lg r"></i>返回</span>
      <span><i class="lg e"></i>鉴权失败</span>
      <span><i class="lg n"></i>异步</span>
    </div>

    <div class="seq-board">
      <div class="seq-lanes">
        <div
          v-for="(l, i) in LANES"
          :key="l.name"
          class="seq-lane"
          :class="{ on: laneOn(i) }"
        >
          <div class="seq-ic" :style="{ background: l.color }">
            <icon-user v-if="l.icon === 'user'" />
            <icon-desktop v-else-if="l.icon === 'desktop'" />
            <icon-tool v-else-if="l.icon === 'tool'" />
            <icon-apps v-else-if="l.icon === 'apps'" />
            <icon-cloud v-else-if="l.icon === 'cloud'" />
            <icon-storage v-else />
          </div>
          <div class="nm">{{ l.name }}</div>
          <div class="ds">{{ l.desc }}</div>
        </div>
      </div>

      <div class="seq-body">
        <div class="seq-lines">
          <i v-for="n in 6" :key="n" :style="{ left: `${((n - 0.5) / 6) * 100}%` }"></i>
        </div>
        <div class="seq-rows">
          <template v-for="(row, idx) in visible" :key="idx">
            <div v-if="row.kind === 'phase'" class="seq-phase" :class="row.id">{{ row.t }}</div>
            <div
              v-else-if="row.kind === 'note'"
              class="seq-note-row"
            >
              <div class="seq-note" :style="noteStyle(row)">
                {{ row.t }} <b>{{ row.em }}</b>{{ row.rest }}
              </div>
            </div>
            <div
              v-else
              class="seq-msg"
              :class="{ clickable: !!row.goto }"
              :title="row.goto ? `点击进入「${GOTO_NAME[row.goto]}」` : ''"
              @mouseenter="hover = row"
              @mouseleave="hover = null"
              @click="onMsg(row)"
            >
              <div class="seq-arr" :class="row.dir" :style="arrStyle(row)">
                <div class="lb">
                  <span class="no">{{ row.no }}</span>
                  {{ row.t }}
                  <span class="code">{{ row.code }}</span>
                </div>
                <div class="ln"></div>
                <div class="hd"></div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :xs="24" :md="8" style="margin-bottom: 16px">
        <a-card title="鉴权与安全" :bordered="false" hoverable class="stat-card" @click="emit('goto', 'clients')">
          <ul class="seq-ul">
            <li>Bearer Key 校验 <span class="mono">base_from_mcp_api_key</span>（enabled + expire_time），结果缓存 60s</li>
            <li>握手（initialize）放行；tools/list 与 tools/call 强制鉴权。失败分流：缺 Key / 已停用 / 已过期</li>
            <li>日配额 / QPS 与到期时间彼此独立：超限 429，过期拒绝鉴权</li>
            <li>客户端统一写 <span class="mono">type: http</span>（SSE 则为 <span class="mono">sse</span>）+ Bearer API Key；stdio 的 command/args 本服务不用</li>
          </ul>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8" style="margin-bottom: 16px">
        <a-card title="数据源路由" :bordered="false" hoverable class="stat-card" @click="emit('goto', 'tools')">
          <ul class="seq-ul">
            <li><span class="mono">1</span> 同花顺 → <span class="mono">base_from_ths_*</span></li>
            <li><span class="mono">9</span> SMM → <span class="mono">base_from_smm_*</span></li>
            <li><span class="mono">11</span> 上海钢联(化工) → <span class="mono">base_from_mysteel_chemical_*</span></li>
            <li><span class="mono">34</span> 手工录入；EDB 双路径自动回源</li>
          </ul>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8" style="margin-bottom: 16px">
        <a-card title="可观测与运维" :bordered="false" hoverable class="stat-card" @click="emit('goto', 'monitor')">
          <ul class="seq-ul">
            <li>调用日志：key_name / tool_name / args / 耗时 / 行数</li>
            <li>管理台「调用监控」：24h 趋势、P50/P95/P99、错误码分布</li>
            <li><span class="mono">get_source_freshness</span> 巡检逾期指标（默认 10 天）</li>
          </ul>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>
