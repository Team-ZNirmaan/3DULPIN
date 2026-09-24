import { ChevronDown, ChevronRight, Copy, Cuboid, KeyRound, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { ClassSwatch, CodeText, StatusChip, TierBadge, useBi } from '@/components/domain'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { PILOT_PARENT } from '@/data/generate'
import { CLASS_LABEL, STATUS_LABEL, classOf } from '@/domain/display'
import type { SpatialUnit, Status, UnitType } from '@/domain/types'
import { UNIT_TYPES, makeCode, validateCode } from '@/domain/ulpin'
import { UnitDetails } from '@/features/explorer/DetailsPanel'
import { cn } from '@/lib/cn'
import { useShowIn3d } from '@/lib/useShowIn3d'
import { useData } from '@/store/data'
import { CodeAnatomy } from './CodeAnatomy'

const LEVELS = ['RF', '05', '04', '03', '02', '01', '00', 'B1', 'B2']

function TreeNode({ label, sub, depth, open, onToggle, onClick, active, children }: {
  label: string
  sub?: string
  depth: number
  open?: boolean
  onToggle?: () => void
  onClick?: () => void
  active?: boolean
  children?: React.ReactNode
}) {
  return (
    <li>
      <div
        className={cn('flex items-center gap-1 rounded px-1.5 py-1 text-sm', active ? 'bg-saffron-50 text-saffron-600' : 'text-slate-700 hover:bg-slate-50')}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        {onToggle ? (
          <button type="button" onClick={onToggle} className="rounded p-0.5 text-slate-500 hover:text-slate-700" aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open}>
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        <button type="button" onClick={onClick ?? onToggle} className="min-w-0 flex-1 truncate text-left">
          <span className="font-medium">{label}</span>
          {sub && <span className="ml-1.5 font-mono text-[0.7rem] text-slate-500">{sub}</span>}
        </button>
      </div>
      {open && children && <ul>{children}</ul>}
    </li>
  )
}

function Hierarchy({ onSelect, selected }: { onSelect: (code: string) => void; selected?: string }) {
  const units = useData((s) => s.units)
  const parcels = useData((s) => s.parcels)
  const [open, setOpen] = useState<Record<string, boolean>>({ pilot: true, tower: true, '03': true, infra: true })
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }))
  const pilotS = units.find((u) => u.type === 'S' && u.parcelId === 'PCL-7')!
  const tower = units.find((u) => u.id === 'U-B-7')!
  const infra = units.filter((u) => u.type === 'G' || u.type === 'A')

  return (
    <ul className="space-y-0.5">
      <TreeNode label="Plot 7" sub={PILOT_PARENT} depth={0} open={open.pilot} onToggle={() => toggle('pilot')} onClick={() => onSelect(pilotS.code)} active={selected === pilotS.code}>
        <TreeNode label="Tower 1" sub="B1XX000" depth={1} open={open.tower} onToggle={() => toggle('tower')} onClick={() => onSelect(tower.code)} active={selected === tower.code}>
          {LEVELS.map((l) => {
            const items = units.filter((u) => u.buildingId === 'BLD-7' && u.level === l)
            return (
              <TreeNode key={l} label={`Level ${l}`} sub={`${items.length}`} depth={2} open={open[l]} onToggle={() => toggle(l)}>
                {items.map((u) => (
                  <TreeNode key={u.code} label={u.label.replace(/^(Floor \d|Basement \d|Stilt \(ground\)) — /, '')} sub={u.code.slice(15, 22)} depth={3} onClick={() => onSelect(u.code)} active={selected === u.code} />
                ))}
              </TreeNode>
            )
          })}
        </TreeNode>
      </TreeNode>
      <TreeNode label="Infrastructure roots" depth={0} open={open.infra} onToggle={() => toggle('infra')}>
        {infra.map((u) => (
          <TreeNode key={u.code} label={u.label} sub={u.code.slice(0, 8)} depth={1} onClick={() => onSelect(u.code)} active={selected === u.code} />
        ))}
      </TreeNode>
      <TreeNode label={`Other parcels (${parcels.length - 1})`} depth={0} open={open.others} onToggle={() => toggle('others')}>
        {parcels
          .filter((p) => !p.isPilot)
          .map((p) => {
            const s = units.find((u) => u.type === 'S' && u.parcelId === p.id)!
            return <TreeNode key={p.id} label={p.label} sub={p.ulpin} depth={1} onClick={() => onSelect(s.code)} active={selected === s.code} />
          })}
      </TreeNode>
    </ul>
  )
}

function MintDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation()
  const bi = useBi()
  const units = useData((s) => s.units)
  const logEvent = useData((s) => s.logEvent)
  const [type, setType] = useState<UnitType>('U')
  const [level, setLevel] = useState('05')
  const next = useMemo(() => {
    const seqs = units.filter((u) => u.code.startsWith(PILOT_PARENT) && u.level === level).map((u) => parseInt(u.code.slice(19, 22), 36))
    return (seqs.length ? Math.max(...seqs) : 0) + 1
  }, [units, level])
  const code = makeCode(PILOT_PARENT, type, '1', level, next)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('registry.mintTitle')}
      description={t('registry.mintDesc')}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('registry.close')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              void logEvent('RESERVE_CODE', code, `Preview reserved for ${bi(UNIT_TYPES[type])} on level ${level}`)
              toast({ tone: 'success', title: t('registry.reserved'), body: code })
              onOpenChange(false)
            }}
          >
            <KeyRound className="h-4 w-4" /> {t('registry.reserve')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{t('registry.seg.type')}</span>
          <select value={type} onChange={(e) => setType(e.target.value as UnitType)} className="h-9 w-full rounded-md border border-line px-2">
            {(['U', 'L', 'C', 'P'] as UnitType[]).map((ty) => (
              <option key={ty} value={ty}>
                {ty} · {bi(UNIT_TYPES[ty])}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{t('registry.seg.level')}</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-9 w-full rounded-md border border-line px-2">
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 rounded-lg bg-navy-950 px-4 py-3">
        <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-navy-100/60">{t('registry.nextCode')}</div>
        <div className="mt-1 font-mono text-lg font-bold tracking-wide text-white">
          {code.slice(0, 15)}
          <span className="text-saffron-400">{code.slice(15, 22)}</span>
          <span className="text-green-300">{code.slice(22)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('registry.mintNote')}</p>
    </Dialog>
  )
}

export function RegistryPage() {
  const { t } = useTranslation()
  const bi = useBi()
  const [params, setParams] = useSearchParams()
  const units = useData((s) => s.units)
  const showIn3d = useShowIn3d()
  const [code, setCode] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<UnitType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [selected, setSelected] = useState<string | undefined>()
  const [mintOpen, setMintOpen] = useState(false)

  useEffect(() => {
    const q = params.get('q')
    if (!q) return
    setCode(q)
    const v = validateCode(q)
    const hit = units.find((u) => u.code === v.normalized || u.label.toLowerCase() === q.toLowerCase())
    if (hit) setSelected(hit.code)
    else setFilter(q)
  }, [params, units])

  const rows = useMemo(
    () =>
      units.filter(
        (u) =>
          (typeFilter === 'all' || u.type === typeFilter) &&
          (statusFilter === 'all' || u.status === statusFilter) &&
          (!filter || `${u.code} ${u.label}`.toLowerCase().includes(filter.toLowerCase())),
      ),
    [units, typeFilter, statusFilter, filter],
  )
  const selectedUnit = units.find((u) => u.code === selected)

  const pick = (c: string) => {
    setSelected(c)
    setCode(c)
    setParams({ q: c }, { replace: true })
  }

  const example = units.find((u) => u.label === 'Flat 402')!.code
  const typo = example.slice(0, 18) + (example[18] === '5' ? '6' : '5') + example.slice(19)

  return (
    <Page>
      <PageHeader
        eyebrow="L8 — M5 3D-ULPIN minting + LADM registry"
        title={t('nav.registry')}
        description={t('registry.description')}
        actions={
          <Button variant="accent" onClick={() => setMintOpen(true)}>
            <Sparkles className="h-4 w-4" /> {t('registry.mint')}
          </Button>
        }
      />

      <Card className="mb-5">
        <CardHeader title={t('registry.validatorTitle')} subtitle={t('registry.validatorSubtitle')} />
        <CardBody>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="DEMO27PN0417A2-U104005X"
              className="h-11 min-w-[20rem] flex-1 rounded-md border border-line px-3 font-mono text-base tracking-wide uppercase"
              aria-label={t('registry.validatorTitle')}
              spellCheck={false}
            />
            <Button variant="outline" onClick={() => setCode(example)}>
              {t('registry.tryValid')}
            </Button>
            <Button variant="outline" onClick={() => setCode(typo)}>
              {t('registry.tryTypo')}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Copy" onClick={() => void navigator.clipboard?.writeText(code)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <CodeAnatomy input={code} />
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[15rem_1fr] 2xl:grid-cols-[16rem_1fr_22rem] xl:grid-cols-[15rem_1fr_20rem]">
        <Card className="self-start">
          <CardHeader title={t('registry.hierarchy')} />
          <div className="max-h-[36rem] overflow-y-auto p-2">
            <Hierarchy onSelect={pick} selected={selected} />
          </div>
        </Card>

        <Card className="min-w-0 self-start overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="relative min-w-40 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('registry.filter')} className="h-9 w-full rounded-md border border-line pl-8 pr-3 text-sm" aria-label={t('registry.filter')} />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as UnitType | 'all')} className="h-9 rounded-md border border-line px-2 text-sm" aria-label="Type">
              <option value="all">{t('registry.allTypes')}</option>
              {(Object.keys(UNIT_TYPES) as UnitType[]).map((ty) => (
                <option key={ty} value={ty}>
                  {ty} · {bi(CLASS_LABEL[classOf({ type: ty })])}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | 'all')} className="h-9 rounded-md border border-line px-2 text-sm" aria-label="Status">
              <option value="all">{t('registry.allStatus')}</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {bi(STATUS_LABEL[s])}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {rows.length} {t('registry.records')}
            </span>
          </div>
          <div className="max-h-[36rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-[0.7rem] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">3D-ULPIN</th>
                  <th className="px-2 py-2 font-semibold">{t('registry.col.label')}</th>
                  <th className="px-2 py-2 font-semibold">{t('registry.col.status')}</th>
                  <th className="hidden px-4 py-2 font-semibold 2xl:table-cell">Tier</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: SpatialUnit) => (
                  <tr key={u.code} onClick={() => pick(u.code)} className={cn('cursor-pointer border-t border-line', selected === u.code ? 'bg-saffron-50' : 'hover:bg-slate-50')}>
                    <td className="px-4 py-2">
                      <CodeText code={u.code} className="text-[0.75rem]" />
                    </td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2">
                        <ClassSwatch cls={classOf(u)} label={false} />
                        <span className="truncate text-slate-800">{u.label}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <StatusChip status={u.status} />
                    </td>
                    <td className="hidden px-4 py-2 2xl:table-cell">
                      <TierBadge tier={u.tier} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="self-start overflow-hidden lg:col-span-2 xl:col-span-1">
          {selectedUnit ? (
            <>
              <UnitDetails unit={selectedUnit} />
              <div className="border-t border-line px-4 py-3">
                <Button size="sm" variant="primary" onClick={() => showIn3d(selectedUnit.code)}>
                  <Cuboid className="h-3.5 w-3.5" /> {t('validation.show3d')}
                </Button>
              </div>
            </>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-slate-500">{t('registry.pickRecord')}</p>
          )}
        </Card>
      </div>
      <MintDialog open={mintOpen} onOpenChange={setMintOpen} />
    </Page>
  )
}

export default RegistryPage
