# SIPERAN Kedungwaringin - Diagram Workflow & Alur Proses

## 1. Sistem Overview

```mermaid
graph TB
    subgraph Frontend["🖥️ Frontend (React + Vite)"]
        Dashboard[📊 Dashboard]
        Perencanaan[📋 Perencanaan]
        Pengendalian[🎛️ Pengendalian]
        Evaluasi[✅ Evaluasi]
        Layanan[🛎️ Layanan]
    end

    subgraph Backend["⚙️ Backend (Express.js)"]
        API[🔌 REST API]
        Auth[🔐 Auth Middleware]
        Upload[📁 File Upload]
    end

    subgraph Database["💾 Database (SQLite)"]
        DB[(siperan.sqlite)]
    end

    Frontend --> API
    API --> Auth
    API --> Upload
    API --> DB

    style Frontend fill:#e8f5e9,stroke:#2e7d32
    style Backend fill:#e3f2fd,stroke:#1565c0
    style Database fill:#fff3e0,stroke:#e65100
```

## 2. User Role & Access Control

```mermaid
graph LR
    subgraph Roles["👤 User Roles"]
        SA["🦸 Super Admin<br/>Full Access"]
        AD["👨‍💼 Admin<br/>Input + Update"]
        US["👤 User<br/>Read Only"]
    end

    subgraph Actions["⚡ Actions"]
        Input["✏️ Input"]
        Update["🔄 Update"]
        Delete["🗑️ Delete"]
        Verify["✅ Verify"]
        Approve["👍 Approve"]
    end

    SA --> Input
    SA --> Update
    SA --> Delete
    SA --> Verify
    SA --> Approve

    AD --> Input
    AD --> Update

    style SA fill:#c8e6c9,stroke:#2e7d32,color:#000
    style AD fill:#bbdefb,stroke:#1565c0,color:#000
    style US fill:#f5f5f5,stroke:#9e9e9e,color:#666
```

### Tabel Hak Akses

| Fitur | Super Admin | Admin | User |
|:------|:-----------:|:-----:|:----:|
| Dashboard | ✅ | ✅ | ✅ |
| Input Data | ✅ | ✅ | ❌ |
| Update Data | ✅ | ✅ | ❌ |
| Delete Data | ✅ | ❌ | ❌ |
| Verifikasi | ✅ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ |
| Manajemen User | ✅ | ❌ | ❌ |

## 3. Siklus Kinerja Kecamatan

```mermaid
flowchart LR
    P["📋 PERENCANAAN<br/>• E-Usulan Kegiatan<br/>• RKA/KAK<br/>• Anggaran"]
    C["🎛️ PENGENDALIAN<br/>• Input Progres<br/>• SPJ Pencairan<br/>• Kartu Kendali"]
    E["✅ EVALUASI<br/>• Review Dokumen<br/>• Verifikasi<br/>• Approval"]
    L["📊 PELAPORAN<br/>• Triwulan<br/>• Semester<br/>• Tahunan"]

    P --> C --> E --> L
    L -.->|Feedback| P

    style P fill:#e8f5e9,stroke:#2e7d32
    style C fill:#e3f2fd,stroke:#1565c0
    style E fill:#fff3e0,stroke:#e65100
    style L fill:#f3e5f5,stroke:#7b1fa2
```

## 4. Workflow Input RKA

```mermaid
flowchart TD
    Start([🔑 Login]) --> Form["📝 Form Input RKA"]
    Form --> Validasi{"✅ Validasi"}
    Validasi -->|Gagal| Error["⚠️ Tampilkan Error"]
    Error --> Form
    Validasi -->|Berhasil| Hitung["🧮 Hitung Otomatis<br/>Jumlah = Koef × Harga + PPN"]
    Hitung --> Simpan{💾 Simpan?}
    Simpan -->|Ya| DB["💾 Simpan ke Database"]
    Simpan -->|Tidak| Form
    DB --> Export{📄 Export PDF?}
    Export -->|Ya| PDF["📄 Generate PDF"]
    Export -->|Tidak| Done([✅ Selesai])
    PDF --> Done

    style Start fill:#c8e6c9,stroke:#2e7d32
    style Form fill:#e3f2fd,stroke:#1565c0
    style DB fill:#fff3e0,stroke:#e65100
    style PDF fill:#f3e5f5,stroke:#7b1fa2
    style Done fill:#c8e6c9,stroke:#2e7d32
```

### Form Input RKA

```mermaid
block-beta
    columns 9
    KODE["KODE REKENING"]:1
    URAIAN["URAIAN"]:2
    KOEF["KOEFISIEN"]:1
    SATUAN["SATUAN"]:1
    HARGA["HARGA SATUAN"]:1
    PPN["PPN %"]:1
    JUMLAH["JUMLAH"]:1
    AKSI["AKSI"]:1

    block:row1["Header Row"]:9
    row1 --> KODE
    row1 --> URAIAN
    row1 --> KOEF
    row1 --> SATUAN
    row1 --> HARGA
    row1 --> PPN
    row1 --> JUMLAH
    row1 --> AKSI
```

## 5. Workflow Pengendalian & Realisasi

```mermaid
stateDiagram-v2
    [*] --> PilihProgram
    PilihProgram --> InputProgres: Tab Progres
    PilihProgram --> InputSPJ: Tab SPJ
    PilihProgram --> InputKartu: Tab Kartu Kendali
    PilihProgram --> InputDPA: Tab DPA

    state InputProgres {
        [*] --> AturPersentase
        AturPersentase --> SimpanProgres
        SimpanProgres --> [*]
    }

    state InputSPJ {
        [*] --> BuatSPJ
        BuatSPJ --> ReviewSubag
        ReviewSubag --> TTD_Camat: Disetujui
        ReviewSubag --> Ditolak: Ditolak
        TTD_Camat --> TahapPencairan
        TahapPencairan --> SelesaiDicairkan
        SelesaiDicairkan --> [*]
    }

    state InputKartu {
        [*] --> BuatKartu
        BuatKartu --> MonitorTahapan
        MonitorTahapan --> [*]
    }

    InputProgres --> [*]
    InputSPJ --> [*]
    InputKartu --> [*]
    InputDPA --> [*]
```

### Status Verifikasi SPJ

```mermaid
flowchart LR
    S1["1️⃣ Review<br/>Subag Perencanaan"]
    S2["2️⃣ Penandatanganan<br/>Camat/Sekcam"]
    S3["3️⃣ Tahap<br/>Pencairan"]
    S4["4️⃣ Selesai<br/>Dicairkan"]

    S1 --> S2 --> S3 --> S4

    style S1 fill:#fff3e0,stroke:#e65100
    style S2 fill:#fff3e0,stroke:#e65100
    style S3 fill:#e3f2fd,stroke:#1565c0
    style S4 fill:#c8e6c9,stroke:#2e7d32
```

## 6. Workflow Evaluasi & Verifikasi

```mermaid
flowchart TD
    Start(["📤 Upload Dokumen"]) --> Review["👀 Review<br/>Menunggu Verifikasi"]
    Review --> Verifikasi{🔐 Verifikasi}
    Verifikasi -->|✅ Disetujui| Terverifikasi["✅ Terverifikasi"]
    Verifikasi -->|❌ Ditolak| Ditolak["❌ Ditolak<br/>+ Catatan"]
    Verifikasi -->|🔄 Perbaikan| Perbaikan["🔄 Perlu Perbaikan"]
    Perbaikan --> Start

    Terverifikasi --> Approve{👍 Approve<br/>Section}
    Approve -->|✅ Disetujui| Done(["✅ Selesai"])
    Approve -->|❌ Ditolak| Ditolak

    style Start fill:#e3f2fd,stroke:#1565c0
    style Terverifikasi fill:#c8e6c9,stroke:#2e7d32
    style Ditolak fill:#ffebee,stroke:#c62828
    style Done fill:#c8e6c9,stroke:#2e7d32
```

### Approval Board

```mermaid
block-beta
    columns 3
    Section["SECTION"]:1
    Status["STATUS"]:1
    Aksi["AKSI"]:1

    block:sekretariat["Sekretariat"]:3
    sekretariat --> S_Status["✅ Disetujui"]
    sekretariat --> S_Aksi["Setujui | Tolak"]

    block:pemantib["Pemantib"]:3
    pemantib --> P_Status["❌ Belum"]
    pemantib --> P_Aksi["Setujui | Tolak"]

    block:pmd["PMD"]:3
    pmd --> PMD_Status["❌ Belum"]
    pmd --> PMD_Aksi["Setujui | Tolak"]
```

## 7. Database Schema

```mermaid
erDiagram
    USERS {
        int id PK
        string username
        string password
        string name
        string role
        string bidang
        string status
        string created_at
        string last_login
    }

    PROGRAMS {
        int id PK
        string kode
        string nama
        string bidang
        float target
        float realisasi
        float pagu
        string status
        string penanggung
        string deadline
    }

    RKA_FORMS {
        int id PK
        string title
        string tahun
        string satuan
        string formulir
        float total
        string updated_at
    }

    RKA_ROWS {
        int id PK
        int rka_id FK
        string kode
        string uraian
        string koefisien
        string satuan
        string harga
        string ppn
        string jumlah
        string keterangan
    }

    SPJ_PENCAIRAN {
        int id PK
        int program_id FK
        string kode_kegiatan
        string nama_kegiatan
        float pagu
        float nilai_pencairan
        float progres_fisik
        float progres_keuangan
        string status
        string no_spj
        string tanggal_spj
        string created_by
    }

    DOCS {
        int id PK
        string name
        string type
        string size
        string date
        string status
        string preview
        string file_path
        string mime_type
        string storage_name
    }

    USULAN_RKA {
        int id PK
        string judul
        string bidang
        string jenis
        string tahun_anggaran
        float pagu
        string penanggung
        string status
        string created_by
        string created_at
    }

    USULAN_RKA_DOKUMEN {
        int id PK
        int usulan_id FK
        string jenis_dokumen
        string name
        string size
        string file_path
    }

    KARTU_KENDALI {
        int id PK
        int program_id FK
        string nama_kegiatan
        json tahapan
        string status
    }

    DPA_FORMS {
        int id PK
        int usulan_id FK
        string nama_kegiatan
        float pagu
        json rincian
        string status
    }

    EVENTS {
        int id PK
        string date
        string title
        string type
    }

    CLINIC_THREADS {
        int id PK
        int user_id
        string topic
        string status
        string created_at
    }

    CLINIC_MESSAGES {
        int id PK
        int thread_id FK
        string sender_name
        string message
        string created_at
    }

    SECTION_APPROVALS {
        int id PK
        string section
        string status
        string notes
        string updated_at
    }

    USULAN_RKA ||--o{ USULAN_RKA_DOKUMEN : has
    RKA_FORMS ||--o{ RKA_ROWS : contains
    PROGRAMS ||--o{ SPJ_PENCAIRAN : has
    PROGRAMS ||--o{ KARTU_KENDALI : tracks
    USULAN_RKA ||--o{ DPA_FORMS : generates
    CLINIC_THREADS ||--o{ CLINIC_MESSAGES : contains
```

## 8. API Endpoints

```mermaid
graph TB
    subgraph Auth["🔐 Authentication"]
        A1["POST /api/auth/login"]
        A2["POST /api/auth/register"]
        A3["POST /api/auth/logout"]
        A4["GET /api/auth/me"]
        A5["GET /api/auth/captcha"]
    end

    subgraph Programs["📋 Programs"]
        P1["GET /api/programs"]
        P2["POST /api/programs"]
        P3["PATCH /api/programs/:id"]
        P4["DELETE /api/programs/:id 🔒"]
    end

    subgraph RKA["📝 RKA"]
        R1["GET /api/rka"]
        R2["POST /api/rka"]
    end

    subgraph SPJ["💰 SPJ"]
        SP1["GET /api/spj"]
        SP2["POST /api/spj"]
        SP3["PATCH /api/spj/:id"]
        SP4["DELETE /api/spj/:id 🔒"]
    end

    subgraph Docs["📁 Dokumen"]
        D1["GET /api/docs"]
        D2["POST /api/docs"]
        D3["PATCH /api/docs/:id"]
        D4["DELETE /api/docs/:id 🔒"]
        D5["POST /api/docs/:id/review"]
    end

    subgraph Usulan["📨 Usulan RKA"]
        U1["GET /api/usulan-rka"]
        U2["POST /api/usulan-rka"]
        U3["POST /api/usulan-rka/:id/dokumen"]
        U4["PATCH /api/usulan-rka/:id/verifikasi 🔒"]
        U5["DELETE /api/usulan-rka/:id 🔒"]
    end

    subgraph Clinic["🏥 Klinik"]
        C1["GET /api/clinic/threads"]
        C2["POST /api/clinic/threads"]
        C3["POST /api/clinic/threads/:id/messages"]
        C4["GET /api/clinic/consultations"]
        C5["POST /api/clinic/consultations"]
        C6["GET /api/clinic/templates"]
    end

    style P4 fill:#ffebee,stroke:#c62828
    style SP4 fill:#ffebee,stroke:#c62828
    style D4 fill:#ffebee,stroke:#c62828
    style U4 fill:#ffebee,stroke:#c62828
    style U5 fill:#ffebee,stroke:#c62828
```

## 9. Menu Sidebar & Navigasi

```mermaid
graph TD
    Sidebar["📱 SIDEBAR MENU"]

    subgraph Utama["🏠 UTAMA"]
        Dash["📊 Dashboard"]
    end

    subgraph Siklus["🔄 SIKLUS KINERJA ▼"]
        Perencanaan["📋 Perencanaan"]
        UsulanRKA["📨 Usulan RKA/KAK"]
        UploadPendukung["📤 Upload Dokumen"]
        Verifikasi["✅ Verifikasi Usulan"]
        Arsip["📁 Arsip Renja & DPA"]
        Pengendalian["🎛️ Pengendalian & Realisasi"]
        Evaluasi["✅ Evaluasi & Pelaporan"]
    end

    subgraph Layanan["🛎️ LAYANAN ▼"]
        Kalender["📅 Kalender Kegiatan"]
        Unduhan["⬇️ Pusat Unduhan"]
        Klinik["🏥 Klinik Perencanaan"]
        Pengaturan["⚙️ Pengaturan & Bantuan"]
    end

    Sidebar --> Utama
    Sidebar --> Siklus
    Sidebar --> Layanan

    style Sidebar fill:#e8f5e9,stroke:#2e7d32
    style Utama fill:#e3f2fd,stroke:#1565c0
    style Siklus fill:#fff3e0,stroke:#e65100
    style Layanan fill:#f3e5f5,stroke:#7b1fa2
```

## 10. Export PDF RKA Flow

```mermaid
flowchart TD
    Start(["🖱️ Klik Export PDF"]) --> Collect["📊 Kumpulkan Data<br/>dari State"]
    Collect --> Filter["🔍 Filter Baris<br/>yang Kosong"]
    Filter --> Format["🔢 Format Angka<br/>Rupiah"]
    Format --> Generate["📄 Generate PDF<br/>jsPDF + autotable"]
    Generate --> Header["📋 Header<br/>• Judul<br/>• Tahun<br/>• Satuan<br/>• Formulir"]
    Header --> Table["📊 Tabel Data<br/>• Kode<br/>• Uraian<br/>• Koefisien<br/>• Satuan<br/>• Harga<br/>• PPN<br/>• Jumlah<br/>• Keterangan"]
    Table --> Footer["📝 Footer<br/>• Total Anggaran<br/>• Tanda Tangan"]
    Footer --> Download(["💾 Download PDF"])

    style Start fill:#e3f2fd,stroke:#1565c0
    style Generate fill:#fff3e0,stroke:#e65100
    style Download fill:#c8e6c9,stroke:#2e7d32
```

### Contoh Output PDF

```mermaid
block-beta
    columns 1
    Judul["RENCANA KERJA DAN ANGGARAN<br/>SATUAN KERJA PERANGKAT DAERAH"]:1
    Info["PEMERINTAH KABUPATEN BEKASI | Tahun: 2025 | Satuan: Kecamatan Kedungwaringin"]:1
    HeaderTabel["KODE | URAIAN | KOEF | SATUAN | HARGA | PPN | JUMLAH | KET"]:1
    Row1["5 | BELANJA DAERAH | | | | | |"]:1
    Row2["5.1 | BELANJA OPERASI | | | | | |"]:1
    Row3("[#] | Belanja Jilid | 1 | Buah | 44.700 | | 44.700 |"):1
    Total["JUMLAH ANGGARAN SUB KEGIATAN: Rp. 855.000"]:1
    TTD["Mengetahui, Kepala Bagian Perencanaan & Keuangan"]:1
```

## 11. Matrik Hak Akses

```mermaid
graph TB
    subgraph SuperAdmin["🦸 SUPER ADMIN"]
        SA_Full["✅ Semua Akses<br/>Input + Update + Delete<br/>+ Verifikasi + Approve"]
    end

    subgraph Admin["👨‍💼 ADMIN"]
        AD_Limit["⚠️ Terbatas<br/>Input + Update saja<br/>❌ Tidak bisa Delete"]
    end

    subgraph User["👤 USER"]
        US_Read["👁️ Read Only<br/>Hanya Lihat<br/>❌ Tidak bisa Edit"]
    end

    SuperAdmin -.->|Mengelola| Admin
    Admin -.->|Membantu| User

    style SuperAdmin fill:#c8e6c9,stroke:#2e7d32,color:#000
    style Admin fill:#bbdefb,stroke:#1565c0,color:#000
    style User fill:#f5f5f5,stroke:#9e9e9e,color:#666
```

### Detail Matrik

```mermaid
block-beta
    columns 4
    Fitur["FITUR"]:1
    SA["SUPER ADMIN"]:1
    AD["ADMIN"]:1
    US["USER"]:1

    block:header["Header"]:4
    header --> Fitur
    header --> SA
    header --> AD
    header --> US

    block:dashboard["Dashboard"]:4
    dashboard --> F1["Lihat Dashboard"]
    dashboard --> SA1["✅"]
    dashboard --> AD1["✅"]
    dashboard --> US1["✅"]

    block:perencanaan["Perencanaan"]:4
    perencanaan --> F2["Input/Edit"]
    perencanaan --> SA2["✅"]
    perencanaan --> AD2["✅"]
    perencanaan --> US2["❌"]

    block:delete["Delete"]:4
    delete --> F3["Hapus Data"]
    delete --> SA3["✅"]
    delete --> AD3["❌"]
    delete --> US3["❌"]

    block:verifikasi["Verifikasi"]:4
    verifikasi --> F4["Verifikasi"]
    verifikasi --> SA4["✅"]
    verifikasi --> AD4["❌"]
    verifikasi --> US4["❌"]
```

## 12. Arsitektur Aplikasi

```mermaid
graph TB
    subgraph Client["🖥️ CLIENT (Browser)"]
        subgraph ReactApp["⚛️ React App"]
            Pages["📄 Pages/Views"]
            Components["🧩 Components"]
            Services["🔌 API Services"]
            Utils["🛠️ Utils"]
        end
    end

    subgraph Server["🖥️ SERVER (Node.js)"]
        Express["⚡ Express.js"]
        Auth["🔐 Session Auth"]
        Multer["📁 Multer Upload"]
        Routes["🛣️ API Routes"]
    end

    subgraph DB["💾 DATABASE"]
        SQLite["🗄️ SQLite"]
        Tables["📊 Tables<br/>• users<br/>• programs<br/>• rka_forms<br/>• spj_pencairan<br/>• docs<br/>• usulan_rka<br/>• ..."]
    end

    Pages --> Components
    Pages --> Services
    Services --> Utils
    Services -->|HTTP/JSON| Express
    Express --> Auth
    Express --> Multer
    Express --> Routes
    Routes --> SQLite
    SQLite --> Tables

    style Client fill:#e8f5e9,stroke:#2e7d32
    style Server fill:#e3f2fd,stroke:#1565c0
    style DB fill:#fff3e0,stroke:#e65100
```

## 13. Alur Login & Autentikasi

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as 🖥️ Frontend
    participant B as ⚙️ Backend
    participant D as 💾 Database

    U->>F: Buka Aplikasi
    F->>B: GET /api/auth/me
    B->>D: Cek Session
    D-->>B: Session Valid?
    alt Session Valid
        B-->>F: Return User Data
        F-->>U: Tampilkan Dashboard
    else Session Invalid
        B-->>F: 401 Unauthorized
        F-->>U: Tampilkan Login Page
    end

    U->>F: Input Username + Password + Captcha
    F->>B: POST /api/auth/login
    B->>D: Verifikasi Credentials
    D-->>B: User Found?
    alt Valid
        B->>D: Update last_login
        B->>D: Create Session
        B-->>F: Return User + Session
        F-->>U: Redirect ke Dashboard
    else Invalid
        B-->>F: 401 Error
        F-->>U: Tampilkan Error
    end
```

## 14. Multi-Device Responsiveness

```mermaid
graph LR
    subgraph Desktop["🖥️ DESKTOP (> 1050px)"]
        D_Layout["Sidebar Fixed + Content Wide"]
        D_Grid["4 Column Grid"]
        D_Table["Full Table"]
    end

    subgraph Tablet["📱 TABLET (700-1050px)"]
        T_Layout["Sidebar Narrow (220px)"]
        T_Grid["2 Column Grid"]
        T_Table["Scrollable Table"]
    end

    subgraph Mobile["📱 MOBILE (< 700px)"]
        M_Layout["Off-Canvas Sidebar"]
        M_Grid["1-2 Column Grid"]
        M_Table["Horizontal Scroll"]
    end

    Desktop -->|Resize| Tablet
    Tablet -->|Resize| Mobile

    style Desktop fill:#e8f5e9,stroke:#2e7d32
    style Tablet fill:#e3f2fd,stroke:#1565c0
    style Mobile fill:#fff3e0,stroke:#e65100
```

---

## 📋 Ringkasan Login Default

| Role | Username | Password |
|:-----|:---------|:---------|
| Super Admin | `superadmin` | `superadmin123` |
| Admin | `admin` | `admin123` |
| User | `user` | `user123` |
| PPTK | `pptk` | `pptk123` |
| Camat | `camat` | `camat123` |
| Sekcam | `sekcam` | `sekcam123` |

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | React 18 + Vite 6 |
| Backend | Express 4 + Node.js 24 |
| Database | SQLite (better-sqlite3) |
| PDF | jsPDF + jspdf-autotable |
| Styling | Custom CSS (CSS Variables) |
| Auth | express-session + scrypt |

---

> **Catatan:** File ini dapat di-render langsung di GitHub atau VS Code dengan extension **Mermaid**. Semua diagram menggunakan syntax Mermaid yang kompatibel dengan GitHub Flavored Markdown.