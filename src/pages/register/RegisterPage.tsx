import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '../../components/PageLayout'
import { spaces, towerPlot } from '../../data'
import { resetDemo, setTowerRegistered, useDemoState } from '../../state/demo'
import { DataStep } from './DataStep'
import { SLOTS, type SlotId } from './slots'
import { PlotStep } from './PlotStep'
import { CodesResult } from './CodesResult'
import s from './RegisterPage.module.css'

// Register a building: the moment Tower 1's 3D-ULPINs are created, which opens the demo.
// Four steps (plot, data, generate, codes). Once the tower is registered the page shows its codes,
// with "Reset demo" to start again. Nothing is processed for real and no pipeline steps are shown.

type Step = 1 | 2 | 3

const ISSUED = spaces.length
/** How long the calm "issuing" progress takes, in milliseconds. */
const GENERATE_MS = 2600

export function RegisterPage() {
  const { t } = useTranslation()
  const { towerRegistered } = useDemoState()
  const [params] = useSearchParams()
  const [step, setStep] = useState<Step>(1)
  const [plotCts, setPlotCts] = useState<string | null>(params.get('plot') === towerPlot.cts ? towerPlot.cts : null)
  const [filled, setFilled] = useState<Set<SlotId>>(() => new Set(SLOTS.filter((sl) => sl.auto).map((sl) => sl.id)))
  const [justIssued, setJustIssued] = useState(false)

  const restart = () => {
    resetDemo()
    setStep(1)
    setPlotCts(null)
    setFilled(new Set(SLOTS.filter((sl) => sl.auto).map((sl) => sl.id)))
    setJustIssued(false)
  }

  return (
    <PageLayout title={t('register.title')} intro={t('register.intro')}>
      {towerRegistered ? (
        <CodesResult justIssued={justIssued} onReset={restart} />
      ) : (
        <>
          <Stepper step={step} />
          <div className={s.stepBody}>
            {step === 1 && <PlotStep selected={plotCts} onSelect={setPlotCts} onNext={() => setStep(2)} />}
            {step === 2 && (
              <DataStep
                filled={filled}
                onFill={(ids) => setFilled((f) => new Set([...f, ...ids]))}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <GenerateStep
                onBack={() => setStep(2)}
                onDone={() => {
                  setJustIssued(true)
                  setTowerRegistered(true)
                }}
              />
            )}
          </div>
        </>
      )}
    </PageLayout>
  )
}

function Stepper({ step }: { step: Step }) {
  const { t } = useTranslation()
  const steps = [t('register.steps.plot'), t('register.steps.data'), t('register.steps.generate'), t('register.steps.codes')]
  return (
    <ol className={s.stepper} aria-label={t('register.steps.label')}>
      {steps.map((label, i) => {
        const n = i + 1
        const state = n < step ? s.stepDone : n === step ? s.stepCurrent : ''
        return (
          <li key={label} className={`${s.stepItem} ${state}`} aria-current={n === step ? 'step' : undefined}>
            <span className={s.stepNumber}>{n < step ? '✓' : n}</span>
            <span className={s.stepLabel}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Step 3: one button, then a short, calm progress while the codes are issued. */
function GenerateStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { t } = useTranslation()
  const [issued, setIssued] = useState<number | null>(null)
  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const generate = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 400 : GENERATE_MS
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / duration))
      setIssued(Math.round(ISSUED * p))
      if (p < 1) frame.current = requestAnimationFrame(tick)
      else onDone()
    }
    setIssued(0)
    frame.current = requestAnimationFrame(tick)
  }

  if (issued !== null) {
    return (
      <section className={s.card} aria-live="polite">
        <h2 className={s.cardTitle}>{t('register.generating')}</h2>
        <div className={s.progress} role="progressbar" aria-valuemin={0} aria-valuemax={ISSUED} aria-valuenow={issued}>
          <span className={s.progressBar} style={{ width: `${(issued / ISSUED) * 100}%` }} />
        </div>
        <p className={s.progressText}>{t('register.issuedSoFar', { n: issued, total: ISSUED })}</p>
      </section>
    )
  }

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{t('register.readyTitle', { cts: towerPlot.cts })}</h2>
      <p className={s.cardText}>{t('register.readyText')}</p>
      <ul className={s.readyList}>
        <li>{t('register.readyPlot', { cts: towerPlot.cts })}</li>
        <li>{t('register.readySources', { n: SLOTS.length })}</li>
      </ul>
      <div className={s.actions}>
        <button type="button" className={s.secondary} onClick={onBack}>
          {t('register.back')}
        </button>
        <button type="button" className={s.primary} onClick={generate}>
          {t('register.generate')}
        </button>
      </div>
    </section>
  )
}
