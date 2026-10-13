import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CodeChip } from '../../components/CodeChip'
import { spaces, towerPlot, underground, type Space } from '../../data'
import { spaceName } from '../../lib/format'
import s from './RegisterPage.module.css'

// Step 4, and the page itself once Tower 1 is registered: every new 3D-ULPIN, grouped by type.

const GROUPS: Space['type'][] = ['S', 'B', 'U', 'L', 'P', 'C']
const SINGLE: Space['type'][] = ['S', 'B']
const MANY: Space['type'][] = ['U', 'L', 'P', 'C']

type Props = {
  /** True right after Generate; false when the page is opened on an already registered tower. */
  justIssued: boolean
  onReset: () => void
}

export function CodesResult({ justIssued, onReset }: Props) {
  const { t } = useTranslation()
  const below = underground.filter((u) => u.underPlots.includes(towerPlot.cts))

  const group = (ty: Space['type']) => {
    const here = spaces.filter((sp) => sp.type === ty)
    return (
      <section key={ty} className={s.group} aria-labelledby={`group-${ty}`}>
        <h3 className={s.groupHead} id={`group-${ty}`}>
          <span className={s.swatch} style={{ background: `var(--type-${ty.toLowerCase()})` }} />
          {t(`register.groups.${ty}`)}
          <span className={s.groupCount}>{here.length}</span>
        </h3>
        <ul className={s.chips}>
          {here.map((sp) => (
            <li key={sp.code}>
              <Link to={`/map?code=${sp.code}`} className={s.chipLink}>
                <span className={s.chipName}>{spaceName(t, sp)}</span>
                <CodeChip code={sp.code} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className={s.result}>
      <section className={`${s.card} ${s.resultHead}`}>
        <span className={s.resultTick} aria-hidden="true">
          ✓
        </span>
        <div className={s.resultText}>
          <h2 className={s.cardTitle} id="result-title">
            {justIssued
              ? t('register.issuedTitle', { count: spaces.length })
              : t('register.alreadyTitle', {
                  cts: towerPlot.cts,
                  count: spaces.length,
                })}
          </h2>
          <p className={s.cardText}>{t('register.issuedText', { cts: towerPlot.cts })}</p>
          <ul className={s.counts}>
            {GROUPS.map((ty) => (
              <li key={ty}>
                <span className={s.swatch} style={{ background: `var(--type-${ty.toLowerCase()})` }} />
                {t(`register.groups.${ty}`)}
                <b>{spaces.filter((sp) => sp.type === ty).length}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.resultActions}>
          <Link to={`/map?view=3d&plot=${towerPlot.cts}`} className={s.primary}>
            {t('register.viewIn3d')}
          </Link>
          <button type="button" className={s.quiet} onClick={onReset}>
            {t('register.reset')}
          </button>
        </div>
      </section>

      {/* The plot volume and the building have one code each, so they share a row. */}
      <div className={s.pair}>{SINGLE.map((ty) => group(ty))}</div>
      {MANY.map((ty) => group(ty))}

      {below.length > 0 && (
        <section className={`${s.group} ${s.groupBelow}`} aria-labelledby="group-G">
          <h3 className={s.groupHead} id="group-G">
            <span className={s.swatch} style={{ background: 'var(--type-g)' }} />
            {t('register.belowTitle')}
            <span className={s.groupCount}>{below.length}</span>
          </h3>
          <p className={s.cardText}>{t('register.belowText')}</p>
          <ul className={s.chips}>
            {below.map((u) => (
              <li key={u.code}>
                <Link to={`/map?code=${u.code}`} className={s.chipLink}>
                  <span className={s.chipName}>{t(`underground.${u.key}`)}</span>
                  <CodeChip code={u.code} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
