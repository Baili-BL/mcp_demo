import { format } from 'sql-formatter'

const PH_RE = /\$(?:val|expr|condition|accel|tag|system)\{[^{}\n]*\}|(?<![\w$])\$\{[^{}\n]*\}/g

export function formatSql(sql, dialect = 'mysql') {
  const text = String(sql || '')
  if (!text.trim()) return { sql: text, error: '' }
  const saved = []
  const masked = text.replace(PH_RE, (m) => {
    saved.push(m)
    return `__ph_${saved.length - 1}__`
  })
  try {
    const out = format(masked, {
      language: dialect === 'oracle' ? 'plsql' : 'mysql',
      tabWidth: 2,
      keywordCase: 'upper',
      functionCase: 'upper',
      dataTypeCase: 'upper',
      identifierCase: 'preserve',
      logicalOperatorNewline: 'before',
      expressionWidth: 60,
      linesBetweenQueries: 1,
    })
    return { sql: out.replace(/__ph_(\d+)__/g, (_, i) => saved[Number(i)]), error: '' }
  } catch (e) {
    return { sql: text, error: String(e?.message || e).split('\n')[0] }
  }
}
