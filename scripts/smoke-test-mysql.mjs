// Smoke test API SIPERAN di atas MySQL.
// Jalankan: node scripts/smoke-test-mysql.mjs  (server harus berjalan di :3001)
const BASE = process.env.BASE_URL || 'http://localhost:3001'
let cookie = ''
let pass = 0
let failCount = 0

const req = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const setC = res.headers.get('set-cookie')
  if (setC) cookie = setC.split(';')[0]
  let json = null
  try { json = await res.json() } catch { /* ignore */ }
  return { status: res.status, json }
}

const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS ${name}`) }
  else { failCount++; console.log(`FAIL ${name} ${extra}`) }
}

// Login dengan flow captcha (GET captcha -> decode SVG -> POST login)
const login = async (username, password) => {
  cookie = ''
  const cap = await req('GET', '/api/auth/captcha')
  const svg = Buffer.from(cap.json.captcha.split(',')[1], 'base64').toString('utf8')
  const code = [...svg.matchAll(/>(\w)<\/text>/g)].map(m => m[1]).join('')
  return req('POST', '/api/auth/login', { username, password, captcha: code })
}

// 1. Login admin
let r = await login('admin', 'admin123')
check('login admin', r.status === 200 && r.json?.role === 'Admin', JSON.stringify(r.json))

// 2. Endpoint read
for (const [name, path] of [
  ['programs', '/api/programs'],
  ['docs', '/api/docs'],
  ['usulan-rka', '/api/usulan-rka'],
  ['spj', '/api/spj'],
  ['rka', '/api/rka'],
  ['monthly-reports', '/api/monthly-reports'],
  ['events', '/api/events'],
  ['admin-contacts', '/api/admin-contacts'],
  ['log', '/api/log'],
  ['clinic threads', '/api/clinic/threads'],
  ['clinic templates', '/api/clinic/templates'],
  ['clinic consultations', '/api/clinic/consultations'],
  ['section-approvals', '/api/section-approvals'],
  ['evaluation entries', '/api/evaluation/entries'],
  ['evaluation report', '/api/evaluation/report?tahun=2026&periode=9'],
  ['dpa', '/api/dpa'],
  ['kartu-kendali', '/api/kartu-kendali'],
  ['lka', '/api/lka']
]) {
  r = await req('GET', path)
  check(`GET ${name}`, r.status === 200, `status=${r.status} body=${JSON.stringify(r.json).slice(0, 120)}`)
}

// 3. CRUD programs
r = await req('POST', '/api/programs', { nama: 'Uji Migrasi MySQL', bidang: 'Kasi PMD', target: 5, pagu: 100000, penanggung: 'QA', deadline: '2026-12-31' })
const progId = r.json?.id
check('POST programs', r.status === 200 && progId, JSON.stringify(r.json).slice(0, 120))
r = await req('PATCH', `/api/programs/${progId}`, { nama: 'Uji Migrasi MySQL v2', target: 6 })
check('PATCH programs', r.status === 200 && r.json?.nama === 'Uji Migrasi MySQL v2', JSON.stringify(r.json).slice(0, 120))

// 4. Login superadmin → uji PATCH identik (semantik FOUND_ROWS)
// Hapus program uji memakai superadmin (sesuai aturan: hanya Super Admin boleh hapus).
r = await login('superadmin', 'superadmin123')
check('login superadmin', r.status === 200 && r.json?.role === 'Super Admin', JSON.stringify(r.json))
r = await req('DELETE', `/api/programs/${progId}`)
check('DELETE programs', r.status === 200, JSON.stringify(r.json))

const list = (await req('GET', '/api/section-approvals')).json
const section = list?.[0]?.section
await req('PATCH', `/api/section-approvals/${encodeURIComponent(section)}`, { status: 'Disetujui', notes: 'uji1' })
r = await req('PATCH', `/api/section-approvals/${encodeURIComponent(section)}`, { status: 'Disetujui', notes: 'uji1' })
check('PATCH section-approvals (nilai identik, FOUND_ROWS)', r.status === 200, `status=${r.status} ${JSON.stringify(r.json).slice(0, 120)}`)

// 5. CRUD usulan-rka + verifikasi
r = await req('POST', '/api/usulan-rka', { judul: 'Uji Usulan Migrasi', bidang: 'Kasi PMD', pagu: 5000000, target: 'uji', batas_waktu: '2026-12-31' })
const usulanId = r.json?.id
check('POST usulan-rka', r.status === 201 && usulanId, JSON.stringify(r.json).slice(0, 120))
r = await req('PATCH', `/api/usulan-rka/${usulanId}/verifikasi`, { keputusan: 'Disetujui', catatan: 'oke' })
check('PATCH verifikasi usulan', r.status === 200 && r.json?.status === 'Disetujui' && r.json?.riwayat?.length > 0, JSON.stringify(r.json).slice(0, 120))
r = await req('DELETE', `/api/usulan-rka/${usulanId}`)
check('DELETE usulan-rka', r.status === 200)

// 6. Upsert evaluation entry (ON DUPLICATE KEY UPDATE) dua kali
const entryBody = { program_id: 1, periode: '2026-09', target_anggaran: 50, target_fisik: 60, realisasi_fisik: 70, target_output: 10, realisasi_output: 9, target_outcome: 5, realisasi_outcome: 4, indikator_output: 'uji', satuan_output: 'unit', indikator_outcome: 'uji', satuan_outcome: 'unit', kendala: '', tindak_lanjut: '' }
r = await req('PUT', '/api/evaluation/entries', entryBody)
check('PUT evaluation entry #1', r.status === 200, `status=${r.status} ${JSON.stringify(r.json).slice(0, 150)}`)
r = await req('PUT', '/api/evaluation/entries', { ...entryBody, target_anggaran: 55, indikator_output: 'uji2', indikator_outcome: 'uji2' })
check('PUT evaluation entry #2 (upsert)', r.status === 200 && r.json?.target_anggaran === 55, `status=${r.status} ${JSON.stringify(r.json).slice(0, 150)}`)

// 7. Event CRUD
r = await req('POST', '/api/events', { date: '2026-12-01', title: 'Uji Event', type: 'Rapat' })
const eventId = r.json?.id
check('POST events', r.status === 201 && eventId, JSON.stringify(r.json))
r = await req('PATCH', `/api/events/${eventId}`, { title: 'Uji Event 2' })
check('PATCH events', r.status === 200 && r.json?.title === 'Uji Event 2')
r = await req('DELETE', `/api/events/${eventId}`)
check('DELETE events', r.status === 200)

// 8. clinic thread + message
r = await req('POST', '/api/clinic/threads', { topic: 'Uji topik konsultasi migrasi' })
const threadId = r.json?.id
check('POST clinic thread', r.status === 201 && threadId, JSON.stringify(r.json).slice(0, 120))
r = await req('POST', `/api/clinic/threads/${threadId}/messages`, { message: 'Uji pesan' })
check('POST clinic message', r.status === 201 && r.json?.message === 'Uji pesan', JSON.stringify(r.json).slice(0, 120))
r = await req('GET', `/api/clinic/threads/${threadId}`)
check('GET clinic thread detail', r.status === 200 && r.json?.messages?.length === 1)
r = await req('DELETE', `/api/clinic/threads/${threadId}`)
check('DELETE clinic thread', r.status === 200)

// 9. RKA save + read
r = await req('POST', '/api/rka', { title: 'RKA Uji', tahun: '2026', satuan: 'Uji', formulir: 'F', rows: [{ kode: '5.1', uraian: 'uji', koefisien: '1', satuan: 'unit', harga: '1000', ppn: '0', jumlah: '1000', keterangan: '' }] })
check('POST rka', r.status === 201 && r.json?.rows?.length === 1, JSON.stringify(r.json).slice(0, 150))
r = await req('GET', '/api/rka')
check('GET rka', r.status === 200 && r.json?.title === 'RKA Uji')

console.log(`\nHasil: ${pass} PASS, ${failCount} FAIL`)
process.exit(failCount ? 1 : 0)
