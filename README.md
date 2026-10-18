# Freezyle Traiding

Dashboard riset dan validasi algoritma trading **Freezyle Trend Breakout K100** pada saham BEI KOMPAS100,
dibangun dengan Next.js (App Router), React, TypeScript, dan Tailwind CSS v4. Diekspor sebagai situs
statis: semua data hasil backtest dibaca saat build, tanpa API dan tanpa request ke luar saat runtime.

## Isi

- Aturan strategi lengkap, asumsi biaya BEI, sumber data, dan tanggal pembekuan (2026-10-18).
- Metrik sesudah biaya: CAGR, win ratio, profit factor, MDD, Sharpe, Calmar, exposure, dan lainnya.
- Kurva ekuitas skala log vs IHSG dan LQ45, drawdown, return bulanan dan tahunan, histogram trade.
- Uji validitas: in-sample vs out-of-sample, walk-forward, sensitivitas parameter, Monte Carlo,
  entry acak, uji keterlambatan 1 bar, uji biaya 2x, uji kebocoran data masa depan, forward test.
- Log trade lengkap yang bisa dicari dan diurutkan.

## Struktur

```
src/app/              layout, halaman, dan style global
src/components/ui/    komponen UI bersama
src/components/       bagian dashboard dan grafik SVG
src/lib/              pembaca data dan format angka
src/types/            tipe TypeScript untuk results.json
data/results.json     hasil backtest (sumber semua angka)
data/identity.json    identitas penulis
data/raw/             harga harian Yahoo Finance per saham (dipakai grafik harga)
data/manifest.json    tanggal unduh dan SHA256 tiap file data
design/tokens.json    token warna, radius, spasi, tipografi
assets/icons/         ikon PNG sumber
brand/                logo dan ikon aplikasi
scripts/prebuild.mjs  menyalin ikon, menulis token Tailwind, dan menyiapkan data pasar sebelum dev/build
scripts/market-data.mjs  mengubah CSV harga menjadi JSON per saham di public/data
scripts/serve.mjs     server statis lokal untuk folder out/
```

## Menjalankan

Butuh Node.js 20.9 atau lebih baru.

```
npm ci
npm run dev
```

Build statis ke `out/`:

```
npm run build
npm start
```

## Deploy

Vercel: import repo, framework Next.js, tanpa pengaturan tambahan. Netlify, Cloudflare Pages, atau
GitHub Pages: build command `npm run build`, output directory `out`.

## Data

Harga harian Yahoo Finance, diunduh 2026-10-18. Periode backtest 2016-09-01 sampai
2026-08-31, forward test sesudah 2026-08-31.

## Catatan

Hasil backtest bukan jaminan hasil di masa depan dan bukan saran investasi.
