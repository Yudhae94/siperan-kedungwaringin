$g = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/captcha' -SessionVariable s -UseBasicParsing
$cap = ($g.Content | ConvertFrom-Json).captcha
$svg = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($cap.Split(',')[1]))
$code = ([regex]::Matches($svg, '>([A-Z2-9])</text>') | ForEach-Object { $_.Groups[1].Value }) -join ''
$login = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body ('{"username":"admin","password":"admin123","captcha":"' + $code + '"}') -ContentType 'application/json' -WebSession $s -UseBasicParsing
Write-Output "LOGIN: $($login.StatusCode)"
$th = Invoke-WebRequest -Uri 'http://localhost:3000/api/clinic/threads' -Method Post -Body '{"topic":"Uji coba pertanyaan KAK"}' -ContentType 'application/json' -WebSession $s -UseBasicParsing
Write-Output "THREAD CREATE: $($th.StatusCode)"
$tid = ($th.Content | ConvertFrom-Json).id
$m = Invoke-WebRequest -Uri "http://localhost:3000/api/clinic/threads/$tid/messages" -Method Post -Body '{"message":"Mohon pencerahan format revisi KAK."}' -ContentType 'application/json' -WebSession $s -UseBasicParsing
Write-Output "MESSAGE: $($m.StatusCode)"
$c = Invoke-WebRequest -Uri 'http://localhost:3000/api/clinic/consultations' -Method Post -Body '{"layanan":"Konsultasi Keuangan (RAB/SPJ)","tanggal":"2026-09-15","sesi":"Pagi (08.00-11.00)","agenda":"Uji jadwal"}' -ContentType 'application/json' -WebSession $s -UseBasicParsing
Write-Output "CONSULT CREATE: $($c.StatusCode)"
$cid = ($c.Content | ConvertFrom-Json).id
$u = Invoke-WebRequest -Uri "http://localhost:3000/api/clinic/consultations/$cid" -Method Patch -Body '{"status":"Dikonfirmasi","catatan":"Diterima"}' -ContentType 'application/json' -WebSession $s -UseBasicParsing
Write-Output "CONSULT UPDATE: $($u.StatusCode) - status: $(($u.Content | ConvertFrom-Json).status)"
$r = Invoke-WebRequest -Uri 'http://localhost:3000/api/users' -WebSession $s -UseBasicParsing
Write-Output "USERS: $($r.StatusCode)"
$d = Invoke-WebRequest -Uri "http://localhost:3000/api/clinic/threads/$tid" -Method Delete -WebSession $s -UseBasicParsing
Write-Output "THREAD DELETE (SuperAdmin only): $($d.StatusCode)"
