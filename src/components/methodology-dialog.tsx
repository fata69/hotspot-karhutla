import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

interface MethodologyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const sources = [
  {
    name: 'NASA FIRMS',
    detail: 'Fire Information for Resource Management System — VIIRS 375 m near real-time.',
    href: 'https://firms.modaps.eosdis.nasa.gov/',
  },
  {
    name: 'NASA GIBS',
    detail: 'Global Imagery Browse Services — citra true color harian NOAA-20.',
    href: 'https://nasa.github.io/GIBS/',
  },
  {
    name: 'Esri Living Atlas',
    detail: 'Feature service yang mendistribusikan layer titik panas VIIRS tanpa kunci API.',
    href: 'https://livingatlas.arcgis.com/',
  },
  {
    name: 'Batas provinsi',
    detail: 'GeoJSON 38 provinsi oleh Deny Herianto. Batas disederhanakan, bukan rujukan resmi.',
    href: 'https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces',
  },
]

function Block({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-rule py-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="micro-label text-ember">{index}</span>
        <h3 className="micro-label text-ink">{title}</h3>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <div className="space-y-2 text-[11px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  )
}

export function MethodologyDialog({ open, onOpenChange }: MethodologyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="border-b-2 border-ember px-5 pb-4 pr-14 pt-5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-ember" />
            <span className="micro-label text-ember">Metodologi & batas data</span>
          </div>
          <DialogTitle className="mt-1.5 font-display text-[34px] font-normal leading-[0.95] tracking-[-0.01em] text-ink">
            Cara membaca titik panas.
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-[46ch] text-[11px] leading-relaxed text-muted-foreground">
            Posko Bara memetakan anomali termal satelit, bukan kebakaran terverifikasi. Pahami
            sumber, skala, dan keterbatasannya sebelum menarik kesimpulan lapangan.
          </DialogDescription>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.06em] text-muted-foreground">
            <span className="border border-rule bg-paper-raised px-1.5 py-0.5">NASA FIRMS</span>
            <span>→</span>
            <span className="border border-rule bg-paper-raised px-1.5 py-0.5">Esri Living Atlas</span>
            <span>→</span>
            <span className="border border-ink bg-ink px-1.5 py-0.5 text-paper">Posko Bara</span>
            <span className="ml-auto">Waktu WIB · UTC+7</span>
          </div>
        </div>

        <div className="px-5 pb-5">
          <Block index="01" title="Sumber & alur data">
            <p>
              Titik panas berasal dari produk <strong className="font-semibold text-ink">VIIRS 375 m</strong>{' '}
              Near Real-Time NASA FIRMS, yang dipublikasikan ulang lewat feature service Esri Living
              Atlas. Layer diperbarui sekitar tiap jam dan menyimpan deteksi tujuh hari terakhir.
              Posko Bara menarik ulang data secara berkala dan saat tombol muat ulang ditekan.
            </p>
            <p>
              Tiga satelit dikonsolidasikan: NOAA-20, NOAA-21, dan Suomi NPP. Default tampilan
              memakai deteksi 24 jam dengan keyakinan tinggi dan nominal serta FRP minimal 10 MW.
            </p>
          </Block>

          <Block index="02" title="FRP: intensitas, bukan luas">
            <p>
              <strong className="font-semibold text-ink">Fire Radiative Power (FRP)</strong> mengukur
              laju energi radiasi yang dilepas piksel panas dalam megawatt. Nilai besar menandakan
              sumber panas yang intens, tetapi tidak sama dengan luas area terbakar maupun jumlah
              titik api.
            </p>
            <div className="grid grid-cols-4 border border-rule">
              {[
                ['< 10', 'Rendah'],
                ['10–50', 'Sedang'],
                ['50–100', 'Tinggi'],
                ['≥ 100', 'Sangat tinggi'],
              ].map(([range, label], index) => (
                <div
                  key={label}
                  className={`px-2 py-1.5 ${index > 0 ? 'border-l border-rule' : ''}`}
                >
                  <div className="font-mono text-[9px] tabular-nums text-ink">{range}</div>
                  <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.04em] text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <p>Ambang default 10 MW menyaring anomali lemah agar peta tetap terbaca.</p>
          </Block>

          <Block index="03" title="Keyakinan & resolusi piksel">
            <p>
              NASA memberi atribut <em>confidence</em>: tinggi, nominal, atau rendah, berdasarkan
              karakteristik algoritma deteksi. Kategori rendah lebih rentan terhadap sumber panas
              non-kebakaran dan disembunyikan secara default.
            </p>
            <p>
              Setiap deteksi mewakili piksel sekitar 375 × 375 meter. Api kecil, api bawah kanopi,
              atau kebakaran yang tertutup awan dapat tidak terdeteksi. Sebaliknya, panas industri,
              permukaan terbuka, dan pantulan panas dapat terbaca sebagai anomali.
            </p>
          </Block>

          <Block index="04" title="Citra dasar satelit">
            <p>
              Peta default memakai komposit true color harian <strong className="font-semibold text-ink">NOAA-20</strong>{' '}
              dari NASA GIBS. Tersedia delapan tanggal terakhir hingga kemarin menurut UTC. Awan,
              asap, dan sudut perekaman dapat menutup sebagian besar citra, terutama di musim hujan.
            </p>
            <p>
              Gunakan mode <strong className="font-semibold text-ink">Peta</strong> untuk membaca
              batas wilayah saat citra satelit tertutup awan. Peta terang memakai ubin Esri Light
              Gray Canvas.
              OpenStreetMap.
            </p>
          </Block>

          <Block index="05" title="Batas interpretasi">
            <ul className="space-y-1.5">
              <li className="flex gap-2">
                <span className="mt-[5px] h-1 w-1 shrink-0 bg-ember" />
                <span>Titik panas adalah anomali termal, bukan konfirmasi kebakaran.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[5px] h-1 w-1 shrink-0 bg-ember" />
                <span>
                  Volume besar dibatasi 32.000 titik terkuat. Angka provinsi dan tren dapat berupa
                  subset saat data dipotong; peringatan kapasitas muncul di ringkasan.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[5px] h-1 w-1 shrink-0 bg-ember" />
                <span>
                  Batas provinsi berasal dari dataset pihak ketiga dan hanya untuk orientasi.
                  Gunakan batas resmi untuk keperluan hukum atau operasional.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[5px] h-1 w-1 shrink-0 bg-ember" />
                <span>
                  Untuk respons darurat, verifikasi lewat citra resolusi tinggi, patroli lapangan,
                  dan kanal resmi BNPB, BMKG, atau pemerintah daerah.
                </span>
              </li>
            </ul>
          </Block>

          <Block index="06" title="Sumber & kredit">
            <div className="border border-rule">
              {sources.map((source) => (
                <a
                  key={source.name}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-3 border-b border-rule/70 px-3 py-2 last:border-b-0 hover:bg-sand/60"
                >
                  <span className="min-w-0">
                    <span className="block text-[10.5px] font-semibold leading-tight text-ink">
                      {source.name}
                    </span>
                    <span className="mt-0.5 block text-[9.5px] leading-relaxed text-muted-foreground">
                      {source.detail}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-ember" />
                </a>
              ))}
            </div>
            <p className="pt-1 font-mono text-[7.5px] uppercase leading-relaxed tracking-[0.06em] text-muted-foreground">
              Peta: MapLibre GL · Antarmuka: React + shadcn/ui · Data tidak dimodifikasi, hanya
              difilter dan dipetakan ulang.
            </p>
          </Block>

          <div className="mt-1 flex items-center justify-between gap-3 border-t-2 border-ink pt-3">
            <span className="font-display text-[18px] italic leading-none text-ink-soft">
              Bukan peringatan resmi.
            </span>
            <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-muted-foreground">
              Posko Bara · edisi langsung
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
