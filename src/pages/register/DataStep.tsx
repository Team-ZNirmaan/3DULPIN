import { useTranslation } from 'react-i18next'
import { SLOTS, type SlotId } from './slots'
import s from './RegisterPage.module.css'

// Step 2: the six data sources the PS names for creating 3D-ULPINs (see slots.ts).

type Props = {
  filled: Set<SlotId>
  onFill: (ids: SlotId[]) => void
  onBack: () => void
  onNext: () => void
}

export function DataStep({ filled, onFill, onBack, onNext }: Props) {
  const { t } = useTranslation()
  const missing = SLOTS.filter((sl) => !filled.has(sl.id))

  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h2 className={s.cardTitle}>{t('register.dataTitle')}</h2>
          <p className={s.cardText}>
            {t('register.dataText', {
              filled: filled.size,
              total: SLOTS.length,
            })}
          </p>
        </div>
        <button type="button" className={s.secondary} disabled={missing.length === 0} onClick={() => onFill(missing.map((sl) => sl.id))}>
          {t('register.useAll')}
        </button>
      </div>

      <ul className={s.slots}>
        {SLOTS.map((sl) => {
          const done = filled.has(sl.id)
          return (
            <li key={sl.id} className={done ? `${s.slot} ${s.slotDone}` : s.slot}>
              <div className={s.slotHead}>
                <span className={s.slotTick} aria-hidden="true">
                  {done ? '✓' : ''}
                </span>
                <h3 className={s.slotName}>{t(`register.slots.${sl.id}.name`)}</h3>
              </div>
              <p className={s.slotDesc}>{t(`register.slots.${sl.id}.desc`)}</p>
              {done ? (
                <p className={s.slotFile}>
                  <span className={s.fileName}>{sl.file}</span>
                  <span className={s.fileMeta}>{sl.auto ? t('register.autoFilled') : sl.size}</span>
                </p>
              ) : (
                <button
                  type="button"
                  className={s.slotButton}
                  onClick={() => onFill([sl.id])}
                  aria-label={`${t('register.useSample')}: ${t(`register.slots.${sl.id}.name`)}`}
                >
                  {t('register.useSample')}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className={s.actions}>
        <button type="button" className={s.secondary} onClick={onBack}>
          {t('register.back')}
        </button>
        <button type="button" className={s.primary} disabled={missing.length > 0} onClick={onNext}>
          {t('register.continue')}
        </button>
      </div>
    </section>
  )
}
