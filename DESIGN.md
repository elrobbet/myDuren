# DESIGN.md: myDuren Merchant Ledger

## Brand Identity & Soul
- **Product:** `myDuren`, buku kas, katalog harga varian, perhitungan modal-keuntungan, dan pencatatan stok penjualan box durian dengan fitur cadangan berkas JSON.
- **Audience:** Penjual durian yang mengatur harga varian tahunan, mencatat stok dan modal satuan per box, memantau laba bersih, serta mencatat transaksi harian lewat ponsel maupun desktop.
- **Personality:** Lugas, taktil seperti buku nota toko fisik, tanpa kalimat pemasaran atau basa-basi penjelasan.
- **Dial:** `ENERGY 1 / RHYTHM 2 / MOTION 1`

## Color System (R-29: 3 Core + 1 Accent, Verified R-25 WCAG AA)
### Light Mode (Default)
1. **Core Surface 1 (Warm Husk Paper):** `#F7F4EE` (Latar halaman hangat agar tidak menyilaukan mata saat dipakai di luar ruangan).
2. **Core Surface 2 (Ledger Card & Well):** `#FFFFFF` untuk kartu utama dan `#EFECE4` untuk kepala tabel / kotak ringkasan sekunder.
3. **Core Ink (Deep Bark Charcoal):** `#1C1917` (Teks utama, kontras 15.93:1 di atas `#F7F4EE`, 17.92:1 di atas `#FFFFFF`) dan `#57534E` (Teks sekunder, kontras 6.95:1 di atas `#F7F4EE`, 7.63:1 di atas `#FFFFFF`).
   - **Control Boundary:** `#78716C` (Kontras non-teks 4.80:1 di atas `#FFFFFF`, melampaui batas 3:1 WCAG 1.4.11).
4. **Deliberate Accent (Durian Husk Green):** `#2D5A27` dengan teks `#FFFFFF` (Kontras 8.07:1) pada tombol aksi utama dan indikator fokus.

### Dark Mode (Toggleable, R-21 & R-34)
1. **Core Surface 1 (Night Orchard Slate):** `#121614`
2. **Core Surface 2 (Elevated Bark Card):** `#1B211E` dan `#242C28`
3. **Core Ink (Warm Cream):** `#F3EFE6` (Teks utama, kontras 14.26:1 di atas `#1B211E`) dan `#B5B0A6` (Teks sekunder, kontras 7.58:1 di atas `#1B211E`).
   - **Control Boundary:** `#78827C` (Kontras non-teks 4.12:1 di atas `#1B211E`).
4. **Deliberate Accent (Ripe Durian Gold):** `#E5B842` dengan teks gelap `#121614` (Kontras 9.79:1).

## Typography & Hierarchy (R-06)
- **UI & Body:** `Plus Jakarta Sans` / sistem sans-serif modern yang bersih dan mudah dipindai cepat saat melayani pembeli.
- **Numeric & Currency Data:** `JetBrains Mono` / `tabular-nums` khusus untuk angka stok, jumlah box, dan nominal Rupiah agar digit sejajar vertikal di tabel maupun ringkasan kas.

## Liveliness Levers & Decisions (R-31: One-Line Reasons)
- **Why this color?** Kertas krem hangat (`#F7F4EE`) dan hijau kulit durian (`#2D5A27`) memberi identitas produk durian yang kontras tinggi tanpa silau putih steril.
- **Why this layout?** Tiga tahap responsif (1 kolom ponsel `<640px`, 2 kolom tablet `640px-960px`, dan split panel kasir + buku transaksi di desktop `>960px`) agar input kasir dan daftar transaksi terlihat sekaligus di layar lebar, serta menu tarik berlabel "Menu" di ponsel agar header tetap ringkas hanya menampilkan Sisa Stok.
- **Why this typography?** Angka transaksi memakai `font-variant-numeric: tabular-nums` dan font monospace agar nominal Rupiah mudah dijumlahkan secara visual.
- **Why this spacing?** Kerapatan ringkas (`12px-20px`) pada form kasir dipadukan dengan pemisah garis tegas (`1px solid`) seperti buku nota cetak.
- **Why use cards?** Di layar sempit (`<640px`), baris tabel diubah menjadi kartu nota individual agar kontrol status, metode bayar, dan tombol aksi tetap memenuhi target sentuh `44x44px` tanpa geser horizontal.
- **Why use icons?** Hanya ikon fungsional (sunting, hapus, dan toggle tema gelap/terang) dengan `aria-label` eksplisit, tanpa emoji dekoratif.
- **Identity Motif:** Garis ganda buku kas (*ledger double-rule*) di bawah header dan angka berformat `tabular-nums`.
