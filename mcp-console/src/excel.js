const ENC = new TextEncoder()
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c >>> 0
  }
  return t
})()

function crc32(u8) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function u32(n) {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}
function u16(n) {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}
function concat(parts) {
  const n = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(n)
  let o = 0
  parts.forEach((p) => { out.set(p, o); o += p.length })
  return out
}

function zipStore(files) {
  const locals = []
  const centrals = []
  let offset = 0
  files.forEach(({ name, text }) => {
    const data = ENC.encode(text)
    const nameB = ENC.encode(name)
    const crc = crc32(data)
    const local = concat([
      ENC.encode('PK\x03\x04'), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0),
      nameB, data,
    ])
    const central = concat([
      ENC.encode('PK\x01\x02'), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(nameB.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), nameB,
    ])
    locals.push(local)
    centrals.push(central)
    offset += local.length
  })
  const cd = concat(centrals)
  const eocd = concat([
    ENC.encode('PK\x05\x06'), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(cd.length), u32(offset), u16(0),
  ])
  return concat([...locals, cd, eocd])
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function colLetter(i) {
  return String.fromCharCode(65 + i)
}
function inlineCell(r, c, v) {
  const ref = `${colLetter(c)}${r}`
  return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`
}

export function buildXlsx(headers, dataRows, sheetName = 'Sheet1') {
  const rows = [headers, ...dataRows]
  const sheetRows = rows.map((cells, i) => {
    const r = i + 1
    return `<row r="${r}">${cells.map((v, c) => inlineCell(r, c, v)).join('')}</row>`
  }).join('')
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
  const bytes = zipStore([
    { name: '[Content_Types].xml', text: types },
    { name: '_rels/.rels', text: rels },
    { name: 'xl/workbook.xml', text: workbook },
    { name: 'xl/_rels/workbook.xml.rels', text: wbRels },
    { name: 'xl/worksheets/sheet1.xml', text: sheet },
  ])
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function buildUserImportXlsx() {
  return buildXlsx(
    ['手机号', '名称', '邮箱'],
    [
      ['13900003001', '张三', 'zhangsan@example.com'],
      ['13900003002', '李四', ''],
    ],
    '注册用户',
  )
}

export function buildUserExportXlsx(users) {
  const headers = ['姓名', '身份', '手机', '登录邮箱', '角色', '团队/公司', '用户组', '状态', '注册时间']
  const data = (users || []).map((u) => [
    u.name || '',
    u.kind === 'customer' ? '外部客户' : '内部员工',
    u.phone || '',
    u.email || '',
    u.role || '',
    u.team || '',
    (u.groups || []).join('、'),
    u.status || '',
    u.created || '',
  ])
  return buildXlsx(headers, data, '用户数据')
}

async function inflateRaw(u8) {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([u8]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function findEocd(u8) {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  for (let i = u8.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i
  }
  return -1
}
async function unzip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  const eocd = findEocd(u8)
  if (eocd < 0) throw new Error('不是有效的 Excel 文件')
  const n = view.getUint16(eocd + 10, true)
  let cd = view.getUint32(eocd + 16, true)
  const files = {}
  for (let k = 0; k < n; k++) {
    if (view.getUint32(cd, true) !== 0x02014b50) break
    const method = view.getUint16(cd + 10, true)
    const comp = view.getUint32(cd + 20, true)
    const nameLen = view.getUint16(cd + 28, true)
    const extra = view.getUint16(cd + 30, true)
    const comment = view.getUint16(cd + 32, true)
    const localOff = view.getUint32(cd + 42, true)
    const name = new TextDecoder().decode(u8.subarray(cd + 46, cd + 46 + nameLen))
    const localExtra = view.getUint16(localOff + 28, true)
    const start = localOff + 30 + view.getUint16(localOff + 26, true) + localExtra
    const chunk = u8.subarray(start, start + comp)
    files[name] = method === 8 ? await inflateRaw(chunk) : chunk
    cd += 46 + nameLen + extra + comment
  }
  return files
}

function xmlText(node) {
  return (node?.textContent || '').replace(/^\s+|\s+$/g, '')
}

function cellValue(c, strings) {
  const t = c.getAttribute('t')
  if (t === 'inlineStr') return xmlText(c.querySelector('t'))
  if (t === 's') {
    const i = Number(xmlText(c.querySelector('v')))
    return strings[i] || ''
  }
  const v = xmlText(c.querySelector('v') || c.querySelector('t'))
  if (t === 'str' || t === 'b') return v
  if (v && /^\d+(\.0+)?$/.test(v)) return String(Math.round(Number(v)))
  return v
}

function parseSheet(xml, strings) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const rows = [...doc.getElementsByTagName('row')].map((row) => {
    const cells = []
    ;[...row.getElementsByTagName('c')].forEach((c) => {
      const ref = c.getAttribute('r') || ''
      const col = ref.replace(/\d/g, '').split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1
      if (col >= 0) cells[col] = cellValue(c, strings)
    })
    return cells.map((x) => String(x || '').trim())
  })
  return rows.filter((r) => r.some(Boolean))
}

function parseSharedStrings(xml) {
  if (!xml) return []
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return [...doc.getElementsByTagName('si')].map((si) => xmlText(si))
}

function headerIndex(cells) {
  const idx = { phone: 0, name: 1, email: 2 }
  let hit = false
  cells.forEach((h, i) => {
    if (/手机/.test(h)) { idx.phone = i; hit = true }
    else if (/姓名|名称/.test(h)) { idx.name = i; hit = true }
    else if (/邮箱|邮件/.test(h)) { idx.email = i; hit = true }
  })
  return hit ? idx : null
}

function rowsToUsers(table) {
  if (!table.length) return []
  const idx = headerIndex(table[0]) || { phone: 0, name: 1, email: 2 }
  const start = headerIndex(table[0]) ? 1 : 0
  return table.slice(start).map((r) => ({
    phone: String(r[idx.phone] || '').replace(/\s/g, '').replace(/\.0$/, ''),
    name: String(r[idx.name] || '').trim(),
    email: String(r[idx.email] || '').trim(),
  })).filter((r) => r.phone || r.name || r.email)
}

function parseCsv(text) {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    .map((line) => line.split(/[,，\t;]/).map((x) => x.trim().replace(/^"|"$/g, '')))
}

function parseSpreadsheetMl(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const rows = [...doc.getElementsByTagName('Row')].map((row) =>
    [...row.getElementsByTagName('Data')].map((d) => xmlText(d))
  )
  return rows.filter((r) => r.some(Boolean))
}

export async function parseUserImportFile(file) {
  const name = (file.name || '').toLowerCase()
  const buf = await file.arrayBuffer()
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return rowsToUsers(parseCsv(new TextDecoder().decode(buf)))
  }
  const head = new TextDecoder().decode(buf.slice(0, 80))
  if (head.includes('Workbook') || head.includes('ss:Workbook')) {
    return rowsToUsers(parseSpreadsheetMl(new TextDecoder().decode(buf)))
  }
  const files = await unzip(buf)
  const decoder = new TextDecoder()
  const sheetName = Object.keys(files).find((k) => /worksheets\/sheet1\.xml$/i.test(k))
    || Object.keys(files).find((k) => /worksheets\/sheet\d+\.xml$/i.test(k))
  if (!sheetName) throw new Error('Excel 里没有工作表')
  const strings = parseSharedStrings(
    files['xl/sharedStrings.xml'] ? decoder.decode(files['xl/sharedStrings.xml']) : ''
  )
  return rowsToUsers(parseSheet(decoder.decode(files[sheetName]), strings))
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
