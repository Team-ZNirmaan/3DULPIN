import { CircleCheck, CircleX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CLASS_COLOR,
  CLASS_LABEL,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  TIER_COLOR,
  TIER_LABEL,
} from '@/domain/display'
import type { Bilingual, LegalClass, Severity, Status, Tier } from '@/domain/types'
import { validateCode } from '@/domain/ulpin'
import { cn } from '@/lib/cn'

export function useBi() {
  const { i18n } = useTranslation()
  return (b: Bilingual) => (i18n.language === 'hi' ? b.hi : b.en)
}

function Pill({ color, children, className }: { color: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.72rem] font-semibold', className)}
      style={{ backgroundColor: `${color}1f`, color: shade(color), boxShadow: `inset 0 0 0 1px ${color}55` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  )
}

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * 0.62)
  const g = Math.round(((n >> 8) & 255) * 0.62)
  const b = Math.round((n & 255) * 0.62)
  return `rgb(${r},${g},${b})`
}

export function StatusChip({ status }: { status: Status }) {
  const bi = useBi()
  return <Pill color={STATUS_COLOR[status]}>{bi(STATUS_LABEL[status])}</Pill>
}

export function TierBadge({ tier, long = false }: { tier: Tier; long?: boolean }) {
  const bi = useBi()
  return <Pill color={TIER_COLOR[tier]}>{long ? bi(TIER_LABEL[tier]) : `Tier ${tier}`}</Pill>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const bi = useBi()
  return <Pill color={SEVERITY_COLOR[severity]}>{bi(SEVERITY_LABEL[severity])}</Pill>
}

export function ClassSwatch({ cls, label = true }: { cls: LegalClass; label?: boolean }) {
  const bi = useBi()
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: CLASS_COLOR[cls] }} />
      {label && bi(CLASS_LABEL[cls])}
    </span>
  )
}

export function CodeText({ code, className, showValidity = false }: { code: string; className?: string; showValidity?: boolean }) {
  const parent = code.slice(0, 14)
  const ext = code.slice(15, 22)
  const check = code.slice(22)
  const v = showValidity ? validateCode(code) : null
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-0.5 font-mono text-[0.82rem] tracking-tight', className)}>
      <span className="text-slate-500">{parent}</span>
      {ext && (
        <>
          <span className="text-slate-500">-</span>
          <span className="font-semibold text-navy-700">{ext}</span>
          <span className="ml-0.5 rounded bg-navy-50 px-1 font-semibold text-saffron-600">{check}</span>
        </>
      )}
      {v && (
        <span className={cn('ml-1.5 inline-flex items-center gap-1 font-sans text-[0.7rem] font-semibold', v.valid ? 'text-success' : 'text-blocking')}>
          {v.valid ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
          {v.valid ? 'valid' : 'invalid'}
        </span>
      )}
    </span>
  )
}

export function KV({ k, v, mono = false }: { k: React.ReactNode; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <dt className="shrink-0 text-slate-500">{k}</dt>
      <dd className={cn('text-right font-medium text-slate-800', mono && 'font-mono text-[0.8rem]')}>{v}</dd>
    </div>
  )
}
