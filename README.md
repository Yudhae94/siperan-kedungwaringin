# SIPERAN Kedungwaringin

SIPERAN (Sistem Perencanaan dan Pelaporan Terpadu) adalah dashboard lokal untuk Kecamatan Kedungwaringin. Data kini disimpan pada **MySQL** melalui backend Express dan sesi server.

## Menjalankan

```powershell
cd C:\Users\Yudhaeka12\SIPERAN-KEDUNGWARINGIN
npm install
npm run dev
```

Script `npm run dev` otomatis memastikan MySQL berjalan (lewat `scripts/start-mysql.js`), lalu menjalankan backend Express dan Vite bersamaan.

Buka `http://localhost:5173` (Vite meneruskan API ke server pada port 3000) atau jalankan `npm start` lalu buka `http://localhost:3000`.

## Database MySQL

Aplikasi memakai MySQL dengan konfigurasi default berikut (dapat dioverride lewat environment variable):

| Env | Default |
|---|---|
| `MYSQL_HOST` | `127.0.0.1` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | `siperan` |
| `MYSQL_PASSWORD` | `siperan123` |
| `MYSQL_DATABASE` | `siperan` |

Catatan untuk mesin lain:

- Install MySQL (atau MariaDB) terlebih dahulu, buat database `siperan` beserta user aplikasi, lalu set env di atas bila beda dari default.
- Lokasi MySQL portable di mesin saat ini dikonfigurasi lewat `MYSQLD_PATH` dan `MYSQL_INI_PATH` (default `C:\Users\Yudhaeka12\mysql9\...`, lihat `scripts/start-mysql.js`).
- Tabel dibuat dan diisi seed otomatis saat server pertama kali berjalan.
- Untuk memindahkan data lama dari SQLite: `npm run db:migrate` (butuh file `siperan.sqlite`).
- Uji cepat seluruh endpoint: `npm run test:smoke` (server harus berjalan; script ini memodifikasi sebagian data uji).

## Jalankan offline tanpa internet

Jika dependencies sudah terinstall di komputer ini, jalankan:

```bat
C:\Users\Yudhaeka12\SIPERAN-KEDUNGWARINGIN\offline-run.bat
```

File ini akan menjalankan aplikasi tanpa perlu mengunduh paket apapun dari internet.

## Backup versi project

Untuk membuat backup lokal project:

```bat
C:\Users\Yudhaeka12\SIPERAN-KEDUNGWARINGIN\backup-project.bat
```

File zip backup akan dibuat di folder `backup` di dalam project.

## Branch GitHub

Project ini sudah memiliki branch utama dan backup:

- `master` → branch utama untuk versi aktif
- `backup` → salinan aman / backup
- `dev` → cabang pengembangan lanjutan

Untuk berpindah ke branch pengembangan:

```powershell
cd C:\Users\Yudhaeka12\SIPERAN-KEDUNGWARINGIN
git checkout dev
```

## Membuka source code di VS Code

Buka file `SIPERAN-KEDUNGWARINGIN.code-workspace` dengan VS Code, atau jalankan:

```powershell
code C:\Users\Yudhaeka12\SIPERAN-KEDUNGWARINGIN
```

Source code utama berada di folder `src`, backend ada di `server.js`, dan database SQLite ada di `siperan.sqlite`.

## Fitur

- Dashboard ringkasan anggaran, progress, early warning, agenda, dan aktivitas.
- CRUD program kerja (tambah program) dengan data seed realistis.
- Pengendalian realisasi dan status otomatis selesai.
- Upload dokumen lokal yang benar-benar tersimpan di folder `uploads/`, status verifikasi, serta pusat unduhan.
- Evaluasi kinerja, kepatuhan pelaporan, kalender agenda, dan ekspor berkas ringkas.
- Mode peran Admin, PPTK/Kasi, dan Camat/Sekcam.
- Login multi-peran User, Admin, dan Super Admin dengan pencatatan SIGN_IN/SIGN_OUT.
- Hak akses: User hanya melihat data; Admin dapat tambah, edit, update, hapus, dan verifikasi; Super Admin memiliki akses penuh serta melihat manajemen pengguna.
- Data disimpan di MySQL (database `siperan`); tabel dibuat dan diisi otomatis saat server pertama kali berjalan.

## Upload dokumen lokal

Dokumen yang diunggah disimpan secara nyata di folder `uploads/` di dalam project agar dapat dibuka, dilihat, dan diunduh kembali dari aplikasi tanpa kehilangan data saat aplikasi dijalankan ulang.

## Akun demo

| Peran | Username | Password |
|---|---|---|
| User | `user` | `user123` |
| Admin | `admin` | `admin123` |
| Super Admin | `superadmin` | `superadmin123` |

Super Admin dapat melihat daftar pengguna dan jumlah aktivitas autentikasi dari menu Pengaturan & Bantuan.

Untuk mengulang data demo di komputer baru, kosongkan database `siperan` lalu jalankan server kembali — skema dan seed akan dibuat ulang otomatis. Untuk memindahkan data lama dari SQLite, jalankan `npm run db:migrate`.
