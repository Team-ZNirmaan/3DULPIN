import { useTranslation } from 'react-i18next'
import { LEVELS } from '../data/tower'
import { levelName, levelShort } from '../lib/format'
import type { Level } from '../lib/ulpin'
import s from './panels/Panels.module.css'

type Props = {
  exploded: boolean
  onExplode: (exploded: boolean) => void
  slice: Level | null
  onSlice: (level: Level | null) => void
  /** Basements join the floor picker in the underground view. */
  includeBasements?: boolean
}

/** Tower tools: explode the floors apart, and a vertical floor picker that shows one floor at a time. */
export function SceneDock({ exploded, onExplode, slice, onSlice, includeBasements = false }: Props) {
  const { t } = useTranslation()
  const levels = [...LEVELS].reverse().filter((l) => includeBasements || l.order >= 0)

  return (
    <aside className={s.dock} aria-label={t('tools.label')}>
      <button
        type="button"
        className={exploded ? `${s.tool} ${s.toolOn}` : s.tool}
        aria-pressed={exploded}
        aria-label={t('tools.explodeLong')}
        title={t('tools.explodeLong')}
        onClick={() => onExplode(!exploded)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2 21 6l-9 4-9-4 9-4Z" />
          <path d="m3 12 9 4 9-4" opacity={exploded ? 1 : 0.6} />
          <path d="m3 18 9 4 9-4" opacity={exploded ? 1 : 0.35} />
        </svg>
        <span>{t('tools.explode')}</span>
      </button>

      <div className={s.floors} role="group" aria-label={t('tools.floors')}>
        <span className={s.floorsLabel}>{t('tools.floors')}</span>
        <button type="button" className={slice === null ? `${s.floor} ${s.floorOn}` : s.floor} aria-pressed={slice === null} aria-label={t('tools.allFloors')} title={t('tools.allFloors')} onClick={() => onSlice(null)}>
          {t('levelsShort.all')}
        </button>
        {levels.map((l) => (
          <button
            key={l.level}
            type="button"
            className={slice === l.level ? `${s.floor} ${s.floorOn}` : s.floor}
            aria-pressed={slice === l.level}
            aria-label={levelName(t, l.level)}
            title={levelName(t, l.level)}
            onClick={() => onSlice(slice === l.level ? null : l.level)}
          >
            {levelShort(t, l.level)}
          </button>
        ))}
      </div>
    </aside>
  )
}
