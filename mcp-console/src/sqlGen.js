function tokensOf(prompt) {
  return String(prompt || '')
    .split(/[，,。；;、\s]+|的|和|与|以及|每个|查询|统计|关联|连接|列出|一下/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
}

function scoreTable(table, prompt, tokens) {
  let score = 0
  const name = String(table.name || '')
  const comment = String(table.comment || '')
  if (name && prompt.toLowerCase().includes(name.toLowerCase())) score += 12
  for (const token of tokens) {
    if (comment.includes(token)) score += 4 + Math.min(token.length, 6)
  }
  for (const col of table.columns || []) {
    const label = String(col.comment || '')
    const colName = String(col.name || '')
    if (label && (prompt.includes(label) || tokens.some((token) => label.includes(token) || token.includes(label)))) score += 3
    else if (colName && prompt.toLowerCase().includes(colName.toLowerCase())) score += 2
  }
  if (table.kind === 'view' && /在营|视图|公开/.test(prompt) && /在营|视图|公开/.test(comment)) score += 6
  if (/序列|明细/.test(prompt) && /序列|明细/.test(comment)) score += 6
  if (/定义/.test(prompt) && /定义/.test(comment)) score += 6
  return score
}

function sharedCode(a, b) {
  const left = new Map((a.columns || []).map((c) => [c.name, c]))
  const shared = (b.columns || []).filter((c) => left.has(c.name))
  const code = shared.find((c) => /代码/.test(c.comment || '') || /_code$/i.test(c.name))
  if (code) return code.name
  const named = shared.find((c) => !/^(unit|frequency|value|sort|is_stop|latest_value|end_value|id)$/.test(c.name) && !/主键/.test(c.comment || ''))
  return named?.name || ''
}

function aliasFor(table, used) {
  const name = String(table.name || '')
  let base = 't'
  if (/^v_/i.test(name)) base = 'v'
  else if (/data|series|receipt/i.test(name)) base = 'd'
  else if (/info|index|account/i.test(name)) base = 'i'
  else {
    const letters = name.replace(/[^a-z]/gi, '')
    base = (letters[0] || 't').toLowerCase()
  }
  let alias = base
  let n = 2
  while (used.has(alias)) {
    alias = `${base}${n}`
    n += 1
  }
  used.add(alias)
  return alias
}

function isNoise(col) {
  return col.comment === '主键' || col.name === 'is_stop' || col.name === 'sort'
}

function pickDims(table, prompt, aggregating) {
  const cols = (table.columns || []).filter((c) => c.name && !isNoise(c))
  const mentioned = cols.filter((c) => {
    const label = String(c.comment || '')
    return (label && prompt.includes(label)) || prompt.toLowerCase().includes(String(c.name).toLowerCase())
  })
  if (mentioned.length) return mentioned.slice(0, aggregating ? 4 : 6)
  const identity = cols.filter((c) => /代码|名称|单位|客户|行业|品种|仓库|频度/.test(c.comment || '') || /(_code|_name)$/i.test(c.name))
  if (identity.length) return identity.slice(0, aggregating ? 3 : 4)
  return cols.slice(0, aggregating ? 3 : 4)
}

function findCol(table, pred) {
  return (table.columns || []).find(pred) || null
}

function pickAggs(table, prompt) {
  if (!table) return []
  const dateCol = findCol(table, (c) => /data_time|biz_date|^dt$/i.test(c.name))
    || findCol(table, (c) => /日期/.test(c.comment || ''))
  const valueCol = findCol(table, (c) => /^(value|pnl|qty)$/i.test(c.name))
    || findCol(table, (c) => /^(latest_value|end_value)$/i.test(c.name) || /数值|最新值|盈亏|数量/.test(c.comment || ''))
  const aggs = []
  if (/点数|条数|次数|多少|count/i.test(prompt)) {
    const col = dateCol || valueCol || table.columns[0]
    if (col) aggs.push({ fn: 'COUNT', column: col.name, as: /点/.test(prompt) ? 'point_count' : 'row_count' })
  }
  if (/最大|最高|\bmax\b/i.test(prompt) && valueCol) aggs.push({ fn: 'MAX', column: valueCol.name, as: 'max_value' })
  if (/最小|最低|\bmin\b/i.test(prompt) && valueCol && !/最早/.test(prompt)) aggs.push({ fn: 'MIN', column: valueCol.name, as: 'min_value' })
  if (/最早/.test(prompt) && dateCol) aggs.push({ fn: 'MIN', column: dateCol.name, as: 'first_time' })
  if (/最晚|最新日期|最近日期/.test(prompt) && dateCol) aggs.push({ fn: 'MAX', column: dateCol.name, as: 'last_time' })
  if (/平均/.test(prompt) && valueCol) aggs.push({ fn: 'AVG', column: valueCol.name, as: 'avg_value' })
  if (/合计|求和|总和/.test(prompt) && valueCol) aggs.push({ fn: 'SUM', column: valueCol.name, as: 'sum_value' })
  return aggs
}

function bestPartner(table, list, prompt) {
  let best = null
  let score = 0
  for (const other of list) {
    if (other.name === table.name) continue
    if (!sharedCode(table, other)) continue
    let s = 1
    if (/序列|明细|数值|日期/.test(prompt) && /序列|明细|数据/.test(other.comment || '')) s += 4
    if (/在营|视图/.test(prompt) && other.kind === 'view') s += 2
    if (s > score) {
      score = s
      best = other
    }
  }
  return best
}

function buildWhere(table, prompt) {
  if (!/停更|未停/.test(prompt)) return ''
  if (/已过滤停更/.test(table.comment || '')) return ''
  const col = findCol(table, (c) => c.name === 'is_stop')
  if (!col) return ''
  return `${table.alias}.is_stop = 0`
}

export function generateSql(tables, prompt, dialect = 'mysql') {
  const text = String(prompt || '').trim()
  const list = (tables || []).filter((t) => t?.name && t.columns?.length)
  if (!list.length) return { error: '当前数据源没有可用来生成 SQL 的表', sql: '' }
  if (!text) return { error: '先描述要查询的数据', sql: '' }

  const tokens = tokensOf(text)
  const ranked = list
    .map((table) => ({ table, score: scoreTable(table, text, tokens) }))
    .sort((a, b) => b.score - a.score || (a.table.kind === 'view' ? -1 : 1))
  if (!ranked[0]?.score) return { error: '当前数据源里没有和这句话匹配的表，换个说法，或先切换左侧数据源', sql: '' }

  const picked = [ranked[0].table]
  const wantsJoin = /关联|连接|join|连表/i.test(text) || /序列|明细/.test(text)
  const wantsMeasure = /点数|条数|次数|最大|最高|最小|最低|最早|最晚|平均|合计|求和|数值/.test(text)
  const hasMeasure = findCol(picked[0], (c) => c.name === 'value' || /data_time|biz_date|^dt$/i.test(c.name))
  if ((wantsJoin || (wantsMeasure && !hasMeasure)) && list.length > 1) {
    const partner = bestPartner(picked[0], list, text)
    if (partner) picked.push(partner)
  }
  if (picked.length > 1 && picked[0].kind !== 'view' && picked[1].kind === 'view') picked.reverse()

  const used = new Set()
  const aliased = picked.map((table) => ({ ...table, alias: aliasFor(table, used) }))
  let right = null
  let key = ''
  if (aliased.length > 1) {
    key = sharedCode(aliased[0], aliased[1])
    if (key) right = aliased[1]
  }
  const left = aliased[0]
  const fact = right || left
  const aggs = pickAggs(fact, text).map((agg) => ({ ...agg, alias: fact.alias }))
  const dims = pickDims(left, text, aggs.length > 0)
  const factCols = !aggs.length && right
    ? pickDims(right, text).filter((c) => c.name !== key && !dims.some((d) => d.name === c.name)).slice(0, 4)
    : []

  const select = []
  dims.forEach((c) => select.push(`${left.alias}.${c.name}`))
  factCols.forEach((c) => select.push(`${right.alias}.${c.name}`))
  aggs.forEach((agg) => select.push(`${agg.fn}(${agg.alias}.${agg.column}) AS ${agg.as}`))
  if (!select.length) return { error: '没有匹配到可输出的列', sql: '' }

  const lines = ['SELECT', `  ${select.join(',\n  ')}`, `FROM ${left.name} ${left.alias}`]
  if (right && key) {
    lines.push(`LEFT JOIN ${right.name} ${right.alias}`)
    lines.push(`  ON ${left.alias}.${key} = ${right.alias}.${key}`)
  }
  const where = buildWhere(left, text)
  if (where) lines.push(`WHERE ${where}`)
  if (aggs.length && dims.length) lines.push(`GROUP BY ${dims.map((c) => `${left.alias}.${c.name}`).join(', ')}`)
  lines.push(dialect === 'oracle' ? 'FETCH FIRST 100 ROWS ONLY' : 'LIMIT 100')
  return { sql: lines.join('\n'), error: '' }
}
