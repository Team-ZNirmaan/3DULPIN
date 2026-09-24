import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-saffron-600">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">{children}</div>
}
