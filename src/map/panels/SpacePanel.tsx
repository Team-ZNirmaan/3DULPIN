import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CodeChip } from '../../components/CodeChip'
import { findByCode, type Space } from '../../data'
import { heightRange, levelName, num, spaceName } from '../../lib/format'
import s from './Panels.module.css'

type Props = {
  space: Space
  onClose: () => void
  onSelect: (code: string) => void
}

/** Details of one 3D space: its code, where it is, how big it is, and the rights in it. */
export function SpacePanel({ space, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const linked = (code: string) => findByCode(code) as Space | undefined

  return (
    <section className={`${s.panel} ${s.right}`} aria-labelledby="space-title">
      <header className={s.head}>
        <div>
          <p className={s.eyebrow}>
            <span className={s.swatch} style={{ background: `var(--type-${space.type.toLowerCase()})` }} />
            {t(`types.${space.type}`)}
          </p>
          <h2 id="space-title" className={s.title}>
            {spaceName(t, space)}
          </h2>
        </div>
        <button type="button" className={s.close} onClick={onClose} aria-label={t('details.close')}>
          ×
        </button>
      </header>

      <CodeChip code={space.code} size="md" />

      <dl className={s.facts}>
        <dt>{t('details.level')}</dt>
        <dd>{levelName(t, space.level)}</dd>
        <dt>{t('details.height')}</dt>
        <dd>{heightRange(t, lang, space)}</dd>
        <dt>{t('details.floorArea')}</dt>
        <dd>{num(lang, space.floorAreaM2)} m²</dd>
        {space.carpetAreaM2 !== undefined && (
          <>
            <dt>{t('details.carpetArea')}</dt>
            <dd>{num(lang, space.carpetAreaM2)} m²</dd>
          </>
        )}
        {space.undividedSharePct !== undefined && (
          <>
            <dt>{t('details.share')}</dt>
            <dd>{num(lang, space.undividedSharePct, 3)}%</dd>
          </>
        )}
        {space.holder && (
          <>
            <dt>{t('details.holder')}</dt>
            <dd>{space.holder}</dd>
          </>
        )}
        {space.type === 'U' && (
          <>
            <dt>{t('details.parking')}</dt>
            <dd>
              {space.parkingCodes?.length
                ? space.parkingCodes.map((c) => (
                    <button key={c} type="button" className={s.linkButton} onClick={() => onSelect(c)}>
                      {spaceName(t, linked(c)!)}
                    </button>
                  ))
                : t('details.noParking')}
            </dd>
          </>
        )}
        {space.allottedTo && (
          <>
            <dt>{t('details.allottedTo')}</dt>
            <dd>
              <button type="button" className={s.linkButton} onClick={() => onSelect(space.allottedTo!)}>
                {spaceName(t, linked(space.allottedTo)!)}
              </button>
            </dd>
          </>
        )}
      </dl>

      <h3 className={s.subhead}>{t('details.rights')}</h3>
      <ul className={s.rights}>
        {space.rights.map((r, i) => (
          <li key={i}>
            <p className={s.rightKind}>
              {t(`rights.${r.kind}`)}
              {r.sharePct !== undefined && <span className={s.share}>{num(lang, r.sharePct, 3)}%</span>}
            </p>
            <p className={s.rightHolder}>{r.holder}</p>
            <p className={s.rightSource}>
              {t(`docs.${r.source.kind}`)}, {r.source.ref}
            </p>
          </li>
        ))}
      </ul>

      <Link to={`/card/${space.code}`} className={s.primary}>
        {t('details.openCard')}
      </Link>
    </section>
  )
}
