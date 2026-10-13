import { useTranslation } from 'react-i18next'
import { CodeChip } from '../../components/CodeChip'
import { PageLayout } from '../../components/PageLayout'
import { allCodes, findByCode, plots, SITE, spaces, TOWER, towerPlot, underground } from '../../data'
import type { Space } from '../../data'
import { toMsl } from '../../data/geo'
import { SPACE_TYPES } from '../../lib/ulpin'
import { SitePlan } from './SitePlan'
import s from './DebugPage.module.css'

// Internal page to review the demo data (chunk 1). Not in the menu; open #/debug.
// Labels here are English only; the space names use the shared translations.

const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const share = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const LEVEL_ORDER = (sp: Space) => (sp.levelOrder === 10 ? 100 : sp.levelOrder)

function Verify() {
  return <span className={s.verify}>to verify</span>
}

export function DebugPage() {
  const { t } = useTranslation()
  const counts = Object.fromEntries(SPACE_TYPES.map((ty) => [ty, ty === 'G' ? underground.length : spaces.filter((sp) => sp.type === ty).length]))
  const sorted = [...spaces].sort((a, b) => LEVEL_ORDER(b) - LEVEL_ORDER(a) || a.type.localeCompare(b.type) || a.unit.localeCompare(b.unit))
  const spaceName = (sp: Space) => t(`space.${sp.kind}`, { number: sp.number })
  const holderOf = (sp: Space) => {
    if (sp.type === 'U') return sp.holder
    if (sp.type === 'L') return `Allotted to ${spaceName(findByCode(sp.allottedTo!) as Space)}`
    return sp.rights[0]?.holder
  }

  return (
    <PageLayout
      wide
      title="Demo data check"
      intro="Internal review page for chunk 1. Everything below is generated from the demo dataset that the map, search and cards will use."
    >
      <section className={s.summary}>
        <div className={s.total}>
          <span className={s.bigNumber}>{allCodes.length}</span>
          <span>3D-ULPINs in the demo</span>
        </div>
        {SPACE_TYPES.map((ty) => (
          <div key={ty} className={s.count}>
            <span className={s.swatch} style={{ background: `var(--type-${ty.toLowerCase()})` }} />
            <span className={s.countNumber}>{counts[ty]}</span>
            <span className={s.countLabel}>
              <b>{ty}</b> {t(`types.${ty}`)}
            </span>
          </div>
        ))}
      </section>

      <div className={s.twoCol}>
        <section className={s.card}>
          <h2 className={s.h2}>Site</h2>
          <dl className={s.facts}>
            <dt>Building</dt>
            <dd>{TOWER.name}</dd>
            <dt>Plot</dt>
            <dd>
              CTS {towerPlot.cts}, {nf.format(towerPlot.areaM2)} m², {TOWER.road}
            </dd>
            <dt>Plot ULPIN</dt>
            <dd>
              <code className={s.mono}>{towerPlot.ulpin}</code> (fictional)
            </dd>
            <dt>Village</dt>
            <dd>
              {SITE.village} <Verify />
            </dd>
            <dt>Taluka</dt>
            <dd>
              {SITE.taluka} <Verify />
            </dd>
            <dt>District, state</dt>
            <dd>
              {SITE.district}, {SITE.state}
            </dd>
            <dt>Local body</dt>
            <dd>
              {SITE.localBody}, {SITE.pincode}
            </dd>
            <dt>Ground level</dt>
            <dd>
              {SITE.groundLevelMsl} m above sea level (SRTM) <Verify />
            </dd>
            <dt>Map data</dt>
            <dd>Plot shapes and metro alignment from {SITE.attribution}</dd>
          </dl>
        </section>
        <section className={s.card}>
          <h2 className={s.h2}>Site plan</h2>
          <SitePlan />
          <p className={s.caption}>
            Yellow: tower plot. Blue: Tower 1 footprint. Pink: the two metro bores, about 24 m down; hatched plots carry a right of user. Dashed blue: water
            main.
          </p>
        </section>
      </div>

      <section className={s.card}>
        <h2 className={s.h2}>Plots ({plots.length})</h2>
        <table className={s.table}>
          <thead>
            <tr>
              <th>CTS</th>
              <th>ULPIN</th>
              <th className={s.num}>Area (m²)</th>
              <th>Underground lines beneath</th>
            </tr>
          </thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id} className={p.hasTower ? s.highlight : undefined}>
                <td>
                  {p.cts}
                  {p.hasTower && <span className={s.tag}>Tower 1</span>}
                </td>
                <td>
                  <code className={s.mono}>{p.ulpin}</code>
                </td>
                <td className={s.num}>{nf.format(p.areaM2)}</td>
                <td>
                  {p.restrictions.length === 0 ? (
                    <span className={s.muted}>None</span>
                  ) : (
                    p.restrictions.map((r) => (
                      <div key={r.segmentCode} className={s.restriction}>
                        <CodeChip code={r.segmentCode} size="sm" /> <span className={s.muted}>{r.kind === 'right-of-user' ? 'right of user' : 'easement'}</span>
                      </div>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={s.card}>
        <h2 className={s.h2}>Underground segments ({underground.length})</h2>
        <table className={s.table}>
          <thead>
            <tr>
              <th>3D-ULPIN</th>
              <th>Segment</th>
              <th className={s.num}>Depth to centre</th>
              <th className={s.num}>Diameter</th>
              <th>Runs under CTS</th>
              <th>Holder</th>
            </tr>
          </thead>
          <tbody>
            {underground.map((u) => (
              <tr key={u.code}>
                <td>
                  <CodeChip code={u.code} size="sm" />
                </td>
                <td>{t(`underground.${u.key}`)}</td>
                <td className={s.num}>{u.axisDepthM} m</td>
                <td className={s.num}>{nf.format(u.radiusM * 2)} m</td>
                <td>{u.underPlots.join(', ')}</td>
                <td>{u.rights[0].holder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={s.card}>
        <h2 className={s.h2}>Tower 1 spaces ({spaces.length})</h2>
        <table className={s.table}>
          <thead>
            <tr>
              <th>3D-ULPIN</th>
              <th>Space</th>
              <th className={s.num}>Height (m above sea level)</th>
              <th className={s.num}>Floor area (m²)</th>
              <th className={s.num}>Carpet (m²)</th>
              <th className={s.num}>Share (%)</th>
              <th>Holder or use</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((sp) => (
              <tr key={sp.code}>
                <td>
                  <CodeChip code={sp.code} size="sm" />
                </td>
                <td>
                  <span className={s.typeCell}>
                    <span className={s.swatch} style={{ background: `var(--type-${sp.type.toLowerCase()})` }} />
                    {spaceName(sp)}
                  </span>
                </td>
                <td className={s.num}>
                  {nf.format(toMsl(sp.zBottom))} to {nf.format(toMsl(sp.zTop))}
                </td>
                <td className={s.num}>{nf.format(sp.floorAreaM2)}</td>
                <td className={s.num}>{sp.carpetAreaM2 ? nf.format(sp.carpetAreaM2) : ''}</td>
                <td className={s.num}>{sp.undividedSharePct ? share.format(sp.undividedSharePct) : ''}</td>
                <td>{holderOf(sp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PageLayout>
  )
}
