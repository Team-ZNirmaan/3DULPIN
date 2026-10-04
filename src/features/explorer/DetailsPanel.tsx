import { Building2, FileText, History, Loader2, MapPin, Scale, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { ResolveResult } from '@/api'
import { ClassSwatch, CodeText, KV, StatusChip, TierBadge, useBi } from '@/components/domain'
import { Button } from '@/components/ui/button'
import { QL_LABEL, RIGHT_LABEL, classOf, fmtArea, fmtM, fmtMsl } from '@/domain/display'
import type { SpatialUnit } from '@/domain/types'
import { UNIT_TYPES, describeLevel } from '@/domain/ulpin'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'

function Block({ title, icon: Icon, children }: { title: string; icon?: typeof MapPin; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-3">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" />} {title}
      </h3>
      {children}
    </section>
  )
}

export function RightsList({ codes }: { codes: string[] }) {
  const { t } = useTranslation()
  const bi = useBi()
  const rights = useData((s) => s.rights)
  const parties = useData((s) => s.parties)
  const deeds = useData((s) => s.deeds)
  const list = rights.filter((r) => codes.includes(r.unitCode))
  if (!list.length) return <p className="text-sm text-slate-500">{t('explorer.noRights')}</p>
  return (
    <ul className="space-y-1.5">
      {list.map((r) => {
        const party = parties.find((p) => p.id === r.partyId)
        const deed = deeds.find((d) => d.id === r.sourceDeedId)
        return (
          <li key={r.id} className="rounded-md bg-surface px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.75rem] font-semibold text-navy-700">{bi(RIGHT_LABEL[r.type])}</span>
              {r.sharePct !== undefined && <span className="text-xs font-semibold text-slate-600">{r.sharePct}%</span>}
            </div>
            <div className="text-sm font-medium text-slate-900">{party?.name}</div>
            {(r.note || deed) && (
              <div className="mt-0.5 text-[0.72rem] text-slate-500">
                {deed && <span className="font-mono">{deed.number}</span>}
                {deed && r.note && ' · '}
                {r.note}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function UnitDetails({ unit }: { unit: SpatialUnit }) {
  const { t } = useTranslation()
  const bi = useBi()
  const navigate = useNavigate()
  const [showLineage, setShowLineage] = useState(false)
  const building = useData((s) => s.buildings.find((b) => b.id === unit.buildingId))
  const areaMismatch = unit.carpetAreaSqm && unit.declaredAreaSqm && Math.abs(unit.carpetAreaSqm - unit.declaredAreaSqm) > 0.5

  return (
    <>
      <div className="px-4 pb-3 pt-4">
        <div className="mb-1 flex items-center gap-2">
          <ClassSwatch cls={classOf(unit)} label={false} />
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">{bi(UNIT_TYPES[unit.type])}</span>
        </div>
        <h2 className="pr-8 text-lg font-bold leading-snug text-navy-900">{unit.label}</h2>
        <div className="mt-1">
          <CodeText code={unit.code} showValidity />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusChip status={unit.status} />
          <TierBadge tier={unit.tier} long />
        </div>
      </div>

      <Block title={t('explorer.geometry')} icon={MapPin}>
        <dl className="divide-y divide-line/70">
          {unit.level && <KV k={t('explorer.level')} v={`${unit.level} · ${describeLevel(unit.level)}`} />}
          {building && <KV k={t('explorer.building')} v={building.label} />}
          <KV k={t('explorer.zRange')} v={`${fmtM(unit.zMin)} … ${fmtM(unit.zMax)}`} />
          <KV k={t('explorer.msl')} v={`${fmtMsl(unit.zMin)} … ${fmtMsl(unit.zMax).replace(' m MSL', '')}`} />
          {unit.carpetAreaSqm !== undefined && <KV k={t('explorer.carpet')} v={fmtArea(unit.carpetAreaSqm)} />}
          {areaMismatch && <KV k={t('explorer.declared')} v={<span className="text-blocking">{fmtArea(unit.declaredAreaSqm)} ⚠</span>} />}
          {unit.undividedSharePct !== undefined && <KV k={t('explorer.share')} v={`${unit.undividedSharePct}%`} />}
        </dl>
      </Block>

      {unit.infra && (
        <Block title={t('explorer.infra')} icon={Building2}>
          <dl className="divide-y divide-line/70">
            <KV k={t('explorer.agency')} v={unit.infra.agency} />
            <KV k={t('explorer.qualityLevel')} v={QL_LABEL[unit.infra.qualityLevel]} />
            <KV k={t('explorer.protection')} v={`± ${unit.infra.protectionM} m`} />
          </dl>
          <p className="mt-1.5 text-[0.72rem] text-slate-500">{unit.infra.legalBasis}</p>
        </Block>
      )}

      <Block title={t('explorer.rights')} icon={Scale}>
        <RightsList codes={[unit.code]} />
      </Block>

      <Block title={t('explorer.lineage')} icon={History}>
        {showLineage ? (
          <ol className="space-y-1 text-[0.8rem] text-slate-600">
            {unit.lineage.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-500" />
                {l}
              </li>
            ))}
          </ol>
        ) : (
          <button type="button" onClick={() => setShowLineage(true)} className="text-sm font-medium text-navy-700 hover:underline">
            {t('explorer.showLineage', { n: unit.lineage.length })}
          </button>
        )}
      </Block>

      {unit.type !== 'G' && unit.type !== 'A' && (
        <div className="border-t border-line px-4 py-3">
          <Button size="sm" variant="accent" onClick={() => navigate(`/app/card?code=${encodeURIComponent(unit.code)}`)}>
            <FileText className="h-3.5 w-3.5" /> {t('explorer.openCard')}
          </Button>
        </div>
      )}
    </>
  )
}

function QueryResult({ query, querying, onRequery }: { query: ResolveResult | null; querying: boolean; onRequery: (z: number) => void }) {
  const { t } = useTranslation()
  const [z, setZ] = useState<string>('')
  const select = useData((s) => s.select)
  if (!query && !querying) {
    return <p className="px-4 py-5 pr-10 text-sm text-slate-600">{t('explorer.queryHint')}</p>
  }
  return (
    <>
      <div className="px-4 pb-3 pt-4">
        <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-saffron-600">{t('explorer.pointQuery')}</div>
        <h2 className="pr-8 text-base font-bold text-navy-900">{t('explorer.pointResult')}</h2>
        {query && (
          <div className="mt-1 font-mono text-[0.72rem] text-slate-600">
            {query.point.lat.toFixed(6)}°N, {query.point.lon.toFixed(6)}°E · z {fmtM(query.point.z)}
          </div>
        )}
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = parseFloat(z)
            if (!isNaN(v)) onRequery(v)
          }}
        >
          <label className="text-xs text-slate-600" htmlFor="qz">
            {t('explorer.height')}
          </label>
          <input
            id="qz"
            type="number"
            step="0.5"
            placeholder={query ? String(query.point.z) : ''}
            value={z}
            onChange={(e) => setZ(e.target.value)}
            className="h-8 w-20 rounded-md border border-line bg-white px-2 font-mono text-sm"
          />
          <Button size="sm" type="submit" variant="outline">
            {t('explorer.requery')}
          </Button>
        </form>
      </div>
      {querying ? (
        <div className="flex items-center gap-2 border-t border-line px-4 py-5 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> …
        </div>
      ) : (
        query && (
          <>
            <Block title={`${t('explorer.volumesAtPoint')} (${query.units.length})`}>
              {query.units.length === 0 ? (
                <p className="text-sm text-slate-500">{t('explorer.noVolumes')}</p>
              ) : (
                <ul className="space-y-1">
                  {query.units.map((u) => (
                    <li key={u.code}>
                      <button type="button" onClick={() => select(u.code)} className="w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <ClassSwatch cls={classOf(u)} label={false} />
                          <span className="text-sm font-semibold text-slate-800">{u.label}</span>
                        </div>
                        <CodeText code={u.code} className="text-[0.7rem]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title={t('explorer.rightsAtPoint')} icon={Scale}>
              <RightsList codes={query.units.map((u) => u.code)} />
            </Block>
          </>
        )
      )}
    </>
  )
}

interface DetailsCardProps {
  className?: string
  query: ResolveResult | null
  querying: boolean
  queryMode: boolean
  onRequery: (z: number) => void
  onClose: () => void
}

/** Floating card shown only when something is selected or queried. */
export function DetailsCard({ className, query, querying, queryMode, onRequery, onClose }: DetailsCardProps) {
  const { t } = useTranslation()
  const unit = useData((s) => s.units.find((u) => u.code === s.selectedCode))
  const inQuery = queryMode || querying || query !== null
  if (!inQuery && !unit) return null
  return (
    <aside className={cn('pointer-events-auto relative flex flex-col overflow-y-auto rounded-xl border border-line bg-white/97 shadow-2xl backdrop-blur', className)} aria-live="polite">
      <button type="button" onClick={onClose} className="absolute right-2.5 top-2.5 z-10 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={t('explorer.close')}>
        <X className="h-4 w-4" />
      </button>
      {inQuery ? <QueryResult query={query} querying={querying} onRequery={onRequery} /> : unit && <UnitDetails unit={unit} />}
    </aside>
  )
}
