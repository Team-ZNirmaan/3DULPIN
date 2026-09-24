import { ArrowRight, Building2, ExternalLink, FileText, History, Loader2, MapPin, Scale, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import type { ResolveResult } from '@/api'
import { ClassSwatch, CodeText, KV, SeverityBadge, StatusChip, TierBadge, useBi } from '@/components/domain'
import { Button } from '@/components/ui/button'
import { QL_LABEL, RIGHT_LABEL, classOf, fmtArea, fmtM, fmtMsl } from '@/domain/display'
import type { SpatialUnit } from '@/domain/types'
import { UNIT_TYPES, describeLevel } from '@/domain/ulpin'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'

function Block({ title, icon: Icon, children }: { title: string; icon?: typeof MapPin; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">
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
    <ul className="space-y-2">
      {list.map((r) => {
        const party = parties.find((p) => p.id === r.partyId)
        const deed = deeds.find((d) => d.id === r.sourceDeedId)
        return (
          <li key={r.id} className="rounded-md border border-line bg-surface px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.78rem] font-semibold text-navy-800">{bi(RIGHT_LABEL[r.type])}</span>
              {r.sharePct !== undefined && <span className="text-xs font-semibold text-slate-600">{r.sharePct}%</span>}
            </div>
            <div className="text-sm font-medium text-slate-900">{party?.name}</div>
            <div className="mt-0.5 text-[0.72rem] leading-snug text-slate-500">{r.legalBasis}</div>
            {(r.note || deed) && (
              <div className="mt-1 text-[0.72rem] text-slate-500">
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
  const issues = useData((s) => s.issues)
  const parcels = useData((s) => s.parcels)
  const buildings = useData((s) => s.buildings)
  const parcel = parcels.find((p) => p.id === unit.parcelId)
  const building = buildings.find((b) => b.id === unit.buildingId)
  const unitIssues = issues.filter(
    (i) => i.status !== 'fix-approved' && i.status !== 'rejected' && (i.objectCodes.includes(unit.code) || (unit.level === '05' && i.id === 'ISS-004')),
  )
  const areaMismatch = unit.carpetAreaSqm && unit.declaredAreaSqm && Math.abs(unit.carpetAreaSqm - unit.declaredAreaSqm) > 0.5

  return (
    <>
      <div className="border-b border-line bg-navy-50/60 px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <ClassSwatch cls={classOf(unit)} label={false} />
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">{bi(UNIT_TYPES[unit.type])}</span>
        </div>
        <h2 className="text-lg font-bold text-navy-900">{unit.label}</h2>
        <div className="mt-1.5">
          <CodeText code={unit.code} showValidity />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusChip status={unit.status} />
          <TierBadge tier={unit.tier} long />
          <span className="rounded-full bg-white px-2 py-0.5 text-[0.72rem] font-medium text-slate-500 ring-1 ring-line">v{unit.version}</span>
        </div>
      </div>

      {unitIssues.length > 0 && (
        <Block title={t('explorer.openIssues')} icon={ShieldAlert}>
          <ul className="space-y-1.5">
            {unitIssues.map((i) => (
              <li key={i.id}>
                <Link to={`/app/validation?issue=${i.id}`} className="flex items-start gap-2 rounded-md border border-line px-2.5 py-2 hover:bg-slate-50">
                  <SeverityBadge severity={i.severity} />
                  <span className="flex-1 text-[0.8rem] leading-snug text-slate-700">{bi(i.title)}</span>
                  <span className="text-[0.68rem] font-medium text-slate-500">{i.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title={t('explorer.geometry')} icon={MapPin}>
        <dl className="divide-y divide-line/70">
          {unit.level && <KV k={t('explorer.level')} v={`${unit.level} · ${describeLevel(unit.level)}`} />}
          {building && <KV k={t('explorer.building')} v={building.label} />}
          {parcel && <KV k={t('explorer.parcel')} v={<span className="font-mono text-[0.78rem]">{parcel.ulpin}</span>} />}
          <KV k={t('explorer.zRange')} v={`${fmtM(unit.zMin)} … ${fmtM(unit.zMax)}`} />
          <KV k={t('explorer.msl')} v={`${fmtMsl(unit.zMin)} … ${fmtMsl(unit.zMax).replace(' m MSL', '')}`} />
          {unit.carpetAreaSqm !== undefined && <KV k={t('explorer.carpet')} v={fmtArea(unit.carpetAreaSqm)} />}
          {unit.declaredAreaSqm !== undefined && (
            <KV k={t('explorer.declared')} v={<span className={cn(areaMismatch && 'text-blocking')}>{fmtArea(unit.declaredAreaSqm)}{areaMismatch && ' ⚠'}</span>} />
          )}
          {unit.undividedSharePct !== undefined && <KV k={t('explorer.share')} v={`${unit.undividedSharePct}%`} />}
          {unit.digipin && <KV k={t('explorer.digipin')} v={<span className="font-mono">{unit.digipin}</span>} />}
        </dl>
      </Block>

      {unit.infra && (
        <Block title={t('explorer.infra')} icon={Building2}>
          <dl className="divide-y divide-line/70">
            <KV k={t('explorer.agency')} v={unit.infra.agency} />
            <KV k={t('explorer.qualityLevel')} v={QL_LABEL[unit.infra.qualityLevel]} />
            <KV k={t('explorer.width')} v={`${unit.infra.widthM} m`} />
            <KV k={t('explorer.protection')} v={`± ${unit.infra.protectionM} m`} />
          </dl>
          <p className="mt-1.5 text-[0.72rem] text-slate-500">{unit.infra.legalBasis}</p>
        </Block>
      )}

      <Block title={t('explorer.rights')} icon={Scale}>
        <RightsList codes={[unit.code]} />
      </Block>

      <Block title={t('explorer.lineage')} icon={History}>
        <ol className="space-y-1 text-[0.8rem] text-slate-600">
          {unit.lineage.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-500" />
              {l}
            </li>
          ))}
        </ol>
      </Block>

      <div className="flex flex-wrap gap-2 px-4 py-3">
        {unit.type !== 'G' && unit.type !== 'A' && (
          <Button size="sm" variant="accent" onClick={() => navigate(`/app/citizen?code=${encodeURIComponent(unit.code)}`)}>
            <FileText className="h-3.5 w-3.5" /> {t('explorer.openCard')}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => navigate(`/app/registry?q=${encodeURIComponent(unit.code)}`)}>
          <ExternalLink className="h-3.5 w-3.5" /> {t('explorer.viewInRegistry')}
        </Button>
      </div>
    </>
  )
}

function IssueSummary({ id }: { id: string }) {
  const bi = useBi()
  const { t } = useTranslation()
  const issue = useData((s) => s.issues.find((i) => i.id === id))
  if (!issue) return null
  return (
    <div className="px-4 py-4">
      <div className="mb-2 flex items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <span className="font-mono text-xs text-slate-500">{issue.id}</span>
      </div>
      <h2 className="text-base font-bold text-navy-900">{bi(issue.title)}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{bi(issue.explanation)}</p>
      <Link to={`/app/validation?issue=${issue.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline">
        {t('explorer.openInValidation')} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function QueryResult({ query, querying, onRequery }: { query: ResolveResult | null; querying: boolean; onRequery: (z: number) => void }) {
  const { t } = useTranslation()
  const [z, setZ] = useState<string>('')
  const select = useData((s) => s.select)
  if (!query && !querying) {
    return (
      <div className="px-4 py-6 text-sm text-slate-500">
        <p className="font-medium text-slate-700">{t('explorer.pointQuery')}</p>
        <p className="mt-1">{t('explorer.queryHint')}</p>
      </div>
    )
  }
  return (
    <>
      <div className="border-b border-line bg-saffron-50 px-4 py-3">
        <div className="text-[0.72rem] font-semibold uppercase tracking-wider text-saffron-600">GET /resolve?x&y&z</div>
        <h2 className="text-base font-bold text-navy-900">{t('explorer.pointResult')}</h2>
        {query && (
          <div className="mt-1 font-mono text-[0.75rem] text-slate-600">
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
            className="h-8 w-24 rounded-md border border-line bg-white px-2 font-mono text-sm"
          />
          <Button size="sm" type="submit" variant="outline">
            {t('explorer.requery')}
          </Button>
        </form>
      </div>
      {querying ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Resolving…
        </div>
      ) : (
        query && (
          <>
            <Block title={`${t('explorer.volumesAtPoint')} (${query.units.length})`}>
              {query.units.length === 0 ? (
                <p className="text-sm text-slate-500">{t('explorer.noVolumes')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {query.units.map((u) => (
                    <li key={u.code}>
                      <button type="button" onClick={() => select(u.code)} className="w-full rounded-md border border-line px-2.5 py-2 text-left hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <ClassSwatch cls={classOf(u)} label={false} />
                          <span className="text-sm font-semibold text-slate-800">{u.label}</span>
                        </div>
                        <CodeText code={u.code} className="mt-0.5 text-[0.72rem]" />
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

function DefaultSummary() {
  const { t } = useTranslation()
  const units = useData((s) => s.units)
  const issues = useData((s) => s.issues)
  const pilot = useMemo(() => units.filter((u) => u.buildingId === 'BLD-7' && u.type !== 'B'), [units])
  const flats = pilot.filter((u) => u.type === 'U').length
  const bays = pilot.filter((u) => u.type === 'L' || u.type === 'P').length
  const open = issues.filter((i) => i.status === 'open').length
  return (
    <div className="px-4 py-4">
      <div className="text-[0.72rem] font-semibold uppercase tracking-wider text-saffron-600">{t('explorer.pilot')}</div>
      <h2 className="text-lg font-bold text-navy-900">Tower 1, Demo Heights</h2>
      <p className="text-sm text-slate-500">Plot 7 · Demo Ward 7</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          [t('explorer.stat.volumes'), pilot.length],
          [t('explorer.stat.flats'), flats],
          [t('explorer.stat.bays'), bays],
          [t('explorer.stat.issues'), open],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border border-line bg-surface px-3 py-2">
            <div className="text-xl font-bold text-navy-900">{v}</div>
            <div className="text-[0.72rem] text-slate-500">{k}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-[0.8rem] text-warning">{t('explorer.sanctionNote')}</div>
      <p className="mt-4 text-sm text-slate-500">{t('explorer.clickHint')}</p>
    </div>
  )
}

interface DetailsPanelProps {
  className?: string
  query: ResolveResult | null
  querying: boolean
  queryMode: boolean
  onRequery: (z: number) => void
}

export function DetailsPanel({ className, query, querying, queryMode, onRequery }: DetailsPanelProps) {
  const selectedCode = useData((s) => s.selectedCode)
  const unit = useData((s) => s.units.find((u) => u.code === selectedCode))
  const inQueryMode = queryMode || querying || query !== null

  return (
    <aside className={cn('w-[22rem] shrink-0 flex-col overflow-y-auto border-l border-line bg-white', className)} aria-live="polite">
      {inQueryMode ? (
        <QueryResult query={query} querying={querying} onRequery={onRequery} />
      ) : selectedCode?.startsWith('issue:') ? (
        <IssueSummary id={selectedCode.slice(6)} />
      ) : unit ? (
        <UnitDetails unit={unit} />
      ) : (
        <DefaultSummary />
      )}
    </aside>
  )
}
