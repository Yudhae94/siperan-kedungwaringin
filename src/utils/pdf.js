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
  // "1.234.567" (titik=ribuan) atau "1234.5" (titik=desimal) atau "1,234.5"
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''))
  return parseFloat(s.replace(/\./g, '').replace(/,/g, '.')) || 0
}

export const formatRupiah = value => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(parseNumber(value) || 0))

// Hitung jumlah otomatis: koefisien × harga (ditambah PPN % jika diisi)
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

// Ekspor PDF sesuai template formulir RKA MANUAL - RINCIAN BELANJA SKPD
export function exportRkaFormPdf({ title, tahun, satuan, formulir, rows, total }) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const left = 8
  const tableWidth = pageWidth - left * 2
  const widths = [30, 92, 22, 24, 26, 16, tableWidth - 30 - 92 - 22 - 24 - 26 - 16]
  const headers = ['Kode Rekening', 'Uraian', 'Koefisien', 'Satuan', 'Harga', 'PPN', 'Jumlah']
  const fmt = v => formatRupiah(v).replace('Rp ', '')
  let y = 12

  const drawHead = () => {
    pdf.setFillColor(255); pdf.setTextColor(0)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
    pdf.rect(left, y, 130, 12); pdf.rect(left + 130, y, tableWidth - 130, 12)
    pdf.text('RENCANA KERJA DAN ANGGARAN SATUAN KERJA', left + 65, y + 5, { align: 'center' })
    pdf.text('PERANGKAT DAERAH MANUAL', left + 65, y + 10, { align: 'center' })
    pdf.text('Formulir', left + 130 + (tableWidth - 130) / 2, y + 5, { align: 'center' })
    pdf.text('RKA MANUAL - RINCIAN BELANJA SKPD', left + 130 + (tableWidth - 130) / 2, y + 10, { align: 'center' })
    y += 12
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal')
    pdf.rect(left, y, tableWidth, 7)
    pdf.text(`Pemerintah Kabupaten Bekasi Tahun Anggaran ${tahun || '2025'}`, left + tableWidth / 2, y + 5, { align: 'center' })
    y += 7
    pdf.rect(left, y, tableWidth, 11)
    pdf.text('Rincian Anggaran Belanja Kegiatan', left + tableWidth / 2, y + 5, { align: 'center' })
    pdf.text('Satuan Kerja Perangkat Daerah', left + tableWidth / 2, y + 9, { align: 'center' })
    y += 11
    // Header tabel dua tingkat
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold')
    pdf.rect(left, y, widths[0], 12); pdf.rect(left + widths[0], y, widths[1], 12)
    pdf.rect(left + widths[0] + widths[1], y, widths[2] + widths[3] + widths[4] + widths[5], 6)
    pdf.rect(left + widths[0] + widths[1], y + 6, widths[2], 6); pdf.rect(left + widths[0] + widths[1] + widths[2], y + 6, widths[3], 6)
    pdf.rect(left + widths[0] + widths[1] + widths[2] + widths[3], y + 6, widths[4], 6); pdf.rect(left + widths[0] + widths[1] + widths[2] + widths[3] + widths[4], y + 6, widths[5], 6)
    pdf.rect(left + widths[0] + widths[1] + widths[2] + widths[3] + widths[4] + widths[5], y, widths[6], 12)
    pdf.text('Kode Rekening', left + widths[0] / 2, y + 7.5, { align: 'center' })
    pdf.text('Uraian', left + widths[0] + widths[1] / 2, y + 7.5, { align: 'center' })
    const rx = left + widths[0] + widths[1]
    pdf.text('Rincian Perhitungan', rx + (widths[2] + widths[3] + widths[4] + widths[5]) / 2, y + 4.5, { align: 'center' })
    pdf.text('Koefisien', rx + widths[2] / 2, y + 10.5, { align: 'center' })
    pdf.text('Satuan', rx + widths[2] + widths[3] / 2, y + 10.5, { align: 'center' })
    pdf.text('Harga', rx + widths[2] + widths[3] + widths[4] / 2, y + 10.5, { align: 'center' })
    pdf.text('PPN', rx + widths[2] + widths[3] + widths[4] + widths[5] / 2, y + 10.5, { align: 'center' })
    pdf.text('Jumlah', left + widths[0] + widths[1] + widths[2] + widths[3] + widths[4] + widths[5] + widths[6] / 2, y + 7.5, { align: 'center' })
    y += 12
  }

  drawHead()
  pdf.setTextColor(0)
  const detailRows = rows.filter(r => !(isAccountRow(r) && !String(r.uraian || '').trim()))
  detailRows.forEach(row => {
    const isDetail = !isAccountRow(row)
    const uraianLines = pdf.splitTextToSize(String(row.uraian || ''), widths[1] - 4)
    const extra = []
    if (String(row.kode || '').trim() === '[#]') extra.push('Sumber Dana : PENDAPATAN ASLI DAERAH (PAD)')
    if (row.satuan && !String(row.kode || '').includes('[') && !isAccountRow(row)) extra.push(`Satuan: ${row.satuan}`)
    const blockLines = [...uraianLines, ...extra]
    const rowHeight = Math.max(7, blockLines.length * 4.5 + 3)
    if (y + rowHeight > pageHeight - 14) { pdf.addPage(); y = 12; drawHead() }
    let x = left
    const bold = isAccountRow(row) && !String(row.kode || '').includes('[')
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(8)
    const cells = [String(row.kode || ''), '', isDetail ? String(row.koefisien || '') : '', isDetail ? String(row.satuan || '') : '', isDetail ? (parseNumber(row.harga) ? fmt(row.harga) : '') : '', isDetail && parseNumber(row.ppn) ? `${row.ppn}%` : '', isDetail && parseNumber(row.jumlah) ? fmt(row.jumlah) : 'Rp.']
    cells.forEach((cell, i) => { pdf.rect(x, y, widths[i], rowHeight); x += widths[i] })
    pdf.text(String(cells[0]), left + 2, y + 5)
    blockLines.forEach((line, li) => pdf.text(String(line), left + widths[0] + 2, y + 5 + li * 4.5))
    const rx2 = left + widths[0] + widths[1]
    if (cells[2]) pdf.text(cells[2], rx2 + widths[2] / 2, y + 5, { align: 'center' })
    if (cells[3]) pdf.text(cells[3], rx2 + widths[2] + widths[3] / 2, y + 5, { align: 'center' })
    if (cells[4]) pdf.text(cells[4], rx2 + widths[2] + widths[3] + widths[4] - 2, y + 5, { align: 'right' })
    if (cells[5]) pdf.text(cells[5], rx2 + widths[2] + widths[3] + widths[4] + widths[5] / 2, y + 5, { align: 'center' })
    if (cells[6]) pdf.text(cells[6], rx2 + widths[2] + widths[3] + widths[4] + widths[5] + widths[6] - 2, y + 5, { align: 'right' })
    y += rowHeight
  })
  if (y + 10 > pageHeight - 14) { pdf.addPage(); y = 12; drawHead() }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5)
  pdf.rect(left, y, tableWidth - widths[6], 9); pdf.rect(left + tableWidth - widths[6], y, widths[6], 9)
  pdf.text('Jumlah Anggaran Sub Kegiatan :', left + tableWidth - widths[6] - 3, y + 6, { align: 'right' })
  pdf.text(`Rp. ${fmt(total)}`, left + tableWidth - 3, y + 6, { align: 'right' })
  pdf.save(`RKA-${(satuan || 'Kedungwaringin').replace(/\s+/g, '-')}-TA${tahun || '2025'}.pdf`)
}
