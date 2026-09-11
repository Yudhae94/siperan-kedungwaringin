import express from 'express'
import session from 'express-session'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openMysqlDb, bootstrapMysqlOnly } from './server/db.js'
import crypto from 'node:crypto'
import { registerEvaluation } from './server/evaluation.js'
import { registerClinic } from './server/clinic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const db = openMysqlDb()
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS programs (id INTEGER PRIMARY KEY, kode TEXT UNIQUE NOT NULL, nama TEXT NOT NULL, bidang TEXT, target REAL NOT NULL, realisasi REAL NOT NULL DEFAULT 0, pagu REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, penanggung TEXT, deadline TEXT);
CREATE TABLE IF NOT EXISTS docs (id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT, size TEXT, date TEXT, status TEXT NOT NULL, preview TEXT, file_path TEXT, mime_type TEXT, storage_name TEXT);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT NOT NULL, type TEXT);
CREATE TABLE IF NOT EXISTS auth_log (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, role TEXT, action TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS doc_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id INTEGER NOT NULL, reviewer TEXT NOT NULL, action TEXT NOT NULL, notes TEXT, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS section_approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, section TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'Belum disetujui', notes TEXT, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rka_forms (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, tahun TEXT NOT NULL, satuan TEXT NOT NULL, formulir TEXT NOT NULL, total REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rka_rows (id INTEGER PRIMARY KEY AUTOINCREMENT, rka_id INTEGER NOT NULL, kode TEXT, uraian TEXT, koefisien TEXT, satuan TEXT, harga TEXT, ppn TEXT, jumlah TEXT, keterangan TEXT, FOREIGN KEY(rka_id) REFERENCES rka_forms(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS monthly_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, periode TEXT NOT NULL, pagu REAL NOT NULL DEFAULT 0, realisasi_keuangan REAL NOT NULL DEFAULT 0, realisasi_fisik REAL NOT NULL DEFAULT 0, catatan TEXT, created_at TEXT NOT NULL);`)

for (const col of [
  { name: 'email', def: 'TEXT' },
  { name: 'bidang', def: 'TEXT' },
  { name: 'status', def: "TEXT NOT NULL DEFAULT 'Aktif'" },
  { name: 'created_at', def: 'TEXT' },
  { name: 'last_login', def: 'TEXT' }
]) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`)
  } catch {
    // ignore if column already exists
  }
}

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`
}

const verifyPassword = (password, stored) => {
  if (!stored) return false
  if (!stored.startsWith('scrypt:')) return stored === password
  const parts = stored.split(':')
  if (parts.length !== 3) return false
  const [, salt, hash] = parts
  const actual = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}
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

const formatFileSizeServer = bytes => {
  if (!bytes || bytes < 1024) return '1 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${Math.max(1, Math.round(value))} ${units[unitIndex]}`
}

const createDocPreview = (name, type) => {
  const lowerName = String(name || '').toLowerCase()
  if (lowerName.endsWith('.pdf')) return `File PDF ${name} terlampir dan siap ditinjau untuk kelengkapan laporan serta riwayat kegiatan.`
  if (lowerName.includes('xls') || lowerName.includes('csv')) return `File spreadsheet ${name} berisi data realisasi, pagu, dan capaian kegiatan yang sedang menunggu review.`
  if (type === 'Pelaporan') return `Dokumen ${name} berisi ringkasan realisasi dan status pelaporan yang sedang menunggu verifikasi.`
  return `Dokumen ${name} berhasil diunggah dan sedang dalam proses peninjauan administrasi.`
}

const seed = () => {
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
    const u = db.prepare('INSERT INTO users (id, username, password, name, role, bidang, status, created_at) VALUES (?,?,?,?,?,?,?,?)')
    const now = new Date().toISOString()
    u.run(1, 'user', hashPassword('user123'), 'Pengguna SIPERAN', 'User', 'Kasi Pelayanan Publik', 'Aktif', now)
    u.run(2, 'admin', hashPassword('admin123'), 'Admin', 'Admin', 'Sekretariat - Bagian Perencanaan dan Keuangan', 'Aktif', now)
    u.run(3, 'superadmin', hashPassword('superadmin123'), 'Super Admin', 'Super Admin', 'Sekretariat - Bagian Umum dan Kepegawaian', 'Aktif', now)
  } else {
    db.prepare("UPDATE users SET name = 'Admin' WHERE username = 'admin' AND name <> 'Admin'").run()
    // Konsolidasi role lama (PPTK/Camat/Sekcam) ke Super Admin
    db.prepare("UPDATE users SET role = 'Super Admin' WHERE role IN ('PPTK','Camat','Sekcam')").run()
    for (const [uname, pass] of [['user', 'user123'], ['admin', 'admin123'], ['superadmin', 'superadmin123']]) {
      const userRec = db.prepare('SELECT id, password, status, bidang FROM users WHERE username = ?').get(uname)
      if (userRec) {
        if (!userRec.password.startsWith('scrypt:')) {
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(pass), userRec.id)
        }
        if (!userRec.status) {
          db.prepare("UPDATE users SET status = 'Aktif' WHERE id = ?").run(userRec.id)
        }
        if (!userRec.bidang) {
          const defaultBidang = uname === 'user' ? 'Kasi Pelayanan Publik' : uname === 'admin' ? 'Sekretariat - Bagian Perencanaan dan Keuangan' : 'Sekretariat - Bagian Umum dan Kepegawaian'
          db.prepare("UPDATE users SET bidang = ? WHERE id = ?").run(defaultBidang, userRec.id)
        }
      }
    }
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

  if (!db.prepare("SELECT 1 FROM docs WHERE type IN ('Renstra','Renja','DPA','RAK') LIMIT 1").get()) {
    const a = db.prepare('INSERT INTO docs (name, type, size, date, status, preview) VALUES (?,?,?,?,?,?)')
    ;[
      ['Rencana Strategis (Renstra) Kecamatan 2025-2029.pdf', 'Renstra', '3.1 MB', '15 Jan 2026', 'Terverifikasi', 'Dokumen Renstra Kecamatan Kedungwaringin berisi visi, misi, arah kebijakan, dan program prioritas lima tahunan.'],
      ['Rencana Kerja (Renja) Kecamatan 2026.pdf', 'Renja', '2.4 MB', '02 Sep 2026', 'Terverifikasi', 'Renja Kecamatan Kedungwaringin memuat rencana kerja tahunan, indikator kinerja, dan pagu anggaran tiap bidang.'],
      ['DPA Kecamatan Kedungwaringin TA 2026.pdf', 'DPA', '1.8 MB', '10 Des 2025', 'Terverifikasi', 'Dokumen Pelaksanaan Anggaran berisi rincian belanja per kegiatan, satuan harga, dan sumber dana tahun 2026.'],
      ['RAK Kecamatan Kedungwaringin TA 2026.xlsx', 'RAK', '956 KB', '18 Des 2025', 'Menunggu verifikasi', 'Rencana Anggaran Kas memuat penarikan dana bulanan sesuai jadwal pelaksanaan kegiatan tahun 2026.']
    ].forEach(x => a.run(...x))
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

  if (!db.prepare("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'usulan_rka'").get()) {
    db.exec(`CREATE TABLE usulan_rka (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      bidang TEXT,
      jenis TEXT NOT NULL DEFAULT 'Tahunan',
      tahun_anggaran TEXT,
      pagu REAL NOT NULL DEFAULT 0,
      penanggung TEXT,
      target TEXT,
      batas_waktu TEXT,
      catatan TEXT,
      status TEXT NOT NULL DEFAULT 'Menunggu verifikasi',
      catatan_verifikator TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE usulan_rka_dokumen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usulan_id INTEGER NOT NULL,
      jenis_dokumen TEXT NOT NULL,
      name TEXT NOT NULL,
      size TEXT,
      file_path TEXT,
      mime_type TEXT,
      storage_name TEXT,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY(usulan_id) REFERENCES usulan_rka(id) ON DELETE CASCADE
    );
    CREATE TABLE usulan_rka_verifikasi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usulan_id INTEGER NOT NULL,
      verifikator TEXT NOT NULL,
      keputusan TEXT NOT NULL,
      catatan TEXT,
      at TEXT NOT NULL,
      FOREIGN KEY(usulan_id) REFERENCES usulan_rka(id) ON DELETE CASCADE
    );`)
    const seedUsulan = db.prepare(`INSERT INTO usulan_rka
      (judul,bidang,jenis,tahun_anggaran,pagu,penanggung,target,batas_waktu,catatan,status,catatan_verifikator,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    seedUsulan.run(
      'Rehabilitasi Jalan Lingkungan Desa Warung Bingkok', 'Kasi Ekonomi dan Pembangunan', 'Tahunan', '2026',
      450000000, 'PPTK Infrastruktur', 'Panjang jalan ditingkatkan 2.400 m', '2026-10-30',
      'Perlu cek ketersediaan pagu pada sumber dana DAU.', 'Menunggu verifikasi', null, 'Admin', new Date().toISOString(), new Date().toISOString())
    seedUsulan.run(
      'Peningkatan Layanan Posyandu Mawar', 'Kasi Pelayanan Publik', 'Perubahan', '2026',
      120000000, 'Kasi Pelayanan Publik', '12 posyandu mendapat paket alat ukur gizi', '2026-09-25',
      'Sebagai usulan perubahan menggantikan kegiatan bimtek yang ditunda.', 'Perlu perbaikan',
      'RAB belum memuat biaya transport sebaran alat, mohon diperbarui.', 'Admin', new Date().toISOString(), new Date().toISOString())
    const seedDoc = db.prepare(`INSERT INTO usulan_rka_dokumen
      (usulan_id,jenis_dokumen,name,size,file_path,mime_type,storage_name,uploaded_at)
      VALUES (?,?,?,?,?,?,?,?)`)
    seedDoc.run(1, 'KAK', 'KAK Rehabilitasi Jalan Lingkungan 2026.pdf', '1.2 MB', null, 'application/pdf', null, new Date().toISOString())
    seedDoc.run(1, 'RAB', 'RAB Rehabilitasi Jalan 2026.xlsx', '486 KB', null, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, new Date().toISOString())
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
      ['Pemtantrib', 'Belum disetujui', 'Menunggu evaluasi program dan anggaran', new Date().toISOString()],
      ['PMD', 'Belum disetujui', 'Perlu konfirmasi output pemberdayaan', new Date().toISOString()],
      ['Pelayanan Publik', 'Belum disetujui', 'Tunggu validasi indikator layanan', new Date().toISOString()],
      ['Kessos', 'Belum disetujui', 'Menunggu review kebutuhan sosial', new Date().toISOString()]
    ]
    sections.forEach(x => s.run(...x))
  }
}

db.exec(`CREATE TABLE IF NOT EXISTS spj_pencairan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER,
  kode_kegiatan TEXT,
  nama_kegiatan TEXT NOT NULL,
  pagu REAL NOT NULL DEFAULT 0,
  nilai_pencairan REAL NOT NULL DEFAULT 0,
  progres_fisik REAL NOT NULL DEFAULT 0,
  progres_keuangan REAL NOT NULL DEFAULT 0,
  no_spj TEXT,
  tanggal_spj TEXT,
  status TEXT NOT NULL DEFAULT 'Review Subag Perencanaan & Keuangan',
  catatan TEXT,
  file_name TEXT,
  file_path TEXT,
  mime_type TEXT,
  storage_name TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(program_id) REFERENCES programs(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS spj_riwayat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spj_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  catatan TEXT,
  oleh TEXT,
  at TEXT NOT NULL,
  FOREIGN KEY(spj_id) REFERENCES spj_pencairan(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS dpa_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usulan_id INTEGER,
  kode_kegiatan TEXT,
  nama_kegiatan TEXT NOT NULL,
  bidang TEXT,
  pagu REAL NOT NULL DEFAULT 0,
  rincian TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kartu_kendali (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER,
  kode_kegiatan TEXT,
  nama_kegiatan TEXT NOT NULL,
  bidang TEXT,
  tahapan TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'Aktif',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`)

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
const superAdminOnly = (req, res, next) => req.session.user && req.session.user.role === 'Super Admin' ? next() : res.status(403).json({ error: 'Aksi ini hanya dapat dilakukan oleh Super Admin.' })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'document'
    const suffix = path.extname(file.originalname) || '.bin'
    cb(null, `${Date.now()}-${safeBase}${suffix}`)
  }
})
const allowedDocMimes = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const allowedDocExt = ['.pdf', '.xls', '.xlsx', '.doc', '.docx']
function docFileFilter (_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (allowedDocMimes.includes(file.mimetype) || allowedDocExt.includes(ext)) return cb(null, true)
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'))
}
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: docFileFilter
})

app.get('/api/auth/captcha', (req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let value = ''
  for (let i = 0; i < 6; i += 1) value += chars[Math.floor(Math.random() * chars.length)]
  req.session.loginCaptcha = value

  // Render sebagai SVG bergaya captcha (karakter miring + garis coret acak)
  const width = 240
  const height = 80
  const n = value.length
  const slot = width / n
  const rand = (min, max) => min + Math.random() * (max - min)
  const glyphs = [...value].map((ch, i) => {
    const rotate = rand(-28, 28)
    const y = height / 2 + rand(-8, 8)
    const size = rand(34, 42)
    const x = slot * i + slot / 2 + rand(-5, 5)
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rotate.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${size.toFixed(1)}" fill="#0d6b58" text-anchor="middle" dominant-baseline="central">${ch}</text>`
  }).join('')
  let lines = ''
  for (let i = 0; i < 5; i += 1) {
    const x1 = rand(0, width), y1 = rand(0, height)
    const x2 = x1 + rand(-width * 0.7, width * 0.7), y2 = y1 + rand(-height * 0.5, height * 0.5)
    lines += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#0d6b58" stroke-width="${rand(0.6, 1.2).toFixed(2)}" opacity="${rand(0.35, 0.65).toFixed(2)}"/>`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Kode CAPTCHA"><rect width="${width}" height="${height}" fill="#eef8f5"/>${lines}${glyphs}</svg>`
  res.setHeader('Cache-Control', 'no-store')
  res.json({ captcha: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` })
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
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')
  if (!username || !password) {
    req.loginAttemptLog?.(false, 'MISSING_FIELDS')
    return res.status(400).json({ error: 'Username dan password wajib diisi.' })
  }

  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).toLowerCase())
  if (!u || !verifyPassword(password, u.password)) {
    req.loginAttemptLog?.(false, 'INVALID_CREDENTIALS')
    return res.status(401).json({ error: 'Username atau password tidak sesuai.' })
  }

  if (u.status === 'Nonaktif') {
    req.loginAttemptLog?.(false, 'ACCOUNT_INACTIVE')
    return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan. Silakan hubungi admin.' })
  }

  // Auto-upgrade plaintext to scrypt if legacy
  if (!u.password.startsWith('scrypt:')) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), u.id)
  }

  const now = new Date().toISOString()
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now, u.id)

  const sessionUser = {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    bidang: u.bidang || 'Kasi Pelayanan Publik',
    email: u.email || '',
    status: u.status || 'Aktif'
  }

  req.session.user = sessionUser
  db.prepare('INSERT INTO auth_log(username,role,action,at) VALUES (?,?,?,?)').run(u.username, u.role, 'SIGN_IN', now)
  req.loginAttemptLog?.(true, 'SIGN_IN')
  res.json(sessionUser)
})

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body?.name || '').trim()
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const bidang = normalizeBidang(req.body?.bidang)
  const email = String(req.body?.email || '').trim()

  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Nama lengkap wajib diisi minimal 2 karakter.' })
  }
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username wajib minimal 3 karakter.' })
  }
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username hanya boleh huruf kecil, angka, titik, strip, atau underscore.' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password wajib minimal 6 karakter.' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    return res.status(400).json({ error: 'Username sudah digunakan. Silakan pilih username lain.' })
  }

  const now = new Date().toISOString()
  const hashed = hashPassword(password)
  const insert = db.prepare(
    'INSERT INTO users (username, password, name, role, bidang, email, status, created_at, last_login) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(username, hashed, name, 'User', bidang, email, 'Aktif', now, now)

  const newUser = {
    id: Number(insert.lastInsertRowid),
    username,
    name,
    role: 'User',
    bidang,
    email,
    status: 'Aktif'
  }

  req.session.user = newUser
  db.prepare('INSERT INTO auth_log(username,role,action,at) VALUES (?,?,?,?)').run(username, 'User', 'SIGN_UP', now)
  res.status(201).json(newUser)
})

app.post('/api/auth/logout', auth, (req, res) => {
  const u = req.session.user
  db.prepare('INSERT INTO auth_log(username,role,action,at) VALUES (?,?,?,?)').run(u.username, u.role, 'SIGN_OUT', new Date().toISOString())
  req.session.destroy(() => res.json({ ok: true }))
})
app.get('/api/auth/me', (req, res) => res.json(req.session.user || null))
app.get('/api/log', auth, (req, res) => res.json(db.prepare('SELECT * FROM auth_log ORDER BY id DESC').all()))

app.get('/api/users', auth, (req, res) => {
  if (req.session.user.role !== 'Super Admin' && req.session.user.role !== 'Admin') {
    return res.json([])
  }
  const rows = db.prepare('SELECT id, username, name, role, bidang, email, status, created_at, last_login FROM users ORDER BY id ASC').all()
  res.json(rows)
})

app.patch('/api/users/:id', auth, superAdminOnly, (req, res) => {
  const targetId = Number(req.params.id)
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId)
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })

  const { name, role, status, bidang, email } = req.body || {}
  const validRoles = ['User', 'Admin', 'Super Admin']
  const validStatuses = ['Aktif', 'Nonaktif']

  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' })
  }
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid.' })
  }

  if (targetId === req.session.user.id) {
    if (role && role !== 'Super Admin') return res.status(400).json({ error: 'Anda tidak dapat menurunkan role akun sendiri.' })
    if (status && status !== 'Aktif') return res.status(400).json({ error: 'Anda tidak dapat menonaktifkan akun sendiri.' })
  }

  const updatedName = name !== undefined ? String(name).trim() : target.name
  const updatedRole = role !== undefined ? role : target.role
  const updatedStatus = status !== undefined ? status : target.status
  const updatedBidang = bidang !== undefined ? normalizeBidang(bidang) : (target.bidang || 'Kasi Pelayanan Publik')
  const updatedEmail = email !== undefined ? String(email).trim() : (target.email || '')

  db.prepare('UPDATE users SET name = ?, role = ?, status = ?, bidang = ?, email = ? WHERE id = ?')
    .run(updatedName, updatedRole, updatedStatus, updatedBidang, updatedEmail, targetId)

  if (targetId === req.session.user.id) {
    req.session.user.name = updatedName
    req.session.user.role = updatedRole
    req.session.user.bidang = updatedBidang
    req.session.user.email = updatedEmail
  }

  const updated = db.prepare('SELECT id, username, name, role, bidang, email, status, created_at, last_login FROM users WHERE id = ?').get(targetId)
  res.json(updated)
})

app.post('/api/users/:id/reset-password', auth, superAdminOnly, (req, res) => {
  const targetId = Number(req.params.id)
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId)
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })

  const newPassword = String(req.body?.password || '').trim()
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' })
  }

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), targetId)
  res.json({ ok: true, message: `Password pengguna ${target.username} berhasil direset.` })
})

app.delete('/api/users/:id', auth, superAdminOnly, (req, res) => {
  const targetId = Number(req.params.id)
  if (targetId === req.session.user.id) {
    return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' })
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId)
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId)
  res.json({ ok: true })
})
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

registerClinic(app, db, auth, write, superAdminOnly, uploadsDir)

app.get('/api/programs', auth, (req, res) => res.json(db.prepare('SELECT * FROM programs').all()))
app.post('/api/programs', auth, write, (req, res) => {
  const b = req.body
  if (!String(b.nama || '').trim()) return res.status(400).json({ error: 'Nama usulan kegiatan wajib diisi.' })
  const bidang = normalizeBidang(b.bidang)
  let kode = String(b.kode || '').trim()
  if (!kode) {
    const maxNum = db.prepare("SELECT MAX(CAST(SUBSTRING(kode, 5) AS SIGNED)) m FROM programs WHERE kode LIKE 'PRG-%'").get().m || 0
    let candidate = maxNum + 1
    while (db.prepare('SELECT 1 FROM programs WHERE kode = ?').get(`PRG-${String(candidate).padStart(3, '0')}`)) candidate += 1
    kode = `PRG-${String(candidate).padStart(3, '0')}`
  }
  const info = db.prepare("INSERT INTO programs (kode,nama,bidang,target,realisasi,pagu,status,penanggung,deadline) VALUES (?,?,?,?,0,?,?,?,?)").run(
    kode,
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
app.delete('/api/programs/:id', auth, superAdminOnly, (req, res) => {
  db.prepare('DELETE FROM programs WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/rka', auth, (req, res) => {
  try { db.exec('ALTER TABLE rka_forms ADD COLUMN jabatan TEXT') } catch { /* kolom sudah ada */ }
  try { db.exec('ALTER TABLE rka_forms ADD COLUMN nama_ttd TEXT') } catch { /* kolom sudah ada */ }
  try { db.exec('ALTER TABLE rka_forms ADD COLUMN nip_ttd TEXT') } catch { /* kolom sudah ada */ }
  const form = db.prepare('SELECT * FROM rka_forms ORDER BY id DESC LIMIT 1').get()
  if (!form) return res.json({ id: null, title: 'Rencana Kerja dan Anggaran', tahun: '2025', satuan: 'Kecamatan Kedungwaringin', formulir: 'RKA MANUAL - RINCIAN BELANJA SKPD', jabatan: 'Kepala Bagian Perencanaan & Keuangan', nama_ttd: '', nip_ttd: '', rows: [] })
  const rows = db.prepare('SELECT * FROM rka_rows WHERE rka_id = ? ORDER BY id').all(form.id)
  res.json({ ...form, rows })
})

app.post('/api/rka', auth, write, (req, res) => {
  try { db.exec('ALTER TABLE rka_forms ADD COLUMN jabatan TEXT') } catch { /* kolom sudah ada */ }
  try { db.exec('ALTER TABLE rka_forms ADD COLUMN nama_ttd TEXT') } catch { /* kolom sudah ada */ }
  try { db.exec('ALTER TABLE rka_forms ADD COLUMN nip_ttd TEXT') } catch { /* kolom sudah ada */ }
  const { id, title, tahun, satuan, formulir, jabatan, nama_ttd, nip_ttd, rows = [] } = req.body || {}
  const payload = {
    title: title || 'Rencana Kerja dan Anggaran',
    tahun: tahun || '2025',
    satuan: satuan || 'Kecamatan Kedungwaringin',
    formulir: formulir || 'RKA MANUAL - RINCIAN BELANJA SKPD',
    jabatan: jabatan || 'Kepala Bagian Perencanaan & Keuangan',
    nama_ttd: nama_ttd || '',
    nip_ttd: nip_ttd || '',
    total: rows.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0),
    updated_at: new Date().toISOString()
  }

  let formId = id
  if (formId) {
    db.prepare('UPDATE rka_forms SET title=?, tahun=?, satuan=?, formulir=?, jabatan=?, nama_ttd=?, nip_ttd=?, total=?, updated_at=? WHERE id=?').run(payload.title, payload.tahun, payload.satuan, payload.formulir, payload.jabatan, payload.nama_ttd, payload.nip_ttd, payload.total, payload.updated_at, formId)
  } else {
    const insert = db.prepare('INSERT INTO rka_forms (title,tahun,satuan,formulir,jabatan,nama_ttd,nip_ttd,total,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(payload.title, payload.tahun, payload.satuan, payload.formulir, payload.jabatan, payload.nama_ttd, payload.nip_ttd, payload.total, payload.updated_at)
    formId = insert.lastInsertRowid
  }

  try { db.exec('ALTER TABLE rka_rows ADD COLUMN keterangan TEXT') } catch { /* kolom sudah ada */ }
  db.prepare('DELETE FROM rka_rows WHERE rka_id = ?').run(formId)
  const rowStmt = db.prepare('INSERT INTO rka_rows (rka_id, kode, uraian, koefisien, satuan, harga, ppn, jumlah, keterangan) VALUES (?,?,?,?,?,?,?,?,?)')
  rows.forEach(row => rowStmt.run(formId, row.kode || '', row.uraian || '', row.koefisien || '', row.satuan || '', row.harga || '', row.ppn || '', row.jumlah || '', row.keterangan || ''))

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

app.patch('/api/docs/:id', auth, superAdminOnly, (req, res) => {
  const b = req.body
  db.prepare('UPDATE docs SET status=?, preview=? WHERE id=?').run(b.status || 'Terverifikasi', b.preview || 'Dokumen sudah ditinjau dan siap ditindaklanjuti.', req.params.id)
  res.json({ ok: true })
})

app.post('/api/docs/:id/review', auth, superAdminOnly, (req, res) => {
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
app.patch('/api/section-approvals/:section', auth, superAdminOnly, (req, res) => {
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
app.patch('/api/events/:id', auth, write, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id)
  if (!event) return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' })
  const { date, title, type } = req.body || {}
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return res.status(400).json({ error: 'Format tanggal tidak valid.' })
  }
  if (title !== undefined && !String(title).trim()) {
    return res.status(400).json({ error: 'Nama kegiatan tidak boleh kosong.' })
  }
  db.prepare('UPDATE events SET date=?, title=?, type=? WHERE id=?').run(
    date !== undefined ? date : event.date,
    title !== undefined ? String(title).trim() || event.title : event.title,
    type !== undefined ? String(type).trim() || event.type : event.type,
    event.id
  )
  res.json(db.prepare('SELECT * FROM events WHERE id=?').get(event.id))
})
app.delete('/api/events/:id', auth, superAdminOnly, (req, res) => {
  const deleted = db.prepare('DELETE FROM events WHERE id=?').run(req.params.id)
  if (!deleted.changes) return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' })
  res.json({ ok: true })
})

// ===== E-Usulan RKA / KAK =====
const getUsulanDokumen = usulanId => db.prepare('SELECT * FROM usulan_rka_dokumen WHERE usulan_id = ? ORDER BY id').all(usulanId)
const getUsulanRiwayat = usulanId => db.prepare('SELECT * FROM usulan_rka_verifikasi WHERE usulan_id = ? ORDER BY id DESC').all(usulanId)
const getUsulanDetail = row => ({
  ...row,
  dokumen: getUsulanDokumen(row.id),
  riwayat: getUsulanRiwayat(row.id)
})

app.get('/api/usulan-rka', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM usulan_rka ORDER BY id DESC').all()
  res.json(rows.map(getUsulanDetail))
})

app.post('/api/usulan-rka', auth, write, (req, res) => {
  const b = req.body || {}
  if (!String(b.judul || '').trim()) return res.status(400).json({ error: 'Judul usulan kegiatan wajib diisi.' })
  const now = new Date().toISOString()
  const info = db.prepare(`INSERT INTO usulan_rka
    (judul,bidang,jenis,tahun_anggaran,pagu,penanggung,target,batas_waktu,catatan,status,catatan_verifikator,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'Menunggu verifikasi',NULL,?,?,?)`).run(
    String(b.judul).trim(),
    b.bidang || bidangOptions[0],
    b.jenis === 'Perubahan' ? 'Perubahan' : 'Tahunan',
    b.tahun_anggaran || '2026',
    Number(b.pagu) || 0,
    b.penanggung || '',
    b.target || '',
    b.batas_waktu || '',
    b.catatan || '',
    req.session.user.name,
    now,
    now
  )
  const created = db.prepare('SELECT * FROM usulan_rka WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(getUsulanDetail(created))
})

app.post('/api/usulan-rka/:id/dokumen', auth, write, upload.single('file'), (req, res) => {
  const usulan = db.prepare('SELECT * FROM usulan_rka WHERE id = ?').get(req.params.id)
  if (!usulan) return res.status(404).json({ error: 'Usulan tidak ditemukan.' })
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Berkas dokumen wajib diunggah.' })
  const jenisDokumen = ['KAK', 'RAB', 'Jadwal Pelaksanaan'].includes(req.body?.jenis_dokumen) ? req.body.jenis_dokumen : 'KAK'
  const storageName = file.filename
  const filePath = `/api/uploads/${storageName}`
  db.prepare(`INSERT INTO usulan_rka_dokumen (usulan_id,jenis_dokumen,name,size,file_path,mime_type,storage_name,uploaded_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    usulan.id,
    jenisDokumen,
    req.body?.name || file.originalname,
    req.body?.size || formatFileSizeServer(file.size),
    filePath,
    file.mimetype,
    storageName,
    new Date().toISOString()
  )
  const doc = db.prepare('SELECT * FROM usulan_rka_dokumen WHERE usulan_id = ? ORDER BY id DESC LIMIT 1').get(usulan.id)
  res.status(201).json(doc)
})

app.delete('/api/usulan-rka/:id/dokumen/:docId', auth, superAdminOnly, (req, res) => {
  const doc = db.prepare('SELECT * FROM usulan_rka_dokumen WHERE id = ? AND usulan_id = ?').get(req.params.docId, req.params.id)
  if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan.' })
  if (doc.storage_name) {
    const storedPath = path.join(uploadsDir, path.basename(doc.storage_name))
    if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath)
  }
  db.prepare('DELETE FROM usulan_rka_dokumen WHERE id = ?').run(doc.id)
  res.json({ ok: true })
})

app.patch('/api/usulan-rka/:id/verifikasi', auth, superAdminOnly, (req, res) => {
  const usulan = db.prepare('SELECT * FROM usulan_rka WHERE id = ?').get(req.params.id)
  if (!usulan) return res.status(404).json({ error: 'Usulan tidak ditemukan.' })
  const { keputusan, catatan } = req.body || {}
  const keputusanValid = ['Disetujui', 'Perlu perbaikan', 'Ditolak'].includes(keputusan)
  if (!keputusanValid) return res.status(400).json({ error: 'Keputusan verifikasi wajib diisi.' })
  db.prepare('UPDATE usulan_rka SET status = ?, catatan_verifikator = ?, updated_at = ? WHERE id = ?').run(
    keputusan,
    String(catatan || '').trim(),
    new Date().toISOString(),
    usulan.id
  )
  db.prepare('INSERT INTO usulan_rka_verifikasi (usulan_id,verifikator,keputusan,catatan,at) VALUES (?,?,?,?,?)').run(
    usulan.id,
    req.session.user.name,
    keputusan,
    String(catatan || '').trim(),
    new Date().toISOString()
  )
  const updated = db.prepare('SELECT * FROM usulan_rka WHERE id = ?').get(usulan.id)
  res.json(getUsulanDetail(updated))
})

app.delete('/api/usulan-rka/:id', auth, superAdminOnly, (req, res) => {
  const usulan = db.prepare('SELECT * FROM usulan_rka WHERE id = ?').get(req.params.id)
  if (!usulan) return res.status(404).json({ error: 'Usulan tidak ditemukan.' })
  db.prepare('SELECT storage_name FROM usulan_rka_dokumen WHERE usulan_id = ?').all(usulan.id)
    .forEach(doc => {
      if (doc.storage_name) {
        const storedPath = path.join(uploadsDir, path.basename(doc.storage_name))
        if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath)
      }
    })
  db.prepare('DELETE FROM usulan_rka WHERE id = ?').run(usulan.id)
  res.json({ ok: true })
})

// ===== SPJ / Pencairan (Pengendalian & Realisasi Anggaran) =====
const SPJ_STAGES = ['Review Subag Perencanaan & Keuangan', 'Penandatanganan Camat / Sekcam', 'Tahap Pencairan', 'Selesai Dicairkan']

app.get('/api/spj', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM spj_pencairan ORDER BY id DESC').all()
  const history = db.prepare('SELECT * FROM spj_riwayat ORDER BY id DESC').all()
  res.json(rows.map(r => ({ ...r, riwayat: history.filter(h => h.spj_id === r.id) })))
})

app.post('/api/spj', auth, (req, res, next) => {
  if (!['Admin', 'Super Admin'].includes(req.session.user.role)) {
    return res.status(403).json({ error: 'Input SPJ & progres hanya dapat dilakukan oleh Admin atau Super Admin.' })
  }
  next()
}, upload.single('file'), (req, res) => {
  const b = req.body || {}
  const now = new Date().toISOString()
  const file = req.file
  const namaKegiatan = String(b.nama_kegiatan || '').trim()
  if (!namaKegiatan) {
    if (file) { const p = path.join(uploadsDir, file.filename); if (fs.existsSync(p)) fs.unlinkSync(p) }
    return res.status(400).json({ error: 'Nama kegiatan wajib diisi.' })
  }
  const program = b.program_id ? db.prepare('SELECT * FROM programs WHERE id=?').get(b.program_id) : null
  const info = db.prepare(`INSERT INTO spj_pencairan
    (program_id,kode_kegiatan,nama_kegiatan,pagu,nilai_pencairan,progres_fisik,progres_keuangan,no_spj,tanggal_spj,status,catatan,file_name,file_path,mime_type,storage_name,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    program ? program.id : null,
    b.kode_kegiatan || (program ? program.kode : null),
    namaKegiatan,
    Number(b.pagu) || (program ? program.pagu : 0),
    Number(b.nilai_pencairan) || 0,
    Number(b.progres_fisik) || 0,
    Number(b.progres_keuangan) || 0,
    b.no_spj || null,
    b.tanggal_spj || null,
    SPJ_STAGES[0],
    b.catatan || null,
    file ? file.originalname : null,
    file ? `/api/uploads/${file.filename}` : null,
    file ? file.mimetype : null,
    file ? file.filename : null,
    req.session.user.name,
    now, now
  )
  const spjId = info.lastInsertRowid
  db.prepare('INSERT INTO spj_riwayat (spj_id,status,catatan,oleh,at) VALUES (?,?,?,?,?)')
    .run(spjId, SPJ_STAGES[0], 'SPJ dibuat dan masuk review Subag Perencanaan & Keuangan', req.session.user.name, now)
  const row = db.prepare('SELECT * FROM spj_pencairan WHERE id=?').get(spjId)
  res.json({ ...row, riwayat: db.prepare('SELECT * FROM spj_riwayat WHERE spj_id=? ORDER BY id DESC').all(spjId) })
})

app.patch('/api/spj/:id', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM spj_pencairan WHERE id=?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Data SPJ tidak ditemukan.' })
  const b = req.body || {}
  const role = req.session.user.role
  const canInputProgress = ['Admin', 'Super Admin'].includes(role)
  // ==== Validasi perubahan data (bukan status): hanya Admin/Super Admin ====
  const hasDataChange = ['nilai_pencairan', 'progres_fisik', 'progres_keuangan', 'catatan'].some(k => b[k] !== undefined)
  if (hasDataChange && !canInputProgress) {
    return res.status(403).json({ error: 'Hanya PPTK atau Admin yang dapat memperbarui data progres SPJ.' })
  }
  // ==== Workflow status verifikasi SPJ per-role (bertahap) ====
  // Review Subag -> Admin/Super Admin | Penandatanganan Camat/Sekcam -> Camat/Sekcam (atau Admin/SA) | Tahap Pencairan -> Admin/Super Admin
  if (b.status !== undefined && b.status !== row.status) {
    if (!SPJ_STAGES.includes(b.status)) {
      return res.status(400).json({ error: 'Status tidak valid.' })
    }
    const from = SPJ_STAGES.indexOf(row.status)
    const to = SPJ_STAGES.indexOf(b.status)
    const isSuperAdmin = role === 'Super Admin'
    const isAdmin = role === 'Admin' || isSuperAdmin
    const isSigner = isAdmin // Penandatanganan kini milik Admin/Super Admin
    let allowed = false
    if (isSuperAdmin) {
      allowed = true // Super Admin dapat memindahkan ke tahap mana pun
    } else if (to === from + 1) {
      // hanya maju satu tahap, sesuai penanggung jawab tahap tersebut
      allowed = (to === 1 && isAdmin) || (to === 2 && isSigner) || (to === 3 && isAdmin)
    }
    if (!allowed) {
      return res.status(403).json({ error: `Role ${role} tidak dapat mengubah status SPJ dari \"${row.status}\" menjadi \"${b.status}\". Alur: review Subag (Admin) -> penandatanganan Camat/Sekcam -> pencairan.` })
    }
  }
  const now = new Date().toISOString()
  const num = (val, fallback) => {
    const n = Number(val)
    return Number.isFinite(n) ? n : fallback
  }
  const next = {
    nilai_pencairan: b.nilai_pencairan !== undefined ? Math.max(0, num(b.nilai_pencairan, row.nilai_pencairan)) : row.nilai_pencairan,
    progres_fisik: b.progres_fisik !== undefined ? Math.max(0, Math.min(100, num(b.progres_fisik, row.progres_fisik))) : row.progres_fisik,
    progres_keuangan: b.progres_keuangan !== undefined ? Math.max(0, Math.min(100, num(b.progres_keuangan, row.progres_keuangan))) : row.progres_keuangan,
    catatan: b.catatan !== undefined ? (b.catatan === null ? null : String(b.catatan)) : row.catatan,
    status: SPJ_STAGES.includes(b.status) ? b.status : row.status
  }
  db.prepare('UPDATE spj_pencairan SET nilai_pencairan=?, progres_fisik=?, progres_keuangan=?, catatan=?, status=?, updated_at=? WHERE id=?')
    .run(next.nilai_pencairan, next.progres_fisik, next.progres_keuangan, next.catatan, next.status, now, row.id)
  if (next.status !== row.status) {
    db.prepare('INSERT INTO spj_riwayat (spj_id,status,catatan,oleh,at) VALUES (?,?,?,?,?)')
      .run(row.id, next.status, b.catatan_status || `Status diperbarui menjadi: ${next.status}`, req.session.user.name, now)
  }
  const updated = db.prepare('SELECT * FROM spj_pencairan WHERE id=?').get(row.id)
  res.json({ ...updated, riwayat: db.prepare('SELECT * FROM spj_riwayat WHERE spj_id=? ORDER BY id DESC').all(row.id) })
})

app.delete('/api/spj/:id', auth, superAdminOnly, (req, res) => {
  const row = db.prepare('SELECT * FROM spj_pencairan WHERE id=?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Data SPJ tidak ditemukan.' })
  if (row.storage_name) {
    const storedPath = path.join(uploadsDir, path.basename(row.storage_name))
    if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath)
  }
  db.prepare('DELETE FROM spj_riwayat WHERE spj_id=?').run(row.id)
  db.prepare('DELETE FROM spj_pencairan WHERE id=?').run(row.id)
  res.json({ ok: true })
})

// ===== DPA (Dokumen Pelaksanaan Anggaran) =====
app.get('/api/dpa', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM dpa_forms ORDER BY id DESC').all()
  res.json(rows.map(r => ({ ...r, rincian: JSON.parse(r.rincian || '[]') })))
})
app.post('/api/dpa', auth, write, (req, res) => {
  const b = req.body || {}
  const now = new Date().toISOString()
  if (!String(b.nama_kegiatan || '').trim()) return res.status(400).json({ error: 'Nama kegiatan wajib diisi.' })
  const info = db.prepare(`INSERT INTO dpa_forms (usulan_id,kode_kegiatan,nama_kegiatan,bidang,pagu,rincian,status,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    b.usulan_id || null,
    b.kode_kegiatan || '',
    String(b.nama_kegiatan).trim(),
    b.bidang || '',
    Number(b.pagu) || 0,
    JSON.stringify(b.rincian || []),
    b.status || 'Draft',
    req.session.user.name,
    now, now
  )
  res.status(201).json(db.prepare('SELECT * FROM dpa_forms WHERE id=?').get(info.lastInsertRowid))
})
app.patch('/api/dpa/:id', auth, write, (req, res) => {
  const row = db.prepare('SELECT * FROM dpa_forms WHERE id=?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'DPA tidak ditemukan.' })
  const b = req.body || {}
  const now = new Date().toISOString()
  db.prepare('UPDATE dpa_forms SET usulan_id=?,kode_kegiatan=?,nama_kegiatan=?,bidang=?,pagu=?,rincian=?,status=?,updated_at=? WHERE id=?').run(
    b.usulan_id !== undefined ? b.usulan_id : row.usulan_id,
    b.kode_kegiatan !== undefined ? b.kode_kegiatan : row.kode_kegiatan,
    b.nama_kegiatan !== undefined ? String(b.nama_kegiatan).trim() : row.nama_kegiatan,
    b.bidang !== undefined ? b.bidang : row.bidang,
    b.pagu !== undefined ? Number(b.pagu) || 0 : row.pagu,
    b.rincian !== undefined ? JSON.stringify(b.rincian) : row.rincian,
    b.status !== undefined ? b.status : row.status,
    now,
    row.id
  )
  res.json(db.prepare('SELECT * FROM dpa_forms WHERE id=?').get(row.id))
})
app.delete('/api/dpa/:id', auth, superAdminOnly, (req, res) => {
  const deleted = db.prepare('DELETE FROM dpa_forms WHERE id=?').run(req.params.id)
  if (!deleted.changes) return res.status(404).json({ error: 'DPA tidak ditemukan.' })
  res.json({ ok: true })
})

// ===== Kartu Kendali =====
app.get('/api/kartu-kendali', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM kartu_kendali ORDER BY id DESC').all()
  res.json(rows.map(r => ({ ...r, tahapan: JSON.parse(r.tahapan || '[]') })))
})
app.post('/api/kartu-kendali', auth, write, (req, res) => {
  const b = req.body || {}
  const now = new Date().toISOString()
  if (!String(b.nama_kegiatan || '').trim()) return res.status(400).json({ error: 'Nama kegiatan wajib diisi.' })
  const info = db.prepare(`INSERT INTO kartu_kendali (program_id,kode_kegiatan,nama_kegiatan,bidang,tahapan,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    b.program_id || null,
    b.kode_kegiatan || '',
    String(b.nama_kegiatan).trim(),
    b.bidang || '',
    JSON.stringify(b.tahapan || []),
    b.status || 'Aktif',
    now, now
  )
  res.status(201).json(db.prepare('SELECT * FROM kartu_kendali WHERE id=?').get(info.lastInsertRowid))
})
app.patch('/api/kartu-kendali/:id', auth, write, (req, res) => {
  const row = db.prepare('SELECT * FROM kartu_kendali WHERE id=?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Kartu kendali tidak ditemukan.' })
  const b = req.body || {}
  const now = new Date().toISOString()
  db.prepare('UPDATE kartu_kendali SET program_id=?,kode_kegiatan=?,nama_kegiatan=?,bidang=?,tahapan=?,status=?,updated_at=? WHERE id=?').run(
    b.program_id !== undefined ? b.program_id : row.program_id,
    b.kode_kegiatan !== undefined ? b.kode_kegiatan : row.kode_kegiatan,
    b.nama_kegiatan !== undefined ? String(b.nama_kegiatan).trim() : row.nama_kegiatan,
    b.bidang !== undefined ? b.bidang : row.bidang,
    b.tahapan !== undefined ? JSON.stringify(b.tahapan) : row.tahapan,
    b.status !== undefined ? b.status : row.status,
    now,
    row.id
  )
  res.json(db.prepare('SELECT * FROM kartu_kendali WHERE id=?').get(row.id))
})
app.delete('/api/kartu-kendali/:id', auth, superAdminOnly, (req, res) => {
  const deleted = db.prepare('DELETE FROM kartu_kendali WHERE id=?').run(req.params.id)
  if (!deleted.changes) return res.status(404).json({ error: 'Kartu kendali tidak ditemukan.' })
  res.json({ ok: true })
})

// ===== LKA (Lembar Kendali Anggaran) =====
app.get('/api/lka', auth, (req, res) => {
  const programs = db.prepare('SELECT * FROM programs ORDER BY kode').all()
  const spj = db.prepare("SELECT * FROM spj_pencairan WHERE status = 'Selesai Dicairkan'").all()
  const rows = programs.map(p => {
    const paid = spj.filter(s => s.program_id === p.id)
    const spent = paid.reduce((n, s) => n + Number(s.nilai_pencairan || 0), 0)
    // Jika kegiatan sudah Selesai, nilai serapan dibuat otomatis = pagu (100%).
    const realisasi = String(p.status || '').toLowerCase() === 'selesai' ? Number(p.pagu || 0) : spent
    return {
      kode: p.kode,
      nama: p.nama,
      bidang: p.bidang,
      pagu: p.pagu,
      realisasi,
      sisa: Math.max(0, p.pagu - realisasi),
      serapan: p.pagu > 0 ? Math.min(100, Math.round(realisasi / p.pagu * 100)) : 0
    }
  })
  const totals = rows.reduce((t, r) => ({ pagu: t.pagu + r.pagu, realisasi: t.realisasi + r.realisasi, sisa: t.sisa + r.sisa }), { pagu: 0, realisasi: 0, sisa: 0 })
  res.json({ rows, totals: { ...totals, serapan: totals.pagu > 0 ? Math.round(totals.realisasi / totals.pagu * 100) : 0 } })
})

// ===== Edit dokumen pendukung usulan (Super Admin saja) =====
app.patch('/api/usulan-rka/:id/dokumen/:docId', auth, superAdminOnly, (req, res) => {
  const doc = db.prepare('SELECT * FROM usulan_rka_dokumen WHERE id=? AND usulan_id=?').get(req.params.docId, req.params.id)
  if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan.' })
  const b = req.body || {}
  db.prepare('UPDATE usulan_rka_dokumen SET jenis_dokumen=?, name=? WHERE id=?').run(
    ['KAK', 'RAB', 'Jadwal Pelaksanaan'].includes(b.jenis_dokumen) ? b.jenis_dokumen : doc.jenis_dokumen,
    b.name !== undefined ? String(b.name).trim() || doc.name : doc.name,
    doc.id
  )
  res.json(db.prepare('SELECT * FROM usulan_rka_dokumen WHERE id=?').get(doc.id))
})

app.get('/api/uploads/:filename', auth, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename)
  if (!filePath.startsWith(uploadsDir)) return res.status(403).json({ error: 'Akses file ditolak.' })
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan.' })
  res.sendFile(filePath)
})

registerEvaluation(app, db, auth, write, superAdminOnly)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }))
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

const requestedPort = Number(process.env.PORT || 3001)
const port = requestedPort
// Trigger MySQL (pengganti trigger SQLite untuk e_usulan_kegiatan & evaluasi)
bootstrapMysqlOnly(db)
// Handler error (termasuk penolakan tipe berkas dari multer)
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Format berkas tidak didukung. Gunakan PDF, Excel (xls/xlsx), atau Word (doc/docx).' })
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Ukuran berkas melebihi batas 10 MB.' })
    }
    return res.status(400).json({ error: 'Gagal mengunggah berkas: ' + err.code })
  }
  console.error(err)
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' })
})
app.listen(port, () => console.log(`SIPERAN server running at http://localhost:${port}`))
