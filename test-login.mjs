// Skenario login: captcha -> login dengan 3 akun
const base = 'http://localhost:3000'

async function tryLogin(username, password) {
  const res = await fetch(`${base}/api/auth/captcha`, { headers: { cookie: '' } })
  const cookie = res.headers.get('set-cookie').split(';')[0]
  const { captcha } = await res.json()
  // captcha SVG base64 -> decode untuk ambil nilai (server-side only test)
  const svg = Buffer.from(captcha.split(',')[1], 'base64').toString()
  const value = [...svg.matchAll(/>([A-Z0-9])<\/text>/g)].map(m => m[1]).join('')
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ username, password, captcha: value })
  })
  const body = await r.json()
  console.log(username, r.status, r.ok ? 'OK' : body.error)
}

tryLogin('user', 'user123')
tryLogin('admin', 'admin123')
tryLogin('superadmin', 'superadmin123')
tryLogin('user', 'salah') // harus gagal
