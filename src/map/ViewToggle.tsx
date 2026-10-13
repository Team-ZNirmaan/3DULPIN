import { useTranslation } from 'react-i18next'
import { CubeIcon, MapIcon } from '../components/icons'
import s from './MapControls.module.css'

type Props = {
  value: '2d' | '3d'
  onChange: (value: '2d' | '3d') => void
}

/** Switches between the top-down parcel map and the 3D view of Tower 1. */
export function ViewToggle({ value, onChange }: Props) {
  const { t } = useTranslation()
  const options = [
    { id: '2d', label: t('map.view2d'), icon: <MapIcon /> },
    { id: '3d', label: t('map.view3d'), icon: <CubeIcon /> },
  ] as const
  return (
    <div className={`${s.glass} ${s.toggle}`} role="group" aria-label={t('map.views')}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={value === o.id ? `${s.option} ${s.active}` : s.option}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}
