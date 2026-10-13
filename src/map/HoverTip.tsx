import { useTranslation } from 'react-i18next'
import { findByCode, type Space } from '../data'
import { levelName, spaceName } from '../lib/format'
import type { MapHover } from './CesiumMap'
import s from './panels/Panels.module.css'

/** Small label that follows the pointer over a block: what the space is and on which level. */
export function HoverTip({ hover }: { hover: MapHover }) {
  const { t } = useTranslation()
  if (!hover) return null
  const space = findByCode(hover.space) as Space | undefined
  if (!space) return null
  return (
    <div className={s.tip} style={{ left: hover.x + 14, top: hover.y + 14 }} role="tooltip">
      <span className={s.swatch} style={{ background: `var(--type-${space.type.toLowerCase()})` }} />
      <span>
        <b>{spaceName(t, space)}</b>
        <span className={s.tipLevel}>{levelName(t, space.level)}</span>
      </span>
    </div>
  )
}
