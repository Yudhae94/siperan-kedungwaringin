// Kosongkan daftar E-Usulan Kegiatan (programs + cermin e_usulan_kegiatan)
// beserta seluruh data turunannya, tanpa menyentuh akun maupun kode.
// Cara pakai: node scripts/clear-eusulan.mjs
// (otomatis restart server + verifikasi smoke test seperti db:reset).
import mysql from 'mysql2/promise'
import { spawn } from 'node:child_process'

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'siperan',
  password: process.env.MYSQL_PASSWORD || 'siperan123',
  database: process.env.MYSQL_DATABASE || 'siperan',
  multipleStatements: true,
})

// Urutan penting: anak dulu, induk (programs) terakhir.
const ordered = [
  'spj_riwayat', 'spj_pencairan',
  'usulan_rka_verifikasi', 'usulan_rka_dokumen', 'usulan_rka',
  'dpa_forms', 'kartu_kendali',
  'evaluation_reports', 'evaluation_entries',
  'rka_rows', 'rka_forms',
  'e_usulan_kegiatan', 'programs',
]
await conn.query('SET FOREIGN_KEY_CHECKS = 0')
for (const t of ordered) {
  try {
    await conn.query(`DELETE FROM \`${t}\``)
    try { await conn.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`) } catch { /* abaikan */ }
    console.log(`- ${t}: dikosongkan`)
  } catch (error) {
    console.log(`- ${t}: dilewati (${error.code || error.message})`)
  }
}
await conn.query('SET FOREIGN_KEY_CHECKS = 1')
await conn.end()

console.log('\nE-Usulan dikosongkan. Me-restart server untuk verifikasi...')
const restart = spawn('cmd.exe', ['/c', 'cloudflare\\restart-backend.bat'], { stdio: 'inherit', shell: false })
await new Promise(resolve => restart.on('close', resolve))

// Kunci agar seed() tidak mengisi ulang 4 program demo setelah restart:
// server hanya seed jika tabel programs kosong, jadi sisakan 1 baris penanda
// berkode __EMPTY__ yang disembunyikan dari API (lihat filter di server.js).
const lock = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'siperan',
  password: process.env.MYSQL_PASSWORD || 'siperan123',
  database: process.env.MYSQL_DATABASE || 'siperan',
  multipleStatements: true,
})
await lock.query('SET FOREIGN_KEY_CHECKS = 0')
await lock.query('DELETE FROM `e_usulan_kegiatan`')
await lock.query(
  `INSERT INTO programs (kode, nama, bidang, target, realisasi, pagu, status, penanggung, deadline)
   VALUES ('__EMPTY__','Daftar dikosongkan untuk demo','-',0,0,0,'Arsip','-','2026-12-31')
   ON DUPLICATE KEY UPDATE nama = VALUES(nama)`
)
await lock.end()
console.log('Selesai. Daftar E-Usulan Kegiatan kini kosong (0 usulan terdaftar).')
