// Uji cepat perbaikan role evaluasi/dokumen: Admin boleh verifikasi+setujui, User tetap 403.
const BASE = 'http://localhost:3001'
let cookie = ''
const req = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const setC = res.headers.get('set-cookie')
  if (setC) cookie = setC.split(';')[0]
  let json = null
  try { json = await res.json() } catch { }
  return { status: res.status, json }
}
const login = async (username, password) => {
  cookie = ''
  const cap = await req('GET', '/api/auth/captcha')
  const svg = Buffer.from(cap.json.captcha.split(',')[1], 'base64').toString('utf8')
  const code = [...svg.matchAll(/>(\w)<\/text>/g)].map(m => m[1]).join('')
  return req('POST', '/api/auth/login', { username, password, captcha: code })
}
let fail = 0
const check = (n, c, e = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n, c ? '' : e); if (!c) fail++ }

let r = await login('admin', 'admin123')
check('login admin', r.status === 200 && r.json?.role === 'Admin', JSON.stringify(r.json))

// Verifikasi dokumen pertama yang belum terverifikasi, lalu kembalikan
const docs = await req('GET', '/api/docs')
const doc = docs.json.find(d => d.status !== 'Terverifikasi') || docs.json[0]
const origStatus = doc.status
r = await req('PATCH', `/api/docs/${doc.id}`, { status: 'Terverifikasi', preview: 'uji role admin' })
check(`Admin PATCH /docs/${doc.id} (verifikasi)`, r.status === 200, `status=${r.status}`)
r = await req('POST', `/api/docs/${doc.id}/review`, { reviewer: 'Admin Uji', action: 'Terverifikasi', notes: 'uji role' })
check('Admin POST /docs/:id/review', r.status === 201, `status=${r.status}`)
// Kembalikan status dokumen seperti semula & hapus jejak review uji
await req('PATCH', `/api/docs/${doc.id}`, { status: origStatus, preview: doc.preview })
const mysql = await import('mysql2/promise')
const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'siperan', password: 'siperan123', database: 'siperan' })
await conn.query("DELETE FROM doc_reviews WHERE reviewer = 'Admin Uji'")
await conn.end()

// Persetujuan seksi: set lalu kembalikan nilai asli
const sections = await req('GET', '/api/section-approvals')
const sec = sections.json[0]
const origSec = { status: sec.status, notes: sec.notes }
r = await req('PATCH', `/api/section-approvals/${encodeURIComponent(sec.section)}`, { status: 'Disetujui', notes: 'uji role admin' })
check(`Admin PATCH section-approvals (${sec.section})`, r.status === 200, `status=${r.status}`)
r = await req('PATCH', `/api/section-approvals/${encodeURIComponent(sec.section)}`, origSec)
check('kembalikan nilai asli seksi', r.status === 200)

// User harus tetap diblok (403) di semua aksi tulis
r = await login('user', 'user123')
check('login user', r.status === 200 && r.json?.role === 'User')
r = await req('PATCH', `/api/docs/${doc.id}`, { status: 'Terverifikasi' })
check('User PATCH docs => 403', r.status === 403, `status=${r.status}`)
r = await req('PATCH', `/api/section-approvals/${encodeURIComponent(sec.section)}`, { status: 'Disetujui' })
check('User PATCH section-approvals => 403', r.status === 403, `status=${r.status}`)

console.log(fail ? `\n${fail} FAIL` : '\nSemua PASS')
process.exit(fail ? 1 : 0)
