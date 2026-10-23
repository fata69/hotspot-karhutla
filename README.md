# Posko Bara

Pemantauan titik panas karhutla Indonesia dari data satelit VIIRS NASA FIRMS, dengan citra harian NASA GIBS. Antarmuka editorial bergaya buletin posko lapangan: peta sebagai fokus, rel informasi berhalaman tanpa scrollbar vertikal, dan bahasa Indonesia.

**Live:** [posko-bara.vercel.app](https://posko-bara.vercel.app)

## Fitur

- Peta sebaran titik panas terkunci di wilayah Indonesia — bisa zoom, tidak bisa digeser keluar scope.
- Filter periode (24 jam, 48 jam, 72 jam, 7 hari), ambang FRP, keyakinan, dan satelit.
- Mode harian: pilih tanggal untuk memuat ulang deteksi satu hari WIB sekaligus citra satelitnya.
- Citra satelit true color NOAA-20 per hari dari NASA GIBS, atau peta dasar Esri.
- Ringkasan, tren per jam/harian, peringkat provinsi, dan sorotan FRP tertinggi.
- Log deteksi berhalaman dengan pencarian, pengurutan, dan ekspor CSV.
- Legenda dapat disembunyikan agar peta tetap lega.
- Font di-host sendiri (Fontsource); tanpa Google Fonts maupun API key.

## Sumber data

- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) — VIIRS 375 m thermal hotspots, diakses tanpa API key melalui [Esri Living Atlas](https://livingatlas.arcgis.com/).
- [NASA GIBS](https://nasa.github.io/GIBS/) — komposit harian VIIRS NOAA-20 Corrected Reflectance True Color.
- [Esri Light Gray Canvas](https://www.esri.com/) — peta dasar mode Peta.
- Batas provinsi: [Deny Herianto](https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces).

Satu titik panas adalah anomali termal pada piksel 375 meter, bukan konfirmasi kebakaran. Verifikasi lapangan tetap diperlukan.

## Menjalankan

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, MapLibre GL, lucide-react.
