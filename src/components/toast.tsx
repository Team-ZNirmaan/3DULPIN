import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { create } from 'zustand'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'warning' | 'info'

interface Toast {
  id: number
  title: string
  body?: string
  tone: ToastTone
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

export const useToast = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { ...t, id }] })
    setTimeout(() => get().dismiss(id), 4500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = (t: Omit<Toast, 'id'>) => useToast.getState().push(t)

const ICON = { success: CircleCheck, warning: CircleAlert, info: Info }
const TONE = {
  success: 'border-success/30 text-success',
  warning: 'border-warning/40 text-warning',
  info: 'border-info/30 text-info',
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts)
  const dismiss = useToast((s) => s.dismiss)
  return (
    <div className="no-print pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.tone]
        return (
          <div key={t.id} className={cn('pointer-events-auto flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-xl', TONE[t.tone])}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">{t.title}</div>
              {t.body && <div className="mt-0.5 text-[0.8rem] text-slate-600">{t.body}</div>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-slate-700" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
