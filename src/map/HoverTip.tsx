import { useTranslation } from 'react-i18next'
import { findByCode } from '../data'
import { depthRange, levelName, spaceName } from '../lib/format'
import type { MapHover } from './CesiumMap'
import s from './panels/Panels.module.css'

/** Small label that follows the pointer over a block or a line: what it is, and its level or depth. */
export function HoverTip({ hover }: { hover: MapHover }) {
  const { t, i18n } = useTranslation()
  if (!hover) return null
  const found = findByCode(hover.space)
  if (!found) return null
  const [type, name, where] =
    'type' in found
      ? [found.type, spaceName(t, found), levelName(t, found.level)]
      : ['G', t(`underground.${found.key}`), depthRange(t, i18n.language, found)]
  return (
    <div className={s.tip} style={{ left: hover.x + 14, top: hover.y + 14 }} role="tooltip">
      <span className={s.swatch} style={{ background: `var(--type-${type.toLowerCase()})` }} />
      <span>
        <b>{name}</b>
        <span className={s.tipLevel}>{where}</span>
      </span>
    </div>
  )
}
