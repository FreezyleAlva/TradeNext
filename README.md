# Freezyle Traiding

Dashboard riset dan validasi algoritma trading **Freezyle Trend Breakout K100** pada saham BEI KOMPAS100,
dibangun dengan Next.js (App Router), React, TypeScript, dan Tailwind CSS v4. Diekspor sebagai situs
statis: semua data hasil backtest dibaca saat build, tanpa API dan tanpa request ke luar saat runtime.

## Revisi UTS (30 Oktober 2026)

Feedback UTS: mesin backtest sempat terlewat saat penilaian karena tidak berada di repositori dashboard,
dan hasil pada data penilai berbeda (10,2%). Revisi ini:

1. Memasukkan mesin backtest Python (`backtest/`) dan 102 file harga mentah (`data/raw/`) ke repositori ini.
2. Membuktikan reproduksi: `python -m backtest verify` menjalankan ulang backtest dari data mentah dan
   mencocokkan 212/212 trade serta semua metrik utama dengan `data/results.json` (selisih ekuitas akhir Rp0).
3. Membuktikan data asli: SHA256 102/102 file cocok dengan `data/manifest.json`, dan unduhan ulang Yahoo
   30 Okt 2026 identik dengan snapshot 18 Okt (204.955 bar dibandingkan, 0 berbeda).
4. Mengaudit kualitas data terhadap batas ARA/ARB BEI: 6 bar glitch Yahoo ditemukan (MAPI, TOWR Mei 2018;
   MINA Mar 2019) dan dibersihkan pada skenario data bersih.
5. Menjalankan 9 skenario sensitivitas data dan eksekusi (data bersih, spread 2-3 fraksi, biaya 2x, tunda 1 bar,
   tanpa IPO baru, modal Rp10 miliar, gabungan). Rentang CAGR 10,6% - 20,1%, semuanya di atas IHSG (2,0%).
6. Parameter beku (150 / 100 / 5) tidak diubah. `data/results.json` tidak disentuh; semua angka revisi ada di
   `data/revision.json`.

## Mesin backtest

Butuh Python 3.10 atau lebih baru.

```
pip install -r requirements.txt
python -m backtest verify      # cek SHA256 data dan reproduksi semua klaim (beberapa detik)
python -m backtest revision    # hitung ulang data/revision.json
python -m backtest download    # unduh ulang Yahoo ke data/snapshots/<tanggal> (opsional, butuh internet)
```

| File | Isi |
|---|---|
| `backtest/config.py` | parameter beku, periode, biaya, aturan pasar |
| `backtest/data.py` | baca CSV, susun matriks harga, faktor split, indikator dasar |
| `backtest/engine.py` | eksekusi BEI: pembukaan t+1, fraksi, lot, spread, fee, ARA/ARB, likuiditas, dividen |
| `backtest/metrics.py` | CAGR, MDD, Sharpe, Sortino, Calmar, metrik trade |
| `backtest/data_audit.py` | audit kualitas data dan pembersih glitch |
| `backtest/revision.py` | reproduksi, integritas, kualitas, skenario sensitivitas |
| `backtest/download.py` | pengunduh ulang Yahoo Finance |

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
backtest/             mesin backtest Python (lihat bagian Mesin backtest)
data/results.json     hasil backtest beku (sumber semua angka UTS)
data/revision.json    hasil revisi: reproduksi, integritas, kualitas data, skenario
data/identity.json    identitas penulis
data/raw/             harga harian Yahoo Finance per saham (dipakai grafik harga)
data/manifest.json    tanggal unduh dan SHA256 tiap file data
design/tokens.json    token warna, radius, spasi, tipografi
assets/icons/         ikon PNG sumber
brand/                logo dan ikon aplikasi
assets/bg/            latar landscape dan portrait
assets/fonts/         Inter latin woff2
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
