import { ChevronDown, ChevronRight, Cuboid, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { PILOT_PARENT } from '@/data/generate'
import { validateCode } from '@/domain/ulpin'
import { UnitDetails } from '@/features/explorer/DetailsPanel'
import { buildCityJson, download } from '@/features/services/exporters'
import { cn } from '@/lib/cn'
import { useShowIn3d } from '@/lib/useShowIn3d'
import { useData } from '@/store/data'
import { CodeAnatomy } from './CodeAnatomy'

const LEVELS = ['RF', '05', '04', '03', '02', '01', '00', 'B1', 'B2']

function TreeNode({
  label,
  sub,
  depth,
  open,
  onToggle,
  onClick,
  active,
  children,
}: {
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
      <div className={cn('flex items-center gap-1 rounded px-1.5 py-1 text-sm', active ? 'bg-saffron-50 text-saffron-700' : 'text-slate-700 hover:bg-slate-50')} style={{ paddingLeft: depth * 14 + 6 }}>
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
  const { t } = useTranslation()
  const units = useData((s) => s.units)
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
              <TreeNode key={l} label={`${t('registry.level')} ${l}`} sub={`${items.length}`} depth={2} open={open[l]} onToggle={() => toggle(l)}>
                {items.map((u) => (
                  <TreeNode
                    key={u.code}
                    label={u.label.replace(/^(Floor \d|Basement \d|Stilt \(ground\)) — /, '')}
                    sub={u.code.slice(15, 22)}
                    depth={3}
                    onClick={() => onSelect(u.code)}
                    active={selected === u.code}
                  />
                ))}
              </TreeNode>
            )
          })}
        </TreeNode>
      </TreeNode>
      <TreeNode label={t('registry.infraRoots')} depth={0} open={open.infra} onToggle={() => toggle('infra')}>
        {infra.map((u) => (
          <TreeNode key={u.code} label={u.label} sub={u.code.slice(0, 8)} depth={1} onClick={() => onSelect(u.code)} active={selected === u.code} />
        ))}
      </TreeNode>
    </ul>
  )
}

export function RegistryPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const units = useData((s) => s.units)
  const showIn3d = useShowIn3d()
  const [code, setCode] = useState(params.get('q') ?? '')
  const [selected, setSelected] = useState<string | undefined>()

  useEffect(() => {
    const q = params.get('q')
    if (!q) return
    setCode(q)
    const hit = units.find((u) => u.code === validateCode(q).normalized)
    if (hit) setSelected(hit.code)
  }, [params, units])

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
        eyebrow={t('registry.eyebrow')}
        title={t('nav.registry')}
        description={t('registry.description')}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              download('bhu-aayam-tower1.city.json', buildCityJson())
              toast({ tone: 'success', title: t('registry.downloaded'), body: 'CityJSON 2.0 · EPSG:32643' })
            }}
          >
            <Download className="h-4 w-4" /> {t('registry.cityjson')}
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
              placeholder="DEMO27PN0417A2-U104005L"
              className="h-11 min-w-[16rem] flex-1 rounded-md border border-line px-3 font-mono text-base uppercase tracking-wide"
              aria-label={t('registry.validatorTitle')}
              spellCheck={false}
            />
            <Button variant="outline" onClick={() => setCode(example)}>
              {t('registry.tryValid')}
            </Button>
            <Button variant="outline" onClick={() => setCode(typo)}>
              {t('registry.tryTypo')}
            </Button>
          </div>
          <CodeAnatomy input={code} />
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <Card className="self-start">
          <CardHeader title={t('registry.hierarchy')} subtitle={t('registry.hierarchySubtitle')} />
          <div className="max-h-[36rem] overflow-y-auto p-2">
            <Hierarchy onSelect={pick} selected={selected} />
          </div>
        </Card>
        <Card className="self-start overflow-hidden">
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
            <p className="px-4 py-12 text-center text-sm text-slate-500">{t('registry.pickRecord')}</p>
          )}
        </Card>
      </div>
    </Page>
  )
}

export default RegistryPage
