const BASE = 'http://localhost:3001'

function makeClient() {
  let cookie = ''
  const req = async (method, path, body, isForm) => {
    const headers = { cookie }
    let payload
    if (body && !isForm) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body) }
    const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
    const setCookie = res.headers.getSetCookie?.() || []
    if (setCookie.length) cookie = setCookie.map(c => c.split(';')[0]).join('; ')
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    return { status: res.status, data }
  }
  return { req }
}

async function login(client, username, password) {
  // Ambil captcha, dekode SVG-nya, ambil tiap karakter
  const cap = await client.req('GET', '/api/auth/captcha')
  const svg = Buffer.from(cap.data.captcha.split(',')[1], 'base64').toString('utf8')
  const code = [...svg.matchAll(/>(\w)<\/text>/g)].map(m => m[1]).join('')
  const res = await client.req('POST', '/api/auth/login', { username, password, captcha: code })
  return res
}

const out = []
const log = m => { out.push(m); console.log(m) }

// ===== ADMIN =====
const admin = makeClient()
log('login admin: ' + JSON.stringify((await login(admin, 'admin', 'admin123')).data.role))
const created = await admin.req('POST', '/api/spj', { nama_kegiatan: 'Pencairan DP Jalan Lingkungan', nilai_pencairan: 90000000, progres_fisik: 35, progres_keuangan: 25 })
log(`admin create: ${created.status} id=${created.data.id} status="${created.data.status}"`)
const upd = await admin.req('PATCH', `/api/spj/${created.data.id}`, { progres_fisik: 55, progres_keuangan: 40 })
log(`admin update: ${upd.status} fisik=${upd.data.progres_fisik} keu=${upd.data.progres_keuangan}`)
const adv = await admin.req('PATCH', `/api/spj/${created.data.id}`, { status: 'Penandatanganan Camat / Sekcam' })
log(`admin advance tahap: ${adv.status} -> "${adv.data.status}", riwayat=${adv.data.riwayat.length}`)
const delAdmin = await admin.req('DELETE', `/api/spj/${created.data.id}`)
log(`admin delete (harus 403): ${delAdmin.status} ${JSON.stringify(delAdmin.data)}`)

// ===== SUPER ADMIN =====
const sa = makeClient()
log('login superadmin: ' + JSON.stringify((await login(sa, 'superadmin', 'superadmin123')).data.role))
const saUpd = await sa.req('PATCH', `/api/spj/${created.data.id}`, { status: 'Tahap Pencairan', progres_fisik: 70 })
log(`superadmin update: ${saUpd.status} status="${saUpd.data.status}" fisik=${saUpd.data.progres_fisik}`)
const saDel = await sa.req('DELETE', `/api/spj/${created.data.id}`)
log(`superadmin delete (harus 200): ${saDel.status} ${JSON.stringify(saDel.data)}`)

// ===== USER =====
const user = makeClient()
log('login user: ' + JSON.stringify((await login(user, 'user', 'user123')).data.role))
const userCreate = await user.req('POST', '/api/spj', { nama_kegiatan: 'X' })
log(`user create (harus 403): ${userCreate.status} ${JSON.stringify(userCreate.data)}`)
const userList = await user.req('GET', '/api/spj')
log(`user read: ${userList.status} count=${userList.data.length}`)

// Verifikasi DB bersih dari data uji
const adminList = await admin.req('GET', '/api/spj')
log(`final spj count (admin view): ${adminList.data.length}`)
