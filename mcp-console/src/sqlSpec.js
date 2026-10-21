import { validatePlaceholders } from './placeholders.js'

const WRITE_RE = /\b(insert|update|delete|drop|alter|truncate|create)\b/i
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const TOKEN_CN = {
  id: '标识', code: '代码', name: '名称', time: '时间', date: '日期', value: '值',
  unit: '单位', frequency: '频度', create: '创建', update: '更新', index: '指标',
  data: '数据', start: '开始', end: '结束', type: '类型', status: '状态', title: '标题',
  summary: '摘要', content: '内容', source: '来源', parent: '上级', level: '层级',
  sort: '排序', price: '价格', region: '地区', variety: '品种', count: '数量',
  amount: '金额', user: '用户', account: '账号',
}

const SQL_WORDS = new Set(['on', 'where', 'left', 'right', 'inner', 'outer', 'full', 'join', 'cross', 'limit', 'group', 'order', 'having', 'union', 'select', 'and', 'or'])

export function tablesInSql(sql) {
  return tableAliases(sql).tables
}

/** FROM / JOIN 后面的表，以及别名到表名的对应。关联补齐时用别名找回源表。 */
export function tableAliases(sql) {
  const masked = maskLiterals(String(sql || ''))
  const aliases = {}
  const tables = []
  const re = /\b(?:from|join)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?/gi
  let m
  while ((m = re.exec(masked))) {
    const table = m[1]
    const alias = m[2] && !SQL_WORDS.has(m[2].toLowerCase()) ? m[2] : ''
    if (!tables.includes(table)) tables.push(table)
    aliases[table] = table
    if (alias) aliases[alias] = table
  }
  return { tables, aliases }
}

function describeColumn(columnName, cn, hint) {
  const from = hint.table
    ? `来自 ${hint.table}${hint.physical && hint.physical !== columnName ? `.${hint.physical}` : ''}。`
    : ''
  return `${cn}。${from}MCP 工具返回字段 ${columnName}，调用时可据此理解该列含义。`
}

/** 用字段注释或列名推断中文名和说明。只建议空缺项该填什么。 */
export function suggestColumnDef(columnName, hint = {}) {
  const comment = String(hint.description || hint.comment || '').trim()
  const cnFromComment = comment.split(/[，。,.]/)[0].trim()
  if (cnFromComment) {
    return {
      cn: cnFromComment.slice(0, 20),
      description: describeColumn(columnName, cnFromComment, hint),
      data_type: hint.data_type || '',
    }
  }
  const parts = String(columnName || '').split('_').filter(Boolean)
  const known = parts.map((p) => TOKEN_CN[p.toLowerCase()] || '')
  const cn = known.some(Boolean) ? parts.map((p, i) => known[i] || p).join('') : (columnName || '')
  return {
    cn,
    description: describeColumn(columnName, cn, hint),
    data_type: hint.data_type || '',
  }
}

/** 把字符串和注释换成空格，长度不变，方便按括号深度找关键字。 */
function maskLiterals(sql) {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const n = sql[i + 1]
    if (c === '-' && n === '-') {
      const end = sql.indexOf('\n', i)
      const stop = end < 0 ? sql.length : end
      out += ' '.repeat(stop - i)
      i = stop
      continue
    }
    if (c === '/' && n === '*') {
      const end = sql.indexOf('*/', i + 2)
      const stop = end < 0 ? sql.length : end + 2
      out += ' '.repeat(stop - i)
      i = stop
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === c) {
          if (c === "'" && sql[j + 1] === "'") {
            j += 2
            continue
          }
          j += 1
          break
        }
        j += 1
      }
      out += ' '.repeat(j - i)
      i = j
      continue
    }
    out += c
    i += 1
  }
  return out
}

function topLevelKeywords(masked) {
  const hits = []
  let depth = 0
  const re = /[A-Za-z_]+|\(|\)/g
  let m
  while ((m = re.exec(masked))) {
    if (m[0] === '(') {
      depth += 1
      continue
    }
    if (m[0] === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (depth === 0) hits.push({ word: m[0].toLowerCase(), index: m.index })
  }
  return hits
}

function splitAtDepth(masked, sep) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < masked.length; i += 1) {
    const c = masked[i]
    if (c === '(') depth += 1
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (c === sep && depth === 0) {
      parts.push([start, i])
      start = i + 1
    }
  }
  parts.push([start, masked.length])
  return parts
}

function unquote(name) {
  return String(name || '').trim().replace(/^[`"']|[`"']$/g, '')
}

function columnOf(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!text) return { error: '选择列表里有空列' }
  if (text === '*' || /\.\s*\*\s*$/.test(text)) return { star: true, text }
  const as = text.match(/\bas\s+(`[^`]+`|"[^"]+"|[A-Za-z_][A-Za-z0-9_]*)\s*$/i)
  let name = as ? as[1] : ''
  if (!name) {
    if (text.includes('(')) return { error: `表达式「${text}」需要写成 AS 别名，例如 ${text} AS alias_name` }
    const id = text.match(/([A-Za-z_][A-Za-z0-9_]*|`[^`]+`|"[^"]+")\s*$/)
    name = id ? id[1] : ''
  }
  name = unquote(name)
  if (!IDENT_RE.test(name)) {
    return { error: `列名「${name || text}」必须是字母或下划线开头，只含字母、数字和下划线` }
  }
  const expr = as ? text.slice(0, text.length - as[0].length).trim() : text
  const qual = expr.match(/^(?:([A-Za-z_][A-Za-z0-9_]*)\.)?([A-Za-z_][A-Za-z0-9_]*)$/)
  return {
    name,
    qualifier: qual?.[1] || '',
    physical: qual?.[2] || name,
  }
}

function statementsOf(sql) {
  const text = String(sql || '').trim()
  const masked = maskLiterals(text)
  return splitAtDepth(masked, ';')
    .map(([a, b]) => ({ raw: text.slice(a, b).trim(), masked: masked.slice(a, b).trim() }))
    .filter((s) => s.raw)
}

/** 从一条 SELECT 里取出输出列名。失败时 columns 为空，error 说明原因。 */
export function parseOutputColumns(sql) {
  const parts = statementsOf(sql)
  if (!parts.length) return { columns: [], error: '请先编写 SQL' }
  if (parts.length > 1) return { columns: [], error: '只允许一条 SQL 语句' }
  const { raw, masked } = parts[0]
  const keywords = topLevelKeywords(masked)
  const first = keywords[0]?.word
  if (first !== 'select' && first !== 'with') {
    return { columns: [], error: 'SQL 数据集只允许 SELECT，或以 WITH 开头的 SELECT' }
  }
  const select = keywords.find((k) => k.word === 'select')
  if (!select) return { columns: [], error: 'WITH 查询必须包含 SELECT' }
  const from = keywords.find((k) => k.word === 'from' && k.index > select.index)
  if (!from) return { columns: [], error: '无法识别输出列，请先运行 SQL，或写成 SELECT 列名 FROM 表' }
  let start = select.index + 'select'.length
  const between = masked.slice(start, from.index)
  const lead = between.match(/^\s*(distinct|all)\b/i)
  if (lead) start += lead[0].length
  const listRaw = raw.slice(start, from.index)
  const listMasked = masked.slice(start, from.index)
  const items = splitAtDepth(listMasked, ',').map(([a, b]) => listRaw.slice(a, b))
  if (!items.some((item) => item.trim())) return { columns: [], error: '请至少选择一个输出列' }
  const columns = []
  const fields = []
  const errors = []
  items.forEach((item) => {
    if (!item.trim()) return
    const col = columnOf(item)
    if (col.star) {
      errors.push('禁止 SELECT * 或 表名.*，请逐列写出字段，才能为 MCP 工具下定义')
      return
    }
    if (col.error) {
      errors.push(col.error)
      return
    }
    if (columns.includes(col.name)) errors.push(`输出列「${col.name}」重复。关联查询里两边都有该列时，请用 AS 区分，例如 d.index_code AS series_code`)
    else {
      columns.push(col.name)
      fields.push({ name: col.name, qualifier: col.qualifier, physical: col.physical })
    }
  })
  return { columns, fields, error: errors[0] || '', errors }
}

export function checkSqlSpec({ sql, placeholders = [], columns = [], dialect = 'mysql' } = {}) {
  const errors = []
  const warnings = []
  const text = String(sql || '').trim()
  const parts = statementsOf(text)
  if (!parts.length) errors.push('请先编写 SQL')
  else if (parts.length > 1) errors.push('只允许一条 SQL 语句，数据集会整段作为 MCP 工具的查询')
  const body = parts[0]
  if (body) {
    const first = topLevelKeywords(body.masked)[0]?.word
    if (first !== 'select' && first !== 'with') errors.push('只允许只读 SELECT。MCP 工具只查数，不能改库')
    if (WRITE_RE.test(body.masked)) errors.push('SQL 中含有写操作关键字，MCP 工具不能改库')
    if (/\binto\s+outfile\b/i.test(body.masked)) errors.push('禁止 INTO OUTFILE')
    if (dialect === 'oracle') {
      if (topLevelKeywords(body.masked).some((k) => k.word === 'limit')) {
        errors.push('当前数据源是 Oracle，不支持 LIMIT。请改成 FETCH FIRST n ROWS ONLY')
      } else if (!/\bfetch\s+first\b/i.test(body.masked) && !/\brownum\b/i.test(body.masked)) {
        warnings.push('SQL 中没有限制行数。Oracle 请写 FETCH FIRST n ROWS ONLY。预览最多 100 行，工具调用默认 500、最大 5000')
      }
    } else if (!topLevelKeywords(body.masked).some((k) => k.word === 'limit')) {
      warnings.push('SQL 中没有 LIMIT。预览最多返回 100 行，工具调用默认 500、最大 5000，可以不写 LIMIT')
    }
  }
  const parsed = parseOutputColumns(text)
  const structural = !body || parts.length !== 1 || (body && topLevelKeywords(body.masked)[0]?.word !== 'select' && topLevelKeywords(body.masked)[0]?.word !== 'with')
  if (!structural) {
    if (parsed.errors?.length) errors.push(...parsed.errors)
    else if (parsed.error) errors.push(parsed.error)
  }
  const names = parsed.columns || []
  if (names.length) {
    const missing = names.some((name) => {
      const col = columns.find((c) => c.column_name === name) || {}
      const cn = String(col.cn ?? col.semantic_hint ?? '').trim()
      const description = String(col.description ?? '').trim()
      return !cn || !description
    })
    if (missing) errors.push('还有字段未配置')
  }
  const ph = validatePlaceholders(placeholders)
  errors.push(...ph.errors)
  warnings.push(...ph.warnings)
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], columns: names }
}
