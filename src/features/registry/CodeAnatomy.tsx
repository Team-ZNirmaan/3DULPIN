import { CircleCheck, CircleX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useBi } from '@/components/domain'
import type { UnitType } from '@/domain/types'
import { NETWORK_CLASSES, UNIT_TYPES, describeLevel, validateCode } from '@/domain/ulpin'
import { cn } from '@/lib/cn'

interface Segment {
  key: string
  value: string
  label: string
  meaning: string
  className: string
}

export function CodeAnatomy({ input }: { input: string }) {
  const { t } = useTranslation()
  const bi = useBi()
  const v = validateCode(input)

  if (!input.trim()) return null

  if (!v.formatOk) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-blocking/30 bg-blocking-bg px-4 py-3 text-sm text-blocking">
        <CircleX className="mt-0.5 h-4 w-4 shrink-0" />
        <div>{v.errors.map((e) => <div key={e}>{e}</div>)}</div>
      </div>
    )
  }

  if (v.isParentOnly) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-bg px-4 py-3 text-sm text-info">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {t('registry.parentOnly')}
      </div>
    )
  }

  const p = v.parts!
  const infra = p.type === 'G' || p.type === 'A'
  const segments: Segment[] = [
    { key: 'parent', value: p.parent, label: t('registry.seg.parent'), meaning: t('registry.seg.parentMeaning'), className: 'bg-slate-100 text-slate-700' },
    { key: 'T', value: p.type, label: t('registry.seg.type'), meaning: bi(UNIT_TYPES[p.type as UnitType]), className: 'bg-navy-100 text-navy-800' },
    {
      key: 'B',
      value: p.building,
      label: infra ? t('registry.seg.network') : t('registry.seg.building'),
      meaning: infra ? NETWORK_CLASSES[p.building] ?? '—' : p.building === '0' ? t('registry.seg.parcelLevel') : `${t('registry.seg.tower')} ${p.building}`,
      className: 'bg-navy-100 text-navy-800',
    },
    { key: 'LL', value: p.level, label: infra ? t('registry.seg.segmentGroup') : t('registry.seg.level'), meaning: infra ? `${t('registry.seg.group')} ${p.level}` : describeLevel(p.level), className: 'bg-navy-100 text-navy-800' },
    { key: 'UUU', value: p.unit, label: infra ? t('registry.seg.segment') : t('registry.seg.unit'), meaning: `#${parseInt(p.unit, 36)} (base-36)`, className: 'bg-navy-100 text-navy-800' },
    {
      key: 'C',
      value: p.check,
      label: t('registry.seg.check'),
      meaning: v.checkOk ? 'ISO 7064 MOD 37,36 ✓' : `${t('registry.seg.expected')} ${v.expectedCheck}`,
      className: v.checkOk ? 'bg-success-bg text-success' : 'bg-blocking-bg text-blocking',
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-stretch gap-1.5">
        {segments.map((s, i) => (
          <div key={s.key} className={cn('min-w-0', i === 0 ? 'flex-[2.2]' : 'flex-1')}>
            <div className={cn('rounded-md px-2 py-2 text-center font-mono text-base font-bold tracking-wide', s.className)}>{s.value}</div>
            <div className="mt-1 text-center text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{s.label}</div>
            <div className="text-center text-[0.75rem] leading-tight text-slate-600">{s.meaning}</div>
          </div>
        ))}
      </div>
      <div className={cn('mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm', v.valid ? 'bg-success-bg text-success' : 'bg-blocking-bg text-blocking')}>
        {v.valid ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleX className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>{v.valid ? t('registry.valid') : v.errors.join(' ')}</span>
      </div>
    </div>
  )
}
