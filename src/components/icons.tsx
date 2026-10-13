// Small inline icons. Stroke icons inherit the text colour.
type IconProps = { size?: number; className?: string }

export function LogoMark({ size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="rgb(255 255 255 / 8%)" stroke="rgb(255 255 255 / 18%)" />
      <path d="M16 6 26 11.5v9L16 26 6 20.5v-9z" fill="none" stroke="#E8A065" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 11.5 16 17l10-5.5M16 17v9" fill="none" stroke="#E8A065" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function PinIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function MapIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function CubeIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
      <path d="m3 7 9 5 9-5M12 12v10" />
    </svg>
  )
}

/** Ground line with layers below it, for the underground view. */
export function UndergroundIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 7h20" />
      <path d="M5 4.5 7 7M10 4.5 12 7M15 4.5 17 7" opacity="0.6" />
      <circle cx="12" cy="15.5" r="4.5" />
      <circle cx="12" cy="15.5" r="1.5" />
    </svg>
  )
}

export function AlertIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  )
}
