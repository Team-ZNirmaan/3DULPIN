import { parseCode } from '../lib/ulpin'
import s from './CodeChip.module.css'

type Props = {
  code: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Shows a 3D-ULPIN with each part of the code tinted:
 * parent ULPIN · type (in its space colour) · building · level · unit · check character (green).
 */
export function CodeChip({ code, size = 'md' }: Props) {
  const r = parseCode(code)
  if (!r.ok) return <code className={`${s.chip} ${s[size]}`}>{code}</code>
  const { parent, type, building, level, unit, check } = r.parts
  return (
    <code className={`${s.chip} ${s[size]}`} aria-label={code} title={code}>
      <span className={s.parent}>{parent}</span>
      <span className={s.dash}>-</span>
      <span className={s.type} style={{ ['--type' as string]: `var(--type-${type.toLowerCase()})` }}>
        {type}
      </span>
      <span className={s.part}>{building}</span>
      <span className={s.part}>{level}</span>
      <span className={s.part}>{unit}</span>
      <span className={s.check}>{check}</span>
    </code>
  )
}
