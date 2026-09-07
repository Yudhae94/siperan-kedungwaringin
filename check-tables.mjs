import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync('siperan.sqlite')
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name).join(', '))
console.log(db.prepare('SELECT id, username, role, status, bidang, substr(password,1,12) AS pw FROM users').all())
console.log('spj_pencairan cols:', db.prepare('PRAGMA table_info(spj_pencairan)').all().map(c => c.name).join(', '))
console.log('spj_riwayat cols:', db.prepare('PRAGMA table_info(spj_riwayat)').all().map(c => c.name).join(', '))
console.log('spj rows:', db.prepare('SELECT id, nama_kegiatan, status, progres_fisik, progres_keuangan FROM spj_pencairan').all())
