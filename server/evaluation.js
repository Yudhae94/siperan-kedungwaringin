// Monthly physical/output/outcome values are cumulative snapshots, never summed.
export function migrateEvaluation(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS evaluation_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    periode VARCHAR(32) NOT NULL CHECK(periode GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
    target_anggaran REAL NOT NULL CHECK(target_anggaran BETWEEN 0 AND 100),
    target_fisik REAL NOT NULL CHECK(target_fisik BETWEEN 0 AND 100),
    realisasi_fisik REAL NOT NULL CHECK(realisasi_fisik BETWEEN 0 AND 100),
    indikator_output TEXT NOT NULL, satuan_output TEXT NOT NULL,
    target_output REAL NOT NULL CHECK(target_output >= 0),
    realisasi_output REAL NOT NULL CHECK(realisasi_output >= 0),
    indikator_outcome TEXT NOT NULL, satuan_outcome TEXT NOT NULL,
    target_outcome REAL NOT NULL CHECK(target_outcome >= 0),
    realisasi_outcome REAL NOT NULL CHECK(realisasi_outcome >= 0),
    kendala TEXT NOT NULL DEFAULT '', tindak_lanjut TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(program_id, periode)
  );
  CREATE INDEX IF NOT EXISTS evaluation_period_idx ON evaluation_entries(periode, program_id);
  CREATE TABLE IF NOT EXISTS evaluation_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jenis VARCHAR(64) NOT NULL, periode VARCHAR(32) NOT NULL, bidang TEXT NOT NULL,
    snapshot TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS evaluation_archive_idx ON evaluation_reports(periode, jenis);
  CREATE TRIGGER IF NOT EXISTS evaluation_program_delete AFTER DELETE ON programs
    BEGIN DELETE FROM evaluation_entries WHERE program_id = OLD.id; END;`)
}

export const reportTypes = ['realisasi', 'deviasi', 'kinerja']
const fail = message => { const error = new Error(message); error.status = 400; throw error }
const ratio = (actual, target) => target > 0 ? Math.round(actual / target * 10000) / 100 : null
const round = value => Math.round(value * 100) / 100
export function reportPeriod(query) {
  const tahun = Number(query.tahun)
  const mode = query.mode || 'bulanan'
  const periode = Number(query.periode)
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100 || !['bulanan', 'triwulanan'].includes(mode) || !Number.isInteger(periode) || periode < 1 || periode > (mode === 'bulanan' ? 12 : 4)) fail('Tahun atau periode laporan tidak valid.')
  const first = mode === 'bulanan' ? periode : (periode - 1) * 3 + 1
  const last = mode === 'bulanan' ? periode : first + 2
  const start = `${tahun}-${String(first).padStart(2, '0')}-01`
  const end = `${tahun}-${String(last).padStart(2, '0')}-${new Date(Date.UTC(tahun, last, 0)).getUTCDate()}`
  return { tahun, mode, periode, start, end, label: mode === 'bulanan' ? start.slice(0, 7) : `${tahun}-TW${periode}` }
}

export function buildEvaluationReport(db, query) {
  const period = reportPeriod(query)
  const bidang = String(query.bidang || '')
  const programs = db.prepare('SELECT * FROM programs WHERE (? = \'\' OR bidang = ?) ORDER BY kode').all(bidang, bidang)
  const entries = db.prepare(`SELECT * FROM evaluation_entries WHERE periode BETWEEN ? AND ? ORDER BY periode DESC`).all(`${period.tahun}-01`, period.end.slice(0, 7))
  // Use completion history, not the editable document date or latest update date.
  const payments = db.prepare(`SELECT s.program_id, s.nilai_pencairan,
    (SELECT MAX(h.at) FROM spj_riwayat h WHERE h.spj_id=s.id AND h.status='Selesai Dicairkan') AS paid_at
    FROM spj_pencairan s WHERE s.status='Selesai Dicairkan'`).all()
  const rows = programs.map(p => {
    const entry = entries.find(e => e.program_id === p.id)
    const paid = payments.filter(s => s.program_id === p.id && s.paid_at && s.paid_at.slice(0, 10) >= `${period.tahun}-01-01` && s.paid_at.slice(0, 10) <= period.end)
    const cumulative = round(paid.reduce((n, s) => n + s.nilai_pencairan, 0))
    const current = round(paid.filter(s => s.paid_at.slice(0, 10) >= period.start).reduce((n, s) => n + s.nilai_pencairan, 0))
    const serapan = ratio(cumulative, p.pagu)
    const deviasi = entry ? round(entry.realisasi_fisik - entry.target_fisik) : null
    const fresh = entry?.periode === period.end.slice(0, 7)
    const overdue = p.deadline && p.deadline <= period.end && entry?.realisasi_fisik < 100
    const status = !fresh ? 'Belum dilaporkan' : deviasi < 0 || overdue || entry.kendala.trim() ? 'Terhambat' : 'Tepat waktu'
    return { program_id: p.id, kode: p.kode, nama: p.nama, bidang: p.bidang, penanggung: p.penanggung, deadline: p.deadline,
      pagu: p.pagu, realisasi_periode: current, realisasi_kumulatif: cumulative, sisa: round(p.pagu - cumulative), serapan,
      entry: entry || null, deviasi, deviasi_anggaran: entry && serapan !== null ? round(serapan - entry.target_anggaran) : null,
      status, capaian_output: entry ? ratio(entry.realisasi_output, entry.target_output) : null,
      capaian_outcome: entry ? ratio(entry.realisasi_outcome, entry.target_outcome) : null }
  })
  const totals = rows.reduce((t, r) => ({ pagu: t.pagu + r.pagu, periode: t.periode + r.realisasi_periode, kumulatif: t.kumulatif + r.realisasi_kumulatif }), { pagu: 0, periode: 0, kumulatif: 0 })
  return { period, bidang, rows, totals: { ...totals, serapan: ratio(totals.kumulatif, totals.pagu), sisa: totals.pagu - totals.kumulatif },
    warnings: { spj_tanpa_kegiatan: payments.filter(s => !programs.some(p => p.id === s.program_id)).length, spj_tanpa_tanggal_cair: payments.filter(s => !s.paid_at).length }, generated_at: new Date().toISOString() }
}

export function saveEvaluationEntry(db, body, user) {
  const program = db.prepare('SELECT id FROM programs WHERE id=?').get(Number(body.program_id) || 0)
  if (!program) fail('Kegiatan tidak ditemukan.')
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(body.periode || '')) fail('Periode evaluasi harus YYYY-MM.')
  const numeric = ['target_anggaran', 'target_fisik', 'realisasi_fisik', 'target_output', 'realisasi_output', 'target_outcome', 'realisasi_outcome']
  const values = {}
  for (const key of numeric) {
    if (body[key] === '' || body[key] == null || !['number', 'string'].includes(typeof body[key])) fail(`${key} wajib diisi.`)
    const n = Number(body[key])
    if (!Number.isFinite(n) || n < 0 || n > (key.includes('fisik') || key === 'target_anggaran' ? 100 : 1e15)) fail(`Nilai ${key} tidak valid.`)
    values[key] = n
  }
  const texts = ['indikator_output', 'satuan_output', 'indikator_outcome', 'satuan_outcome', 'kendala', 'tindak_lanjut']
  for (const key of texts) {
    values[key] = String(body[key] || '').trim()
    if (values[key].length > 2000 || (!values[key] && !['kendala', 'tindak_lanjut'].includes(key))) fail(`${key} wajib diisi (maksimal 2000 karakter).`)
  }
  if (values.realisasi_fisik < values.target_fisik && !values.kendala) fail('Alasan kendala wajib diisi untuk realisasi di bawah target.')
  if (values.kendala && !values.tindak_lanjut) fail('Tindak lanjut wajib diisi jika ada kendala.')
  const fields = [...numeric, ...texts, 'updated_by', 'updated_at']
  db.prepare(`INSERT INTO evaluation_entries (program_id,periode,${fields.join(',')}) VALUES (${Array(fields.length + 2).fill('?').join(',')}) AS new_row
    ON DUPLICATE KEY UPDATE ${fields.map(f => `${f}=new_row.${f}`).join(',')}`)
    .run(program.id, body.periode, ...numeric.map(f => values[f]), ...texts.map(f => values[f]), user, new Date().toISOString())
  return db.prepare('SELECT * FROM evaluation_entries WHERE program_id=? AND periode=?').get(program.id, body.periode)
}

export function registerEvaluation(app, db, auth, write) {
  migrateEvaluation(db)
  const route = handler => (req, res, next) => {
    try { handler(req, res) } catch (error) { if (error.status === 400) res.status(400).json({ error: error.message }); else next(error) }
  }
  app.get('/api/evaluation/report', auth, route((req, res) => res.json(buildEvaluationReport(db, req.query))))
  app.get('/api/evaluation/entries', auth, route((req, res) => res.json(db.prepare('SELECT * FROM evaluation_entries ORDER BY periode DESC, program_id').all())))
  app.put('/api/evaluation/entries', auth, write, route((req, res) => res.json(saveEvaluationEntry(db, req.body || {}, req.session.user.name))))
  app.get('/api/evaluation/archives', auth, route((_req, res) => res.json(db.prepare('SELECT id,jenis,periode,bidang,created_by,created_at FROM evaluation_reports ORDER BY id DESC LIMIT 100').all())))
  app.get('/api/evaluation/archives/:id', auth, route((req, res) => {
    const row = db.prepare('SELECT * FROM evaluation_reports WHERE id=?').get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Arsip tidak ditemukan.' })
    res.json({ ...row, snapshot: JSON.parse(row.snapshot) })
  }))
  app.delete('/api/evaluation/archives/:id', auth, write, route((req, res) => {
    const result = db.prepare('DELETE FROM evaluation_reports WHERE id=?').run(req.params.id)
    if (!result.changes) return res.status(404).json({ error: 'Arsip tidak ditemukan.' })
    res.json({ ok: true })
  }))
  app.post('/api/evaluation/archives', auth, write, route((req, res) => {
    const b = req.body || {}
    if (!reportTypes.includes(b.jenis)) fail('Jenis laporan tidak valid.')
    const snapshot = buildEvaluationReport(db, b)
    const result = db.prepare('INSERT INTO evaluation_reports (jenis,periode,bidang,snapshot,created_by,created_at) VALUES (?,?,?,?,?,?)')
      .run(b.jenis, snapshot.period.label, snapshot.bidang, JSON.stringify(snapshot), req.session.user.name, new Date().toISOString())
    res.status(201).json({ id: Number(result.lastInsertRowid) })
  }))
}
