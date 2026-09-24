import { ChevronLeft, ChevronRight, Play, RotateCcw, X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { create } from 'zustand'
import { toast } from '@/components/toast'
import { useBi } from '@/components/domain'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'
import { useExplorer } from '@/store/explorer'
import { useSession } from '@/app/session-store'
import { DEMO_STEPS } from './steps'

interface GuideState {
  open: boolean
  step: number
  setOpen: (o: boolean) => void
  setStep: (s: number) => void
}

export const useGuide = create<GuideState>()((set) => ({
  open: false,
  step: 0,
  setOpen: (open) => set({ open }),
  setStep: (step) => set({ step }),
}))

export function DemoGuide() {
  const { t } = useTranslation()
  const bi = useBi()
  const navigate = useNavigate()
  const { open, step, setOpen, setStep } = useGuide()
  const role = useSession((s) => s.role)

  const go = (i: number) => {
    const next = Math.max(0, Math.min(DEMO_STEPS.length - 1, i))
    const s = DEMO_STEPS[next]
    if (role !== 'presenter') useSession.getState().setRole('presenter')
    setStep(next)
    navigate(s.path)
    if (s.run) setTimeout(s.run, 60)
  }

  const reset = async () => {
    await useData.getState().reset()
    useExplorer.getState().resetExplorer()
    toast({ tone: 'info', title: t('guide.resetDone') })
    go(0)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(step + 1)
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(step - 1)
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          go(step)
        }}
        className="no-print fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10 hover:bg-navy-800"
      >
        <Play className="h-4 w-4 text-saffron-400" /> {t('guide.open')}
      </button>
    )
  }

  const s = DEMO_STEPS[step]
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-900/97 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.25)] backdrop-blur" role="region" aria-label={t('guide.open')}>
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3">
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="rounded-md p-2 hover:bg-white/10 disabled:opacity-30" aria-label={t('guide.prev')}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="w-14 text-center font-mono text-sm font-semibold text-saffron-400">
            {step + 1}/{DEMO_STEPS.length}
          </div>
          <button type="button" onClick={() => go(step + 1)} disabled={step === DEMO_STEPS.length - 1} className="rounded-md p-2 hover:bg-white/10 disabled:opacity-30" aria-label={t('guide.next')}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.95rem] font-bold">{bi(s.title)}</div>
          <div className="text-sm leading-snug text-navy-100/85">{bi(s.talk)}</div>
        </div>
        <div className="hidden shrink-0 items-center gap-1 lg:flex" aria-hidden="true">
          {DEMO_STEPS.map((_, i) => (
            <button key={i} type="button" tabIndex={-1} onClick={() => go(i)} className={cn('h-2 rounded-full transition-all', i === step ? 'w-6 bg-saffron-400' : 'w-2 bg-white/25 hover:bg-white/50')} />
          ))}
        </div>
        <button type="button" onClick={() => void reset()} className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-navy-100 hover:bg-white/10" title={t('guide.reset')}>
          <RotateCcw className="h-4 w-4" /> <span className="hidden xl:inline">{t('guide.reset')}</span>
        </button>
        <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-md p-2 text-navy-100 hover:bg-white/10" aria-label={t('guide.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
