// Reset database SIPERAN ke kondisi awal demo (data seed bawaan).
// Cara pakai:
//   Lokal   : node scripts/reset-database.mjs
//   Produksi: SIPERAN_RESET_CONFIRM=RESET-DEMO node scripts/reset-database.mjs
// Efek: SEMUA data transaksi dihapus (SPJ, DPA, usulan RKA, evaluasi, klinik, log,
// dokumen, event, laporan, kartu kendali, LKA cache), lalu server akan mengisi
// ulang data seed bawaan saat berikutnya dijalankan (fungsi seed() di server.js).
// Akun demo setelah reset: user/user123, admin/admin123, superadmin/superadmin123.
import mysql from 'mysql2/promise'

const CONFIRM = process.env.SIPERAN_RESET_CONFIRM
if (process.env.NODE_ENV === 'production' && CONFIRM !== 'RESET-DEMO') {
  console.error("Batal: set SIPERAN_RESET_CONFIRM=RESET-DEMO untuk reset di server produksi.")
  process.exit(1)
}

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

console.log('\nReset selesai. Restart server (node server.js / run-server.bat) untuk mengisi data demo awal.')
console.log('Akun demo: user/user123 (User), admin/admin123 (Admin), superadmin/superadmin123 (Super Admin).')
