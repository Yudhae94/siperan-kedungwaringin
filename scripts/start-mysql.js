// Memastikan MySQL berjalan sebelum `npm run dev`. Cek port 3306;
// jika belum hidup, jalankan mysqld portable dan tunggu sampai siap.
import net from 'node:net'
import { spawn } from 'node:child_process'

const MYSQLD = process.env.MYSQLD_PATH || 'C:\\Users\\Yudhaeka12\\mysql9\\mysql-9.1.0-winx64\\bin\\mysqld.exe'
const MY_INI = process.env.MYSQL_INI_PATH || 'C:\\Users\\Yudhaeka12\\mysql9\\my.ini'
const HOST = process.env.MYSQL_HOST || '127.0.0.1'
const PORT = Number(process.env.MYSQL_PORT || 3306)

const isUp = () => new Promise(resolve => {
  const s = net.connect({ host: HOST, port: PORT, timeout: 1500 })
  s.on('connect', () => { s.destroy(); resolve(true) })
  s.on('error', () => resolve(false))
  s.on('timeout', () => { s.destroy(); resolve(false) })
})

if (await isUp()) {
  console.log(`MySQL sudah berjalan di ${HOST}:${PORT}`)
  process.exit(0)
}

console.log('Menjalankan MySQL...')
const child = spawn(MYSQLD, [`--defaults-file=${MY_INI}`, '--console'], { stdio: 'ignore', detached: true })
child.unref()

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 2000))
  if (await isUp()) {
    console.log(`MySQL siap di ${HOST}:${PORT} (database: siperan, user: siperan).`)
    process.exit(0)
  }
}
console.error(`MySQL gagal start dalam 60 detik. Cek log di folder datadir.`)
process.exit(1)
