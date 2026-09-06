import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync('siperan.sqlite')
db.exec('PRAGMA journal_mode = WAL')
db.prepare("DELETE FROM programs WHERE nama = 'Uji Coba Simpan QA'").run()
db.prepare("DELETE FROM e_usulan_kegiatan WHERE nama = 'Uji Coba Simpan QA'").run()
db.prepare("DELETE FROM usulan_rka WHERE judul = 'Tes Usulan Otomatis'").run()
db.prepare("DELETE FROM rka_rows WHERE uraian = 'Belanja Jilid QA'").run()
console.log('programs:', db.prepare('SELECT COUNT(*) c FROM programs').get().c)
console.log('usulan:', db.prepare('SELECT COUNT(*) c FROM usulan_rka').get().c)
