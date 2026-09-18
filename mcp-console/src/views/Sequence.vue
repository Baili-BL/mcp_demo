<script setup>
import { computed, ref } from 'vue'

const emit = defineEmits(['goto'])
const phase = ref('all')
const hover = ref(null)

const LANES = [
  { name: '用户 · 研究员', desc: '申请账号 / 提问 / 收结论', color: '#165dff', icon: 'user' },
  { name: 'MCP 客户端', desc: 'Cursor / Claude Desktop', color: '#14c9c9', icon: 'desktop' },
  { name: '开发工程师', desc: '实现 MCP · 注册服务与工具', color: '#ff7d00', icon: 'tool' },
  { name: '管理台 Console', desc: '用户 · 服务 · 密钥 · 监控', color: '#722ed1', icon: 'apps' },
  { name: 'MCP 服务端', desc: 'FastMCP · 按工具路由上游', color: '#3491fa', icon: 'cloud' },
  { name: '数据面', desc: '跨平台 / 跨库（指标 · CRM · 数仓）', color: '#0fc6c2', icon: 'storage' },
]

const PHASES = [
  { id: 'all', t: '全部阶段' },
  { id: 'p0', t: '⓪ 开发介入' },
  { id: 'p1', t: '① 开通签发' },
  { id: 'p2', t: '② 客户端接入' },
  { id: 'p3', t: '③ 数据调用' },
  { id: 'p4', t: '④ 监控闭环' },
]

const ROWS = [
  { kind: 'phase', id: 'p0', t: '阶段零 · 开发提前介入（服务实现 · 服务注册 · 工具注册）' },
  { kind: 'msg', phase: 'p0', no: '1', from: 0, to: 2, dir: 'f', t: '提出数据能力需求', code: '要哪些品种 / 系统 / 工具', goto: 'services' },
  { kind: 'msg', phase: 'p0', no: '2', from: 2, to: 5, dir: 'f', t: '评审上游边界', code: '哪套库 · 是否跨库 · 只读账号' },
  { kind: 'msg', phase: 'p0', no: '3', from: 5, to: 2, dir: 'r', t: '返回表结构与口径', code: '禁止在 MCP 层重算口径' },
  { kind: 'msg', phase: 'p0', no: '4', from: 2, to: 4, dir: 'f', t: '实现 FastMCP 工具', code: '@mcp.tool · snake_case', goto: 'tools' },
  { kind: 'msg', phase: 'p0', no: '5', from: 2, to: 3, dir: 'f', t: '联系 MCP 服务人员登记服务', code: '名称 · 端点 · 协议 · 上游平台', goto: 'services' },
  { kind: 'msg', phase: 'p0', no: '6', from: 3, to: 2, dir: 'r', t: '服务已登记', code: '待探测 tools/list', goto: 'services' },
  { kind: 'msg', phase: 'p0', no: '7', from: 2, to: 3, dir: 'f', t: '注册工具 Schema', code: '探测或手工提交 · 编入工具集', goto: 'tools' },
  { kind: 'msg', phase: 'p0', no: '8', from: 3, to: 4, dir: 'f', t: '核对 tools/list', code: '与目录不一致则保持待发布' },
  { kind: 'msg', phase: 'p0', no: '9', from: 4, to: 3, dir: 'r', t: '返回工具清单', code: 'name + inputSchema', goto: 'tools' },
  { kind: 'phase', id: 'p1', t: '阶段一 · 用户开通与密钥签发' },
  { kind: 'msg', phase: 'p1', no: '10', from: 2, to: 3, dir: 'f', t: '企业微信通讯录选人', code: '内部员工 · userid / 手机 / 邮箱', goto: 'users' },
  { kind: 'msg', phase: 'p1', no: '11', from: 3, to: 0, dir: 'r', t: '发放客户邀请链接', code: '外部客户 · #register?t=inv-…', goto: 'users' },
  { kind: 'msg', phase: 'p1', no: '12', from: 0, to: 3, dir: 'f', t: '客户填写姓名与手机号', code: '邮箱选填 · 完成后账号为正常', goto: 'users' },
  { kind: 'msg', phase: 'p1', no: '13', from: 2, to: 3, dir: 'f', t: '签发密钥并绑定工具集', code: 'QPS · 日配额 · 到期 · 归属用户', goto: 'clients' },
  { kind: 'msg', phase: 'p1', no: '14', from: 3, to: 5, dir: 'f', t: '写入密钥', code: 'INSERT INTO base_from_mcp_api_key', goto: 'clients' },
  { kind: 'msg', phase: 'p1', no: '15', from: 3, to: 2, dir: 'r', t: '完整 Key 仅展示一次', code: '含到期时间；过期后拒绝鉴权', goto: 'clients' },
  { kind: 'msg', phase: 'p1', no: '16', from: 2, to: 0, dir: 'r', t: '分发接入配置', code: 'url + Bearer Key', goto: 'clients' },
  { kind: 'phase', id: 'p2', t: '阶段二 · 客户端接入（initialize / tools/list）' },
  { kind: 'msg', phase: 'p2', no: '17', from: 0, to: 1, dir: 'f', t: '粘贴配置并重启', code: '~/.cursor/mcp.json', goto: 'clients' },
  { kind: 'msg', phase: 'p2', no: '18', from: 1, to: 4, dir: 'f', t: 'initialize', code: '协议协商（握手无需鉴权）' },
  { kind: 'msg', phase: 'p2', no: '19', from: 4, to: 1, dir: 'r', t: 'serverInfo', code: 'futures-metric-mcp · 工具使用说明' },
  { kind: 'msg', phase: 'p2', no: '20', from: 1, to: 4, dir: 'f', t: 'tools/list', code: 'Authorization: Bearer <api_key>', goto: 'clients' },
  { kind: 'msg', phase: 'p2', no: '21', from: 4, to: 5, dir: 'f', t: '校验 Key', code: 'base_from_mcp_api_key', goto: 'clients' },
  { kind: 'msg', phase: 'p2', no: '22', from: 4, to: 1, dir: 'r', t: '返回已授权工具 Schema', code: '仅工具集内可见', goto: 'tools' },
  { kind: 'note', phase: 'p2', lane: 5, t: '鉴权结果', em: '内存缓存 60s', rest: '，避免每次 tools/call 打库' },
  { kind: 'msg', phase: 'p2', no: '✕', from: 4, to: 1, dir: 'err', t: '无 Key / 错 Key → 拒绝', code: '记录 phase=AUTH_FAIL', goto: 'clients' },
  { kind: 'phase', id: 'p3', t: '阶段三 · 数据调用（可跨服务，禁止单工具跨库 JOIN）' },
  { kind: 'msg', phase: 'p3', no: '23', from: 0, to: 1, dir: 'f', t: '自然语言提问', code: '「螺纹钢价格 + 对应客户盈亏」' },
  { kind: 'msg', phase: 'p3', no: '24', from: 1, to: 4, dir: 'f', t: 'tools/call', code: 'search_source_indexes{source:1, keyword:"螺纹钢"}', goto: 'tools' },
  { kind: 'msg', phase: 'p3', no: '25', from: 4, to: 5, dir: 'f', t: '路由到指标库', code: 'METRIC_DSN · base_from_ths_*' },
  { kind: 'msg', phase: 'p3', no: '26', from: 5, to: 4, dir: 'r', t: '指标与序列', code: 'S012107757 · 3126 元/吨' },
  { kind: 'msg', phase: 'p3', no: '27', from: 1, to: 4, dir: 'f', t: 'tools/call（另一工具）', code: 'query_warehouse{dataset_id:"dw.ads_variety_pnl_d"}', goto: 'tools' },
  { kind: 'msg', phase: 'p3', no: '28', from: 4, to: 5, dir: 'f', t: '路由到数仓', code: 'DW_DSN · 不 JOIN CRM' },
  { kind: 'note', phase: 'p3', lane: 5, t: '跨平台', em: 'Agent 拼结果', rest: '，MCP 不在一个 SQL 里打两套库' },
  { kind: 'msg', phase: 'p3', no: '29', from: 4, to: 1, dir: 'r', t: '返回结构化结果', code: 'meta + points / rows', goto: 'tools' },
  { kind: 'msg', phase: 'p3', no: '30', from: 1, to: 0, dir: 'r', t: 'LLM 生成结论', code: '价格 + 盈亏分述并引用工具' },
  { kind: 'phase', id: 'p4', t: '阶段四 · 监控闭环' },
  { kind: 'msg', phase: 'p4', no: '31', from: 5, to: 3, dir: 'r', t: '读取调用日志', code: 'invoke_log → 按上游拆延迟', goto: 'monitor' },
  { kind: 'msg', phase: 'p4', no: '32', from: 3, to: 2, dir: 'r', t: '监控视图 + 告警', code: '错误率 · 配额 · 逾期指标', goto: 'alerts' },
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
const GOTO_NAME = { services: 'MCP 中心', clients: '接入与密钥', tools: '工具目录', monitor: '调用监控', alerts: '告警中心', users: '用户管理' }
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>时序图</h2>
        <div class="desc">开发先实现并注册服务/工具；内部员工走企业微信选人开通，外部客户再发邀请链接，然后签发密钥。点击蓝色步骤跳到对应控制台页。</div>
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
            <li><span class="mono">1</span> 同花顺 / SMM / 钢联 → 指标库 <span class="mono">METRIC_DSN</span></li>
            <li>CRM 工具只打 <span class="mono">CRM_DSN</span>；数仓工具只打 <span class="mono">DW_DSN</span></li>
            <li>跨平台由 Agent 连续调两个工具，禁止单 SQL JOIN 两套库</li>
            <li>错误码带上游名，限流按源分别计算</li>
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
