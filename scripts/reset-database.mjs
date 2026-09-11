// Reset database SIPERAN ke kondisi awal demo (data seed bawaan).
// Cara pakai:
//   Lokal: npm run db:reset   (otomatis restart server agar seed terisi ulang)
// Efek: SEMUA data transaksi dihapus (SPJ, DPA, usulan RKA, evaluasi, klinik, log,
// dokumen, event, laporan, kartu kendali), lalu server di-restart agar fungsi
// seed() di server.js mengisi ulang data demo bawaan.
// Akun demo setelah reset: user/user123, admin/admin123, superadmin/superadmin123.
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

const [tables] = await conn.query(
  "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name NOT IN ('sys_config')"
)
const names = tables.map(r => r.t)
console.log('Tabel terdeteksi:', names.join(', ') || '(kosong)')

await conn.query('SET FOREIGN_KEY_CHECKS = 0')
// Urutan hapus: tabel anak dulu agar aman walau FK check dimatikan sementara.
const ordered = [
  'spj_riwayat', 'spj_pencairan',
  'usulan_rka_verifikasi', 'usulan_rka_dokumen', 'usulan_rka',
  'dpa_forms', 'kartu_kendali',
  'evaluation_reports', 'evaluation_entries',
  'clinic_messages', 'clinic_threads', 'clinic_consultations', 'clinic_templates',
  'doc_reviews', 'docs',
  'rka_rows', 'rka_forms',
  'monthly_reports', 'events', 'auth_log', 'login_attempts',
  'admin_contacts', 'section_approvals',
  'e_usulan_kegiatan', 'programs', 'users',
]
for (const t of ordered) {
  if (!names.includes(t)) continue
  await conn.query(`DELETE FROM \`${t}\``)
  try { await conn.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`) } catch { /* abaikan */ }
  console.log(`- ${t}: dikosongkan`)
}
// Tabel lain yang belum dikenal ikut dikosongkan agar benar-benar bersih.
for (const t of names) {
  if (ordered.includes(t)) continue
  await conn.query(`DELETE FROM \`${t}\``)
  console.log(`- ${t}: dikosongkan (tambahan)`)
}
await conn.query('SET FOREIGN_KEY_CHECKS = 1')
await conn.end()

console.log('\nReset selesai. Me-restart server agar data demo terisi ulang...')

// Restart server otomatis agar seed() berjalan (tanpa ini tabel users kosong
// karena server lama memegang koneksi sebelum reset).
const restart = spawn('cmd.exe', ['/c', 'cloudflare\\restart-backend.bat'], { stdio: 'inherit', shell: false })
await new Promise(resolve => restart.on('close', resolve))
console.log('Selesai. Akun demo: user/user123 (User), admin/admin123 (Admin), superadmin/superadmin123 (Super Admin).')
