# SIPERAN Kedungwaringin — Codebase Overview

## Summary
SIPERAN (Sistem Perencanaan dan Pelaporan Terpadu) is a local, browser-based government planning & reporting dashboard for **Kecamatan Kedungwaringin** (Indonesia). It manages program/activity budgets (pagu vs realisasi), RKA (Rencana Kerja dan Anggaran) forms, e-usulan kegiatan, document upload/verification, calendars, monthly reports, and role-based access (User / Admin / Super Admin). Data persists in a local SQLite file (`siperan.sqlite`), seeded automatically on first server start. It is a personal/local deployment — a single Express backend serving a monolithic React SPA.

## Architecture
- **Primary pattern**: Single-page React app (frontend) + Express JSON REST API (backend) + SQLite via Node's built-in `node:sqlite` (`DatabaseSync`). Not layered — it is a thin client over a thin server; all business logic lives either in `server.js` routes/seed or in `src/main.jsx` component functions.
- **Technology stack**: Node 22+ (uses `node:sqlite`, top-level await), Express 4, express-session, multer (file uploads), React 18, Vite 6, lucide-react icons, jsPDF. Vite dev server proxies `/api` → `http://localhost:3000`.
- **Startup flow**: `npm run dev` → `node server.js` → creates `siperan.sqlite`, runs `seed()`, listens on port 3000 (auto-increments up to +20 if busy). Vite serves the SPA at :5173 and proxies `/api`.
- **Unique trait — the frontend is one giant file**: All pages, components, hooks, modals, and the app tree live in `src/main.jsx`. The folders `src/pages`, `src/components/{admin,common,superadmin,user}`, and `src/hooks` are **empty directories** — they exist but hold nothing. Do not look for them; everything is in `main.jsx`.

## Directory Structure
```
SIPERAN-KEDUNGWARINGIN/
├── server.js                     — Entire backend: DB schema, seed, auth, all REST routes, upload handling
├── src/
│   ├── main.jsx                  — ENTIRE frontend (single-file SPA): App, Login, all pages, modals, API helper
│   ├── styles.css                — All styling (CSS variables, light/dark themes, component-specific classes)
│   └── utils/constants.js        — bidangOptions + ROLES (only used for bidan & roles; note: duplicated in main.jsx)
├── index.html                    — SPA entry, #root div, loads /src/main.jsx
├── vite.config.js                — React plugin + /api proxy to :3000
├── qa-login.mjs                  — Playwright test helper for QA (fills admin login + captcha)
├── uploads/                      — Files physically stored by multer (real on-disk storage)
├── siperan.sqlite                — SQLite DB (auto-created; delete to reset seed data)
├── backup/                       — zip backups (see backup-project.bat)
├── package.json / package-lock.json
└── README.md                     — Setup, run, demo accounts, feature list
```

## Key Abstractions

### [App] (src/main.jsx)
- **Responsibility**: Root component; holds all global state (users, currentUser, programs, docs, reports, events, approvalBoard, usulanRka, modals, theme, etc.) and renders the sidebar + active page based on `active` state.
- **Interface**: `active` state drives which page component renders (dashboard, kalender, perencanaan, usulan-rka, upload-pendukung, verifikasi-usulan, pengendalian, evaluasi, unduhan, arsip, pengaturan).
- **Lifecycle**: Mounts once; on login fetches everything in parallel via `Promise.all`.
- **Used by**: All pages.

### [Planning] (Perencanaan (E-Usulan Kegiatan) page) — src/main.jsx
- **File**: `src/main.jsx`, the `Planning` function component.
- **Responsibility**: The "Perencanaan" page — lists E-Usulan Kegiatan (backed by `programs` via `/api/programs`), has "E-Usulan Kegiatan" add button, the **"Input RKA" toggle** (`RkaForm`), and a `planning-subnav` row of four navigation buttons (Usulan RKA/KAK, Upload Dokumen Pendukung, Verifikasi Usulan, Arsip Renja & DPA).
- **Relevant to the user request**: The "E-Usulan Kegiatan" button calls `onAdd` → opens `modal === 'program'` → `addProgram` → POST `/api/programs`. The "Input RKA" button (`<button className="secondary">`) toggles `showRkaForm` → renders `RkaForm`.

### [RkaForm] — src/main.jsx
- **Responsibility**: Inline editable RKA spreadsheet (kode, uraian, koefisien, satuan, harga, ppn, jumlah) with hardcoded default rows and a hardcoded year **2025**. Saves via POST `/api/rka`, exports PDF.
- **Quirk**: Hardcodes `tahun: '2025'` and `title: 'Rencana Kerja dan Anggaran'`, `satuan: 'Kecamatan Kedungwaringin'`, `formulir: 'RKA MANUAL - RINCIAN BELANJA SKPD'` regardless of DB.

### [UsulanRkaPage / UploadPendukungPage / VerifikasiUsulanPage] — src/main.jsx
- **Responsibility**: The "Usulan RKA / KAK" flow — create usulan (`POST /api/usulan-rka`), upload KAK/RAB/Jadwal documents per usulan, and verify (Disetujui / Perlu perbaikan / Ditolak). Backed by `usulan_rka`, `usulan_rka_dokumen`, `usulan_rka_verifikasi` tables.

### [server.js] — Backend entry / DB schema / seed / routes
- **Responsibility**: Creates all tables, seeds demo data, and exposes REST endpoints. Key tables: `users`, `programs`, `docs`, `events`, `auth_log`, `admin_contacts`, `doc_reviews`, `section_approvals`, `rka_forms`, `rka_rows`, `monthly_reports`, `login_attempts`, `e_usulan_kegiatan` (mirror), `usulan_rka`, `usulan_rka_dokumen`, `usulan_rka_verifikasi`.
- **Important**: `e_usulan_kegiatan` is **not** directly written by the frontend. It is a trigger-mirror of `programs` (INSERT/UPDATE/DELETE triggers copy `programs` ↔ `e_usulan_kegiatan`).

### [auth / write / superAdminOnly middleware + session]
- **Responsibility**: `auth` requires `req.session.user`; `write` blocks role `User`; `superAdminOnly` requires role `Super Admin`. Login uses a CAPTCHA stored in session (`req.session.loginCaptcha`), verified on POST `/api/auth/login`.

## Data Flow

**Login flow:**
1. Login page calls `api('/auth/captcha')` → server sets `req.session.loginCaptcha` and returns it.
2. User submits username/password/captcha → `POST /api/auth/login` middleware verifies CAPTCHA, logs attempt to `login_attempts`, then verifies credentials. On success sets `req.session.user`, inserts `auth_log` (SIGN_IN), returns user.
3. `App` calls `api('/auth/me')` → `setCurrentUser` → effect fires `Promise.all` fetch of programs/docs/reports/events/log/users/contacts/approvals/usulan → fills state.

**E-Usulan Kegiatan (add):**
1. User clicks "E-Usulan Kegiatan" → `onAdd` sets `modal = 'program'` → `addProgram` (`main.jsx`) → `api('/programs', POST)` sends nama/bidang/target/pagu/penanggung/deadline.
2. Server `POST /api/programs` validates & inserts into `programs`. The trigger `programs_to_e_usulan_insert` mirrors the row into `e_usulan_kegiatan`.
3. `setPrograms([...programs, p])` re-renders the list.

**Input RKA:**
1. User clicks "Input RKA" (`<button className="secondary">`) → `setShowRkaForm(true)` → renders `RkaForm`.
2. `RkaForm` loads existing RKA from `/api/rka` on mount; rows are editable inline; "Simpan RKA" → `POST /api/rka` with rows → server upserts `rka_forms` + replaces `rka_rows`; "Export PDF" → `jsPDF`.

**Usulan RKA / KAK:**
1. `UsulanRkaPage` → "Usulan baru" → modal → `submitUsulan` → `POST /api/usulan-rka` (judul, bidang, jenis, tahun_anggaran, pagu, penanggung, target, batas_waktu, catatan).
2. Upload dokumen → `POST /api/usulan-rka/:id/dokumen` (multer stores file in `uploads/`, row in `usulan_rka_dokumen`).
3. Verification → `PATCH /api/usulan-rka/:id/verifikasi` sets status + appends `usulan_rka_verifikasi` history row.

## Non-Obvious Behaviors & Design Decisions

- **The whole frontend is one file.** `src/main.jsx` is ~1,200+ lines containing every page, modal, and helper. The `src/pages/` and `src/components/*` directories are empty placeholders — this is the single most surprising thing for a new developer. The "componentized" folder structure in the repo is fake; the code isn't modular.
- **`e_usulan_kegiatan` is a trigger-mirror, not a first-class table.** There is **no `/api/e-usulan` endpoint**. The frontend "E-Usulan Kegiatan" button POSTs to `/api/programs`. The `e_usulan_kegiatan` table is only populated by DB triggers when `programs` changes. This means "E-Usulan Kegiatan" === "Program" in practice; if you want it to be independently fillable/editable with its own schema, the backend and frontend must be extended (currently no dedicated API/table usage).
- **`programs` seed uses `bidang` normalization.** `normalizeBidang` coerces any unknown value to the first option. The `programs` seed also has a query that remaps old bidang values ('Infrastruktur', 'Pelayanan Publik', etc.) to the new Kasi-based options on every startup.
- **RKA form is hardcoded to 2025.** The `RkaForm` component hardcodes `tahun: '2025'`, `title`, `satuan`, `formulir` regardless of the actual page context (title says "Tahun Anggaran 2026"). Save overwrites `rka_forms` (only one form stored — `ORDER BY id DESC LIMIT 1`).
- **Deleting a doc/event/usulan requires Super Admin**, even though edit/verify only need `write` (Admin+). Deleting a file also deletes the physical file from `uploads/` (`fs.unlinkSync`).
- **Document preview is auto-generated.** The server's `createDocPreview` produces canned Indonesian text based on file extension/type; the frontend has its own `createDocPreview` if no server preview is provided. Legacy seed rows have `preview` but `file_path`/`storage_name` = null — those can only be "downloaded" as generated PDFs, not opened from disk.
- **Auth logging dual-path.** Both `auth_log` (SIGN_IN/SIGN_OUT) and `login_attempts` (success/failure + reason) are written. `auth_log` is shown in Settings; `login_attempts` is for auditing only.
- **Port fallback.** `getAvailablePort` tries the requested port then increments up to +20 if the port is busy, so it won't crash on a conflict.
- **Seed only runs on empty tables.** Deleting `siperan.sqlite` resets everything to the documented seed data. `db.exec` uses `CREATE TABLE IF NOT EXISTS` + a manual column-adding loop for `docs` migrations.
- **`monthly_reports` is only inserted, never updated via the UI** — it's a separate tracked collection; the frontend fetches but the only write endpoint is `POST /api/monthly-reports`.
- **Frontend `api` helper** uses `credentials: 'include'` and throws `Error` with the server's `error` field; it returns `null` on 204. There's a hardcoded `notify` default message "Gagal memuat data server" if any initial fetch fails.

## The RKA / E-Usulan area (what the user asked about)

- **"Input RKA" button** (`Planning` component, `src/main.jsx`): a plain `<button className="secondary">` in the `title-actions-inline` area, toggling `showRkaForm`. It sits next to the "E-Usulan Kegiatan" `<Button>` (primary) and the unit filter. It is styled as a generic secondary button, **not** matching the `planning-subnav` buttons which use `display:inline-flex; gap:8px; padding:10px 14px; border-radius:10px; font-size:12px; font-weight:700`.
- **"E-Usulan Kegiatan" button**: `<Button>` primary (`<Plus size={17}/> E-Usulan Kegiatan`), which opens the program add modal. It POSTs to `/api/programs`.
- **The `planning-subnav`** below the page title already establishes a "consistent, tidy" group style (four primary buttons with icons). The user's request is to make the "Input RKA" and "E-Usulan Kegiatan" buttons match that existing pattern for visual consistency.
- **Database for e-usulan**: Currently `e_usulan_kegiatan` is only a trigger-mirror of `programs`. To make "e-usulan" independently fillable (e.g. with its own fields or a dedicated endpoint/modal that writes directly to `e_usulan_kegiatan`), the backend needs a new endpoint (`GET/POST/PATCH/DELETE /api/e-usulan`) and the frontend needs the form to call it. As-is, the "E-Usulan Kegiatan" form writes to `programs` and the mirror fires automatically — so it *is* fillable, but only as a program, with a fixed field set (nama, bidang, target, pagu, penanggung, deadline, kode).

## Module Reference

| File | Purpose |
|------|---------|
| `server.js` | Entire backend: DB schema/seed, auth (CAPTCHA), all REST routes, multer uploads, static serving, error handler |
| `src/main.jsx` | Entire frontend SPA: App state, Login, Dashboard, Calendar, Planning (E-Usulan Kegiatan), RkaForm, Usulan RKA/KAK pages, Control, Evaluation, Downloads, Archive, Settings, modals, API helper |
| `src/styles.css` | All styling: CSS variables, light/dark themes, layout, tables, buttons, modals, rka-sheet, planning-subnav, progress editor |
| `src/utils/constants.js` | `bidangOptions` + `ROLES` (duplicated inside main.jsx — the file is barely used) |
| `vite.config.js` | React plugin + `/api` → `http://localhost:3000` proxy |
| `qa-login.mjs` | Playwright QA helper: fills admin login + reads captcha code |
| `index.html` | SPA shell, `#root`, loads `/src/main.jsx` |

## Suggested Reading Order

1. `server.js` — Why start here: it defines the whole data model, seed, and every API. Understanding the tables and routes is prerequisite to the frontend.
2. `src/main.jsx` (top half) — App state, `api()` helper, `bidangOptions`, seed data, modals, login.
3. `src/main.jsx` (`Planning` + `RkaForm`) — The exact area the user is asking about (E-Usulan Kegiatan + Input RKA buttons).
4. `src/main.jsx` (`UsulanRkaPage`, `UploadPendukungPage`, `VerifikasiUsulanPage`) — The Usulan RKA/KAK flow.
5. `src/main.jsx` (`Control`, `Evaluation`, `Settings`) — Realisasi control, document review/verification, settings/contacts.
6. `src/styles.css` — The button/layout classes that govern visual consistency (`planning-subnav`, `primary`/`secondary`, `title-actions-inline`, `.rka-*`).

---

*Note to developer: This is an EXPLORE MODE investigation. The user's request ("rapikan tombol Input RKA & E-Usulan" + "update database e-usulan agar bisa mengisi") is an implementation task. Those changes must be done in Act Mode — this document captures the current structure so Act Mode can proceed with full context.*
