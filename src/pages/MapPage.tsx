import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CesiumMap, type MapStatus } from '../map/CesiumMap'
import { usingEvaluationToken } from '../map/config'
import { AlertIcon, PinIcon } from '../components/icons'
import s from './MapPage.module.css'

export function MapPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<MapStatus>('loading')

  return (
    <div className={s.page}>
      <CesiumMap onStatus={setStatus} />

      <section className={s.panel} aria-labelledby="map-title">
        <h1 id="map-title" className={s.title}>
          {t('map.title')}
        </h1>
        <p className={s.place}>
          <PinIcon size={15} />
          {t('map.place')}
        </p>
        <p className={s.intro}>{t('map.intro')}</p>

        {status === 'loading' && (
          <p className={s.status} role="status">
            <span className={s.spinner} aria-hidden="true" />
            {t('map.loading')}
          </p>
        )}
        {status === 'error' && (
          <p className={`${s.status} ${s.error}`} role="alert">
            <AlertIcon size={15} />
            {t('map.loadError')}
          </p>
        )}
        {usingEvaluationToken && <p className={s.note}>{t('map.evalToken')}</p>}
      </section>
    </div>
  )
}
