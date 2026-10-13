import { useTranslation } from 'react-i18next'
import type { MapView } from './scene/camera'
import s from './MapControls.module.css'

// Only what can be seen in the current view: parking bays and the underground lines appear with the
// underground view, where the basements and the ground below show.
const ABOVE_GROUND = ['U', 'C'] as const
const BASEMENTS = ['L', 'P'] as const

/** What the colours on the map mean. Same colours as the code chips and the property card. */
export function MapLegend({ towerRegistered, view }: { towerRegistered: boolean; view: MapView }) {
  const { t } = useTranslation()
  const under = view === 'under'
  const types = towerRegistered ? [...ABOVE_GROUND, ...(under ? BASEMENTS : [])] : []
  return (
    <section className={`${s.glass} ${s.legend}`} aria-label={t('map.legend')}>
      <h2 className={s.legendTitle}>{t('map.legend')}</h2>
      <ul className={s.legendList}>
        <li>
          <span className={s.lineSwatch} />
          {t('map.plotBoundary')}
        </li>
        <li>
          <span className={s.hatchSwatch} />
          {t('map.rightOfUser')}
        </li>
        {towerRegistered ? (
          types.map((ty) => (
            <li key={ty}>
              <span className={s.swatch} style={{ background: `var(--type-${ty.toLowerCase()})` }} />
              {t(`types.${ty}`)}
            </li>
          ))
        ) : (
          <li>
            <span className={s.swatch} style={{ background: '#c3c8d0' }} />
            {t('map.unregisteredBuilding')}
          </li>
        )}
        {under && (
          <li>
            <span className={s.swatch} style={{ background: 'var(--type-g)' }} />
            {t('map.lines')}
          </li>
        )}
      </ul>
    </section>
  )
}
