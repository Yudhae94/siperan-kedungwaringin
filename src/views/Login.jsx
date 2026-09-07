import { useState, useEffect } from 'react'
import { LogIn, RotateCcw, UserPlus } from 'lucide-react'
import { bidangOptions } from '../constants'
import { api } from '../services/api'

function Login({ users, onLogin }) {
  const [tab, setTab] = useState('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')

  const [regForm, setRegForm] = useState({
    name: '',
    username: '',
    bidang: bidangOptions[0],
    email: '',
    password: '',
    confirmPassword: ''
  })

  const loadCaptcha = () => {
    api('/auth/captcha')
      .then(data => setCaptcha(data.captcha))
      .catch(() => setError('CAPTCHA gagal dimuat.'))
  }

  useEffect(() => {
    if (tab === 'signin') {
      loadCaptcha()
    }
  }, [tab])

  function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.get('username'),
        password: form.get('password'),
        captcha: captchaInput
      })
    })
      .then(onLogin)
      .catch(err => {
        setError(err.message || 'Login gagal.')
        setCaptchaInput('')
        loadCaptcha()
      })
      .finally(() => setLoading(false))
  }

  function handleSignUp(e) {
    e.preventDefault()
    setError('')

    if (regForm.password !== regForm.confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }
    if (regForm.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    setLoading(true)
    api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: regForm.name,
        username: regForm.username,
        bidang: regForm.bidang,
        email: regForm.email,
        password: regForm.password
      })
    })
      .then(onLogin)
      .catch(err => setError(err.message || 'Pendaftaran gagal.'))
      .finally(() => setLoading(false))
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark">S</div>
          <div>
            <b>SIPERAN</b>
            <small>KEDUNGWARINGIN</small>
          </div>
        </div>

        <div className="login-heading">
          <span className="eyebrow">Sistem Perencanaan dan Pelaporan Terpadu</span>
          <h1>{tab === 'signin' ? 'Selamat Datang' : 'Pendaftaran Akun'}</h1>
          <p>
            {tab === 'signin'
              ? 'Masuk untuk mengelola kinerja Kecamatan Kedungwaringin.'
              : 'Daftarkan akun staf/pejabat unit untuk mengakses SIPERAN.'}
          </p>
        </div>

        {tab === 'signin' ? (
          <form className="login-form" onSubmit={handleSignIn}>
            <label>
              Username
              <input name="username" required autoComplete="username" placeholder="Masukkan username" />
            </label>
            <label>
              Password
              <input name="password" required type="password" autoComplete="current-password" placeholder="Masukkan password" />
            </label>
            <div className="captcha-box">
              <div className="captcha-image" aria-label="Kode CAPTCHA">
                {captcha
                  ? <img src={captcha} alt="Kode CAPTCHA" draggable="false" />
                  : <span className="captcha-loading">Memuat kode…</span>}
              </div>
              <button className="secondary captcha-refresh" type="button" onClick={loadCaptcha} aria-label="Ganti kode CAPTCHA"><RotateCcw size={16} /></button>
            </div>
            <label>
              Kode CAPTCHA
              <input
                required
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value.toUpperCase())}
                autoComplete="off"
                placeholder="Masukkan huruf dan angka"
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <button className="primary full" type="submit" disabled={loading}>
              <LogIn size={17} /> {loading ? 'Memproses...' : 'Masuk ke aplikasi'}
            </button>
            <p className="auth-switch-text">
              Belum memiliki akun?{' '}
              <button type="button" className="text-link" onClick={() => { setTab('signup'); setError(''); }}>
                Daftar akun baru di sini
              </button>
            </p>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSignUp}>
            <label>
              Nama Lengkap
              <input
                required
                value={regForm.name}
                onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                placeholder="Contoh: Budi Santoso, S.STP"
              />
            </label>
            <label>
              Username
              <input
                required
                value={regForm.username}
                onChange={e => setRegForm({ ...regForm, username: e.target.value.toLowerCase() })}
                placeholder="Contoh: budi_santoso"
                autoComplete="off"
              />
            </label>
            <label>
              Unit / Seksi Kerja
              <select
                value={regForm.bidang}
                onChange={e => setRegForm({ ...regForm, bidang: e.target.value })}
              >
                {bidangOptions.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
            <label>
              Email (Opsional)
              <input
                type="email"
                value={regForm.email}
                onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="Contoh: budi@kecamatan.go.id"
              />
            </label>
            <label>
              Password (Minimal 6 karakter)
              <input
                required
                type="password"
                value={regForm.password}
                onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                placeholder="Buat password aman"
                autoComplete="new-password"
              />
            </label>
            <label>
              Konfirmasi Password
              <input
                required
                type="password"
                value={regForm.confirmPassword}
                onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                placeholder="Ulangi password"
                autoComplete="new-password"
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <button className="primary full" type="submit" disabled={loading}>
              <UserPlus size={17} /> {loading ? 'Mendaftarkan...' : 'Daftar & Masuk ke Aplikasi'}
            </button>
            <p className="auth-switch-text">
              Sudah memiliki akun?{' '}
              <button type="button" className="text-link" onClick={() => { setTab('signin'); setError(''); }}>
                Masuk di sini
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  )
}

export default Login
