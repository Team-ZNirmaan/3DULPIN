import { useTranslation } from 'react-i18next'
import type { Right } from '../../data'
import { num } from '../../lib/format'
import s from './Panels.module.css'

/** Rights in a 3D space, each with its holder and the legal document it comes from. */
export function RightsList({ rights, heading = true }: { rights: Right[]; heading?: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <>
      {heading && <h3 className={s.subhead}>{t('details.rights')}</h3>}
      <ul className={s.rights}>
        {rights.map((r, i) => (
          <li key={i}>
            <p className={s.rightKind}>
              {t(`rights.${r.kind}`)}
              {r.sharePct !== undefined && <span className={s.share}>{num(i18n.language, r.sharePct, 3)}%</span>}
            </p>
            <p className={s.rightHolder}>{r.holder}</p>
            <p className={s.rightSource}>
              {t(`docs.${r.source.kind}`)}, {r.source.ref}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}
