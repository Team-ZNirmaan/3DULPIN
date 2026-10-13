import { useTranslation } from 'react-i18next'
import s from './MapControls.module.css'

// Only what is visible above ground. Parking (L, P) and underground (G) are added with the
// underground view in chunk 4, since the basements are hidden until then.
const REGISTERED_TYPES = ['U', 'C'] as const

/** What the colours on the map mean. Same colours as the code chips and the property card. */
export function MapLegend({ towerRegistered }: { towerRegistered: boolean }) {
  const { t } = useTranslation()
  return (
    <section className={`${s.glass} ${s.legend}`} aria-label={t('map.legend')}>
      <h2 className={s.legendTitle}>{t('map.legend')}</h2>
      <ul className={s.legendList}>
        <li>
          <span className={s.lineSwatch} />
          {t('map.plotBoundary')}
        </li>
        {towerRegistered ? (
          REGISTERED_TYPES.map((ty) => (
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
      </ul>
    </section>
  )
}
