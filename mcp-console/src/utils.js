export const fmt = (n) => Number(n).toLocaleString('en-US')
const pad2 = (n) => String(n).padStart(2, '0')
export function fmtDateTime(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
export function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(23, 59, 59, 0)
  return d
}
export function keyExpireMeta(c) {
  if (!c.expire) return { kind: 'never', label: '长期有效', tag: 'gray', days: null }
  const days = Math.ceil((new Date(c.expire.replace(' ', 'T')).getTime() - Date.now()) / 86400000)
  if (days < 0) return { kind: 'expired', label: '已过期 ' + c.expire.slice(0, 10), tag: 'red', days }
  if (days <= 7) return { kind: 'soon', label: days + ' 天后到期', tag: 'orangered', days }
  return { kind: 'ok', label: c.expire.slice(0, 10), tag: 'green', days }
}
export function keyStatus(c) {
  if (c.status === 'revoked') return { text: '已吊销', tag: 'gray' }
  const e = keyExpireMeta(c)
  if (e.kind === 'expired') return { text: '已过期', tag: 'red' }
  if (c.status === 'limited') return { text: '限流中', tag: 'orangered' }
  if (e.kind === 'soon') return { text: '即将到期', tag: 'orangered' }
  return { text: '正常', tag: 'green' }
}
export function srColor(sr) {
  return sr >= 99 ? 'green' : sr >= 97 ? 'orangered' : 'red'
}
export function mcpServerEntry(svc, apiKey) {
  const key = apiKey || 'mcp-sk-****（请替换为「接入与密钥」中创建的 Key）'
  const isSse = /sse/i.test(svc.proto || '')
  return {
    type: isSse ? 'sse' : 'http',
    url: svc.endpoint,
    headers: { Authorization: 'Bearer ' + key },
  }
}
export function mcpConfigText(svc, apiKey) {
  return JSON.stringify({ mcpServers: { [svc.code]: mcpServerEntry(svc, apiKey) } }, null, 2)
}
export async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(txt)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = txt
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch { /* ignore */ }
    document.body.removeChild(ta)
    return true
  }
}
