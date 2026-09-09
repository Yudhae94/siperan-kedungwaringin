import { jsPDF } from 'jspdf'

export function makePdfDownload(name, lines) {
  const esc = value => String(value).replace(/[\\()]/g, '\\$&')
  const content = `BT /F1 12 Tf 50 760 Td ${lines.map(line => `(${esc(line)}) Tj 0 -18 Td`).join('')} ET`
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
  let pdf = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name.replace(/\.[^.]+$/, '')}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function makeRkaTemplatePdf() {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const left = 10
  const right = pageWidth - 10
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

// ===== Konversi & hitung otomatis =====
export const parseNumber = value => {
  if (value === null || value === undefined) return 0
  const s = String(value).trim()
  if (!s) return 0
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''))
  return parseFloat(s.replace(/\./g, '').replace(/,/g, '.')) || 0
}

export const formatRupiah = value => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(parseNumber(value) || 0))

// Hitung jumlah otomatis: koefisien x harga satuan (+ PPN % bila diisi)
export const hitungJumlah = row => {
  const koef = parseNumber(row.koefisien)
  const harga = parseNumber(row.harga)
  const ppn = parseNumber(row.ppn)
  let jumlah = koef * harga
  if (ppn > 0 && ppn < 100) jumlah += jumlah * (ppn / 100)
  return jumlah
}

// Tandai baris header/akun (tanpa perhitungan) vs baris rincian belanja
export const isAccountRow = row => !parseNumber(row.koefisien) && !parseNumber(row.harga)

// Ekspor PDF sesuai tampilan layar: KODE REKENING, URAIAN, KOEFISIEN, SATUAN,
// HARGA SATUAN (RP), PPN %, JUMLAH (RP), KETERANGAN + footer total
export function exportRkaFormPdf({ title, tahun, satuan, formulir, rows, total }) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const left = 8
  const tableWidth = pageWidth - left * 2
  const widths = [26, 62, 20, 22, 30, 16, 34, 40]
  const headers = ['KODE REKENING', 'URAIAN', 'KOEFISIEN', 'SATUAN', 'HARGA SATUAN (RP)', 'PPN %', 'JUMLAH (RP)', 'KETERANGAN']
  const fmt = v => new Intl.NumberFormat('id-ID').format(Math.round(parseNumber(v) || 0))
  let y = 12

  const drawHead = () => {
    pdf.setTextColor(0)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
    pdf.rect(left, y, 150, 12); pdf.rect(left + 150, y, tableWidth - 150, 12)
    pdf.text('RINCIAN BELANJA SKPD', left + 4, y + 5)
    pdf.text('PEMERINTAH KABUPATEN BEKASI', left + 4, y + 9)
    pdf.text('SATUAN KERJA PERANGKAT DAERAH', left + 4, y + 12)
    pdf.text('SATUAN', left + 150 + 20, y + 7)
    pdf.text('FORMULIR', left + 150 + (tableWidth - 150) / 2, y + 5, { align: 'center' })
    pdf.text('RKA MANUAL - RINCIAN BELANJA SKPD', left + 150 + (tableWidth - 150) / 2, y + 10, { align: 'center' })
    y += 12
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold')
    pdf.rect(left, y, tableWidth, 7)
    pdf.text(`PEMERINTAH KABUPATEN BEKASI TAHUN ANGGARAN ${tahun || '2025'}`, left + 4, y + 5)
    y += 7
    pdf.rect(left, y, tableWidth, 11)
    pdf.text('RINCIAN ANGGARAN BELANJA KEGIATAN', left + 4, y + 5)
    pdf.text('SATUAN KERJA PERANGKAT DAERAH', left + 4, y + 9)
    y += 11
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold')
    let x = left
    headers.forEach((h, i) => {
      pdf.rect(x, y, widths[i], 10)
      const lines = pdf.splitTextToSize(h, widths[i] - 3)
      lines.forEach((line, li) => pdf.text(line, x + widths[i] / 2, y + 4 + li * 3.2, { align: 'center' }))
      x += widths[i]
    })
    y += 10
  }

  drawHead()
  pdf.setTextColor(0)
  const detailRows = rows.filter(r => String(r.kode || r.uraian || r.koefisien || r.harga || r.keterangan || '').trim() !== '')
  detailRows.forEach(row => {
    const isDetail = !isAccountRow(row)
    const uraianLines = pdf.splitTextToSize(String(row.uraian || ''), widths[1] - 4)
    const ketLines = pdf.splitTextToSize(String(row.keterangan || ''), widths[7] - 4)
    const rowHeight = Math.max(8, Math.max(uraianLines.length, ketLines.length) * 4.2 + 3.5)
    if (y + rowHeight > pageHeight - 14) { pdf.addPage(); y = 12; drawHead() }
    let x = left
    const bold = isAccountRow(row) && !String(row.kode || '').includes('[')
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(8)
    const cells = [
      String(row.kode || ''),
      '',
      isDetail ? String(row.koefisien || '') : '',
      isDetail ? String(row.satuan || '') : '',
      isDetail && parseNumber(row.harga) ? fmt(row.harga) : '',
      isDetail && parseNumber(row.ppn) ? `${String(row.ppn).replace('%', '')}%` : '',
      isDetail && parseNumber(row.jumlah) ? fmt(row.jumlah) : '',
      String(row.keterangan || '')
    ]
    cells.forEach((cell, i) => { pdf.rect(x, y, widths[i], rowHeight); x += widths[i] })
    pdf.text(String(cells[0]), left + 2, y + 5)
    uraianLines.forEach((line, li) => pdf.text(String(line), left + widths[0] + 2, y + 5 + li * 4.2))
    const rx2 = left + widths[0] + widths[1]
    if (cells[2]) pdf.text(cells[2], rx2 + widths[2] / 2, y + 5, { align: 'center' })
    if (cells[3]) pdf.text(cells[3], rx2 + widths[2] + widths[3] / 2, y + 5, { align: 'center' })
    if (cells[4]) pdf.text(cells[4], rx2 + widths[2] + widths[3] + widths[4] - 2, y + 5, { align: 'right' })
    if (cells[5]) pdf.text(cells[5], rx2 + widths[2] + widths[3] + widths[4] + widths[5] / 2, y + 5, { align: 'center' })
    if (cells[6]) pdf.text(cells[6], rx2 + widths[2] + widths[3] + widths[4] + widths[5] + widths[6] - 2, y + 5, { align: 'right' })
    ketLines.forEach((line, li) => pdf.text(String(line), rx2 + widths[2] + widths[3] + widths[4] + widths[5] + widths[6] + 2, y + 5 + li * 4.2))
    y += rowHeight
  })
  if (y + 10 > pageHeight - 14) { pdf.addPage(); y = 12; drawHead() }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5)
  const totalLabelWidth = widths[0] + widths[1] + widths[2] + widths[3] + widths[4] + widths[5]
  pdf.rect(left, y, totalLabelWidth, 9)
  pdf.rect(left + totalLabelWidth, y, widths[6], 9)
  pdf.rect(left + totalLabelWidth + widths[6], y, widths[7], 9)
  pdf.text('Jumlah Anggaran Sub Kegiatan', left + totalLabelWidth - 3, y + 6, { align: 'right' })
  pdf.text(`Rp. ${fmt(total)}`, left + totalLabelWidth + widths[6] - 2, y + 6, { align: 'right' })
  pdf.save(`RKA-${(satuan || 'Kedungwaringin').replace(/\s+/g, '-')}-TA${tahun || '2025'}.pdf`)
}