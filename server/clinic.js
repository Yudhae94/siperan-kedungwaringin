// Klinik Perencanaan & Keuangan: chat Q&A internal, jadwal konsultasi, pusat unduhan template.
import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'

const formatFileSize = bytes => {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function migrateClinic(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS clinic_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_bidang TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Terbuka',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS clinic_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL REFERENCES clinic_threads(id) ON DELETE CASCADE,
    sender_id INTEGER,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS clinic_messages_thread_idx ON clinic_messages(thread_id, id);
  CREATE TABLE IF NOT EXISTS clinic_consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_bidang TEXT NOT NULL DEFAULT '',
    layanan TEXT NOT NULL,
    tanggal VARCHAR(64) NOT NULL,
    sesi TEXT NOT NULL,
    agenda TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Menunggu Konfirmasi',
    catatan TEXT NOT NULL DEFAULT '',
    handled_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS clinic_consultations_date_idx ON clinic_consultations(tanggal);
  CREATE TABLE IF NOT EXISTS clinic_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    file_name TEXT,
    mime_type TEXT,
    size TEXT,
    storage_name TEXT,
    uploaded_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );`)
  // Template standar bawaan (dapat dilengkapi file oleh Super Admin).
  const count = db.prepare('SELECT COUNT(*) AS c FROM clinic_templates').get().c
  if (!count) {
    const seed = db.prepare('INSERT INTO clinic_templates (title,category,description,uploaded_by,created_at) VALUES (?,?,?,?,?)')
    const now = new Date().toISOString()
    const defaults = [
      ['Template KAK (Kerangka Acuan Kerja)', 'KAK', 'Format standar penyusunan KAK untuk usulan kegiatan.'],
      ['Template RAB (Rencana Anggaran Biaya)', 'RAB', 'Format standar rincian anggaran belanja kegiatan.'],
      ['SOP Perencanaan & Anggaran', 'SOP', 'Prosedur operasional standar penyusunan renja dan anggaran.'],
      ['Format Berkas Pencairan (SPJ)', 'Pencairan', 'Checklist dan format berkas permohonan pencairan dana.'],
    ]
    for (const [title, category, description] of defaults) seed.run(title, category, description, 'Sistem', now)
  }
}

const fail = message => { const error = new Error(message); error.status = 400; throw error }
const now = () => new Date().toISOString()

export function registerClinic(app, db, auth, write, superAdminOnly, uploadsDir) {
  migrateClinic(db)
  const wrap = handler => (req, res, next) => {
    try { handler(req, res) } catch (error) { if (error.status === 400) res.status(400).json({ error: error.message }); else next(error) }
  }
  const canModerate = user => ['Super Admin', 'Admin'].includes(user.role)
  const canApprove = user => user.role === 'Super Admin'

  // ===== Threads (Q&A) =====
  app.get('/api/clinic/threads', auth, wrap((req, res) => {
    const threads = db.prepare(`
      SELECT t.*, (SELECT COUNT(*) FROM clinic_messages m WHERE m.thread_id = t.id) AS message_count,
        (SELECT MAX(m.created_at) FROM clinic_messages m WHERE m.thread_id = t.id) AS last_activity
      FROM clinic_threads t ORDER BY COALESCE(last_activity, t.created_at) DESC`).all()
    res.json(threads)
  }))

  app.post('/api/clinic/threads', auth, wrap((req, res) => {
    const topic = String(req.body?.topic || '').trim()
    if (topic.length < 5 || topic.length > 200) fail('Topik wajib 5-200 karakter.')
    const info = db.prepare('INSERT INTO clinic_threads (user_id,user_name,user_bidang,topic,created_at) VALUES (?,?,?,?,?)')
      .run(req.session.user.id, req.session.user.name, req.session.user.bidang || '', topic, now())
    const thread = db.prepare('SELECT * FROM clinic_threads WHERE id = ?').get(info.lastInsertRowid)
    res.status(201).json({ ...thread, message_count: 0, last_activity: null })
  }))

  app.get('/api/clinic/threads/:id', auth, wrap((req, res) => {
    const thread = db.prepare('SELECT * FROM clinic_threads WHERE id = ?').get(req.params.id)
    if (!thread) return res.status(404).json({ error: 'Percakapan tidak ditemukan.' })
    thread.messages = db.prepare('SELECT * FROM clinic_messages WHERE thread_id = ? ORDER BY id ASC').all(thread.id)
    res.json(thread)
  }))

  app.patch('/api/clinic/threads/:id', auth, write, wrap((req, res) => {
    const thread = db.prepare('SELECT * FROM clinic_threads WHERE id = ?').get(req.params.id)
    if (!thread) return res.status(404).json({ error: 'Percakapan tidak ditemukan.' })
    const status = String(req.body?.status || '')
    const allowed = ['Terbuka', 'Dijawab', 'Selesai']
    if (!allowed.includes(status)) fail('Status tidak valid.')
    const isOwner = thread.user_id === req.session.user.id
    if (!isOwner && !canModerate(req.session.user)) return res.status(403).json({ error: 'Hanya pemilik atau Admin yang dapat mengubah status.' })
    db.prepare('UPDATE clinic_threads SET status = ? WHERE id = ?').run(status, thread.id)
    res.json(db.prepare('SELECT * FROM clinic_threads WHERE id = ?').get(thread.id))
  }))

  app.delete('/api/clinic/threads/:id', auth, superAdminOnly, wrap((req, res) => {
    const thread = db.prepare('SELECT * FROM clinic_threads WHERE id = ?').get(req.params.id)
    if (!thread) return res.status(404).json({ error: 'Percakapan tidak ditemukan.' })
    db.prepare('DELETE FROM clinic_messages WHERE thread_id = ?').run(thread.id)
    db.prepare('DELETE FROM clinic_threads WHERE id = ?').run(thread.id)
    res.json({ ok: true })
  }))

  app.post('/api/clinic/threads/:id/messages', auth, wrap((req, res) => {
    const thread = db.prepare('SELECT * FROM clinic_threads WHERE id = ?').get(req.params.id)
    if (!thread) return res.status(404).json({ error: 'Percakapan tidak ditemukan.' })
    const message = String(req.body?.message || '').trim()
    if (!message || message.length > 4000) fail('Pesan wajib diisi (maksimal 4000 karakter).')
    const info = db.prepare('INSERT INTO clinic_messages (thread_id,sender_id,sender_name,sender_role,message,created_at) VALUES (?,?,?,?,?,?)')
      .run(thread.id, req.session.user.id, req.session.user.name, req.session.user.role, message, now())
    if (req.session.user.id !== thread.user_id && thread.status === 'Terbuka') {
      db.prepare("UPDATE clinic_threads SET status = 'Dijawab' WHERE id = ?").run(thread.id)
    }
    res.status(201).json(db.prepare('SELECT * FROM clinic_messages WHERE id = ?').get(info.lastInsertRowid))
  }))

  // ===== Konsultasi / coaching =====
  app.get('/api/clinic/consultations', auth, wrap((req, res) => {
    const rows = db.prepare('SELECT * FROM clinic_consultations ORDER BY tanggal DESC, id DESC').all()
    res.json(rows)
  }))

  app.post('/api/clinic/consultations', auth, wrap((req, res) => {
    const b = req.body || {}
    const layanan = String(b.layanan || '').trim()
    const tanggal = String(b.tanggal || '').trim()
    const sesi = String(b.sesi || '').trim()
    const agenda = String(b.agenda || '').trim().slice(0, 2000)
    if (!layanan) fail('Layanan konsultasi wajib dipilih.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) fail('Tanggal konsultasi tidak valid.')
    if (!['Pagi (08.00-11.00)', 'Siang (13.00-15.00)'].includes(sesi)) fail('Sesi konsultasi tidak valid.')
    const info = db.prepare(`INSERT INTO clinic_consultations
      (user_id,user_name,user_bidang,layanan,tanggal,sesi,agenda,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(req.session.user.id, req.session.user.name, req.session.user.bidang || '', layanan, tanggal, sesi, agenda, now())
    res.status(201).json(db.prepare('SELECT * FROM clinic_consultations WHERE id = ?').get(info.lastInsertRowid))
  }))

  app.patch('/api/clinic/consultations/:id', auth, write, wrap((req, res) => {
    const row = db.prepare('SELECT * FROM clinic_consultations WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Jadwal konsultasi tidak ditemukan.' })
    const b = req.body || {}
    const next = {
      status: ['Menunggu Konfirmasi', 'Dikonfirmasi', 'Selesai', 'Dibatalkan'].includes(b.status) ? b.status : row.status,
      catatan: b.catatan !== undefined ? String(b.catatan).trim().slice(0, 2000) : row.catatan,
      tanggal: /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal || '') ? b.tanggal : row.tanggal,
      sesi: ['Pagi (08.00-11.00)', 'Siang (13.00-15.00)'].includes(b.sesi) ? b.sesi : row.sesi,
    }
    const approver = canApprove(req.session.user) || canModerate(req.session.user)
    const isOwner = row.user_id === req.session.user.id
    if (!approver && !isOwner) return res.status(403).json({ error: 'Tidak memiliki akses memperbarui jadwal ini.' })
    if ((b.status && !isOwner) || b.catatan !== undefined) next.handled_by = req.session.user.name
    db.prepare('UPDATE clinic_consultations SET status=?,catatan=?,tanggal=?,sesi=?,handled_by=?,updated_at=? WHERE id=?')
      .run(next.status, next.catatan, next.tanggal, next.sesi, next.handled_by || row.handled_by, now(), row.id)
    res.json(db.prepare('SELECT * FROM clinic_consultations WHERE id = ?').get(row.id))
  }))

  app.delete('/api/clinic/consultations/:id', auth, superAdminOnly, wrap((req, res) => {
    const deleted = db.prepare('DELETE FROM clinic_consultations WHERE id = ?').run(req.params.id)
    if (!deleted.changes) return res.status(404).json({ error: 'Jadwal konsultasi tidak ditemukan.' })
    res.json({ ok: true })
  }))

  // ===== Pusat unduhan template =====
  app.get('/api/clinic/templates', auth, wrap((_req, res) => {
    res.json(db.prepare('SELECT id,title,category,description,file_name,mime_type,size,uploaded_by,created_at FROM clinic_templates ORDER BY category, title').all())
  }))

  app.get('/api/clinic/templates/:id/download', auth, wrap((req, res) => {
    const row = db.prepare('SELECT * FROM clinic_templates WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Template tidak ditemukan.' })
    if (!row.storage_name) return res.status(400).json({ error: 'Berkas template belum tersedia. Silakan hubungi Super Admin.' })
    const filePath = path.join(uploadsDir, path.basename(row.storage_name))
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Berkas tidak ditemukan di server.' })
    res.download(filePath, row.file_name || path.basename(filePath))
  }))

  app.post('/api/clinic/templates', auth, superAdminOnly, wrap((req, res) => {
    const b = req.body || {}
    const title = String(b.title || '').trim()
    const category = ['KAK', 'RAB', 'SOP', 'Pencairan', 'Lainnya'].includes(b.category) ? b.category : 'Lainnya'
    if (title.length < 3 || title.length > 150) fail('Judul template wajib 3-150 karakter.')
    const info = db.prepare('INSERT INTO clinic_templates (title,category,description,uploaded_by,created_at) VALUES (?,?,?,?,?)')
      .run(title, category, String(b.description || '').trim().slice(0, 1000), req.session.user.name, now())
    res.status(201).json(db.prepare('SELECT * FROM clinic_templates WHERE id = ?').get(info.lastInsertRowid))
  }))

  app.patch('/api/clinic/templates/:id', auth, superAdminOnly, wrap((req, res) => {
    const row = db.prepare('SELECT * FROM clinic_templates WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Template tidak ditemukan.' })
    const b = req.body || {}
    const title = String(b.title || row.title).trim()
    if (title.length < 3 || title.length > 150) fail('Judul template wajib 3-150 karakter.')
    db.prepare('UPDATE clinic_templates SET title=?,category=?,description=? WHERE id=?').run(
      title,
      ['KAK', 'RAB', 'SOP', 'Pencairan', 'Lainnya'].includes(b.category) ? b.category : row.category,
      b.description !== undefined ? String(b.description).trim().slice(0, 1000) : row.description,
      row.id)
    res.json(db.prepare('SELECT * FROM clinic_templates WHERE id = ?').get(row.id))
  }))

  app.delete('/api/clinic/templates/:id', auth, superAdminOnly, wrap((req, res) => {
    const row = db.prepare('SELECT * FROM clinic_templates WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Template tidak ditemukan.' })
    if (row.storage_name) {
      const storedPath = path.join(uploadsDir, path.basename(row.storage_name))
      if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath)
    }
    db.prepare('DELETE FROM clinic_templates WHERE id = ?').run(row.id)
    res.json({ ok: true })
  }))

  // Upload berkas untuk template (Super Admin saja).
  const templateUpload = multer({ dest: uploadsDir, limits: { fileSize: 10 * 1024 * 1024 } })
  app.post('/api/clinic/templates/:id/file', auth, superAdminOnly, (req, res) => {
    templateUpload.single('file')(req, res, err => {
      if (err) return res.status(400).json({ error: 'Gagal mengunggah berkas: ' + err.code })
      if (!req.file) return res.status(400).json({ error: 'Berkas wajib dipilih.' })
      const row = db.prepare('SELECT * FROM clinic_templates WHERE id = ?').get(req.params.id)
      if (!row) return res.status(404).json({ error: 'Template tidak ditemukan.' })
      db.prepare('UPDATE clinic_templates SET file_name=?,mime_type=?,size=?,storage_name=? WHERE id=?').run(
        req.file.originalname, req.file.mimetype, formatFileSize(req.file.size), req.file.filename, row.id)
      res.json(db.prepare('SELECT * FROM clinic_templates WHERE id = ?').get(row.id))
    })
  })
}
