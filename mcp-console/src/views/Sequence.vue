<script setup>
import { computed, ref } from 'vue'

const emit = defineEmits(['goto'])
const phase = ref('all')
const hover = ref(null)

const LANES = [
  { name: '用户 · 研究员', desc: '被开通 / 提问 / 收结论', color: '#165dff', icon: 'user' },
  { name: 'MCP 客户端', desc: 'Cursor / Claude Desktop', color: '#14c9c9', icon: 'desktop' },
  { name: '开发 / 管理员', desc: '操作控制台全流程', color: '#ff7d00', icon: 'tool' },
  { name: '管理台 Console', desc: '源 · 集 · 权限 · 服务 · 工具集 · 密钥', color: '#722ed1', icon: 'apps' },
  { name: 'MCP 服务端', desc: '探测 · 路由 · 套 Grant', color: '#3491fa', icon: 'cloud' },
  { name: '数据面', desc: '库表 · Grant · 中间视图', color: '#0fc6c2', icon: 'storage' },
]

const PHASES = [
  { id: 'all', t: '全部' },
  { id: 'psrc', t: '1 数据源 / 数据集' },
  { id: 'pperm', t: '2 用户权限' },
  { id: 'psvc', t: '3 创建服务' },
  { id: 'ptool', t: '4 创建工具' },
  { id: 'pts', t: '5 创建工具集' },
  { id: 'puser', t: '6 开通用户' },
  { id: 'pcall', t: '7 接入调用' },
  { id: 'pmon', t: '8 监控' },
]

const ROWS = [
  { kind: 'phase', id: 'psrc', t: '1 · 数据源 / 数据集（先有源，再建集；服务创建时要勾已登记数据源）' },
  { kind: 'msg', phase: 'psrc', no: '1', from: 2, to: 3, dir: 'f', t: '创建数据源', code: '数据准备 → 数据源 · DSN · 只读 · 超时', goto: 'sources' },
  { kind: 'msg', phase: 'psrc', no: '2', from: 3, to: 5, dir: 'f', t: '测试连接并同步 schema', code: '表 / 字段 / 样例值', goto: 'sources' },
  { kind: 'msg', phase: 'psrc', no: '3', from: 5, to: 3, dir: 'r', t: '返回目录', code: '禁止跨源 JOIN', goto: 'sources' },
  { kind: 'msg', phase: 'psrc', no: '4', from: 2, to: 3, dir: 'f', t: '创建数据集', code: '表 / 同库模型 JOIN / SQL + 占位符', goto: 'datasets' },
  { kind: 'note', phase: 'psrc', lane: 3, t: '定制协议工具', em: '仍须先写 FastMCP', rest: '；数据集路径不必写新服务进程' },

  { kind: 'phase', id: 'pperm', t: '2 · 用户数据权限（行 / 列 / 组 / 协作者，必须在发布工具和发 Key 之前）' },
  { kind: 'msg', phase: 'pperm', no: '5', from: 2, to: 3, dir: 'f', t: '配置行权限', code: '主体：全员 / 用户 / 用户组 · 白名单 · 未匹配兜底', goto: 'security' },
  { kind: 'msg', phase: 'pperm', no: '6', from: 2, to: 3, dir: 'f', t: '配置列权限', code: '隐藏 / 脱敏 · 仅对TA / 除了TA', goto: 'security' },
  { kind: 'msg', phase: 'pperm', no: '7', from: 3, to: 5, dir: 'f', t: '保存 DatasetGrant', code: 'row_policies + col_policies', goto: 'security' },
  { kind: 'msg', phase: 'pperm', no: '8', from: 2, to: 3, dir: 'f', t: '设置数据集协作者', code: 'use / manage，谁能改集与权限', goto: 'datasets' },
  { kind: 'note', phase: 'pperm', lane: 3, t: '权限主体是', em: '用户与用户组', rest: '，不是 Key；Key 只用来找出调用人' },

  { kind: 'phase', id: 'psvc', t: '3 · 创建 MCP 服务（Remote 端点；关联已登记数据源）' },
  { kind: 'msg', phase: 'psvc', no: '9', from: 0, to: 2, dir: 'f', t: '提出要接入的能力', code: '行情 / CRM / 数仓 / 只要某张表' },
  { kind: 'msg', phase: 'psvc', no: '10', from: 2, to: 4, dir: 'f', t: '实现 FastMCP 进程', code: '定制工具才需要；数据集服务 dsx 平台托管', goto: 'services' },
  { kind: 'msg', phase: 'psvc', no: '11', from: 2, to: 3, dir: 'f', t: '创建 MCP 服务', code: 'MCP 中心 → 名称 · code · 端点 · HTTP/SSE', goto: 'services' },
  { kind: 'msg', phase: 'psvc', no: '12', from: 2, to: 3, dir: 'f', t: '勾选本服务读取的数据源', code: '源须已在数据源页登记', goto: 'sources' },
  { kind: 'msg', phase: 'psvc', no: '13', from: 2, to: 3, dir: 'f', t: '打开「透传身份」', code: '数据集受控读取的前提', goto: 'services' },
  { kind: 'msg', phase: 'psvc', no: '14', from: 3, to: 2, dir: 'r', t: '服务已登记', code: '待探测工具，尚未进工具集', goto: 'services' },

  { kind: 'phase', id: 'ptool', t: '4 · 创建工具（上游探测 / 手工登记 / 数据集发布 / 申请读取）' },
  { kind: 'msg', phase: 'ptool', no: '15', from: 3, to: 4, dir: 'f', t: '探测 tools/list', code: '创建服务时可勾选；挂到本服务', goto: 'services' },
  { kind: 'msg', phase: 'ptool', no: '16', from: 4, to: 3, dir: 'r', t: '返回工具清单', code: 'name + inputSchema → 工具目录', goto: 'tools' },
  { kind: 'msg', phase: 'ptool', no: '17', from: 2, to: 3, dir: 'f', t: '手工登记工具', code: '探测失败时在工具目录补 Schema', goto: 'tools' },
  { kind: 'msg', phase: 'ptool', no: '18', from: 3, to: 4, dir: 'f', t: '发布数据集工具', code: '数据集 → 发布工具 · 挂 dataset-hub-mcp', goto: 'datasets' },
  { kind: 'msg', phase: 'ptool', no: '19', from: 2, to: 3, dir: 'f', t: '既有工具申请读取数据集', code: '工具目录勾选数据集 → 待授权', goto: 'tools' },
  { kind: 'msg', phase: 'ptool', no: '20', from: 3, to: 5, dir: 'f', t: '批准读取并生成中间视图', code: 'sec_view + 服务已透传身份 = 受控', goto: 'datasets' },
  { kind: 'note', phase: 'ptool', lane: 3, t: '工具进了目录', em: '还不能给用户', rest: '：必须再创建工具集并勾选' },

  { kind: 'phase', id: 'pts', t: '5 · 创建工具集（归集各服务工具，之后才能被 Key 绑定）' },
  { kind: 'msg', phase: 'pts', no: '21', from: 2, to: 3, dir: 'f', t: '创建 MCP 工具集', code: 'MCP 中心 → MCP 工具集 · 名称', goto: 'services' },
  { kind: 'msg', phase: 'pts', no: '22', from: 2, to: 3, dir: 'f', t: '勾选工具加入工具集', code: '可跨服务归集；不覆盖已有工具', goto: 'services' },
  { kind: 'msg', phase: 'pts', no: '23', from: 3, to: 2, dir: 'r', t: '工具集可下发', code: '端点 + 工具清单；去接入与密钥签发', goto: 'clients' },
  { kind: 'note', phase: 'pts', lane: 3, t: '一把 Key', em: '只绑需要的工具集', rest: '，避免行情 Key 打穿 CRM / 数仓' },

  { kind: 'phase', id: 'puser', t: '6 · 开通用户与签发密钥（先有人，再有 Key，Key 必须绑工具集）' },
  { kind: 'msg', phase: 'puser', no: '24', from: 2, to: 3, dir: 'f', t: '企业微信通讯录选人', code: '用户管理 → 添加企业用户', goto: 'users' },
  { kind: 'msg', phase: 'puser', no: '25', from: 2, to: 3, dir: 'f', t: '导入注册', code: '手机号 + 名称，可 Excel', goto: 'users' },
  { kind: 'msg', phase: 'puser', no: '26', from: 0, to: 3, dir: 'f', t: '账号入组', code: '用户组决定行/列策略是否命中', goto: 'groups' },
  { kind: 'msg', phase: 'puser', no: '27', from: 2, to: 3, dir: 'f', t: '签发密钥', code: '接入与密钥 · 归属用户 + 绑定工具集', goto: 'clients' },
  { kind: 'msg', phase: 'puser', no: '28', from: 3, to: 5, dir: 'f', t: '写入密钥', code: 'QPS · 日配额 · 到期', goto: 'clients' },
  { kind: 'msg', phase: 'puser', no: '29', from: 3, to: 2, dir: 'r', t: '完整 Key 仅展示一次', code: '过期拒绝鉴权', goto: 'clients' },
  { kind: 'msg', phase: 'puser', no: '30', from: 2, to: 0, dir: 'r', t: '把接入配置发给用户', code: 'url + Bearer Key', goto: 'clients' },

  { kind: 'phase', id: 'pcall', t: '7 · 用户接入与受控调用（工具集内可见 + Grant 按调用人过滤）' },
  { kind: 'msg', phase: 'pcall', no: '31', from: 0, to: 1, dir: 'f', t: '粘贴配置并重启', code: '~/.cursor/mcp.json', goto: 'clients' },
  { kind: 'msg', phase: 'pcall', no: '32', from: 1, to: 4, dir: 'f', t: 'initialize', code: '握手无需鉴权' },
  { kind: 'msg', phase: 'pcall', no: '33', from: 1, to: 4, dir: 'f', t: 'tools/list', code: 'Bearer Key', goto: 'clients' },
  { kind: 'msg', phase: 'pcall', no: '34', from: 4, to: 5, dir: 'f', t: '校验 Key 并取归属用户', code: '只返回该 Key 工具集内工具', goto: 'tools' },
  { kind: 'msg', phase: 'pcall', no: '✕', from: 4, to: 1, dir: 'err', t: '无 Key / 错 Key / 未绑工具集 → 拒绝', code: 'AUTH_FAIL', goto: 'clients' },
  { kind: 'msg', phase: 'pcall', no: '35', from: 0, to: 1, dir: 'f', t: '自然语言提问', code: '「螺纹钢价格 + 客户盈亏」' },
  { kind: 'msg', phase: 'pcall', no: '36', from: 1, to: 4, dir: 'f', t: 'tools/call', code: '指标工具或数据集工具', goto: 'tools' },
  { kind: 'msg', phase: 'pcall', no: '37', from: 4, to: 5, dir: 'f', t: '按调用人套 Grant 后路由', code: '行过滤 + 列掩码 · 一工具一 DSN', goto: 'security' },
  { kind: 'msg', phase: 'pcall', no: '38', from: 4, to: 1, dir: 'r', t: '返回已过滤结果', code: '看不见的行/列不会出现', goto: 'tools' },
  { kind: 'msg', phase: 'pcall', no: '39', from: 1, to: 0, dir: 'r', t: 'LLM 生成结论', code: '引用工具，不泄露未授权字段' },

  { kind: 'phase', id: 'pmon', t: '8 · 监控闭环' },
  { kind: 'msg', phase: 'pmon', no: '40', from: 5, to: 3, dir: 'r', t: '读取调用日志', code: '调用人 / 工具 / 耗时 / 行数', goto: 'monitor' },
  { kind: 'msg', phase: 'pmon', no: '41', from: 3, to: 2, dir: 'r', t: '监控与告警', code: '错误率 · 配额 · 未受控读取', goto: 'alerts' },
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
const GOTO_NAME = { overview: '首页', services: 'MCP 中心', clients: '接入与密钥', tools: '工具目录', monitor: '调用监控', alerts: '告警中心', users: '用户管理', groups: '用户组管理', sources: '数据源', datasets: '数据集', security: '数据权限' }
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2>时序图</h2>
        <div class="desc">管理员操作顺序：数据源 → 数据集 → 用户权限 → 创建服务 → 创建工具 → 创建工具集 → 开通用户并发 Key → 用户接入调用。点击步骤或上方条带跳到对应页。</div>
      </div>
      <a-button href="/MCP时序信息流.html" target="_blank">
        <template #icon><icon-launch /></template>新窗口
      </a-button>
    </div>

    <div class="seq-ops" role="tablist" aria-label="操作流程">
      <button
        v-for="p in PHASES.filter((x) => x.id !== 'all')"
        :key="p.id"
        type="button"
        class="seq-ops-item"
        :class="{ on: phase === p.id }"
        @click="phase = p.id"
      >{{ p.t }}</button>
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
        <a-card title="创建顺序（不要颠倒）" :bordered="false" hoverable class="stat-card tone-blue" @click="emit('goto', 'services')">
          <ul class="seq-ul">
            <li>先登记<strong>数据源</strong>，再建<strong>数据集</strong>，再配<strong>行/列权限</strong></li>
            <li>再<strong>创建服务</strong>（勾已有数据源）→ <strong>创建工具</strong>（探测 / 手工 / 发布数据集）</li>
            <li>再<strong>创建工具集</strong>并勾选工具；没有工具集的服务对用户不可见</li>
            <li>最后<strong>开通用户</strong>、签发绑定工具集的 Key</li>
          </ul>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8" style="margin-bottom: 16px">
        <a-card title="两套权限" :bordered="false" hoverable class="stat-card tone-cyan" @click="emit('goto', 'security')">
          <ul class="seq-ul">
            <li><strong>工具集权限</strong>：Key 绑哪些工具，决定 <span class="mono">tools/list</span> 能看见什么</li>
            <li><strong>数据权限</strong>：Grant 按用户/组滤行、掩列；白名单绕过</li>
            <li>创建工具两条路：探测上游，或「数据集 → 发布工具」挂 <span class="mono">dsx</span></li>
            <li>既有工具读数据集：申请读取 + 中间视图 + 服务透传身份</li>
          </ul>
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8" style="margin-bottom: 16px">
        <a-card title="用户侧流程" :bordered="false" hoverable class="stat-card tone-purple" @click="emit('goto', 'users')">
          <ul class="seq-ul">
            <li>内部：企微选人；外部：导入注册。入组后行/列策略才可能命中</li>
            <li>拿到 url + Bearer Key，写入客户端配置并重启</li>
            <li>提问后 Agent 只调工具集内工具，结果已套该用户 Grant</li>
            <li>关系树可从用户 / 服务 / 数据集三边核对是否受控</li>
          </ul>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>
