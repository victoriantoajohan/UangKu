# UangKu

Aplikasi pencatat keuangan pribadi (pemasukan & pengeluaran) full-stack dengan dua kanal input:

- **Web dashboard** — laporan, multi-dompet, budget per kategori, transaksi berulang.
- **Telegram bot** — catat transaksi lewat teks natural ("makan siang 25rb pakai GoPay") atau kirim foto struk belanja (OCR otomatis via Gemini vision).

> 📸 _Screenshot dashboard: `docs/screenshot-dashboard.png` (tambahkan setelah deploy)_
> 📸 _Screenshot bot Telegram: `docs/screenshot-bot.png` (tambahkan setelah deploy)_

## Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Satu deploy target untuk web + API + cron, cocok untuk Vercel serverless |
| Database | PostgreSQL (Neon) via `@neondatabase/serverless` | Driver HTTP tanpa koneksi persisten — aman dipakai di serverless/edge |
| ORM | Drizzle ORM | Tanpa native binary/engine (beda dengan Prisma), cold-start lebih cepat di serverless |
| UI | Tailwind CSS + komponen ala shadcn/ui + Recharts | Ringan, bisa di-generate langsung di repo (bukan runtime dependency) |
| Bot | grammY (webhook, bukan polling) | Webhook wajib untuk deployment serverless di Vercel |
| AI | Google Gemini API (`gemini-2.5-flash`, teks + vision) | Free tier tanpa kartu kredit (1.500 request/hari), tetap mendukung teks & vision dalam satu provider |
| Auth | NextAuth.js (Google OAuth + Email magic link) | Session tersimpan di Postgres yang sama via `@auth/drizzle-adapter` |
| Storage | Vercel Blob | Penyimpanan foto struk yang terintegrasi native dengan Vercel |
| Deploy | Vercel + GitHub Actions | Auto-deploy saat merge ke `main`, preview deploy untuk PR |

## Struktur Folder

```
src/
  app/                  # Next.js App Router (pages + API routes)
    (app)/              # Halaman dashboard yang butuh login (sidebar layout)
    api/                # Route handlers: auth, wallets, transactions, budgets,
                         # recurring, reports, telegram webhook/link, cron
    login/              # Halaman login (Google / email magic link)
  components/
    ui/                 # Primitif ala shadcn/ui (Button, Card, Dialog, dst.)
    dashboard/ wallets/ transactions/ budgets/ reports/ settings/ layout/
  db/
    schema.ts           # Skema Drizzle (users, wallets, transactions, dst.)
    index.ts            # Klien Drizzle (Neon HTTP driver)
  lib/
    ai-parser/          # Parser teks & OCR struk via Gemini
    telegram/           # Bot grammY, format angka ID, matching dompet/kategori
    validations/        # Skema Zod per domain
    reports.ts, wallet-balance.ts, recurring.ts, budget-notify.ts, ...
scripts/
  migrate.ts            # Menjalankan migrasi Drizzle
  seed.ts                # Seed kategori default + user/dompet contoh
  set-webhook.ts         # Mendaftarkan webhook Telegram ke URL production
tests/
  ai-parser/             # Unit test parser transaksi (Vitest)
.github/workflows/ci.yml # Lint -> type-check -> test -> build (+ deploy opsional)
vercel.json              # Konfigurasi Vercel Cron (recurring & recap)
```

## Fitur

- **Multi-dompet**: bank, e-wallet, cash, savings/tabungan, lainnya. Saldo dihitung otomatis dari saldo awal + transaksi. Transfer antar dompet dicatat sebagai sepasang transaksi (tidak dihitung income/expense). Dompet tipe `savings` punya proyeksi pertumbuhan 1-5 tahun berdasarkan setoran rutin bulanan + estimasi bunga tahunan.
- **Transaksi**: income/expense/transfer, kategori (default + custom), sumber (web/telegram_text/telegram_receipt), lampiran foto struk. CRUD penuh di web; `/undo` di bot untuk batalkan transaksi terakhir.
- **Telegram bot** (webhook, `grammY`):
  - `/start`, `/link <kode>`, `/saldo`, `/laporan`, `/undo`
  - Teks bebas diparse dengan Gemini ("makan siang 25rb pakai GoPay"), fallback regex untuk format baku (`keluar 25000 makan gopay`). Dompet/kategori yang ambigu ditanyakan lewat inline keyboard.
  - Foto struk → OCR via Gemini vision → konfirmasi ✅ Simpan / ✏️ Edit / ❌ Batal sebelum disimpan.
  - Semua angka format Indonesia (`Rp 25.000`), paham singkatan `25rb`, `1.5jt`, `100k`.
- **Budget** per kategori per bulan dengan progress bar, notifikasi Telegram otomatis saat >80% dan >100%.
- **Laporan**: perbandingan bulan-ke-bulan, breakdown kategori, ekspor CSV.
- **Transaksi berulang** (gaji, tagihan langganan) dijalankan via Vercel Cron harian.
- **Recap otomatis**: ringkasan mingguan (Senin pagi) dan bulanan (tanggal 1) dikirim ke Telegram.
- Semua query di-scope per `userId` — tidak ada kebocoran data antar pengguna.

## Setup Lokal

### 1. Prasyarat

- Node.js 20+, pnpm 10+ (`corepack enable` atau `npm i -g pnpm`)
- Database PostgreSQL (disarankan [Neon](https://neon.tech), gratis untuk mulai)

### 2. Clone & install

```bash
git clone https://github.com/victoriantoajohan/UangKu.git
cd UangKu
pnpm install
```

### 3. Environment variables

```bash
cp .env.example .env
```

Isi setidaknya `DATABASE_URL`, `NEXTAUTH_SECRET` (generate dengan `openssl rand -base64 32`), dan `NEXTAUTH_URL=http://localhost:3000`. Lihat penjelasan lengkap tiap variabel di `.env.example`.

### 4. Migrasi & seed database

```bash
pnpm db:generate   # hanya perlu dijalankan lagi jika src/db/schema.ts berubah
pnpm db:migrate    # menjalankan migrasi ke DATABASE_URL
pnpm db:seed       # seed kategori default + demo user & dompet
```

### 5. Jalankan dev server

```bash
pnpm dev
```

Buka http://localhost:3000.

### 6. Test & lint

```bash
pnpm test          # unit test (Vitest) — parser transaksi teks
pnpm lint           # ESLint
pnpm typecheck       # tsc --noEmit
pnpm build           # build production
```

## Cara Membuat Bot di BotFather

1. Chat [@BotFather](https://t.me/BotFather) di Telegram, kirim `/newbot`.
2. Ikuti instruksi (nama bot, username harus berakhiran `bot`).
3. Salin **token** yang diberikan → isi ke `TELEGRAM_BOT_TOKEN`.
4. (Opsional) Set foto profil & deskripsi bot lewat `/setuserpic` dan `/setdescription`.
5. Generate string acak untuk `TELEGRAM_WEBHOOK_SECRET` (mis. `openssl rand -hex 20`) — ini dipakai untuk memvalidasi header `X-Telegram-Bot-Api-Secret-Token` di webhook, bukan dari BotFather.

Karena Vercel adalah platform serverless, bot **wajib** berjalan dalam mode **webhook** (bukan long-polling) — ini sudah diimplementasikan di `/api/telegram/webhook`.

## Cara Mendapatkan Gemini API Key (Gratis)

Parsing teks natural dan OCR struk memakai [Google Gemini API](https://ai.google.dev), yang punya tingkat gratis tanpa kartu kredit:

1. Buka [aistudio.google.com/apikey](https://aistudio.google.com/apikey), login dengan akun Google.
2. Klik **Create API key** → pilih atau buat Google Cloud project (tidak perlu mengaktifkan billing untuk tingkat gratis).
3. Salin API key → isi ke `GEMINI_API_KEY`.
4. Model yang dipakai (`gemini-2.5-flash`) berada di tingkat gratis dengan kuota ±1.500 request/hari & 15 request/menit — lebih dari cukup untuk pemakaian pribadi. Jika kuota harian habis, bot otomatis fallback ke regex sederhana untuk format baku (`keluar 25000 makan gopay`) sehingga pencatatan teks tetap jalan; hanya OCR struk yang butuh Gemini secara penuh.

## Cara Membuat Database Neon

1. Buat akun di [neon.tech](https://neon.tech), buat project baru.
2. Salin connection string (mode "Pooled connection" cocok untuk serverless) → isi ke `DATABASE_URL`.
3. Jalankan `pnpm db:migrate` (bisa dari lokal, dengan `DATABASE_URL` mengarah ke Neon) lalu `pnpm db:seed`.

## Setup di Vercel

1. Import repo GitHub ini di [vercel.com/new](https://vercel.com/new) — Vercel otomatis mendeteksi framework Next.js.
2. Di **Project Settings → Environment Variables**, isi semua variabel dari `.env.example`:
   - `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `GEMINI_API_KEY`
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (isi dengan domain production, mis. `https://uangku.vercel.app`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (jika pakai Google OAuth — buat di [Google Cloud Console](https://console.cloud.google.com/apis/credentials), authorized redirect URI: `https://<domain>/api/auth/callback/google`)
   - `EMAIL_SERVER` / `EMAIL_FROM` (jika pakai email magic link)
   - `BLOB_READ_WRITE_TOKEN` (otomatis terisi setelah menambahkan integrasi **Vercel Blob** di tab Storage)
   - `CRON_SECRET` (string acak — melindungi endpoint `/api/cron/*` dari akses publik)
   - `APP_URL` (domain production, dipakai oleh `scripts/set-webhook.ts`)
3. Deploy. Auto-deploy ke production akan berjalan setiap merge ke `main`; setiap PR mendapat preview deployment (bawaan integrasi Vercel–GitHub).
4. `vercel.json` sudah berisi konfigurasi 3 Cron Job (`recurring` harian, `recap-weekly` tiap Senin, `recap-monthly` tanggal 1) — otomatis aktif setelah deploy pertama.

## Mendaftarkan Webhook Telegram

Setelah deploy pertama (dan env vars terisi di Vercel):

```bash
# Jalankan dari lokal, dengan .env berisi TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, APP_URL production
pnpm telegram:set-webhook
```

Script ini memanggil `setWebhook` Telegram API mengarah ke `https://<APP_URL>/api/telegram/webhook` dan menampilkan status webhook saat ini.

## Menghubungkan Akun Telegram ke Akun Web

1. Login ke dashboard web → **Pengaturan** → **Hubungkan Telegram** → klik "Generate Kode OTP".
2. Kirim `/link <kode>` ke bot di Telegram (kode berlaku 10 menit).
3. Setelah terhubung, semua transaksi lewat bot otomatis tersimpan ke akun web yang sama.

## Deploy Full via GitHub Actions (opsional)

`.github/workflows/ci.yml` menjalankan lint → type-check → test → build pada setiap push/PR ke `main`. Job `deploy` berjalan setelah CI hijau di `main`, memakai Vercel CLI — aktifkan dengan mengisi repository secrets:

- `VERCEL_TOKEN` (Account Settings → Tokens)
- `VERCEL_ORG_ID` dan `VERCEL_PROJECT_ID` (dari file `.vercel/project.json` setelah `vercel link`, atau Project Settings → General)

Jika secrets ini tidak diisi, job deploy otomatis di-skip dan kamu cukup mengandalkan integrasi native Vercel–GitHub (auto-deploy ke production + preview per PR), yang **sudah cukup** untuk kebanyakan kasus.

## Catatan Keputusan Teknis

- **Drizzle ORM (bukan Prisma)** dipilih karena tidak memerlukan native query engine binary — start-up lebih cepat dan lebih ringan di cold-start serverless Vercel.
- **Neon HTTP driver** (`@neondatabase/serverless`) dipakai (bukan koneksi TCP biasa) karena cocok dengan model request-per-invocation di serverless functions, tanpa connection pooling manual.
- **grammY dengan webhook** (bukan polling) — polling butuh proses long-running yang tidak didukung serverless.
- **Google Gemini (bukan Anthropic Claude)** dipilih sebagai provider AI karena tingkat gratisnya tanpa kartu kredit (`gemini-2.5-flash`, ±1.500 request/hari) mendukung teks *dan* vision dalam satu API — cocok untuk proyek personal yang tidak mau/tidak bisa membuka billing Anthropic. Kalau nanti butuh kualitas parsing lebih tinggi, tinggal ganti isi `src/lib/ai-parser/client.ts` ke provider lain karena pemanggilnya (`text-parser.ts`, `receipt-parser.ts`) sudah terisolasi dari detail SDK.
- **NextAuth strategi `database`** (bukan JWT) dipilih agar sesi konsisten dan mudah di-invalidate, memakai tabel yang sama dengan domain data.
- Semua endpoint API divalidasi dengan **Zod** dan di-scope per `userId` dari sesi NextAuth untuk mencegah kebocoran data antar pengguna.
