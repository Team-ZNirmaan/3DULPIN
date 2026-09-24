import { CircleCheck, CircleX, Link2, Loader2, ShieldCheck, Skull } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Page, PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { verifyChain, type ChainCheck } from '@/domain/hash'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'

export function AuditPage() {
  const { t } = useTranslation()
  const audit = useData((s) => s.audit)
  const tamper = useData((s) => s.tamperAudit)
  const [check, setCheck] = useState<ChainCheck | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setCheck(await verifyChain(useData.getState().audit))
    setBusy(false)
  }

  const status = (i: number) => (check ? (check.brokenAt !== undefined && i >= check.brokenAt ? 'bad' : 'ok') : 'unknown')

  return (
    <Page>
      <PageHeader
        eyebrow="Tamper-evident record"
        title={t('nav.audit')}
        description={t('audit.description')}
        actions={
          <>
            <Button variant="outline" onClick={() => { tamper(2); setCheck(null) }}>
              <Skull className="h-4 w-4" /> {t('audit.tamper')}
            </Button>
            <Button onClick={() => void run()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {t('audit.verify')}
            </Button>
          </>
        }
      />
      {check && (
        <div className={cn('mb-4 flex items-center gap-3 rounded-lg border px-4 py-3', check.ok ? 'border-success/30 bg-success-bg text-success' : 'border-blocking/30 bg-blocking-bg text-blocking')}>
          {check.ok ? <CircleCheck className="h-5 w-5" /> : <CircleX className="h-5 w-5" />}
          <span className="font-semibold">{check.ok ? t('audit.ok', { n: audit.length }) : t('audit.broken', { id: audit[check.brokenAt!].id })}</span>
        </div>
      )}
      <Card className="overflow-hidden">
        <CardHeader title={t('audit.events', { n: audit.length })} subtitle={t('audit.chainNote')} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-[0.7rem] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-2 py-2">{t('audit.col.when')}</th>
                <th className="px-2 py-2">{t('audit.col.who')}</th>
                <th className="px-2 py-2">{t('audit.col.action')}</th>
                <th className="px-2 py-2">{t('audit.col.details')}</th>
                <th className="px-4 py-2">{t('audit.col.hash')}</th>
              </tr>
            </thead>
            <tbody>
              {[...audit].reverse().map((e) => {
                const i = audit.indexOf(e)
                const st = status(i)
                return (
                  <tr key={e.id} className={cn('border-t border-line align-top', st === 'bad' && 'bg-blocking-bg/60')}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{e.id}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-600">{new Date(e.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="px-2 py-2 text-xs">
                      <div className="font-medium text-slate-800">{e.actor}</div>
                      <div className="text-slate-500">{e.role}</div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="rounded bg-navy-50 px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold text-navy-700">{e.action}</span>
                    </td>
                    <td className="max-w-md px-2 py-2 text-xs text-slate-700">
                      <div className="font-mono text-[0.68rem] text-slate-500">{e.target}</div>
                      {e.details}
                    </td>
                    <td className="px-4 py-2 font-mono text-[0.68rem]">
                      <div className="flex items-center gap-1.5">
                        {st === 'ok' && <CircleCheck className="h-3.5 w-3.5 text-success" />}
                        {st === 'bad' && <CircleX className="h-3.5 w-3.5 text-blocking" />}
                        <span className="text-slate-700">{e.hash.slice(0, 12)}…</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Link2 className="h-3 w-3" /> {e.prevHash.slice(0, 12)}…
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  )
}

export default AuditPage
