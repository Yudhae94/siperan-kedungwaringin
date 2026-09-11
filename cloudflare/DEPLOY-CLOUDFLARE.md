# SIPERAN-KEDUNGWARINGIN — Deploy permanen via Cloudflare Named Tunnel
# Hasil akhir: https://siperan.domain-anda (HTTPS otomatis dari Cloudflare)
# menuju aplikasi lokal http://localhost:3001 (Express melayani API + frontend dist/).
#
# KENAPA NAMED TUNNEL (bukan Quick Tunnel)?
# - URL permanen (Quick Tunnel `*.trycloudflare.com` berubah-ubah & untuk sementara).
# - Bisa dipasang sebagai service Windows agar online terus walau PC restart.
#
# PRASYARAT
# 1. Domain sudah masuk ke akun Cloudflare Anda
#    (dash.cloudflare.com -> Add domain -> ganti nameserver) — contoh: siperan.contoh.go.id
# 2. PC/server Windows ini selalu menyala + MySQL lokal berjalan (127.0.0.1:3306).
# 3. Aplikasi sudah bisa dibuka lokal di http://localhost:3001
#    (jalankan `cloudflare\run-server.bat` setelah `npm install` + `npm run build`).
# 4. cloudflared terpasang. File `bin\cloudflared.exe` sudah tersedia di repo ini.
#
# LANGKAH A — LOGIN (sekali saja, di PC/server ini)
#   bin\cloudflared.exe tunnel login
# - Browser terbuka -> pilih akun Cloudflare Anda (Account ID 46a7e66eb030b0befd1af1bb01d061bd).
# - Hasilnya file cert.pem di %USERPROFILE%\.cloudflared\.
#
# LANGKAH B — BUAT TUNNEL PERMANEN (sekali saja)
#   bin\cloudflared.exe tunnel create siperan
# - Catat TUNNEL_ID + file JSON yang dibuat, contoh:
#     C:\Users\NAMAAANDA\.cloudflared\<TUNNEL_ID>.json
#
# LANGKAH C — PASANG CONFIG
# 1. Salin cloudflare\config.example.yml menjadi:
#      %USERPROFILE%\.cloudflared\config.yml
# 2. Ganti isinya:
#      tunnel: <TUNNEL_ID_ANDA>
#      credentials-file: C:\Users\NAMAANDA\.cloudflared\<TUNNEL_ID_ANDA>.json
#      hostname: siperan.domain-anda (ganti contoh siperan.contoh.go.id)
#
# LANGKAH D — ARAHKAN DOMAIN KE TUNNEL (DNS otomatis oleh Cloudflare)
#   bin\cloudflared.exe tunnel route dns siperan siperan.domain-anda
# - Cek di Dashboard: dash.cloudflare.com -> domain Anda -> DNS -> ada record CNAME
#   siperan -> <TUNNEL_ID>.cfargotunnel.com (Proxied/awan oranye).
#
# LANGKAH E — TES MANUAL (jangan tutup 2 jendela ini)
# Jendela 1 (aplikasi):
#   cloudflare\run-server.bat
#   -> pastikan http://localhost:3001 bisa dibuka.
# Jendela 2 (tunnel):
#   bin\cloudflared.exe tunnel --config "%USERPROFILE%\.cloudflared\config.yml" run siperan
# - Buka https://siperan.domain-anda -> harus tampil login SIPERAN.
# - Login -> cek Dashboard, Pengendalian (LKA), Evaluasi & Pelaporan.
#
# LANGKAH F — JADIKAN SERVICE WINDOWS (agar online terus)
# 1. Pastikan config.yml (Langkah C) sudah benar.
# 2. Jalankan PowerShell sebagai Administrator:
#      bin\cloudflared.exe service install
#    (cloudflared membaca config.yml default di %USERPROFILE%\.cloudflared\config.yml)
# 3. Cek service `Cloudflared` berjalan:
#      Get-Service cloudflared
# 4. Untuk server aplikasi (opsional, rekomendasi pakai NSSM/pm2):
#    - Cara mudah: buat Scheduled Task yang menjalankan `cloudflare\run-server.bat` saat startup.
#
# PENGATURAN PENTING DI DASHBOARD CLOUDFLARE
# - SSL/TLS -> Encryption mode: Full (atau Full strict jika origin HTTPS).
# - SSL/TLS -> Edge Certificates: Always Use HTTPS = ON.
# - (Opsional) Zero Trust -> Access: batasi login hanya untuk email/pegawai tertentu.
# - (Opsional) WAF / Rate limiting untuk /api/auth/* jika dibuka ke publik.
#
# TROUBLESHOOTING
# - Error 1033 / tunnel tidak jalan: pastikan `cloudflared tunnel run` masih hidup
#   dan TUNNEL_ID di config.yml sama dengan hasil `tunnel create`.
# - Error 502 Bad Gateway: aplikasi lokal belum jalan (cek http://localhost:3001).
# - Session logout terus: pastikan akses via SATU hostname saja (jangan campur IP + domain),
#   karena cookie session terikat pada domain yang dipakai login.
# - MySQL mati: jalankan `node scripts\start-mysql.js`, cek MYSQL_HOST/PORT/USER/PASSWORD/DATABASE.
# - Setelah ganti kode: `npm run build`, restart `run-server.bat`, push ke GitHub.
#
# ENV PRODUKSI (set sebelum run-server.bat)
#   set PORT=3001
#   set MYSQL_HOST=127.0.0.1
#   set MYSQL_PORT=3306
#   set MYSQL_USER=siperan
#   set MYSQL_PASSWORD=isi-password-kuat
#   set MYSQL_DATABASE=siperan
#   set SESSION_SECRET=isi-string-acak-panjang
