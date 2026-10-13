import { useTranslation } from 'react-i18next'
import { levelName } from '../lib/format'
import { parseCode } from '../lib/ulpin'
import s from './CodeExplainer.module.css'

const NETWORKS: Record<string, string> = { M: 'metro', W: 'water' }

/** A 3D-ULPIN split into its parts, with what each part means written under it. */
export function CodeExplainer({ code }: { code: string }) {
  const { t } = useTranslation()
  const r = parseCode(code)
  if (!r.ok) return null
  const { parent, type, building, level, unit, check } = r.parts
  const network = type === 'G'
  const parts: { text: string; label: string; tone: string }[] = [
    { text: parent, label: network ? t('explain.networkRoot') : t('explain.parent'), tone: s.parent },
    { text: type, label: t('explain.type', { type: t(`types.${type}`) }), tone: s.type },
    {
      text: building,
      label: network ? t('explain.network', { name: t(`explain.networks.${NETWORKS[building] ?? 'other'}`) }) : t('explain.building', { b: building }),
      tone: s.part,
    },
    ...(network
      ? [{ text: `${level} ${unit}`, label: t('explain.segment'), tone: s.part }]
      : [
          { text: level, label: levelName(t, level), tone: s.part },
          { text: unit, label: t('explain.unit', { n: parseInt(unit, 36) }), tone: s.part },
        ]),
    { text: check, label: t('explain.check'), tone: s.check },
  ]

  return (
    <figure className={s.explainer} aria-label={t('explain.label')}>
      <div className={s.row} style={{ ['--type' as string]: `var(--type-${type.toLowerCase()})` }}>
        {parts.map((p, i) => (
          <div key={i} className={s.cell}>
            <code className={`${s.text} ${p.tone}`}>{p.text}</code>
            <span className={s.label}>{p.label}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}
