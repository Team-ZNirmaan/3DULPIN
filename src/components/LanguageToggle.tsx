import { useTranslation } from 'react-i18next'
import type { Lang } from '../i18n'
import s from './LanguageToggle.module.css'

const LANGS: { code: Lang; short: 'lang.en' | 'lang.hi'; full: 'lang.enFull' | 'lang.hiFull' }[] = [
  { code: 'en', short: 'lang.en', full: 'lang.enFull' },
  { code: 'hi', short: 'lang.hi', full: 'lang.hiFull' },
]

export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  return (
    <div className={s.toggle} role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => {
        const active = i18n.language === l.code
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            className={active ? `${s.option} ${s.active}` : s.option}
            aria-pressed={active}
            title={t(l.full)}
            onClick={() => i18n.changeLanguage(l.code)}
          >
            {t(l.short)}
          </button>
        )
      })}
    </div>
  )
}
