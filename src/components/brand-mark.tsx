import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('h-8 w-8', className)}
      fill="none"
    >
      <path d="M2.5 2.5h8M2.5 2.5v8M29.5 29.5h-8M29.5 29.5v-8" stroke="currentColor" strokeWidth="1" />
      <circle cx="16" cy="16" r="8.25" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
      <path d="M16 5.5v3M16 23.5v3M5.5 16h3M23.5 16h3" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
      <rect x="12.5" y="12.5" width="7" height="7" fill="#c24318" />
      <path d="M12.5 9.5v-2h2M19.5 9.5v-2h-2M12.5 22.5v2h2M19.5 22.5v2h-2" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  )
}
