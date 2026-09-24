import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'navy' | 'info' | 'success' | 'warning' | 'blocking' | 'saffron'

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  navy: 'bg-navy-50 text-navy-700 ring-navy-100',
  info: 'bg-info-bg text-info ring-blue-200',
  success: 'bg-success-bg text-success ring-green-200',
  warning: 'bg-warning-bg text-warning ring-amber-200',
  blocking: 'bg-blocking-bg text-blocking ring-red-200',
  saffron: 'bg-saffron-50 text-saffron-600 ring-orange-200',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.72rem] font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
