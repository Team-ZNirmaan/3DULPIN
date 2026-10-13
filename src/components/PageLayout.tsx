import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import s from './PageLayout.module.css'

type Props = {
  title: string
  intro?: string
  /** Wider content column, for data-heavy pages. */
  wide?: boolean
  children?: ReactNode
}

// Centred, document-like layout used by every screen except the map.
export function PageLayout({ title, intro, wide, children }: Props) {
  const { t } = useTranslation()
  return (
    <div className={s.page}>
      <div className={wide ? `${s.inner} ${s.wide}` : s.inner}>
        <p className={s.eyebrow}>{t('app.tagline')}</p>
        <h1 className={s.title}>{title}</h1>
        {intro && <p className={s.intro}>{intro}</p>}
        <div className={s.body}>{children}</div>
      </div>
    </div>
  )
}

export function BeingBuilt({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className={s.card}>
      <span className={s.wip}>{t('wip')}</span>
      {children}
    </div>
  )
}
