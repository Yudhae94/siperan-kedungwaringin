import { Activity, BadgeCheck, BarChart3, CalendarDays, ClipboardList, CloudDownload, FileUp, FolderOpen, LayoutDashboard, Settings2, Target, Upload } from 'lucide-react'

export const bidangOptions = [
  'Sekretariat - Bagian Umum dan Kepegawaian',
  'Sekretariat - Bagian Perencanaan dan Keuangan',
  'Kasi Pelayanan Publik',
  'Kasi Ekonomi dan Pembangunan',
  'Kasi Pemtrantip',
  'Kasi Pemerintahan',
  'Kasi PMD',
]

export const defaultAdminContacts = [
 { id: 1, type: 'whatsapp', value: '085771076965' },
 { id: 2, type: 'email', value: 'admin.siperan@kedungwaringin.go.id' },
]
export const defaultApprovalBoard = [
 { id: 1, section: 'Sekretariat', status: 'Belum disetujui', notes: 'Menunggu review administrasi umum' },
 { id: 2, section: 'Pemantib', status: 'Belum disetujui', notes: 'Menunggu evaluasi program dan anggaran' },
 { id: 3, section: 'PMD', status: 'Belum disetujui', notes: 'Perlu konfirmasi output pemberdayaan' },
 { id: 4, section: 'Pelayanan Publik', status: 'Belum disetujui', notes: 'Tunggu validasi indikator layanan' },
 { id: 5, section: 'Kessos', status: 'Belum disetujui', notes: 'Menunggu review kebutuhan sosial' },
]

export const navGroups = [
  { title: 'Utama', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'Siklus Kinerja', items: [
    { id: 'perencanaan', label: 'Perencanaan', icon: Target },
    { id: 'usulan-rka', label: 'Usulan RKA / KAK', icon: ClipboardList, parent: 'Perencanaan' },
    { id: 'upload-pendukung', label: 'Upload Dokumen Pendukung', icon: FileUp, parent: 'Perencanaan' },
    { id: 'verifikasi-usulan', label: 'Verifikasi Usulan', icon: BadgeCheck, parent: 'Perencanaan' },
    { id: 'arsip', label: 'Arsip Renja & DPA', icon: FolderOpen, parent: 'Perencanaan' },
    { id: 'pengendalian', label: 'Pengendalian & Realisasi', icon: Activity },
    { id: 'evaluasi', label: 'Evaluasi & Pelaporan', icon: BarChart3 },
  ]},
  { title: 'Layanan', items: [
    { id: 'kalender', label: 'Kalender Kegiatan', icon: CalendarDays },
    { id: 'unduhan', label: 'Pusat Unduhan', icon: CloudDownload },
    { id: 'pengaturan', label: 'Pengaturan & Bantuan', icon: Settings2 },
  ]},
]

export const planningSubPages = ['usulan-rka', 'upload-pendukung', 'verifikasi-usulan', 'arsip']
