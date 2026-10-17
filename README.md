# 🛒 Ngasir — Aplikasi Kasir (POS) Modern & Analitik UMKM

<p align="center">
  <img src="https://raw.githubusercontent.com/rayyanbabab/ngasir/main/public/file.svg" alt="Ngasir Logo" width="80" height="80" />
</p>

<p align="center">
  <b>Sistem Point of Sale (POS) berbasis web yang cepat, intuitif, dan responsif dengan dashboard analitik visual real-time untuk UMKM.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-00E599?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/ORM-Drizzle-C5F74F?style=for-the-badge&logo=drizzle" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Auth-Better--Auth-orange?style=for-the-badge" alt="Better Auth" />
</p>

---

## 📌 Tentang Aplikasi

Banyak pelaku UMKM saat ini masih mencatat transaksi penjualan dan stok barang secara manual, atau terbebani oleh software kasir lama yang kaku, rumit, dan memerlukan perangkat keras mahal.

**Ngasir** hadir sebagai solusi aplikasi kasir (*Point of Sale*) modern berbasis web yang ringan, cepat, dan mudah digunakan langsung melalui browser pada laptop, tablet, maupun smartphone. Dilengkapi dengan **dashboard visual visual interaktif**, pemilik usaha non-teknis sekalipun dapat langsung memantau performa penjualan harian, tren pendapatan, dan kondisi stok barang menipis dalam sekali pandang.

---

## ✨ Fitur Utama

- ⚡ **Modul Kasir (POS) Cepat & Responsif**:
  - Antarmuka layar sentuh atau klik untuk memilih produk dengan instan.
  - Perhitungan subtotal, kalkulasi kembalian otomatis, dan keranjang belanja dinamis.
  - Alur transaksi cepat dirancang untuk meminimalkan antrean kasir.
- 📊 **Dashboard Analitik & Visual Grafik**:
  - Visualisasi tren penjualan harian dan bulanan dengan chart interaktif berbasis Recharts.
  - Ringkasan pendapatan bersih, total transaksi, dan metrik bisnis utama.
  - Notifikasi *low-stock warning* untuk mencegah kehabisan barang.
- 📦 **Manajemen Produk & Inventaris**:
  - Tambah, edit, dan kelola katalog produk (nama barang, harga jual, stok sisa, dan barcode/SKU).
  - Optimasi dan kompresi gambar produk otomatis untuk menjaga performa loading aplikasi.
- 📷 **Pemindai Barcode & Generator Barcode**:
  - Dukungan pemindaian barcode langsung menggunakan kamera perangkat via `html5-qrcode` atau scanner USB/Bluetooth.
  - Fitur cetak dan generate barcode otomatis untuk label produk.
- 🧾 **Cetak Struk Thermal (Receipt Printer)**:
  - Format struk belanja rapi yang kompatibel dengan printer thermal (58mm / 80mm).
  - Dialog cetak langsung terintegrasi dengan browser print.
- 📑 **Riwayat Transaksi & Ekspor Data**:
  - Rekap lengkap histori penjualan beserta detail item yang dibeli.
  - Fitur cetak ulang struk (*reprint receipt*).
  - Ekspor laporan penjualan ke format **CSV / Excel** untuk pembukuan akuntansi.
- 🔐 **Autentikasi Aman**:
  - Sistem login terproteksi menggunakan [Better Auth](https://better-auth.com) dengan session token yang aman.
- 🌓 **Dukungan Tema Gelap & Terang**:
  - Tampilan elegan dengan mode Dark & Light yang nyaman dipandang dalam kondisi pencahayaan apa pun.

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
| --- | --- |
| **Framework** | [Next.js](https://nextjs.org) (App Router, Server Actions) |
| **UI Library** | [React 19](https://react.dev) |
| **Bahasa Pemrograman** | [TypeScript](https://www.typescriptlang.org) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) & [shadcn/ui](https://ui.shadcn.com) |
| **Database** | [Neon Serverless PostgreSQL](https://neon.tech) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) |
| **Autentikasi** | [Better Auth](https://better-auth.com) |
| **Charts** | [Recharts](https://recharts.org) |
| **Barcode Scanner** | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| **Icons** | [Lucide React](https://lucide.dev) |

---

## 📁 Struktur Direktori

```text
ngasir/
├── src/
│   ├── app/                      # App router halaman & API routes
│   │   ├── (auth)/login          # Halaman masuk / login
│   │   ├── dashboard/            # Halaman utama visual analitik
│   │   ├── pos/                  # Modul kasir & transaksi
│   │   ├── inventory/            # Manajemen stok & katalog produk
│   │   ├── transactions/         # Riwayat transaksi & cetak ulang
│   │   ├── settings/             # Pengaturan profil toko & struk
│   │   └── api/                  # API endpoints (Auth, Products, Orders)
│   ├── components/               # Komponen UI reusable (shadcn, sidebar, scanner)
│   │   ├── barcode-scanner-dialog.tsx
│   │   ├── barcode-view.tsx
│   │   ├── sidebar.tsx
│   │   └── ui/                   # Komponen atomik UI
│   └── lib/                      # Utilitas, konfigurasi auth, dan database
│       ├── auth.ts               # Better-Auth server configuration
│       ├── auth-client.ts        # Better-Auth client instance
│       ├── print-receipt.ts      # Engine helper cetak struk kasir
│       ├── export-csv.ts         # Helper export laporan ke file CSV
│       └── db/
│           ├── index.ts          # Koneksi database Neon Postgres
│           ├── schema.ts         # Skema Drizzle ORM
│           └── seed.ts           # Sample data generator
├── drizzle/                      # File migrasi database Drizzle
├── drizzle.config.ts             # Konfigurasi Drizzle Kit
└── package.json
```

---

## 🚀 Panduan Memulai

### 1. Prasyarat

Pastikan perangkat Anda sudah terpasang:
- **Node.js** versi 18.x atau lebih baru
- **npm**, **pnpm**, atau **yarn**
- Akun dan Database PostgreSQL di [Neon.tech](https://neon.tech) (atau database PostgreSQL lainnya)

### 2. Kloning Repository

```bash
git clone https://github.com/rayyanbabab/ngasir.git
cd ngasir
```

### 3. Instalasi Dependensi

```bash
npm install
```

### 4. Konfigurasi Environment Variables

Salin berkas sampel `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Isi variabel environment sesuai kebutuhan:

```env
# Koneksi Database Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Konfigurasi Better Auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-super-secret-key-at-least-32-characters"

# URL Publik Aplikasi
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Setup Database

Jalankan perintah migrasi skema tabel ke database:

```bash
npm run db:push
```

*(Opsional)* Jalankan seeder untuk mengisi data produk dan transaksi demo:

```bash
npm run db:seed
```

### 6. Jalankan Server Development

```bash
npm run dev
```

Buka peramban di [http://localhost:3000](http://localhost:3000) untuk mulai menggunakan Ngasir.

---

## 📜 Skrip yang Tersedia

| Skrip | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan aplikasi dalam mode pengembangan lokal |
| `npm run build` | Membuat bundle build produksi yang teroptimasi |
| `npm run start` | Menjalankan server aplikasi pada mode produksi |
| `npm run lint` | Melakukan audit linting kode dengan ESLint |
| `npm run db:push` | Menyinkronkan skema Drizzle ORM langsung ke database |
| `npm run db:migrate` | Menerapkan berkas migrasi database |
| `npm run db:seed` | Mengisi database dengan data dummy awal |
| `npm run db:studio` | Membuka antarmuka Drizzle Studio untuk eksplorasi data |

---

## 🌐 Panduan Deployment (Vercel)

1. Hubungkan repository GitHub ini ke akun [Vercel](https://vercel.com).
2. Tambahkan variabel lingkungan berikut pada menu **Project Settings > Environment Variables**:
   - `DATABASE_URL`: URL PostgreSQL dari Neon.
   - `BETTER_AUTH_SECRET`: Kunci rahasia acak untuk enkripsi sesi.
   - `BETTER_AUTH_URL`: Domain produksi Vercel Anda (misal `https://ngasir.vercel.app`).
   - `NEXT_PUBLIC_APP_URL`: Domain produksi Vercel Anda.
3. Klik tombol **Deploy** dan aplikasi siap digunakan secara publik.

---

## 🤝 Kontribusi

Kontribusi selalu diterima dengan tangan terbuka! Silakan baca panduan lengkap di [CONTRIBUTING.md](CONTRIBUTING.md) sebelum mengajukan Pull Request.

Untuk pelaporan bug keamanan, silakan tinjau kebijakan kami di [SECURITY.md](SECURITY.md).

---

## 📄 Lisensi

Didistribusikan di bawah lisensi MIT. Silakan gunakan dan kembangkan untuk mendukung ekosistem UMKM Indonesia.
