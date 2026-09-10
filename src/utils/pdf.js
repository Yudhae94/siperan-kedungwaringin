import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// =====================================================================
// Fungsi lama yang tetap dipertahankan apa adanya, supaya import lain
// di project (mis. tombol "unduh template kosong") tidak rusak.
// =====================================================================

// ===== PDF sederhana dari array of lines =====
export function makePdfDownload (name, lines) {
  const esc = value => String(value).replace(/[\\()]/g, '\\$&')
  const content = `BT /F1 12 Tf 50 760 Td ${lines.map(line => `(${esc(line)}) Tj 0 -18 Td`).join('')} ET`
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
  let pdf = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name.replace(/\.[^.]+$/, '')}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ===== Template RKA kosong (untuk unduhan) =====
export function makeRkaTemplatePdf () {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const left = 20
  const right = pageWidth - 20
  const widths = [32, 102, 28, 28, 28, 20, 39]
  const headers = ['Kode Rekening', 'Uraian', 'Koefisien', 'Satuan', 'Harga', 'PPN', 'Jumlah']
  const rows = [
    ['5', 'BELANJA DAERAH', '', '', '', '', 'Rp.'],
    ['5.1', 'BELANJA OPERASI', '', '', '', '', 'Rp.'],
    ['5.1.02', 'Belanja Barang dan Jasa', '', '', '', '', 'Rp.'],
    ['5.1.02.01', 'Belanja Barang', '', '', '', '', 'Rp.'],
    ['5.1.02.01.01', 'Belanja Barang Pakai Habis', '', '', '', '', 'Rp.'],
    ['5.1.02.01.01.0026', 'Belanja Alat/Bahan untuk Kegiatan Kantor - Bahan Cetak', '', '', '', '', 'Rp.'],
    ['[#]', 'Belanja Jilid\nSumber Dana: PENDAPATAN ASLI DAERAH (PAD)', '1', 'Buku', '', '', 'Rp.'],
    ['[#]', 'Belanja Penggandaan\nSumber Dana: PENDAPATAN ASLI DAERAH (PAD)', '1', 'Lembar', '', '', 'Rp.'],
    ['5.1.02.01.0052', 'Belanja Makanan dan Minuman Rapat', '', '', '', '', 'Rp.'],
    ['[#]', 'Belanja Makan dan Minum Rapat Evaluasi Kinerja PPA & SAPA', '1', 'Orang / Kali', '', '', 'Rp.'],
  ]
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('RENCANA KERJA DAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH', pageWidth / 2, 13, { align: 'center' })
  pdf.text('MANUAL', pageWidth / 2, 19, { align: 'center' })
  pdf.text('Formulir', right - 55, 13, { align: 'center' })
  pdf.text('RKA MANUAL - RINCIAN BELANJA SKPD', right - 55, 19, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('Pemerintah Kabupaten Bekasi Tahun Anggaran 2025', pageWidth / 2, 28, { align: 'center' })
  pdf.text('Rincian Anggaran Belanja Kegiatan', pageWidth / 2, 40, { align: 'center' })
  pdf.text('Satuan Kerja Perangkat Daerah', pageWidth / 2, 46, { align: 'center' })

  let y = 54
  const drawRow = (cells, height, bold = false) => {
    let x = left
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(8)
    cells.forEach((cell, index) => {
      pdf.rect(x, y, widths[index], height)
      const lines = String(cell).split('\n')
      lines.forEach((line, lineIndex) => pdf.text(line, x + 2, y + 5 + lineIndex * 4))
      x += widths[index]
    })
    y += height
  }
  drawRow(headers, 9, true)
  rows.forEach(row => drawRow(row, row[1].includes('\n') ? 13 : 9, row[0].length < 8 && !row[0].includes('#')))
  drawRow(['', '', '', '', '', 'Jumlah Anggaran Sub Kegiatan', 'Rp.'], 10, true)
  pdf.save('Template-RKA-Manual-Kedungwaringin.pdf')
}

// =====================================================================
// Helper angka (dipertahankan dari kode sebelumnya)
// =====================================================================
export const parseNumber = value => {
  if (value === null || value === undefined) return 0
  const s = String(value).trim()
  if (!s) return 0
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''))
  return parseFloat(s.replace(/\./g, '').replace(/,/g, '.')) || 0
}

export const formatRupiah = value => 'Rp. ' + new Intl.NumberFormat('id-ID').format(Math.round(parseNumber(value) || 0)) + ',00'

export const hitungJumlah = row => {
  const koef = parseNumber(row.koefisien)
  const harga = parseNumber(row.harga)
  const ppn = parseNumber(row.ppn)
  let jumlah = koef * harga
  if (ppn > 0 && ppn < 100) jumlah += jumlah * (ppn / 100)
  return jumlah
}

// Baris akun/header (kode rekening, [ # ] sumber dana, [ - ] sub-uraian)
// vs baris rincian (punya koefisien & harga) — dipertahankan dari kode sebelumnya.
export const isAccountRow = row => !parseNumber(row.koefisien) && !parseNumber(row.harga)

// =====================================================================
// Konstanta tampilan — hitam-putih polos, tanpa warna, sesuai contoh cetak SIPD
// =====================================================================
const BORDER = [0, 0, 0]
const PLAIN_STYLES = {
  lineColor: BORDER,
  lineWidth: 0.1,
  textColor: [0, 0, 0],
  fillColor: false // tidak ada isian warna sama sekali
}

const dash = v => (v === undefined || v === null || v === '' ? '-' : v)

// =====================================================================
// Blok header atas: judul form + kotak "Formulir" + baris pemerintahan
// =====================================================================
function drawTopHeader (doc, { pemerintah, tahun, formulirKode, formulirNama }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 10
  const right = pageWidth - 10
  const boxRight = right - 130 // lebar kotak "Formulir" di kanan ~130pt
  const top = 10
  const h1 = 40 // tinggi baris judul
  const h2 = 18 // tinggi baris "Pemerintahan ... Tahun Anggaran ..."

  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.4)

  // Kotak judul kiri
  doc.rect(left, top, boxRight - left, h1)
  // Kotak "Formulir" kanan
  doc.rect(boxRight, top, right - boxRight, h1)
  // Baris pemerintahan (full width)
  doc.rect(left, top + h1, right - left, h2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('RENCANA KERJA DAN ANGGARAN', (left + boxRight) / 2, top + 18, { align: 'center' })
  doc.text('SATUAN KERJA PERANGKAT DAERAH', (left + boxRight) / 2, top + 32, { align: 'center' })

  doc.setFontSize(9)
  doc.text('Formulir', (boxRight + right) / 2, top + 14, { align: 'center' })
  doc.text(formulirKode || 'RKA-BELANJA', (boxRight + right) / 2, top + 24, { align: 'center' })
  doc.text('SKPD', (boxRight + right) / 2, top + 34, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${pemerintah || ''} Tahun Anggaran ${tahun || ''}`, pageWidth / 2, top + h1 + 12, { align: 'center' })

  return top + h1 + h2 + 8 // Y berikutnya
}

// =====================================================================
// Tabel label : value polos (dipakai untuk blok "Rincian ... Program, Kegiatan
// dan Sub Kegiatan" dan blok "Rincian Anggaran Belanja Kegiatan" info)
// =====================================================================
function drawLabelValueTable (doc, startY, title, entries) {
  const body = entries.map(([label, value]) => [label, `: ${dash(value)}`])
  autoTable(doc, {
    startY,
    head: [[{ content: title, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } }]],
    body,
    theme: 'grid',
    margin: { left: 10, right: 10 },
    styles: { ...PLAIN_STYLES, fontSize: 9, cellPadding: 2.2, valign: 'middle' },
    headStyles: { ...PLAIN_STYLES, fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 'auto' }
    }
  })
  return doc.lastAutoTable.finalY
}

// =====================================================================
// Tabel "Indikator dan Tolak Ukur Kinerja Kegiatan"
// =====================================================================
function drawIndikatorTable (doc, startY, indikatorRows) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const bodyW = pageWidth - 20
  autoTable(doc, {
    startY,
    head: [
      [{ content: 'Indikator dan Tolak Ukur Kinerja Kegiatan', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } }],
      [
        { content: 'Indikator', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Tolok Ukur Kinerja', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Target Kinerja', styles: { halign: 'center', fontStyle: 'bold' } }
      ]
    ],
    body: indikatorRows.map(r => [dash(r.indikator), dash(r.tolokUkur), dash(r.target)]),
    theme: 'grid',
    margin: { left: 10, right: 10 },
    styles: { ...PLAIN_STYLES, fontSize: 9, cellPadding: 2.2, valign: 'middle' },
    headStyles: { ...PLAIN_STYLES, fontSize: 9 },
    columnStyles: {
      0: { cellWidth: bodyW * 0.16 },
      1: { cellWidth: bodyW * 0.64 },
      2: { cellWidth: 'auto' }
    }
  })
  return doc.lastAutoTable.finalY
}

// =====================================================================
// Tabel utama "Rincian Anggaran Belanja Kegiatan" — Kode Rekening / Uraian /
// Rinci Perhitungan (Koefisien, Satuan, Harga, PPN) / Jumlah.
// Baris akun ("[ # ]", "[ - ]", kode rekening) menggabungkan (colSpan) kolom
// Uraian s.d. PPN menjadi satu sel, persis seperti contoh cetak SIPD.
// =====================================================================
function drawBelanjaTable (doc, startY, rows, jumlahTotal) {
  const dataRows = rows.filter(r =>
    String(r.kode || r.uraian || r.koefisien || r.harga || '').trim() !== ''
  )

  const body = dataRows.map(row => {
    const account = isAccountRow(row)
    const jumlah = row.jumlah !== undefined && row.jumlah !== '' ? parseNumber(row.jumlah) : hitungJumlah(row)
    const cellStyle = account ? { fontStyle: 'bold' } : {}

    if (account) {
      return [
        { content: row.kode || '', styles: cellStyle },
        { content: row.uraian || '', colSpan: 5, styles: cellStyle },
        { content: formatRupiah(jumlah), styles: { ...cellStyle, halign: 'right' } }
      ]
    }
    return [
      { content: row.kode || '' },
      { content: row.uraian || '' },
      { content: row.koefisien !== undefined ? String(row.koefisien) : '', styles: { halign: 'center' } },
      { content: row.satuan || '', styles: { halign: 'center' } },
      { content: row.harga !== undefined && row.harga !== '' ? new Intl.NumberFormat('id-ID').format(Math.round(parseNumber(row.harga))) + ',00' : '', styles: { halign: 'right' } },
      { content: row.ppn !== undefined && row.ppn !== '' ? `${String(row.ppn).replace('%', '')} %` : '0 %', styles: { halign: 'center' } },
      { content: formatRupiah(jumlah), styles: { halign: 'right' } }
    ]
  })

  // Baris total di akhir tabel, menyatu dengan grid (bukan tabel terpisah)
  body.push([
    { content: '', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' }, content_label: true }
  ])
  // isi manual sel terakhir supaya "Jumlah :" rata kanan di kolom ke-6 dan nilai di kolom ke-7
  body[body.length - 1] = [
    { content: '', colSpan: 5 },
    { content: 'Jumlah :', styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatRupiah(jumlahTotal), styles: { halign: 'right', fontStyle: 'bold' } }
  ]

  autoTable(doc, {
    startY,
    head: [
      [
        { content: 'Rincian Anggaran Belanja Kegiatan\nSatuan Kerja Perangkat Daerah', colSpan: 7, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } }
      ],
      [
        { content: 'Kode Rekening', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'Uraian', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'Rinci Perhitungan', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Jumlah', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }
      ],
      [
        { content: 'Koefisien', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Satuan', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Harga', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'PPN', styles: { halign: 'center', fontStyle: 'bold' } }
      ]
    ],
    body,
    theme: 'grid',
    margin: { left: 10, right: 10, top: 10 },
    showHead: 'everyPage',
    styles: { ...PLAIN_STYLES, fontSize: 8, cellPadding: 2 },
    headStyles: { ...PLAIN_STYLES, fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 55, halign: 'center' },
      3: { cellWidth: 65, halign: 'center' },
      4: { cellWidth: 65, halign: 'right' },
      5: { cellWidth: 40, halign: 'center' },
      6: { cellWidth: 130, halign: 'right' }
    }
  })

  return doc.lastAutoTable.finalY
}

// =====================================================================
// Blok tanda tangan (kanan bawah tabel utama)
// =====================================================================
function drawTandaTangan (doc, startY, { kotaTtd, tanggalTtd, jabatanTtd, namaTtd, nipTtd }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const colX = pageWidth / 2 + 10
  let y = startY + 24

  if (y > doc.internal.pageSize.getHeight() - 100) {
    doc.addPage()
    y = 30
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${dash(kotaTtd)}, ${tanggalTtd || '..............................'}`, colX, y, { align: 'left' })
  y += 13
  doc.text(jabatanTtd || '', colX, y, { align: 'left' })
  y += 55
  doc.setFont('helvetica', 'bold')
  doc.text(namaTtd || '', colX, y, { align: 'left' })
  y += 13
  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${nipTtd || '___________________'}`, colX, y, { align: 'left' })

  return y + 16
}

// =====================================================================
// Blok "Pembahasan"
// =====================================================================
function drawPembahasan (doc, startY, { pembahasan, tanggalPembahasan, catatanRows }) {
  // baris pembahasan/tanggal/catatan (3 kolom)
  autoTable(doc, {
    startY,
    body: [
      ['Pembahasan', ':', pembahasan ? String(pembahasan) : ''],
      ['Tanggal', ':', tanggalPembahasan ? String(tanggalPembahasan) : ''],
      ['Catatan', ':', '']
    ],
    theme: 'grid',
    margin: { left: 10, right: 10 },
    styles: { ...PLAIN_STYLES, fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 14 }, 2: { cellWidth: 'auto' } }
  })
  let y = doc.lastAutoTable.finalY

  // baris bernomor untuk catatan tambahan — default persis seperti cetak SIPD: "1.", "2.", "Dst"
  const list = Array.isArray(catatanRows) && catatanRows.length ? catatanRows : ['1.', '2.', 'Dst']
  autoTable(doc, {
    startY: y,
    body: list.map(c => [String(c)]),
    theme: 'grid',
    margin: { left: 10, right: 10 },
    styles: { ...PLAIN_STYLES, fontSize: 9, cellPadding: 3 }
  })
  return doc.lastAutoTable.finalY
}

// =====================================================================
// Tabel "Tim Anggaran Pemerintahan Daerah"
// =====================================================================
function drawTimAnggaran (doc, startY, timAnggaran) {
  const list = Array.isArray(timAnggaran) ? timAnggaran : []
  const body = list.map((t, i) => [
    String(i + 1),
    t.nama || '',
    t.nip || '',
    t.jabatan || '',
    ''
  ])
  if (body.length === 0) body.push(['', '', '', '', ''])

  autoTable(doc, {
    startY,
    head: [
      [{ content: 'Tim Anggaran Pemerintahan Daerah', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } }],
      [
        { content: 'No', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Nama', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'NIP', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Jabatan', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Tanda Tangan', styles: { halign: 'center', fontStyle: 'bold' } }
      ]
    ],
    body,
    theme: 'grid',
    margin: { left: 10, right: 10 },
    styles: { ...PLAIN_STYLES, fontSize: 9, cellPadding: 3, valign: 'middle' },
    headStyles: { ...PLAIN_STYLES, fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 190 },
      2: { cellWidth: 110, halign: 'center' },
      3: { cellWidth: 170 },
      4: { cellWidth: 'auto' }
    }
  })
  return doc.lastAutoTable.finalY
}

// =====================================================================
// Builder utama — mengembalikan instance jsPDF (belum di-save), sehingga
// bisa dipakai untuk mengunduh di browser ATAU untuk pengujian/preview.
//
// data = {
//   pemerintah, tahun, formulirKode,
//   urusan, bidangUrusan, unitOrganisasi, subUnitOrganisasi, program,
//   kegiatan, subKegiatan, spm, jenisLayanan, sumberPendanaan, lokasi,
//   waktuPelaksanaan, kelompokSasaran, alokasi2025, alokasi2026, alokasi2027,
//   indikator: [{ indikator, tolokUkur, target }, ...],
//   subKegiatanInfo: { subKegiatan, sumberPendanaan, lokasi, keluaranSubKegiatan, waktuPelaksanaan, keterangan },
//   rows: [{ kode, uraian, koefisien, satuan, harga, ppn, jumlah }, ...],
//   total,
//   kotaTtd, tanggalTtd, jabatanTtd, namaTtd, nipTtd,
//   pembahasan, tanggalPembahasan, catatanRows: ['1.', '2.', 'Dst'],
//   timAnggaran: [{ nama, nip, jabatan }, ...]
// }
// =====================================================================
export function buildRkaCetakDoc (data = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a3' })

  let y = drawTopHeader(doc, {
    pemerintah: data.pemerintah,
    tahun: data.tahun,
    formulirKode: data.formulirKode
  })

  y = drawLabelValueTable(doc, y, 'Rincian Anggaran Belanja Menurut Program, Kegiatan dan Sub Kegiatan', [
    ['Urusan Pemerintahan', data.urusan],
    ['Bidang Urusan', data.bidangUrusan],
    ['Unit Organisasi', data.unitOrganisasi],
    ['Sub Unit Organisasi', data.subUnitOrganisasi],
    ['Program', data.program],
    ['Kegiatan', data.kegiatan],
    ['Sub Kegiatan', data.subKegiatan],
    ['SPM', data.spm],
    ['Jenis Layanan', data.jenisLayanan],
    ['Sumber Pendanaan', data.sumberPendanaan],
    ['Lokasi', data.lokasi],
    ['Waktu Pelaksanaan', data.waktuPelaksanaan],
    ['Kelompok Sasaran', data.kelompokSasaran],
    ['Alokasi 2025', formatRupiah(data.alokasi2025)],
    ['Alokasi 2026', formatRupiah(data.alokasi2026)],
    ['Alokasi 2027', formatRupiah(data.alokasi2027)]
  ])

  y = drawIndikatorTable(doc, y, data.indikator || [])

  const info = data.subKegiatanInfo || {}
  y = drawLabelValueTable(doc, y, 'Rincian Anggaran Belanja Kegiatan\nSatuan Kerja Perangkat Daerah', [
    ['Sub Kegiatan', info.subKegiatan ?? data.subKegiatan],
    ['Sumber Pendanaan', info.sumberPendanaan ?? data.sumberPendanaan],
    ['Lokasi', info.lokasi ?? data.lokasi],
    ['Keluaran Sub Kegiatan', info.keluaranSubKegiatan],
    ['Waktu Pelaksanaan', info.waktuPelaksanaan ?? data.waktuPelaksanaan],
    ['Keterangan', info.keterangan]
  ])

  // Tabel utama selalu mulai halaman baru, seperti pada contoh cetak SIPD
  doc.addPage()
  y = drawBelanjaTable(doc, 20, data.rows || [], data.total)
  y = drawTandaTangan(doc, y, data)
  y = drawPembahasan(doc, y + 10, data)
  drawTimAnggaran(doc, y + 10, data.timAnggaran)

  return doc
}

// =====================================================================
// Wrapper untuk dipakai di browser (memicu unduhan file)
// =====================================================================
export function exportRkaCetakPdf (data = {}) {
  const doc = buildRkaCetakDoc(data)
  const namaFile = `RKA-${(data.subKegiatan || 'Belanja').toString().slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-')}-TA${data.tahun || ''}.pdf`
  doc.save(namaFile)
}

// Alias — dipertahankan supaya import lama `exportRkaFormPdf` di komponen
// lain tidak rusak. Sekarang menghasilkan cetakan format resmi (bukan lagi
// layout A4 landscape sederhana yang dulu).
export const exportRkaFormPdf = exportRkaCetakPdf