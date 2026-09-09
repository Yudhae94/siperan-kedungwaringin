import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ===== PDF sederhana dari array of lines =====
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

// ===== Template RKA kosong (untuk unduhan) =====
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

// ===== Ekspor PDF dari data input RKA (sesuai tampilan layar) =====
export function exportRkaFormPdf({ title, tahun, satuan, formulir, rows, total }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header judul
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('RENCANA KERJA DAN ANGGARAN', pageWidth / 2, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.text('SATUAN KERJA PERANGKAT DAERAH', pageWidth / 2, 18, { align: 'center' })

  // Info header
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('PEMERINTAH KABUPATEN BEKASI', 10, 26)
  doc.text('Tahun Anggaran: ' + (tahun || '2025'), 10, 31)
  doc.text('Satuan: ' + (satuan || 'Kecamatan Kedungwaringin'), 10, 36)
  doc.text('Formulir: ' + (formulir || 'RKA MANUAL - RINCIAN BELANJA SKPD'), 10, 41)

  // Garis pemisah
  doc.setLineWidth(0.5)
  doc.line(10, 45, pageWidth - 10, 45)

  // Filter baris yang memiliki data
  const dataRows = rows.filter(r =>
    String(r.kode || r.uraian || r.koefisien || r.harga || r.keterangan || '').trim() !== ''
  )

  // Format angka
  const fmt = v => {
    const n = parseNumber(v)
    return n ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : ''
  }

  // Buat data tabel
  const tableData = dataRows.map(row => {
    const isDetail = !isAccountRow(row)
    return [
      row.kode || '',
      row.uraian || '',
      isDetail ? (row.koefisien || '') : '',
      isDetail ? (row.satuan || '') : '',
      isDetail ? fmt(row.harga) : '',
      isDetail && parseNumber(row.ppn) ? `${String(row.ppn).replace('%', '')}%` : '',
      fmt(row.jumlah),
      row.keterangan || ''
    ]
  })

  // Tentukan mana yang baris header (account rows)
  const headStyles = { fillColor: [13, 107, 88], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' }
  const bodyStyles = { fontSize: 7.5 }
  const accountRowStyles = { fontStyle: 'bold', fillColor: [232, 245, 241], textColor: [24, 59, 53] }

  // Draw table dengan autotable
  autoTable(doc, {
    startY: 48,
    head: [['KODE REKENING', 'URAIAN', 'KOEFISIEN', 'SATUAN', 'HARGA SATUAN (RP)', 'PPN %', 'JUMLAH (RP)', 'KETERANGAN']],
    body: tableData,
    margin: { left: 10, right: 10 },
    styles: bodyStyles,
    headStyles: headStyles,
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      // Bold untuk baris header/akun (bukan rincian)
      if (data.section === 'body') {
        const rowIdx = data.row.index
        if (rowIdx < dataRows.length) {
          const row = dataRows[rowIdx]
          if (isAccountRow(row) && !String(row.kode || '').includes('[')) {
            data.cell.styles = { ...data.cell.styles, ...accountRowStyles }
          }
        }
      }
    },
    theme: 'grid'
  })

  // Total di bawah tabel
  const finalY = doc.lastAutoTable.finalY + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`JUMLAH ANGGARAN SUB KEGIATAN: Rp. ${new Intl.NumberFormat('id-ID').format(Math.round(total || 0))}`, pageWidth - 12, finalY, { align: 'right' })

  // Tanda tangan
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Mengetahui,', pageWidth - 80, finalY + 12)
  doc.text('Kepala Bagian Perencanaan & Keuangan', pageWidth - 80, finalY + 17)
  doc.text('_________________________', pageWidth - 80, finalY + 30)
  doc.text('NIP. ___________________', pageWidth - 80, finalY + 35)

  // Simpan
  doc.save(`RKA-Kedungwaringin-TA${tahun || '2025'}.pdf`)
}

// ===== Helper: parsing angka dari string =====
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