export const reportTitles = {
  realisasi: 'Laporan Analisis Realisasi Anggaran',
  deviasi: 'Matriks Deviasi Realisasi',
  kinerja: 'Laporan Capaian Kinerja',
}
export const reportColumns = {
  realisasi: [['kode', 'Kode'], ['nama', 'Kegiatan'], ['pagu', 'Pagu (Rp)'], ['realisasi_periode', 'Realisasi periode (Rp)'], ['realisasi_kumulatif', 'Realisasi YTD (Rp)'], ['serapan', 'Serapan (%)'], ['sisa', 'Sisa (Rp)'], ['target_anggaran', 'Target YTD (%)'], ['deviasi_anggaran', 'Deviasi anggaran (p.p.)']],
  deviasi: [['kode', 'Kode'], ['nama', 'Kegiatan'], ['deadline', 'Tenggat'], ['periode_data', 'Data bulan'], ['target_fisik', 'Target fisik (%)'], ['realisasi_fisik', 'Fisik aktual (%)'], ['deviasi', 'Deviasi (p.p.)'], ['status', 'Status'], ['kendala', 'Kendala'], ['tindak_lanjut', 'Tindak lanjut'], ['penanggung', 'Penanggung jawab']],
  kinerja: [['kode', 'Kode'], ['nama', 'Kegiatan'], ['periode_data', 'Data bulan'], ['indikator_output', 'Indikator output'], ['satuan_output', 'Satuan output'], ['target_output', 'Target output'], ['realisasi_output', 'Aktual output'], ['capaian_output', 'Capaian output (%)'], ['indikator_outcome', 'Indikator outcome'], ['satuan_outcome', 'Satuan outcome'], ['target_outcome', 'Target outcome'], ['realisasi_outcome', 'Aktual outcome'], ['capaian_outcome', 'Capaian outcome (%)']],
}
export const reportValue = (row, key) => key === 'periode_data' ? row.entry?.periode : row[key] ?? row.entry?.[key] ?? null
export const displayValue = value => value == null || value === '' ? '—' : typeof value === 'number' ? value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : value
export const reportNotes = 'Keuangan: SPJ selesai dicairkan berdasarkan tanggal riwayat pencairan. YTD: kumulatif sejak Januari. Fisik/output/outcome: snapshot bulanan terakhir, bukan penjumlahan. Data bulan lama ditandai belum dilaporkan. Target nol: capaian tidak dihitung. Deviasi dalam poin persentase (p.p.).'

export async function exportEvaluation(report, type, format) {
  const title = reportTitles[type]
  const columns = reportColumns[type]
  const name = `SIPERAN-${type}-${report.period.label}`
  const subtitle = `${report.period.start} s.d. ${report.period.end} | ${report.bidang || 'Semua Unit'}`
  if (format === 'pdf') {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
    const pdf = new jsPDF({ orientation: 'landscape', format: type === 'kinerja' ? 'a3' : 'a4' })
    pdf.setFontSize(14); pdf.text(title, 14, 15)
    pdf.setFontSize(9); pdf.text('SIPERAN - Kecamatan Kedungwaringin', 14, 22)
    pdf.text(subtitle, 14, 28)
    autoTable(pdf, { startY: 34, head: [columns.map(c => c[1])], body: report.rows.map(r => columns.map(([key]) => displayValue(reportValue(r, key)))), styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [13, 107, 88] }, margin: { bottom: 24 }, rowPageBreak: 'avoid' })
    for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
      pdf.setPage(i); pdf.setFontSize(7)
      pdf.text(pdf.splitTextToSize(reportNotes, pdf.internal.pageSize.getWidth() - 28), 14, pdf.internal.pageSize.getHeight() - 17)
      pdf.text(`Halaman ${i}/${pdf.getNumberOfPages()}`, 14, pdf.internal.pageSize.getHeight() - 5)
    }
    pdf.save(`${name}.pdf`)
    return
  }
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(title.slice(0, 30))
  ws.mergeCells(1, 1, 1, columns.length)
  ws.mergeCells(2, 1, 2, columns.length)
  ws.getCell(1, 1).value = title
  ws.getCell(2, 1).value = `${subtitle} — SIPERAN Kecamatan Kedungwaringin`
  ws.getCell(1, 1).font = { bold: true, size: 13 }
  ws.getCell(2, 1).font = { size: 9, italic: true }
  ws.addRow([])
  const header = ws.addRow(columns.map(c => c[1]))
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6B58' } }
    cell.alignment = { wrapText: true, vertical: 'middle' }
  })
  for (const row of report.rows) ws.addRow(columns.map(([key]) => reportValue(row, key) ?? '—'))
  ws.columns.forEach(column => { column.width = 22 })
  ws.addRow([])
  const notesRow = ws.addRow([reportNotes])
  notesRow.font = { size: 8, italic: true }
  ws.getRow(4).height = 24
  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${name}.xlsx`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
