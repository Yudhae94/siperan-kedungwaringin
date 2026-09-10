// Adapter MySQL dengan API sinkron yang kompatibel dengan node:sqlite (DatabaseSync).
// Panggilan dieksekusi lewat worker thread + SharedArrayBuffer + Atomics.wait
// sehingga seluruh kode server yang memakai db.prepare().run/get/all dan db.exec
// tidak perlu diubah menjadi async.
import { Worker } from 'node:worker_threads'
import crypto from 'node:crypto'

const REQ_OFF = 1024
const RESP_OFF = 16 * 1024 * 1024
const RESP_MAX = 32 * 1024 * 1024
const SAB_SIZE = 48 * 1024 * 1024

export const mysqlConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'siperan',
  password: process.env.MYSQL_PASSWORD || 'siperan123',
  database: process.env.MYSQL_DATABASE || 'siperan'
}

export function openMysqlDb() {
  const sab = new SharedArrayBuffer(SAB_SIZE)
  const view = new Int32Array(sab)
  const u8 = new Uint8Array(sab)
  const worker = new Worker(new URL('./db-worker.js', import.meta.url), { workerData: { sab } })

  let seq = 0
  const call = (action, sql, params = []) => {
    seq += 1
    const reqStr = JSON.stringify({ seq, action, sql, params })
    const bytes = Buffer.byteLength(reqStr, 'utf8')
    if (bytes > RESP_OFF - 2048) throw new Error('Query terlalu besar.')
    Buffer.from(reqStr, 'utf8').copy(Buffer.from(u8.buffer, u8.byteOffset + REQ_OFF, bytes))
    Atomics.store(view, 2, bytes)
    Atomics.store(view, 0, seq)
    Atomics.notify(view, 0)
    Atomics.wait(view, 1, 0)
    const respLen = Atomics.load(view, 1)
    Atomics.store(view, 1, 0)
    const respStr = Buffer.from(u8.buffer, u8.byteOffset + RESP_OFF, respLen).toString('utf8')
    const resp = JSON.parse(respStr)
    if (resp.err) {
      const err = new Error(resp.err)
      if (resp.code) err.code = resp.code
      throw err
    }
    return resp.result
  }

  // Pastikan koneksi MySQL hidup sebelum dipakai.
  call('ping')

  const prepare = sql => ({
    run: (...params) => {
      const r = call('run', sql, params)
      return { changes: r.affectedRows, lastInsertRowid: r.insertId }
    },
    get: (...params) => {
      const rows = call('all', sql, params)
      return rows && rows.length ? rows[0] : undefined
    },
    all: (...params) => call('all', sql, params) || []
  })

  const db = {
    exec: sql => call('exec', sql),
    prepare,
    // Aksesor async untuk script migrasi/admin
    _worker: worker
  }
  return db
}

// Bootstrap khusus MySQL: sinkronisasi e_usulan_kegiatan via trigger (pengganti
// trigger SQLite yang tidak kompatibel) dan pembersihan evaluasi saat program dihapus.
export function bootstrapMysqlOnly(db) {
  db.exec(`/*MYSQL-TRIGGER*/ CREATE TRIGGER IF NOT EXISTS programs_to_e_usulan_insert AFTER INSERT ON programs
    FOR EACH ROW INSERT INTO e_usulan_kegiatan
      (id, kode, nama, bidang, target, realisasi, pagu, status, penanggung, deadline)
      VALUES (NEW.id, NEW.kode, NEW.nama, NEW.bidang, NEW.target, NEW.realisasi, NEW.pagu, NEW.status, NEW.penanggung, NEW.deadline)
      ON DUPLICATE KEY UPDATE kode=NEW.kode, nama=NEW.nama, bidang=NEW.bidang, target=NEW.target,
        realisasi=NEW.realisasi, pagu=NEW.pagu, status=NEW.status, penanggung=NEW.penanggung, deadline=NEW.deadline`)
  db.exec(`/*MYSQL-TRIGGER*/ CREATE TRIGGER IF NOT EXISTS programs_to_e_usulan_update AFTER UPDATE ON programs
    FOR EACH ROW INSERT INTO e_usulan_kegiatan
      (id, kode, nama, bidang, target, realisasi, pagu, status, penanggung, deadline)
      VALUES (NEW.id, NEW.kode, NEW.nama, NEW.bidang, NEW.target, NEW.realisasi, NEW.pagu, NEW.status, NEW.penanggung, NEW.deadline)
      ON DUPLICATE KEY UPDATE kode=NEW.kode, nama=NEW.nama, bidang=NEW.bidang, target=NEW.target,
        realisasi=NEW.realisasi, pagu=NEW.pagu, status=NEW.status, penanggung=NEW.penanggung, deadline=NEW.deadline`)
  db.exec(`/*MYSQL-TRIGGER*/ CREATE TRIGGER IF NOT EXISTS programs_to_e_usulan_delete AFTER DELETE ON programs
    FOR EACH ROW BEGIN
      DELETE FROM e_usulan_kegiatan WHERE id = OLD.id;
      DELETE FROM evaluation_entries WHERE program_id = OLD.id;
    END`)
}

// Util hash password dipindah ke sini agar bisa dipakai script migrasi.
export function hashPasswordStatic(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`
}