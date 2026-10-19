export const PH_KINDS = [
  { value: 'val', label: '值占位符', syntax: "'$val{name}'", desc: '查询控件传入一个值或一组值；日期区间用 .get(0) / .get(1) 取起止。' },
  { value: 'expr', label: '表达式占位符', syntax: '$expr{字段:name}', desc: '把完整筛选条件（字段 + 运算符 + 值）传入 SQL。' },
  { value: 'condition', label: '条件占位符', syntax: '$condition{一级字段,二级字段:name}', desc: '树形下拉传入一组层级值，字段最多 10 个。' },
  { value: 'accel', label: '加速占位符', syntax: '$accel{字段:name}', desc: '用于抽取加速的时间窗口，每个数据集仅 1 个，仅数据集层生效。' },
  { value: 'tag', label: '标签占位符', syntax: "'$tag{标签名}'", desc: '运行时取当前访问用户的标签值。' },
  { value: 'system', label: '系统占位符', syntax: "'$system{accountName}'", desc: '运行时取当前访问用户的账号信息。' },
]

export const VAR_TYPES = [
  { value: 'text', label: '文本', hint: '多个值用英文逗号分隔' },
  { value: 'number', label: '数值', hint: '如 100' },
  { value: 'year', label: '日期-年', hint: '如 2026', re: /^\d{4}$/ },
  { value: 'quarter', label: '日期-年季', hint: '如 2026-Q3', re: /^\d{4}-Q[1-4]$/ },
  { value: 'month', label: '日期-年月', hint: '如 2026-09', re: /^\d{4}-(0[1-9]|1[0-2])$/ },
  { value: 'week', label: '日期-年周', hint: '如 2026-38', re: /^\d{4}-([0-4]\d|5[0-3])$/ },
  { value: 'date', label: '日期-年月日', hint: '如 2026-09-16', re: /^\d{4}-\d{2}-\d{2}$/ },
  { value: 'datetime', label: '日期-年月日时分秒', hint: '如 2026-09-16 09:30:00', re: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/ },
]

export const SYSTEM_VARS = [
  { value: 'accountName', label: '用户名（登录账号）' },
  { value: 'userNick', label: '用户昵称（组织内）' },
  { value: 'userId', label: '用户 ID（平台内）' },
  { value: 'accountId', label: '三方系统用户 ID（企业微信 ID）' },
]

export const USER_TAGS = ['团队', '角色', '用户组', '身份']

export const DEFAULT_SCOPES = [
  { value: 'dataset', label: '仅数据集' },
  { value: 'global', label: '全局生效' },
]

const MAX_DEFAULT = 150
const MAX_CONDITION_FIELDS = 10
const NAME = '[^{}:,\\s.]+'

export function kindLabel(kind) {
  return PH_KINDS.find((k) => k.value === kind)?.label || kind
}
export function varTypeLabel(t) {
  return VAR_TYPES.find((v) => v.value === t)?.label || '—'
}
export function phKey(p) {
  return `${p.kind}:${p.name}`
}

function selectClause(sql) {
  const m = String(sql || '').match(/\bselect\b([\s\S]*?)\bfrom\b/i)
  return m ? m[1] : ''
}

export function parsePlaceholders(sql) {
  const text = String(sql || '').replace(/--[^\n]*/g, (s) => ' '.repeat(s.length))
  const head = selectClause(text)
  const found = new Map()
  const add = (p) => {
    const key = phKey(p)
    const prev = found.get(key)
    if (prev) {
      prev.count += 1
      prev.range = prev.range || p.range
      prev.inSelect = prev.inSelect || p.inSelect
      return
    }
    found.set(key, { ...p, count: 1 })
  }
  const inHead = (token) => head.includes(token)
  for (const m of text.matchAll(new RegExp(`\\$val\\{(${NAME})(\\.get\\(([01])\\))?\\}`, 'g'))) {
    add({ kind: 'val', name: m[1], range: !!m[2], numeric: text[m.index - 1] !== "'", inSelect: inHead(m[0]) })
  }
  for (const m of text.matchAll(new RegExp(`(?<![\\w$])\\$\\{(${NAME})\\}`, 'g'))) {
    add({ kind: 'val', name: m[1], legacy: true, inSelect: inHead(m[0]) })
  }
  for (const m of text.matchAll(new RegExp(`\\$expr\\{\\s*([\\w.]+)\\s*:\\s*(${NAME})\\s*\\}`, 'g'))) {
    add({ kind: 'expr', name: m[2], fields: [m[1]], inSelect: inHead(m[0]) })
  }
  for (const m of text.matchAll(new RegExp(`\\$condition\\{([^{}:]+):\\s*(${NAME})\\s*\\}`, 'g'))) {
    add({ kind: 'condition', name: m[2], fields: m[1].split(',').map((x) => x.trim()).filter(Boolean), inSelect: inHead(m[0]) })
  }
  for (const m of text.matchAll(new RegExp(`\\$accel\\{\\s*([\\w.]+)\\s*:\\s*(${NAME})\\s*\\}`, 'g'))) {
    add({ kind: 'accel', name: m[2], fields: [m[1]], inSelect: inHead(m[0]) })
  }
  for (const m of text.matchAll(new RegExp(`\\$tag\\{(${NAME})\\}`, 'g'))) {
    add({ kind: 'tag', name: m[1], inSelect: inHead(m[0]) })
  }
  for (const m of text.matchAll(new RegExp(`\\$system\\{(${NAME})\\}`, 'g'))) {
    add({ kind: 'system', name: m[1], inSelect: inHead(m[0]) })
  }
  return [...found.values()]
}

function emptyConfig(p) {
  return {
    id: `ph-${p.kind}-${p.name}-${Math.random().toString(36).slice(2, 7)}`,
    kind: p.kind,
    name: p.name,
    fields: [...(p.fields || [])],
    varType: p.kind === 'accel' || p.range ? 'date' : p.kind === 'val' && p.numeric ? 'number' : 'text',
    scope: p.kind === 'accel' ? 'dataset' : 'global',
    defaultValue: '',
    manual: false,
  }
}

export function mergePlaceholders(sql, existing = []) {
  const parsed = parsePlaceholders(sql)
  const byKey = new Map(existing.map((p) => [phKey(p), p]))
  const out = parsed.map((p) => {
    const prev = byKey.get(phKey(p))
    byKey.delete(phKey(p))
    const base = prev ? { ...prev } : emptyConfig(p)
    return {
      ...base,
      fields: p.fields?.length ? [...p.fields] : [...(base.fields || [])],
      range: !!p.range,
      legacy: !!p.legacy,
      inSelect: !!p.inSelect,
      count: p.count,
      used: true,
      manual: false,
    }
  })
  for (const p of byKey.values()) {
    if (p.manual) out.push({ ...p, used: false, count: 0, inSelect: false })
  }
  return out
}

export function newManualPlaceholder({ kind, name, fields = [], varType, scope, defaultValue }) {
  const base = emptyConfig({ kind, name, fields })
  return {
    ...base,
    varType: varType || base.varType,
    scope: kind === 'accel' ? 'dataset' : (scope || 'global'),
    defaultValue: defaultValue || '',
    manual: true,
    used: false,
    count: 0,
  }
}

export function placeholderToken(p) {
  const f = (p.fields || []).join(',') || 'field'
  if (p.kind === 'expr') return `$expr{${f}:${p.name}}`
  if (p.kind === 'condition') return `$condition{${f}:${p.name}}`
  if (p.kind === 'accel') return `$accel{${(p.fields || [])[0] || 'field'}:${p.name}}`
  if (p.kind === 'tag') return `'$tag{${p.name}}'`
  if (p.kind === 'system') return `'$system{${p.name}}'`
  if (p.varType === 'number') return `$val{${p.name}}`
  return `'$val{${p.name}}'`
}

export function renamePlaceholderInSql(sql, p, next) {
  const from = p.name
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let out = String(sql || '')
  if (p.kind === 'val') {
    out = out.replace(new RegExp(`\\$val\\{${esc}(\\.get\\([01]\\))?\\}`, 'g'), (_, g) => `$val{${next}${g || ''}}`)
    out = out.replace(new RegExp(`(?<![\\w$])\\$\\{${esc}\\}`, 'g'), `\${${next}}`)
  } else if (p.kind === 'tag' || p.kind === 'system') {
    out = out.replace(new RegExp(`\\$${p.kind}\\{${esc}\\}`, 'g'), `$${p.kind}{${next}}`)
  } else {
    out = out.replace(new RegExp(`(\\$${p.kind}\\{[^{}:]+:\\s*)${esc}(\\s*\\})`, 'g'), `$1${next}$2`)
  }
  return out
}

export function removePlaceholderFromSql(sql, p) {
  const esc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (p.kind === 'expr' || p.kind === 'condition' || p.kind === 'accel') {
    return String(sql || '').replace(new RegExp(`\\$${p.kind}\\{[^{}:]+:\\s*${esc}\\s*\\}`, 'g'), '1=1')
  }
  return sql
}

function isExpression(v) {
  return /(=|<>|!=|>=|<=|>|<|\bin\b|\blike\b|\bbetween\b|\bis\b)/i.test(String(v || ''))
}

export function validatePlaceholders(list, users = []) {
  const errors = []
  const warnings = []
  const accel = list.filter((p) => p.kind === 'accel')
  if (accel.length > 1) errors.push(`每个数据集仅支持 1 个加速占位符，当前有 ${accel.length} 个`)
  const names = new Map()
  list.forEach((p) => {
    const label = `「${p.name}」`
    const dv = String(p.defaultValue ?? '').trim()
    if (dv.length > MAX_DEFAULT) errors.push(`${label}默认值超过 ${MAX_DEFAULT} 个字符`)
    if (p.inSelect && !(p.scope === 'global' && dv) && ['val', 'expr', 'condition'].includes(p.kind)) {
      errors.push(`${label}用在 SELECT 语句中，必须设置全局生效的默认值`)
    }
    if (p.kind === 'condition' && (p.fields || []).length > MAX_CONDITION_FIELDS) {
      errors.push(`${label}字段数量超过 ${MAX_CONDITION_FIELDS} 个`)
    }
    if (p.kind === 'val' && dv && p.varType === 'number' && !/^-?\d+(\.\d+)?$/.test(dv)) {
      errors.push(`${label}是数值类型，默认值必须是数字`)
    }
    if (p.kind === 'val' && dv && p.varType !== 'text' && p.varType !== 'number') {
      const re = VAR_TYPES.find((v) => v.value === p.varType)?.re
      const parts = p.range ? dv.split('~').map((x) => x.trim()) : [dv]
      if (p.range && parts.length !== 2) warnings.push(`${label}使用了 .get(0)/.get(1)，默认值请写成「起始~结束」`)
      if (re && parts.some((x) => x && !re.test(x))) warnings.push(`${label}默认值与「${varTypeLabel(p.varType)}」格式不符`)
    }
    if (p.kind === 'accel' && dv && !isExpression(dv)) {
      errors.push(`${label}是加速占位符，默认值需为完整过滤表达式，如 report_date < '2025-04-01'`)
    }
    if (p.kind === 'system' && !SYSTEM_VARS.some((s) => s.value === p.name)) {
      errors.push(`${label}不是支持的系统占位符，可用：${SYSTEM_VARS.map((s) => s.value).join(' / ')}`)
    }
    if (p.kind === 'tag' && !USER_TAGS.includes(p.name)) {
      warnings.push(`${label}不在用户标签（${USER_TAGS.join('、')}）中，运行时取值为空`)
    }
    if (p.kind === 'val' && !dv && !p.inSelect && p.used) {
      warnings.push(`${label}未设置默认值，运行时所在条件按 1=1 处理`)
    }
    if (!p.used && p.manual) warnings.push(`${label}已创建但 SQL 中尚未引用`)
    const k = `${p.name}`
    if (names.has(k) && names.get(k) !== p.kind && !['tag', 'system'].includes(p.kind)) {
      warnings.push(`${label}同名用于多种占位符，查询控件传值时可能冲突`)
    }
    names.set(k, p.kind)
  })
  void users
  return { errors, warnings }
}

export function tagValuesOf(user, tag, groups = []) {
  if (!user) return []
  if (tag === '团队') return user.team ? [user.team] : []
  if (tag === '角色') return user.role ? [user.role] : []
  if (tag === '身份') return [user.kind === 'customer' ? '外部客户' : '内部员工']
  if (tag === '用户组') return groups.filter((g) => (g.memberIds || []).includes(user.id)).map((g) => g.name)
  return []
}

export function systemValueOf(user, name) {
  if (!user) return ''
  if (name === 'accountName') return user.email || user.phone || user.id
  if (name === 'userNick') return user.name || ''
  if (name === 'userId') return user.id
  if (name === 'accountId') return user.wecomUserId || user.id
  return ''
}

function q(v) {
  return String(v).replace(/'/g, "''")
}

function exprFrom(field, value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (isExpression(v)) return v
  const items = v.split(',').map((x) => x.trim()).filter(Boolean)
  return items.length > 1 ? `${field} IN ('${items.map(q).join("', '")}')` : `${field} = '${q(items[0])}'`
}

export function renderSql(sql, list, { user = null, groups = [], values = {} } = {}) {
  const byKey = new Map((list || []).map((p) => [phKey(p), p]))
  const notes = []
  const errors = []
  let out = String(sql || '')
  const valueOf = (kind, name) => {
    if (values[name] !== undefined && values[name] !== '') return values[name]
    return String(byKey.get(`${kind}:${name}`)?.defaultValue ?? '').trim()
  }

  out = out.replace(new RegExp(`\\$expr\\{\\s*([\\w.]+)\\s*:\\s*(${NAME})\\s*\\}`, 'g'), (_, field, name) => {
    const e = exprFrom(field, valueOf('expr', name))
    if (!e) notes.push(`表达式占位符「${name}」未传值，按 1=1 处理`)
    return e || '1=1'
  })
  out = out.replace(new RegExp(`\\$condition\\{([^{}:]+):\\s*(${NAME})\\s*\\}`, 'g'), (_, fields, name) => {
    const first = fields.split(',')[0].trim()
    const e = exprFrom(first, valueOf('condition', name))
    if (!e) notes.push(`条件占位符「${name}」未传值，按 1=1 处理`)
    return e || '1=1'
  })
  out = out.replace(new RegExp(`\\$accel\\{\\s*([\\w.]+)\\s*:\\s*(${NAME})\\s*\\}`, 'g'), (_, field, name) => {
    const v = valueOf('accel', name)
    if (!v) notes.push(`加速占位符「${name}」未设置默认值，预览按 1=1 处理`)
    return v || '1=1'
  })
  out = out.replace(new RegExp(`\\$tag\\{(${NAME})\\}`, 'g'), (_, name) => {
    if (!user) {
      errors.push(`标签占位符「${name}」需要预览身份，请先选择用户`)
      return ''
    }
    const vals = tagValuesOf(user, name, groups)
    if (!vals.length) notes.push(`${user.name} 没有「${name}」标签，取值为空`)
    return vals.map(q).join("', '")
  })
  out = out.replace(new RegExp(`\\$system\\{(${NAME})\\}`, 'g'), (_, name) => {
    if (!user) {
      errors.push(`系统占位符「${name}」需要预览身份，请先选择用户`)
      return ''
    }
    return q(systemValueOf(user, name))
  })

  const valNames = new Set((list || []).filter((p) => p.kind === 'val').map((p) => p.name))
  for (const m of out.matchAll(new RegExp(`\\$val\\{(${NAME})(?:\\.get\\([01]\\))?\\}|(?<![\\w$])\\$\\{(${NAME})\\}`, 'g'))) {
    valNames.add(m[1] || m[2])
  }
  valNames.forEach((name) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const token = `(?:\\$val\\{${esc}(?:\\.get\\(([01])\\))?\\}|(?<![\\w$])\\$\\{${esc}\\})`
    const v = valueOf('val', name)
    if (!v) {
      const pred = new RegExp(`[\\w.]+\\s*(?:=|<>|!=|>=|<=|>|<|\\bnot\\s+in\\b|\\bin\\b|\\blike\\b)\\s*\\(?\\s*'?${token}'?\\s*\\)?`, 'gi')
      const before = out
      out = out.replace(pred, '1=1')
      if (before !== out) notes.push(`值占位符「${name}」未传值，所在条件按 1=1 处理`)
      if (new RegExp(token).test(out)) errors.push(`值占位符「${name}」没有可用的值，请设置默认值`)
      return
    }
    out = out.replace(new RegExp(token, 'g'), (_, idx) => {
      if (idx !== undefined) {
        const parts = String(v).split('~').map((x) => x.trim())
        return q(parts[Number(idx)] ?? parts[0])
      }
      const items = String(v).split(',').map((x) => x.trim()).filter(Boolean)
      return items.map(q).join("', '")
    })
  })
  return { sql: out, notes, errors }
}

export function placeholderToolParams(list) {
  const props = {}
  ;(list || []).filter((p) => p.used !== false).forEach((p) => {
    const dv = String(p.defaultValue ?? '').trim()
    const scopeDefault = p.scope === 'global' && dv ? dv : undefined
    if (p.kind === 'val') {
      const fmt = VAR_TYPES.find((v) => v.value === p.varType)?.hint || ''
      if (p.range) {
        props[p.name] = { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2, description: `占位符 ${p.name}（${varTypeLabel(p.varType)}区间：[起始, 结束]）` }
      } else if (p.varType === 'number') {
        props[p.name] = { type: 'number', description: `占位符 ${p.name}（数值）`, ...(scopeDefault !== undefined ? { default: Number(scopeDefault) } : {}) }
      } else {
        props[p.name] = { type: 'string', description: `占位符 ${p.name}（${varTypeLabel(p.varType)}${fmt ? `，${fmt}` : ''}）`, ...(scopeDefault !== undefined ? { default: scopeDefault } : {}) }
      }
    } else if (p.kind === 'expr') {
      props[p.name] = { type: 'string', description: `表达式占位符：对 ${(p.fields || [])[0]} 的完整条件，如 ${(p.fields || [])[0]} >= '2026-01-01'；不传则不过滤` }
    } else if (p.kind === 'condition') {
      props[p.name] = { type: 'array', items: { type: 'string' }, description: `条件占位符：按 ${(p.fields || []).join(' > ')} 层级传入一组值；不传则不过滤` }
    }
  })
  return props
}
