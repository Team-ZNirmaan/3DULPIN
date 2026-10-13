import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CesiumMap, type MapStatus } from '../map/CesiumMap'
import { usingEvaluationToken } from '../map/config'
import { MapLegend } from '../map/MapLegend'
import { MAP_VIEWS, type MapView } from '../map/scene/camera'
import { ViewToggle } from '../map/ViewToggle'
import { spaces, towerPlot } from '../data'
import { useDemoState } from '../state/demo'
import { AlertIcon, PinIcon } from '../components/icons'
import s from './MapPage.module.css'

const parseView = (v: string | null): MapView => (MAP_VIEWS.includes(v as MapView) ? (v as MapView) : '2d')

export function MapPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const view = parseView(params.get('view'))
  const { towerRegistered } = useDemoState()
  const [status, setStatus] = useState<MapStatus>('loading')

  const setView = (next: '2d' | '3d') =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (next === '2d') n.delete('view')
      else n.set('view', next)
      return n
    }, { replace: true })

  return (
    <div className={s.page}>
      <CesiumMap view={view} towerRegistered={towerRegistered} notRegisteredText={t('map.notRegistered')} onStatus={setStatus} />

      <section className={s.panel} aria-labelledby="map-title">
        <h1 id="map-title" className={s.title}>
          {t('map.title')}
        </h1>
        <p className={s.place}>
          <PinIcon size={15} />
          {t('map.place')}
        </p>
        <p className={s.intro}>{t('map.intro')}</p>

        <div className={s.tower}>
          <span className={s.towerName}>{t('map.towerLine', { cts: towerPlot.cts })}</span>
          <span className={towerRegistered ? `${s.state} ${s.issued}` : `${s.state} ${s.pending}`}>
            {towerRegistered ? t('map.issued', { count: spaces.length }) : t('map.notIssued')}
          </span>
        </div>

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

      <MapLegend towerRegistered={towerRegistered} />
      <ViewToggle value={view === '2d' ? '2d' : '3d'} onChange={setView} />
    </div>
  )
}
