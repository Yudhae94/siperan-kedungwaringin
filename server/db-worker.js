// Worker thread untuk server/db.js — menjalankan query MySQL via mysql2
// dan menulis hasilnya ke SharedArrayBuffer agar thread utama bisa
// memanggil secara sinkron (meniru API node:sqlite DatabaseSync).
import { parentPort, workerData } from 'node:worker_threads'
import mysql from 'mysql2/promise'

const { sab } = workerData
const u8 = new Uint8Array(sab)
const view = new Int32Array(sab)
const REQ_OFF = 1024          // area request (mulai offset 1024)
const RESP_OFF = 16 * 1024 * 1024 // area respons (16MB..48MB)
const RESP_MAX = 32 * 1024 * 1024

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'siperan',
  password: process.env.MYSQL_PASSWORD || 'siperan123',
  database: process.env.MYSQL_DATABASE || 'siperan',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  multipleStatements: false,
  flags: '+FOUND_ROWS'
}
const pool = mysql.createPool(cfg)

// ===== Terjemahan dialek SQLite -> MySQL =====
function translate(sql) {
  let s = sql
  if (/^\s*PRAGMA\b/i.test(s)) return null
  s = s.replace(/\bINSERT\s+OR\s+IGNORE\b/gi, 'INSERT IGNORE')
  s = s.replace(/\bINSERT\s+OR\s+REPLACE\b/gi, 'REPLACE')
  s = s.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'INT PRIMARY KEY AUTO_INCREMENT')
  // Di SQLite, INTEGER PRIMARY KEY apa pun adalah alias rowid (auto). MySQL perlu AUTO_INCREMENT eksplisit.
  s = s.replace(/INTEGER\s+PRIMARY\s+KEY\b/gi, 'INT PRIMARY KEY AUTO_INCREMENT')
  // CHECK (... GLOB ...) tidak didukung MySQL -> buang (validasi ada di aplikasi)
  s = s.replace(/CHECK\s*\([^()]*GLOB[^()]*\)/gi, '')
  // Kolom bertanda UNIQUE/DEFAULT/PRIMARY tidak boleh bertipe TEXT di MySQL
  s = s.replace(/(\b\w+)\s+TEXT\s+NOT\s+NULL\s+UNIQUE\b/gi, '$1 VARCHAR(255) NOT NULL UNIQUE')
  s = s.replace(/(\b\w+)\s+TEXT\s+UNIQUE\s+NOT\s+NULL\b/gi, '$1 VARCHAR(255) NOT NULL UNIQUE')
  s = s.replace(/(\b\w+)\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'([^']*)'/gi, "$1 VARCHAR(255) NOT NULL DEFAULT '$2'")
  s = s.replace(/(\b\w+)\s+TEXT\s+DEFAULT\s+'([^']*)'/gi, "$1 VARCHAR(255) DEFAULT '$2'")
  s = s.replace(/(\b\w+)\s+TEXT\s+UNIQUE\b/gi, '$1 VARCHAR(255) UNIQUE')
  return s
}

// Pecah multi-statement SQL dengan menghormati string/komentar/blok BEGIN..END
function splitStatements(sql) {
  const out = []
  let cur = ''
  let inS = null
  let depth = 0
  const isWord = c => /[A-Za-z_]/.test(c)
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (inS) {
      cur += ch
      if (ch === inS) {
        if (sql[i + 1] === inS) { cur += sql[++i] } else inS = null
      }
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') { inS = ch; cur += ch; continue }
    if (ch === '-' && sql[i + 1] === '-') { while (i < sql.length && sql[i] !== '\n') i++; cur += '\n'; continue }
    if (ch === '/' && sql[i + 1] === '*') { i += 2; while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++; i++; continue }
    if (isWord(ch)) {
      let j = i
      while (j < sql.length && isWord(sql[j])) j++
      const word = sql.slice(i, j).toUpperCase()
      if (word === 'BEGIN') depth += 1
      else if (word === 'END' && depth > 0) depth -= 1
      cur += sql.slice(i, j)
      i = j - 1
      continue
    }
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map(s => s.trim()).filter(Boolean)
}

const exec = async sql => {
  for (const raw of splitStatements(String(sql))) {
    // Trigger dari bootstrap MySQL ditandai komentar khusus; trigger dialek SQLite dilewati.
    const isMysqlTrigger = raw.includes('/*MYSQL-TRIGGER*/')
    if (/CREATE\s+TRIGGER/i.test(raw) && !isMysqlTrigger) continue
    const translated = translate(raw)
    if (translated == null) continue
    const hadIfNotExistsIndex = /CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/i.test(translated)
    const hadIfNotExistsTrigger = /CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS/i.test(translated)
    let s = translated.replace(/CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS/gi, 'CREATE TRIGGER')
    s = s.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/gi, (m, u) => `CREATE ${u || ''}INDEX`)
    try {
      await pool.query(s)
    } catch (error) {
      const code = error.code || error.errno
      if (hadIfNotExistsIndex && (code === 1061 || code === 'ER_DUP_KEYNAME' || code === 'ER_BLOB_KEY_WITHOUT_LENGTH')) continue
      if (hadIfNotExistsTrigger && (code === 1359 || code === 'ER_TRG_ALREADY_EXISTS')) continue
      error.message = `[exec] ${error.message} | SQL: ${s.slice(0, 200)}`
      throw error
    }
  }
  return { ok: true }
}

const runQuery = async (sql, params) => {
  const [result] = await pool.execute(sql, params)
  if (Array.isArray(result)) {
    const first = result[0] || {}
    return { insertId: Number(first.insertId || 0), affectedRows: Number(first.affectedRows || 0) }
  }
  return { insertId: Number(result.insertId || 0), affectedRows: Number(result.affectedRows || 0) }
}

const allQuery = async (sql, params) => {
  const [rows] = await pool.execute(sql, params)
  return rows
}

const send = payload => {
  const str = JSON.stringify(payload)
  const bytes = Buffer.byteLength(str, 'utf8')
  if (bytes > RESP_MAX) throw new Error('Respons query terlalu besar untuk buffer sinkron.')
  Buffer.from(str, 'utf8').copy(new Buffer(u8.buffer, u8.byteOffset + RESP_OFF, RESP_MAX))
  Atomics.store(view, 1, bytes)
  Atomics.notify(view, 1)
}

parentPort.on('message', () => {}) // jaga referensi parentPort

let lastSeq = 0
const loop = async () => {
  for (;;) {
    Atomics.wait(view, 0, lastSeq)
    const seq = Atomics.load(view, 0)
    if (seq === lastSeq) continue
    lastSeq = seq
    const len = Atomics.load(view, 2)
    const reqStr = Buffer.from(u8.buffer, u8.byteOffset + REQ_OFF, len).toString('utf8')
    let payload
    try {
      const req = JSON.parse(reqStr)
      if (req.action === 'ping') {
        const [row] = await pool.query('SELECT 1 AS ok')
        payload = { result: row }
      } else if (req.action === 'exec') {
        payload = { result: await exec(req.sql) }
      } else if (req.action === 'run') {
        payload = { result: await runQuery(req.sql, req.params) }
      } else if (req.action === 'all') {
        payload = { result: await allQuery(req.sql, req.params) }
      } else {
        payload = { err: `Aksi tidak dikenal: ${req.action}` }
      }
    } catch (error) {
      payload = { err: String(error.message || error), code: error.code || null }
    }
    try { send(payload) } catch (e) { send({ err: String(e.message || e) }) }
  }
}
loop()