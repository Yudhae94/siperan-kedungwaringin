// Migrasi data dari siperan.sqlite ke MySQL.
// Jalankan sekali: node scripts/migrate-sqlite-to-mysql.mjs
// Idempotent — tabel MySQL dikosongkan dulu sebelum disalin ulang.
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import mysql from 'mysql2/promise'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlitePath = process.env.SIPERAN_DB || path.join(__dirname, '..', 'siperan.sqlite')

if (!fs.existsSync(sqlitePath)) {
  console.log('Tidak ada file siperan.sqlite — tidak ada data lama untuk dimigrasikan.')
  process.exit(0)
}

const sqlite = new DatabaseSync(sqlitePath)
const mysqlConn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'siperan',
  password: process.env.MYSQL_PASSWORD || 'siperan123',
  database: process.env.MYSQL_DATABASE || 'siperan',
  multipleStatements: true
})

await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 0')

const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
console.log('Tabel SQLite:', tables.join(', '))

let copied = 0
for (const table of tables) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all()
  // Buat tabel MySQL lewat DDL terjemahan dari db-worker? Skema dibuat otomatis oleh server.js.
  // Script ini hanya menyalin data, jadi tabel harus sudah ada (server pernah dijalankan).
  const [exists] = await mysqlConn.query('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [table])
  if (!exists.length) {
    console.log(`- ${table}: tabel belum ada di MySQL (server belum pernah dijalankan) — lewati.`)
    continue
  }
  await mysqlConn.query(`DELETE FROM \`${table}\``)
  if (!rows.length) { console.log(`- ${table}: kosong.`); continue }
  const placeholders = `(${cols.map(() => '?').join(',')})`
  const colList = cols.map(c => `\`${c}\``).join(',')
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const values = chunk.map(row => cols.map(c => {
      const v = row[c]
      return v === undefined ? null : v
    }))
    const sql = `INSERT IGNORE INTO \`${table}\` (${colList}) VALUES ${chunk.map(() => placeholders).join(',')}`
    const flat = values.flat()
    await mysqlConn.query(sql, flat)
  }
  copied += rows.length
  console.log(`- ${table}: ${rows.length} baris disalin.`)
  // Perbaiki AUTO_INCREMENT agar id berikutnya tidak bentrok
  const hasAuto = cols.includes('id')
  if (hasAuto && rows.length) {
    const maxId = Math.max(...rows.map(r => Number(r.id) || 0))
    if (maxId > 0) await mysqlConn.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${maxId + 1}`)
  }
}

await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1')

// Password user seed mungkin masih plaintext/scrypt lama — verifikasi format scrypt modern.
const [userRows] = await mysqlConn.query('SELECT id, username, password FROM users')
const ensureHash = password => {
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`
}
const defaults = { user: 'user123', admin: 'admin123', superadmin: 'superadmin123' }
for (const u of userRows) {
  if (!u.password.startsWith('scrypt:')) {
    const pass = defaults[u.username] || u.password
    await mysqlConn.query('UPDATE users SET password = ? WHERE id = ?', [ensureHash(pass), u.id])
    console.log(`- users/${u.username}: password di-hash ulang (scrypt).`)
  }
}

await mysqlConn.end()
sqlite.close()
console.log(`Migrasi selesai. Total ${copied} baris disalin ke MySQL.`)