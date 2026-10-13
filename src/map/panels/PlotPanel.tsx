import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CodeChip } from '../../components/CodeChip'
import { SITE, spaces, underground, type Plot, type Space } from '../../data'
import { LEVELS } from '../../data/tower'
import { levelName, num, spaceName } from '../../lib/format'
import s from './Panels.module.css'

type Props = {
  plot: Plot
  towerRegistered: boolean
  selectedCode: string | null
  onSelect: (code: string) => void
  onBack: () => void
}

const LEAF = new Set(['U', 'L', 'P', 'C'])
// Top floor first, the way a building directory reads.
const LEVEL_ORDER = [...LEVELS.map((l) => l.level)].reverse()

/** A plot's record: its ULPIN, area, restrictions and, for Tower 1, every 3D space on it. */
export function PlotPanel({ plot, towerRegistered, selectedCode, onSelect, onBack }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const showSpaces = plot.hasTower && towerRegistered
  const plotCode = spaces.find((sp) => sp.type === 'S')!
  const buildingCode = spaces.find((sp) => sp.type === 'B')!
  const leaves = spaces.filter((sp) => LEAF.has(sp.type))
  const multiLevel = leaves.filter((sp) => sp.level === 'XX')

  return (
    <section className={`${s.panel} ${s.left}`} aria-labelledby="plot-title">
      <button type="button" className={s.back} onClick={onBack}>
        ← {t('plot.back')}
      </button>
      <h2 id="plot-title" className={s.title}>
        {t('plot.title', { cts: plot.cts })}
      </h2>
      <p className={s.place}>{SITE.village}, {SITE.taluka}, {SITE.district}</p>

      <dl className={s.facts}>
        <dt>{t('plot.ulpin')}</dt>
        <dd className={s.mono}>{plot.ulpin}</dd>
        <dt>{t('plot.area')}</dt>
        <dd>{num(lang, plot.areaM2, 0)} m²</dd>
        <dt>{t('plot.restrictions')}</dt>
        <dd>
          {plot.restrictions.length === 0
            ? t('plot.noRestrictions')
            : plot.restrictions.map((r) => {
                const seg = underground.find((u) => u.code === r.segmentCode)
                return (
                  <span key={r.segmentCode} className={s.restriction}>
                    {t(`rights.${r.kind}`)}: {seg ? t(`underground.${seg.key}`) : r.segmentCode}
                  </span>
                )
              })}
        </dd>
      </dl>

      {plot.hasTower && !towerRegistered && (
        <div className={s.notice}>
          <p>{t('plot.notIssued')}</p>
          <Link to={`/register?plot=${plot.cts}`} className={s.primary}>
            {t('plot.register')}
          </Link>
        </div>
      )}
      {!plot.hasTower && <p className={s.muted}>{t('plot.noCodes')}</p>}

      {showSpaces && (
        <>
          <h3 className={s.subhead}>{t('plot.codes')}</h3>
          <div className={s.codeRows}>
            <span className={s.codeLabel}>{t('plot.plotCode')}</span>
            <CodeChip code={plotCode.code} size="sm" />
            <span className={s.codeLabel}>{t('plot.buildingCode')}</span>
            <CodeChip code={buildingCode.code} size="sm" />
          </div>

          <h3 className={s.subhead}>
            {t('plot.spaces')} <span className={s.count}>{t('plot.spaceCount', { count: leaves.length })}</span>
          </h3>
          <div className={s.list}>
            {[...LEVEL_ORDER, 'XX' as const].map((level) => {
              const here: Space[] = level === 'XX' ? multiLevel : leaves.filter((sp) => sp.level === level)
              if (!here.length) return null
              return (
                <div key={level} className={s.group}>
                  <p className={s.groupHead}>{levelName(t, level)}</p>
                  {here.map((sp) => (
                    <button
                      key={sp.code}
                      type="button"
                      className={sp.code === selectedCode ? `${s.row} ${s.rowActive}` : s.row}
                      onClick={() => onSelect(sp.code)}
                    >
                      <span className={s.swatch} style={{ background: `var(--type-${sp.type.toLowerCase()})` }} />
                      {spaceName(t, sp)}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
