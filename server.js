import express from 'express'
import session from 'express-session'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new DatabaseSync(path.join(__dirname, 'siperan.sqlite'))
db.exec('PRAGMA journal_mode = WAL')
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS programs (id INTEGER PRIMARY KEY, kode TEXT UNIQUE NOT NULL, nama TEXT NOT NULL, bidang TEXT, target REAL NOT NULL, realisasi REAL NOT NULL DEFAULT 0, pagu REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, penanggung TEXT, deadline TEXT);
CREATE TABLE IF NOT EXISTS docs (id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT, size TEXT, date TEXT, status TEXT NOT NULL, preview TEXT);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT NOT NULL, type TEXT);
CREATE TABLE IF NOT EXISTS auth_log (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, role TEXT, action TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, value TEXT NOT NULL);`)
const programs = [
  [1,'PRG-001','Peningkatan Jalan Lingkungan','Infrastruktur',12,9,1850000000,'Berjalan','PPTK Infrastruktur','2026-10-14'],
  [2,'PRG-002','Pelayanan Administrasi Terpadu','Pelayanan Publik',100,82,640000000,'Berjalan','Kasi Pemerintahan','2026-11-20'],
  [3,'PRG-003','Pemberdayaan UMKM Desa','Ekonomi',8,8,920000000,'Selesai','Kasi Ekonomi','2026-09-30'],
  [4,'PRG-004','Pencegahan Stunting Terpadu','Kesehatan',6,3,770000000,'Perlu perhatian','Kasi Kesra','2026-09-18']]
const seed = () => {
  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
    const u = db.prepare('INSERT INTO users VALUES (?,?,?,?,?)')
    u.run(1,'user','user123','Pengguna SIPERAN','User'); u.run(2,'admin','admin123','Admin','Admin'); u.run(3,'superadmin','superadmin123','Super Admin','Super Admin')
  } else {
    db.prepare("UPDATE users SET name = 'Admin' WHERE username = 'admin' AND name <> 'Admin'").run()
  }
  if (!db.prepare('SELECT 1 FROM programs LIMIT 1').get()) { const p=db.prepare('INSERT INTO programs VALUES (?,?,?,?,?,?,?,?,?,?)'); programs.forEach(x=>p.run(...x)) }
  if (!db.prepare('SELECT 1 FROM docs LIMIT 1').get()) { const d=db.prepare('INSERT INTO docs (id,name,type,size,date,status,preview) VALUES (?,?,?,?,?,?,?)'); [[1,'Rencana Kerja Kecamatan 2026.pdf','Perencanaan','2.4 MB','02 Sep 2026','Terverifikasi','Dokumen perencanaan utama berisi target program, pagu, dan jadwal kegiatan Kecamatan Kedungwaringin.'],[2,'Laporan Realisasi Triwulan II.xlsx','Pelaporan','1.1 MB','28 Agu 2026','Menunggu verifikasi','Laporan realisasi triwulan berisi ringkasan capaian keuangan, fisik, dan indikator kinerja.'],[3,'BA Evaluasi Kinerja Semester I.pdf','Evaluasi','845 KB','21 Agu 2026','Terverifikasi','Berita acara evaluasi membahas kesesuaian target, hambatan, dan rekomendasi tindak lanjut.']].forEach(x=>d.run(...x)) }
  if (!db.prepare('SELECT 1 FROM events LIMIT 1').get()) { const e=db.prepare('INSERT INTO events (date,title,type) VALUES (?,?,?)'); [['2026-09-08','Rapat pengendalian bulanan','Rapat'],['2026-09-12','Batas unggah laporan PPTK','Deadline'],['2026-09-18','Monitoring Stunting Terpadu','Monitoring'],['2026-09-25','Forum evaluasi kinerja','Evaluasi']].forEach(x=>e.run(...x)) }
  if (!db.prepare('SELECT 1 FROM admin_contacts LIMIT 1').get()) { const c=db.prepare('INSERT INTO admin_contacts (type,value) VALUES (?,?)'); c.run('whatsapp','085771076965'); c.run('email','admin.siperan@kedungwaringin.go.id') }
}
seed()
const app = express(); app.use(express.json({ limit: '2mb' })); app.use(session({ secret: process.env.SESSION_SECRET || 'siperan-local-secret', resave:false, saveUninitialized:false, cookie:{ httpOnly:true, sameSite:'lax' } }))
const auth = (req,res,next) => req.session.user ? next() : res.status(401).json({ error:'Unauthorized' })
const write = (req,res,next) => req.session.user && req.session.user.role !== 'User' ? next() : res.status(403).json({ error:'Read-only' })
const superAdminOnly = (req,res,next) => req.session.user && req.session.user.role === 'Super Admin' ? next() : res.status(403).json({ error:'Hanya Super Admin yang dapat mengubah kontak admin.' })
app.post('/api/auth/login',(req,res)=>{ const u=db.prepare('SELECT id,username,name,role FROM users WHERE username=? AND password=?').get(req.body.username,req.body.password); if(!u)return res.status(401).json({error:'Username atau password tidak sesuai.'}); req.session.user=u; db.prepare('INSERT INTO auth_log(username,role,action,at) VALUES (?,?,?,?)').run(u.username,u.role,'SIGN_IN',new Date().toISOString()); res.json(u) })
app.post('/api/auth/logout',auth,(req,res)=>{ const u=req.session.user; db.prepare('INSERT INTO auth_log(username,role,action,at) VALUES (?,?,?,?)').run(u.username,u.role,'SIGN_OUT',new Date().toISOString()); req.session.destroy(()=>res.json({ok:true})) })
app.get('/api/auth/me',(req,res)=>res.json(req.session.user || null))
app.get('/api/log',auth,(req,res)=>res.json(db.prepare('SELECT * FROM auth_log ORDER BY id DESC').all()))
app.get('/api/users',auth,(req,res)=>res.json(req.session.user.role==='Super Admin'?db.prepare('SELECT id,username,name,role FROM users').all():[]))
app.get('/api/admin-contacts',auth,(req,res)=>res.json(db.prepare('SELECT * FROM admin_contacts ORDER BY id').all()))
app.post('/api/admin-contacts',auth,superAdminOnly,(req,res)=>{ const { type, value } = req.body || {}; if (!type || !value) return res.status(400).json({ error:'Tipe dan nilai kontak wajib diisi.' }); const record = db.prepare('INSERT INTO admin_contacts (type,value) VALUES (?, ?)').run(type, value.trim()); res.status(201).json(db.prepare('SELECT * FROM admin_contacts WHERE id = ?').get(record.lastInsertRowid)) })
app.patch('/api/admin-contacts/:id',auth,superAdminOnly,(req,res)=>{ const { type, value } = req.body || {}; if (!type || !value) return res.status(400).json({ error:'Tipe dan nilai kontak wajib diisi.' }); const updated = db.prepare('UPDATE admin_contacts SET type = ?, value = ? WHERE id = ?').run(type, value.trim(), req.params.id); if (!updated.changes) return res.status(404).json({ error:'Kontak tidak ditemukan.' }); res.json({ ok: true, id: Number(req.params.id), type, value: value.trim() }) })
app.delete('/api/admin-contacts/:id',auth,superAdminOnly,(req,res)=>{ const deleted = db.prepare('DELETE FROM admin_contacts WHERE id = ?').run(req.params.id); if (!deleted.changes) return res.status(404).json({ error:'Kontak tidak ditemukan.' }); res.json({ ok: true }) })
app.get('/api/programs',auth,(req,res)=>res.json(db.prepare('SELECT * FROM programs').all()))
app.post('/api/programs',auth,write,(req,res)=>{const b=req.body; const info=db.prepare("INSERT INTO programs (kode,nama,bidang,target,realisasi,pagu,status,penanggung,deadline) VALUES (?,?,?,?,0,?,?,?,?)").run(b.kode || `PRG-${String(db.prepare('SELECT COUNT(*) c FROM programs').get().c+1).padStart(3,'0')}`,b.nama,b.bidang,b.target,b.pagu,'Berjalan',b.penanggung,b.deadline); res.json(db.prepare('SELECT * FROM programs WHERE id=?').get(info.lastInsertRowid))})
app.patch('/api/programs/:id',auth,write,(req,res)=>{const b=req.body; const old=db.prepare('SELECT * FROM programs WHERE id=?').get(req.params.id); if(!old)return res.sendStatus(404); const n={...old,...b}; db.prepare('UPDATE programs SET nama=?,bidang=?,target=?,realisasi=?,pagu=?,status=?,penanggung=?,deadline=? WHERE id=?').run(n.nama,n.bidang,n.target,n.realisasi,n.pagu,n.status,n.penanggung,n.deadline,n.id); res.json(n)})
app.delete('/api/programs/:id',auth,write,(req,res)=>{db.prepare('DELETE FROM programs WHERE id=?').run(req.params.id);res.json({ok:true})})
app.get('/api/docs',auth,(req,res)=>res.json(db.prepare('SELECT * FROM docs ORDER BY id DESC').all()))
app.post('/api/docs',auth,write,(req,res)=>{const b=req.body; const info=db.prepare('INSERT INTO docs(name,type,size,date,status,preview) VALUES (?,?,?,?,?,?)').run(b.name,b.type,b.size,b.date || new Date().toLocaleDateString('id-ID'), 'Menunggu verifikasi', b.preview || 'Dokumen baru sedang menunggu review dan verifikasi oleh admin SIPERAN.');res.json(db.prepare('SELECT * FROM docs WHERE id=?').get(info.lastInsertRowid))})
app.patch('/api/docs/:id',auth,write,(req,res)=>{const b=req.body; db.prepare('UPDATE docs SET status=?, preview=? WHERE id=?').run(b.status || 'Terverifikasi', b.preview || 'Dokumen sudah ditinjau dan siap ditindaklanjuti.', req.params.id);res.json({ok:true})})
app.get('/api/events',auth,(req,res)=>res.json(db.prepare('SELECT * FROM events').all()))
app.use(express.static(path.join(__dirname,'dist')))
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'dist','index.html')))
const port=process.env.PORT || 3000; app.listen(port,()=>console.log(`SIPERAN server running at http://localhost:${port}`))
