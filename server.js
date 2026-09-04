import express from 'express'
import session from 'express-session'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const db = new DatabaseSync(path.join(__dirname, 'siperan.sqlite'))
db.exec('PRAGMA journal_mode = WAL')
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS programs (id INTEGER PRIMARY KEY, kode TEXT UNIQUE NOT NULL, nama TEXT NOT NULL, bidang TEXT, target REAL NOT NULL, realisasi REAL NOT NULL DEFAULT 0, pagu REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, penanggung TEXT, deadline TEXT);
CREATE TABLE IF NOT EXISTS docs (id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT, size TEXT, date TEXT, status TEXT NOT NULL, preview TEXT, file_path TEXT, mime_type TEXT, storage_name TEXT);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT NOT NULL, type TEXT);
CREATE TABLE IF NOT EXISTS auth_log (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, role TEXT, action TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS doc_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id INTEGER NOT NULL, reviewer TEXT NOT NULL, action TEXT NOT NULL, notes TEXT, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS section_approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, section TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'Belum disetujui', notes TEXT, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rka_forms (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, tahun TEXT NOT NULL, satuan TEXT NOT NULL, formulir TEXT NOT NULL, total REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rka_rows (id INTEGER PRIMARY KEY AUTOINCREMENT, rka_id INTEGER NOT NULL, kode TEXT, uraian TEXT, koefisien TEXT, satuan TEXT, harga TEXT, ppn TEXT, jumlah TEXT, FOREIGN KEY(rka_id) REFERENCES rka_forms(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS monthly_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, periode TEXT NOT NULL, pagu REAL NOT NULL DEFAULT 0, realisasi_keuangan REAL NOT NULL DEFAULT 0, realisasi_fisik REAL NOT NULL DEFAULT 0, catatan TEXT, created_at TEXT NOT NULL);`)
db.exec(`CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  at TEXT NOT NULL
)`)
for (const column of ['preview', 'file_path', 'mime_type', 'storage_name']) {
  try {
    db.exec(`ALTER TABLE docs ADD COLUMN ${column} TEXT`)
  } catch {
    // ignore if column already exists
  }
}
try {
  db.exec('ALTER TABLE docs ADD COLUMN periode TEXT')
} catch {
  // ignore if column already exists
}

// E-Usulan Kegiatan is the database-facing name for the former program list.
db.exec(`CREATE TABLE IF NOT EXISTS e_usulan_kegiatan (
  id INTEGER PRIMARY KEY,
  kode TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  bidang TEXT,
  target REAL NOT NULL,
  realisasi REAL NOT NULL DEFAULT 0,
  pagu REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  penanggung TEXT,
  deadline TEXT
);
INSERT OR IGNORE INTO e_usulan_kegiatan
  SELECT id, kode, nama, bidang, target, realisasi, pagu, status, penanggung, deadline
  FROM programs;
CREATE TRIGGER IF NOT EXISTS programs_to_e_usulan_insert
AFTER INSERT ON programs
BEGIN
  INSERT OR REPLACE INTO e_usulan_kegiatan
    (id, kode, nama, bidang, target, realisasi, pagu, status, penanggung, deadline)
  VALUES (NEW.id, NEW.kode, NEW.nama, NEW.bidang, NEW.target, NEW.realisasi, NEW.pagu, NEW.status, NEW.penanggung, NEW.deadline);
END;
CREATE TRIGGER IF NOT EXISTS programs_to_e_usulan_update
AFTER UPDATE ON programs
BEGIN
  INSERT OR REPLACE INTO e_usulan_kegiatan
    (id, kode, nama, bidang, target, realisasi, pagu, status, penanggung, deadline)
  VALUES (NEW.id, NEW.kode, NEW.nama, NEW.bidang, NEW.target, NEW.realisasi, NEW.pagu, NEW.status, NEW.penanggung, NEW.deadline);
END;
CREATE TRIGGER IF NOT EXISTS programs_to_e_usulan_delete
AFTER DELETE ON programs
BEGIN
  DELETE FROM e_usulan_kegiatan WHERE id = OLD.id;
END;`)

const bidangOptions = [
  'Sekretariat - Bagian Umum dan Kepegawaian',
  'Sekretariat - Bagian Perencanaan dan Keuangan',
  'Kasi Pelayanan Publik',
  'Kasi Ekonomi dan Pembangunan',
  'Kasi Pemtrantip',
  'Kasi Pemerintahan',
  'Kasi PMD'
]
const normalizeBidang = value => bidangOptions.includes(value) ? value : bidangOptions[0]

const programs = [
  [1,'PRG-001','Peningkatan Jalan Lingkungan','Kasi Ekonomi dan Pembangunan',12,9,1850000000,'Berjalan','PPTK Infrastruktur','2026-10-14'],
  [2,'PRG-002','Pelayanan Administrasi Terpadu','Kasi Pelayanan Publik',100,82,640000000,'Berjalan','Kasi Pemerintahan','2026-11-20'],
  [3,'PRG-003','Pemberdayaan UMKM Desa','Kasi Ekonomi dan Pembangunan',8,8,920000000,'Selesai','Kasi Ekonomi dan Pembangunan','2026-09-30'],
  [4,'PRG-004','Pencegahan Stunting Terpadu','Kasi PMD',6,3,770000000,'Perlu perhatian','Kasi PMD','2026-09-18']
]

const createDocPreview = (name, type) => {
  const lowerName = String(name || '').toLowerCase()
  if (lowerName.endsWith('.pdf')) return `File PDF ${name} terlampir dan siap ditinjau untuk kelengkapan laporan serta riwayat kegiatan.`
  if (lowerName.includes('xls') || lowerName.includes('csv')) return `File spreadsheet ${name} berisi data realisasi, pagu, dan capaian kegiatan yang sedang menunggu review.`
  if (type === 'Pelaporan') return `Dokumen ${name} berisi ringkasan realisasi dan status pelaporan yang sedang menunggu verifikasi.`
  return `Dokumen ${name} berhasil diunggah dan sedang dalam proses peninjauan administrasi.`
}

const seed = () => {
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
    const u = db.prepare('INSERT INTO users VALUES (?,?,?,?,?)')
    u.run(1, 'user', 'user123', 'Pengguna SIPERAN', 'User')
    u.run(2, 'admin', 'admin123', 'Admin', 'Admin')
    u.run(3, 'superadmin', 'superadmin123', 'Super Admin', 'Super Admin')
  } else {
    db.prepare("UPDATE users SET name = 'Admin' WHERE username = 'admin' AND name <> 'Admin'").run()
  }

  db.prepare("UPDATE programs SET bidang = CASE bidang WHEN 'Infrastruktur' THEN 'Kasi Ekonomi dan Pembangunan' WHEN 'Pelayanan Publik' THEN 'Kasi Pelayanan Publik' WHEN 'Ekonomi' THEN 'Kasi Ekonomi dan Pembangunan' WHEN 'Kesehatan' THEN 'Kasi PMD' ELSE bidang END WHERE bidang IN ('Infrastruktur','Pelayanan Publik','Ekonomi','Kesehatan')").run()

  if (!db.prepare('SELECT 1 FROM programs LIMIT 1').get()) {
    const p = db.prepare('INSERT INTO programs VALUES (?,?,?,?,?,?,?,?,?,?)')
    programs.forEach(x => p.run(...x))
  }

  if (!db.prepare('SELECT 1 FROM docs LIMIT 1').get()) {
    const d = db.prepare('INSERT INTO docs (id, name, type, size, date, status, preview, file_path, mime_type, storage_name) VALUES (?,?,?,?,?,?,?,?,?,?)')
    const seedDocs = [
      [1, 'Rencana Kerja Kecamatan 2026.pdf', 'Perencanaan', '2.4 MB', '02 Sep 2026', 'Terverifikasi', 'Dokumen perencanaan utama berisi target program, pagu, dan jadwal kegiatan Kecamatan Kedungwaringin.', null, 'application/pdf', null],
      [2, 'Laporan Realisasi Triwulan II.xlsx', 'Pelaporan', '1.1 MB', '28 Agu 2026', 'Menunggu verifikasi', 'Laporan realisasi triwulan berisi ringkasan capaian keuangan, fisik, dan indikator kinerja.', null, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null],
      [3, 'BA Evaluasi Kinerja Semester I.pdf', 'Evaluasi', '845 KB', '21 Agu 2026', 'Terverifikasi', 'Berita acara evaluasi membahas kesesuaian target, hambatan, dan rekomendasi tindak lanjut.', null, 'application/pdf', null]
    ]
    seedDocs.forEach(x => d.run(...x))
  }

  if (!db.prepare('SELECT 1 FROM events LIMIT 1').get()) {
    const e = db.prepare('INSERT INTO events (date,title,type) VALUES (?,?,?)')
    ;[['2026-09-08', 'Rapat pengendalian bulanan', 'Rapat'], ['2026-09-12', 'Batas unggah laporan PPTK', 'Deadline'], ['2026-09-18', 'Monitoring Stunting Terpadu', 'Monitoring'], ['2026-09-25', 'Forum evaluasi kinerja', 'Evaluasi']].forEach(x => e.run(...x))
  }

  if (!db.prepare('SELECT 1 FROM admin_contacts LIMIT 1').get()) {
    const c = db.prepare('INSERT INTO admin_contacts (type,value) VALUES (?,?)')
    c.run('whatsapp', '085771076965')
    c.run('email', 'admin.siperan@kedungwaringin.go.id')
  }

  if (!db.prepare('SELECT 1 FROM doc_reviews LIMIT 1').get()) {
    const r = db.prepare('INSERT INTO doc_reviews (doc_id,reviewer,action,notes,at) VALUES (?,?,?,?,?)')
    r.run(1, 'Admin', 'Terverifikasi', 'Dokumen telah ditinjau dan memenuhi kelengkapan administrasi', '2026-09-04T08:00:00.000Z')
    r.run(2, 'Admin', 'Menunggu review', 'Dokumen masih menunggu verifikasi kelengkapan laporan', '2026-09-04T09:15:00.000Z')
  }

  if (!db.prepare('SELECT 1 FROM section_approvals LIMIT 1').get()) {
    const s = db.prepare('INSERT INTO section_approvals (section,status,notes,updated_at) VALUES (?,?,?,?)')
    const sections = [
      ['Sekretariat', 'Belum disetujui', 'Menunggu review administrasi umum', new Date().toISOString()],
      ['Pemantib', 'Belum disetujui', 'Menunggu evaluasi program dan anggaran', new Date().toISOString()],
      ['PMD', 'Belum disetujui', 'Perlu konfirmasi output pemberdayaan', new Date().toISOString()],
      ['Pelayanan Publik', 'Belum disetujui', 'Tunggu validasi indikator layanan', new Date().toISOString()],
      ['Kessos', 'Belum disetujui', 'Menunggu review kebutuhan sosial', new Date().toISOString()]
    ]
    sections.forEach(x => s.run(...x))
  }
}

seed()

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(session({
  secret: process.env.SESSION_SECRET || 'siperan-local-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}))

const auth = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'Unauthorized' })
const write = (req, res, next) => req.session.user && req.session.user.role !== 'User' ? next() : res.status(403).json({ error: 'Read-only' })
const superAdminOnly = (req, res, next) => req.session.user && req.session.user.role === 'Super Admin' ? next() : res.status(403).json({ error: 'Hanya Super Admin yang dapat mengubah kontak admin.' })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'document'
    const suffix = path.extname(file.originalname) || '.bin'
    cb(null, `${Date.now()}-${safeBase}${suffix}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

app.get('/api/auth/captcha', (req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let value = ''
  for (let i = 0; i < 6; i += 1) value += chars[Math.floor(Math.random() * chars.length)]
  req.session.loginCaptcha = value
  res.json({ captcha: value })
})

app.use('/api/auth/login', (req, res, next) => {
  const username = String(req.body?.username || '').trim()
  const answer = String(req.body?.captcha || '').trim().toUpperCase()
  const expected = String(req.session.loginCaptcha || '').toUpperCase()
  const logAttempt = (success, reason) => db.prepare('INSERT INTO login_attempts (username,success,reason,at) VALUES (?,?,?,?)').run(username, success ? 1 : 0, reason, new Date().toISOString())
  delete req.session.loginCaptcha
  if (!answer || answer !== expected) {
    logAttempt(false, 'CAPTCHA_INVALID')
    return res.status(401).json({ error: 'CAPTCHA tidak sesuai.' })
  }
  req.loginAttemptLog = logAttempt
  next()
})

app.post('/api/auth/login', (req, res) => {
  const u = db.prepare('SELECT id,username,name,role FROM users WHERE username=? AND password=?').get(req.body.username, req.body.password)
  if (!u) {
    req.loginAttemptLog?.(false, 'INVALID_CREDENTIALS')
    return res.status(401).json({ error: 'Username atau password tidak sesuai.' })
  }
  req.session.user = u
  db.prepare('INSERT INTO auth_log(username,role,action,at) VALUES (?,?,?,?)').run(u.username, u.role, 'SIGN_IN', new Date().toISOString())
  req.loginAttemptLog?.(true, 'SIGN_IN')
  res.json(u)
})

app.post('/api/auth/logout', auth, (req, res) => {
  const u = req.session.user
  db.prepare('INSERT INTO auth_log(username,role,action,at) VALUES (?,?,?,?)').run(u.username, u.role, 'SIGN_OUT', new Date().toISOString())
  req.session.destroy(() => res.json({ ok: true }))
})
app.get('/api/auth/me', (req, res) => res.json(req.session.user || null))
app.get('/api/log', auth, (req, res) => res.json(db.prepare('SELECT * FROM auth_log ORDER BY id DESC').all()))
app.get('/api/users', auth, (req, res) => res.json(req.session.user.role === 'Super Admin' ? db.prepare('SELECT id,username,name,role FROM users').all() : []))
app.get('/api/admin-contacts', auth, (req, res) => res.json(db.prepare('SELECT * FROM admin_contacts ORDER BY id').all()))
app.post('/api/admin-contacts', auth, superAdminOnly, (req, res) => {
  const { type, value } = req.body || {}
  if (!type || !value) return res.status(400).json({ error: 'Tipe dan nilai kontak wajib diisi.' })
  const record = db.prepare('INSERT INTO admin_contacts (type,value) VALUES (?, ?)').run(type, value.trim())
  res.status(201).json(db.prepare('SELECT * FROM admin_contacts WHERE id = ?').get(record.lastInsertRowid))
})
app.patch('/api/admin-contacts/:id', auth, superAdminOnly, (req, res) => {
  const { type, value } = req.body || {}
  if (!type || !value) return res.status(400).json({ error: 'Tipe dan nilai kontak wajib diisi.' })
  const updated = db.prepare('UPDATE admin_contacts SET type = ?, value = ? WHERE id = ?').run(type, value.trim(), req.params.id)
  if (!updated.changes) return res.status(404).json({ error: 'Kontak tidak ditemukan.' })
  res.json({ ok: true, id: Number(req.params.id), type, value: value.trim() })
})
app.delete('/api/admin-contacts/:id', auth, superAdminOnly, (req, res) => {
  const deleted = db.prepare('DELETE FROM admin_contacts WHERE id = ?').run(req.params.id)
  if (!deleted.changes) return res.status(404).json({ error: 'Kontak tidak ditemukan.' })
  res.json({ ok: true })
})

app.get('/api/programs', auth, (req, res) => res.json(db.prepare('SELECT * FROM programs').all()))
app.post('/api/programs', auth, write, (req, res) => {
  const b = req.body
  const bidang = normalizeBidang(b.bidang)
  const info = db.prepare("INSERT INTO programs (kode,nama,bidang,target,realisasi,pagu,status,penanggung,deadline) VALUES (?,?,?,?,0,?,?,?,?)").run(
    b.kode || `PRG-${String(db.prepare('SELECT COUNT(*) c FROM programs').get().c + 1).padStart(3, '0')}`,
    b.nama,
    bidang,
    Number(b.target) || 0,
    Number(b.pagu) || 0,
    'Berjalan',
    b.penanggung,
    b.deadline
  )
  res.json(db.prepare('SELECT * FROM programs WHERE id=?').get(info.lastInsertRowid))
})
app.patch('/api/programs/:id', auth, write, (req, res) => {
  const b = req.body
  const old = db.prepare('SELECT * FROM programs WHERE id=?').get(req.params.id)
  if (!old) return res.sendStatus(404)
  const n = { ...old, ...b, bidang: normalizeBidang(b.bidang || old.bidang) }
  db.prepare('UPDATE programs SET nama=?,bidang=?,target=?,realisasi=?,pagu=?,status=?,penanggung=?,deadline=? WHERE id=?').run(n.nama, n.bidang, n.target, n.realisasi, n.pagu, n.status, n.penanggung, n.deadline, n.id)
  res.json(n)
})
app.delete('/api/programs/:id', auth, write, (req, res) => {
  db.prepare('DELETE FROM programs WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/rka', auth, (req, res) => {
  const form = db.prepare('SELECT * FROM rka_forms ORDER BY id DESC LIMIT 1').get()
  if (!form) return res.json({ id: null, title: 'Rencana Kerja dan Anggaran', tahun: '2025', satuan: 'Kecamatan Kedungwaringin', formulir: 'RKA MANUAL - RINCIAN BELANJA SKPD', rows: [] })
  const rows = db.prepare('SELECT * FROM rka_rows WHERE rka_id = ? ORDER BY id').all(form.id)
  res.json({ ...form, rows })
})

app.post('/api/rka', auth, write, (req, res) => {
  const { id, title, tahun, satuan, formulir, rows = [] } = req.body || {}
  const payload = {
    title: title || 'Rencana Kerja dan Anggaran',
    tahun: tahun || '2025',
    satuan: satuan || 'Kecamatan Kedungwaringin',
    formulir: formulir || 'RKA MANUAL - RINCIAN BELANJA SKPD',
    total: rows.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0),
    updated_at: new Date().toISOString()
  }

  let formId = id
  if (formId) {
    db.prepare('UPDATE rka_forms SET title=?, tahun=?, satuan=?, formulir=?, total=?, updated_at=? WHERE id=?').run(payload.title, payload.tahun, payload.satuan, payload.formulir, payload.total, payload.updated_at, formId)
  } else {
    const insert = db.prepare('INSERT INTO rka_forms (title,tahun,satuan,formulir,total,updated_at) VALUES (?,?,?,?,?,?)').run(payload.title, payload.tahun, payload.satuan, payload.formulir, payload.total, payload.updated_at)
    formId = insert.lastInsertRowid
  }

  db.prepare('DELETE FROM rka_rows WHERE rka_id = ?').run(formId)
  const rowStmt = db.prepare('INSERT INTO rka_rows (rka_id, kode, uraian, koefisien, satuan, harga, ppn, jumlah) VALUES (?,?,?,?,?,?,?,?)')
  rows.forEach(row => rowStmt.run(formId, row.kode || '', row.uraian || '', row.koefisien || '', row.satuan || '', row.harga || '', row.ppn || '', row.jumlah || ''))

  const saved = db.prepare('SELECT * FROM rka_forms WHERE id = ?').get(formId)
  const savedRows = db.prepare('SELECT * FROM rka_rows WHERE rka_id = ? ORDER BY id').all(formId)
  res.status(201).json({ ...saved, rows: savedRows })
})

app.get('/api/monthly-reports', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM monthly_reports ORDER BY id DESC').all()
  res.json(rows)
})

app.post('/api/monthly-reports', auth, write, (req, res) => {
  const { periode, pagu, realisasi_keuangan, realisasi_fisik, catatan } = req.body || {}
  if (!periode) return res.status(400).json({ error: 'Periode laporan wajib diisi.' })
  const insert = db.prepare('INSERT INTO monthly_reports (periode,pagu,realisasi_keuangan,realisasi_fisik,catatan,created_at) VALUES (?,?,?,?,?,?)').run(
    periode,
    Number(pagu) || 0,
    Number(realisasi_keuangan) || 0,
    Number(realisasi_fisik) || 0,
    catatan || '',
    new Date().toISOString()
  )
  res.status(201).json(db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(insert.lastInsertRowid))
})

app.get('/api/docs', auth, (req, res) => {
  const docs = db.prepare('SELECT * FROM docs ORDER BY id DESC').all()
  res.json(docs.map(doc => ({ ...doc, review_log: db.prepare('SELECT * FROM doc_reviews WHERE doc_id=? ORDER BY id DESC').all(doc.id) })))
})

app.post('/api/docs', auth, write, upload.single('file'), (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Berkas dokumen wajib diunggah.' })

  const name = req.body.name || file.originalname
  const type = req.body.type || 'Lainnya'
  const size = req.body.size || `${Math.max(1, Math.round(file.size / 1024))} KB`
  const preview = req.body.preview || createDocPreview(name, type)
  const storageName = file.filename
  const filePath = `/api/uploads/${storageName}`

  const periode = req.body.periode || null
  const info = db.prepare('INSERT INTO docs(name,type,size,date,status,preview,file_path,mime_type,storage_name,periode) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    name,
    type,
    size,
    req.body.date || new Date().toLocaleDateString('id-ID'),
    'Menunggu verifikasi',
    preview,
    filePath,
    file.mimetype,
    storageName,
    periode
  )

  const created = db.prepare('SELECT * FROM docs WHERE id=?').get(info.lastInsertRowid)
  res.status(201).json({ ...created, review_log: [] })
})

app.patch('/api/docs/:id', auth, write, (req, res) => {
  const b = req.body
  db.prepare('UPDATE docs SET status=?, preview=? WHERE id=?').run(b.status || 'Terverifikasi', b.preview || 'Dokumen sudah ditinjau dan siap ditindaklanjuti.', req.params.id)
  res.json({ ok: true })
})

app.post('/api/docs/:id/review', auth, write, (req, res) => {
  const { reviewer, action, notes } = req.body || {}
  const payload = {
    reviewer: reviewer || req.session.user.name,
    action: action || 'Terverifikasi',
    notes: notes || 'Dokumen ditinjau dan disetujui.',
    at: new Date().toISOString()
  }
  const record = db.prepare('INSERT INTO doc_reviews (doc_id,reviewer,action,notes,at) VALUES (?,?,?,?,?)').run(req.params.id, payload.reviewer, payload.action, payload.notes, payload.at)
  res.status(201).json({ id: record.lastInsertRowid, ...payload, doc_id: Number(req.params.id) })
})

app.delete('/api/docs/:id', auth, superAdminOnly, (req, res) => {
  const doc = db.prepare('SELECT storage_name FROM docs WHERE id=?').get(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan.' })
  if (doc.storage_name) {
    const storedPath = path.join(uploadsDir, path.basename(doc.storage_name))
    if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath)
  }
  db.prepare('DELETE FROM doc_reviews WHERE doc_id=?').run(req.params.id)
  db.prepare('DELETE FROM docs WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/doc-reviews', auth, (req, res) => res.json(db.prepare('SELECT * FROM doc_reviews ORDER BY id DESC').all()))
app.get('/api/section-approvals', auth, (req, res) => res.json(db.prepare('SELECT * FROM section_approvals ORDER BY id').all()))
app.patch('/api/section-approvals/:section', auth, write, (req, res) => {
  const section = decodeURIComponent(req.params.section)
  const { status, notes } = req.body || {}
  if (!status) return res.status(400).json({ error: 'Status persetujuan wajib diisi.' })
  const updated = db.prepare('UPDATE section_approvals SET status=?, notes=?, updated_at=? WHERE section=?').run(status, notes || '', new Date().toISOString(), section)
  if (!updated.changes) return res.status(404).json({ error: 'Seksi belum tersedia.' })
  res.json({ section, status, notes: notes || '', updated_at: new Date().toISOString() })
})
app.get('/api/events', auth, (req, res) => res.json(db.prepare('SELECT * FROM events').all()))
app.post('/api/events', auth, write, (req, res) => {
  const { date, title, type } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !String(title || '').trim()) {
    return res.status(400).json({ error: 'Tanggal dan nama kegiatan wajib diisi.' })
  }
  const record = db.prepare('INSERT INTO events (date,title,type) VALUES (?,?,?)').run(date, title.trim(), String(type || 'Lainnya').trim())
  res.status(201).json(db.prepare('SELECT * FROM events WHERE id=?').get(record.lastInsertRowid))
})
app.delete('/api/events/:id', auth, superAdminOnly, (req, res) => {
  const deleted = db.prepare('DELETE FROM events WHERE id=?').run(req.params.id)
  if (!deleted.changes) return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' })
  res.json({ ok: true })
})

app.get('/api/uploads/:filename', auth, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename)
  if (!filePath.startsWith(uploadsDir)) return res.status(403).json({ error: 'Akses file ditolak.' })
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan.' })
  res.sendFile(filePath)
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

const getAvailablePort = async (startPort) => {
  const net = await import('node:net')
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.default.createServer()
      server.unref()
      server.on('error', () => {
        if (port >= startPort + 20) return reject(new Error(`Tidak ada port tersedia di sekitar ${startPort}.`))
        tryPort(port + 1)
      })
      server.listen(port, () => {
        server.close(() => resolve(port))
      })
    }
    tryPort(startPort)
  })
}

const requestedPort = Number(process.env.PORT || 3000)
const port = await getAvailablePort(requestedPort)
app.listen(port, () => console.log(`SIPERAN server running at http://localhost:${port}`))
