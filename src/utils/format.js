export const createDocPreview = file => {
  if (!file) return 'Dokumen baru sedang menunggu review oleh admin SIPERAN.'
  if (file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('xml') || file.type.includes('csv')) {
    return `Konten file dipindai dari dokumen ${file.name}. File siap ditinjau untuk validasi data, kelengkapan, dan kesesuaian target kegiatan.`
  }
  if (file.type.includes('pdf')) return `File PDF ${file.name} terlampir dan siap ditinjau untuk kelengkapan laporan serta riwayat kegiatan.`
  if (file.type.includes('sheet') || file.type.includes('excel')) return `File spreadsheet ${file.name} berisi data realisasi, pagu, dan capaian kegiatan yang sedang menunggu review.`
  return `Dokumen ${file.name} telah berhasil diunggah dan sedang dalam proses peninjauan administrasi.`
}
export const formatFileSize = bytes => {
  if (!bytes || bytes < 1024) return '1 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${Math.max(1, Math.round(value))} ${units[unitIndex]}`
}
export const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
export const pct = (a, b) => Math.round((a / b) * 100)
export const formatDate = date => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
export const greetingFor = hour => hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'
