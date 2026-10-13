import { useTranslation } from 'react-i18next'
import { CubeIcon, MapIcon, UndergroundIcon } from '../components/icons'
import s from './MapControls.module.css'

export type ToggleView = '2d' | '3d' | 'under'

type Props = {
  value: ToggleView
  onChange: (value: ToggleView) => void
}

/** Switches between the top-down parcel map, the 3D view of Tower 1 and the underground view. */
export function ViewToggle({ value, onChange }: Props) {
  const { t } = useTranslation()
  const options = [
    { id: '2d', label: t('map.view2d'), icon: <MapIcon /> },
    { id: '3d', label: t('map.view3d'), icon: <CubeIcon /> },
    { id: 'under', label: t('map.viewUnder'), icon: <UndergroundIcon /> },
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
