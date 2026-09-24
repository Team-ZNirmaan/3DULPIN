import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0B1F3A" />
      <path d="M16 5 26 10.5 16 16 6 10.5Z" fill="#E8A33D" />
      <path d="M6 14.5 16 20l10-5.5v3.8L16 23.8 6 18.3Z" fill="#7FB2F0" />
      <path d="M6 21.2 16 26.7l10-5.5v2.3L16 29 6 23.5Z" fill="#3E7BD1" />
    </svg>
  )
}

export function Logo({ light = false, subtitle }: { light?: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className={light ? 'ring-1 ring-white/20 rounded-[7px]' : ''} />
      <div className="leading-tight">
        <div className={cn('text-[1.05rem] font-bold tracking-tight', light ? 'text-white' : 'text-navy-900')}>Bhu-Aayam</div>
        {subtitle && <div className={cn('hidden text-[0.68rem] font-medium sm:block', light ? 'text-navy-100/80' : 'text-slate-500')}>{subtitle}</div>}
      </div>
    </div>
  )
}
