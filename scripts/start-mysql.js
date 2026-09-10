// Memastikan MySQL berjalan sebelum `npm run dev`. Cek port 3306;
// jika belum hidup, jalankan mysqld portable dan tunggu sampai siap.
import net from 'node:net'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'

const HOST = process.env.MYSQL_HOST || '127.0.0.1'
const PORT = Number(process.env.MYSQL_PORT || 3306)

const installations = [
  [process.env.MYSQLD_PATH, process.env.MYSQL_INI_PATH],
  [`${os.homedir()}\\mysql9\\mysql-9.1.0-winx64\\bin\\mysqld.exe`, `${os.homedir()}\\mysql9\\my.ini`],
  ['C:\\xampp\\mysql\\bin\\mysqld.exe', 'C:\\xampp\\mysql\\bin\\my.ini'],
  ['C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe', 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\my.ini']
].filter(([mysqld, ini]) => mysqld && ini)

const installation = installations.find(([mysqld, ini]) => fs.existsSync(mysqld) && fs.existsSync(ini))

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
if (!installation) {
  console.error('MySQL tidak ditemukan. Set MYSQLD_PATH dan MYSQL_INI_PATH, atau pasang MySQL/MariaDB terlebih dahulu.')
  process.exit(1)
}

const [mysqld, ini] = installation
const child = spawn(mysqld, [`--defaults-file=${ini}`, '--console'], { stdio: 'ignore', detached: true })
child.on('error', error => {
  console.error(`MySQL gagal dijalankan: ${error.message}`)
  process.exit(1)
})
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
