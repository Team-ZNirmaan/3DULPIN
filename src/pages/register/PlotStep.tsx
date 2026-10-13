import { useTranslation } from 'react-i18next'
import { plots, SITE, TOWER, towerPlot, underground } from '../../data'
import { LEVELS } from '../../data/tower'
import { num } from '../../lib/format'
import s from './RegisterPage.module.css'

type Props = {
  selected: string | null
  onSelect: (cts: string) => void
  onNext: () => void
}

const byCts = [...plots].sort((a, b) => Number(a.cts) - Number(b.cts))
const floors = LEVELS.filter((l) => l.order > 0 && l.level !== 'RF').length
const basements = LEVELS.filter((l) => l.order < 0).length

/**
 * Step 1: the plots without 3D-ULPINs. Only Tower 1's plot has building data submitted, so it is the
 * only one that can be picked; the others are listed, greyed out, like the rest of a registry queue.
 */
export function PlotStep({ selected, onSelect, onNext }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const plot = plots.find((p) => p.cts === selected)

  return (
    <div className={s.plotStep}>
      <section className={s.card}>
        <h2 className={s.cardTitle} id="pick-plot">
          {t('register.pickPlot')}
        </h2>
        <p className={s.cardText}>{t('register.pickPlotText')}</p>
        <ul className={s.plotList} role="radiogroup" aria-labelledby="pick-plot">
          {byCts.map((p) => {
            const ready = p.cts === towerPlot.cts
            return (
              <li key={p.cts}>
                <label className={`${s.plotRow} ${ready ? '' : s.plotRowDisabled} ${selected === p.cts ? s.plotRowOn : ''}`}>
                  <input type="radio" name="plot" value={p.cts} checked={selected === p.cts} disabled={!ready} onChange={() => onSelect(p.cts)} />
                  <span className={s.plotCts}>{t('plot.title', { cts: p.cts })}</span>
                  <span className={s.plotUlpin}>{p.ulpin}</span>
                  <span className={ready ? s.plotReady : s.plotNone}>{ready ? t('register.dataSubmitted') : t('register.noBuilding')}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={`${s.card} ${s.confirm}`} aria-live="polite">
        {plot ? (
          <>
            <h2 className={s.cardTitle}>{t('plot.title', { cts: plot.cts })}</h2>
            <p className={s.place}>
              {SITE.village}, {SITE.taluka}, {SITE.district}
            </p>
            <dl className={s.facts}>
              <dt>{t('plot.ulpin')}</dt>
              <dd className={s.mono}>{plot.ulpin}</dd>
              <dt>{t('plot.area')}</dt>
              <dd>{num(lang, plot.areaM2, 0)} m²</dd>
              <dt>{t('register.building')}</dt>
              <dd>
                {TOWER.name}
                <span className={s.subtle}>{t('register.storeys', { basements, floors })}</span>
              </dd>
              <dt>{t('plot.restrictions')}</dt>
              <dd>
                {plot.restrictions.map((r) => {
                  const line = underground.find((u) => u.code === r.segmentCode)
                  return (
                    <span key={r.segmentCode} className={s.block}>
                      {t(`rights.${r.kind}`)}: {line ? t(`underground.${line.key}`) : r.segmentCode}
                    </span>
                  )
                })}
              </dd>
            </dl>
            <div className={s.actions}>
              <button type="button" className={s.primary} onClick={onNext}>
                {t('register.continue')}
              </button>
            </div>
          </>
        ) : (
          <p className={s.empty}>{t('register.pickPlotHint')}</p>
        )}
      </section>
    </div>
  )
}
