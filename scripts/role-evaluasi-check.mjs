// Uji model hak akses: Admin = input+update saja, User = lihat saja, Super Admin = semua.
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

// ===== ADMIN: input & update boleh, hapus/persetujuan/verifikasi diblok =====
let r = await login('admin', 'admin123')
check('login admin', r.status === 200 && r.json?.role === 'Admin', JSON.stringify(r.json))

r = await req('POST', '/api/programs', { nama: 'Uji Akses Admin', bidang: 'Kasi PMD', target: 1, pagu: 1, penanggung: 'QA', deadline: '2026-12-31' })
const progId = r.json?.id
check('Admin POST programs (input) => 200', r.status === 200 && progId, `status=${r.status}`)
r = await req('PATCH', `/api/programs/${progId}`, { nama: 'Uji Akses Admin v2' })
check('Admin PATCH programs (update) => 200', r.status === 200, `status=${r.status}`)
r = await req('DELETE', `/api/programs/${progId}`)
check('Admin DELETE programs => 403', r.status === 403, `status=${r.status}`)

const sections = await req('GET', '/api/section-approvals')
const sec = sections.json[0]
r = await req('PATCH', `/api/section-approvals/${encodeURIComponent(sec.section)}`, { status: 'Disetujui' })
check('Admin PATCH section-approvals => 403', r.status === 403, `status=${r.status}`)

const docs = await req('GET', '/api/docs')
const doc = docs.json[0]
r = await req('PATCH', `/api/docs/${doc.id}`, { status: 'Terverifikasi' })
check('Admin PATCH docs (verifikasi) => 403', r.status === 403, `status=${r.status}`)

// ===== SUPER ADMIN: semuanya boleh =====
r = await login('superadmin', 'superadmin123')
check('login superadmin', r.status === 200 && r.json?.role === 'Super Admin')
r = await req('PATCH', `/api/section-approvals/${encodeURIComponent(sec.section)}`, { status: sec.status, notes: sec.notes })
check('SuperAdmin PATCH section-approvals => 200', r.status === 200, `status=${r.status}`)
r = await req('PATCH', `/api/docs/${doc.id}`, { status: doc.status, preview: doc.preview })
check('SuperAdmin PATCH docs => 200', r.status === 200, `status=${r.status}`)
r = await req('DELETE', `/api/programs/${progId}`)
check('SuperAdmin DELETE programs => 200', r.status === 200, `status=${r.status}`)

// ===== USER: hanya lihat =====
r = await login('user', 'user123')
check('login user', r.status === 200 && r.json?.role === 'User')
r = await req('POST', '/api/programs', { nama: 'X', bidang: 'Kasi PMD', target: 1, pagu: 1 })
check('User POST programs => 403', r.status === 403, `status=${r.status}`)
r = await req('PATCH', `/api/programs/${doc.id}`, { nama: 'X' })
check('User PATCH programs => 403', r.status === 403, `status=${r.status}`)
r = await req('DELETE', `/api/programs/${doc.id}`)
check('User DELETE programs => 403', r.status === 403, `status=${r.status}`)
r = await req('PATCH', `/api/section-approvals/${encodeURIComponent(sec.section)}`, { status: 'Disetujui' })
check('User PATCH section-approvals => 403', r.status === 403, `status=${r.status}`)

console.log(fail ? `\n${fail} FAIL` : '\nSemua PASS')
process.exit(fail ? 1 : 0)
