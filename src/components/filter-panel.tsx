import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { CONFIDENCE_META, SATELLITES, type Confidence, type SatelliteCode } from '@/types'
import { cn } from '@/lib/utils'

interface FilterPanelProps {
  minFrp: number
  confidences: Confidence[]
  satellites: SatelliteCode[]
  onMinFrpChange: (value: number) => void
  onToggleConfidence: (value: Confidence) => void
  onToggleSatellite: (value: SatelliteCode) => void
  onReset: () => void
  isDefault: boolean
}

function CheckRow({
  checked,
  onToggle,
  label,
  color,
  title,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  color?: string
  title?: string
}) {
  return (
    <label
      className="flex cursor-pointer select-none items-center gap-1.5 py-[3px] text-[10.5px] leading-tight text-ink-soft"
      title={title}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={label} className="h-3 w-3" />
      {color ? <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: color }} aria-hidden="true" /> : null}
      <span className={cn('truncate', checked ? 'text-ink' : 'text-muted-foreground')}>{label}</span>
    </label>
  )
}

export function FilterPanel({
  minFrp,
  confidences,
  satellites,
  onMinFrpChange,
  onToggleConfidence,
  onToggleSatellite,
  onReset,
  isDefault,
}: FilterPanelProps) {
  const [sliderValue, setSliderValue] = useState(minFrp)

  useEffect(() => {
    setSliderValue(minFrp)
  }, [minFrp])

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
            Ambang FRP
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink">
            ≥ {sliderValue} <span className="text-[8px] text-muted-foreground">MW</span>
          </span>
        </div>
        <Slider
          value={[sliderValue]}
          min={0}
          max={100}
          step={5}
          onValueChange={(value) => setSliderValue(value[0])}
          onValueCommit={(value) => onMinFrpChange(value[0])}
          aria-label="Ambang intensitas FRP minimum"
        />
        <div className="mt-1 flex justify-between font-mono text-[7.5px] tabular-nums text-muted-foreground/80">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100+</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-dashed border-rule pt-2.5">
        <div>
          <div className="micro-label mb-1 text-muted-foreground">Keyakinan</div>
          <div className="space-y-0.5">
            <CheckRow
              checked={confidences.includes('high')}
              onToggle={() => onToggleConfidence('high')}
              label="Tinggi"
              color={CONFIDENCE_META.high.color}
            />
            <CheckRow
              checked={confidences.includes('nominal')}
              onToggle={() => onToggleConfidence('nominal')}
              label="Nominal"
              color={CONFIDENCE_META.nominal.color}
            />
            <CheckRow
              checked={confidences.includes('low')}
              onToggle={() => onToggleConfidence('low')}
              label="Rendah"
              color={CONFIDENCE_META.low.color}
            />
          </div>
        </div>

        <div>
          <div className="micro-label mb-1 text-muted-foreground">Satelit</div>
          <div className="space-y-0.5">
            {SATELLITES.map((satellite) => (
              <CheckRow
                key={satellite.code}
                checked={satellites.includes(satellite.code)}
                onToggle={() => onToggleSatellite(satellite.code)}
                label={satellite.name}
                title={`${satellite.name} · VIIRS`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-dashed border-rule pt-2">
        <span className="font-mono text-[7.5px] uppercase leading-relaxed tracking-[0.06em] text-muted-foreground">
          Maks. 32.000 titik terkuat dimuat
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          className={cn(
            'flex shrink-0 items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] transition-colors',
            isDefault ? 'cursor-default text-muted-foreground/40' : 'text-ember hover:text-ink',
          )}
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Reset
        </button>
      </div>
    </div>
  )
}
