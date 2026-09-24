import { lazy, Suspense, useEffect, type ReactElement } from 'react'
import { Loader2 } from 'lucide-react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { LandingPage } from '@/features/landing/LandingPage'
import { useData } from '@/store/data'
import { AppShell } from './AppShell'
import { SCREENS, type ScreenId } from './roles'

const ExplorerPage = lazy(() => import('@/features/explorer/ExplorerPage'))
const PipelinePage = lazy(() => import('@/features/pipeline/PipelinePage'))
const AnalysisPage = lazy(() => import('@/features/analysis/AnalysisPage'))
const ValidationPage = lazy(() => import('@/features/validation/ValidationPage'))
const RegistryPage = lazy(() => import('@/features/registry/RegistryPage'))
const DeedsPage = lazy(() => import('@/features/deeds/DeedsPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const VerificationPage = lazy(() => import('@/features/verification/VerificationPage'))
const DigCheckPage = lazy(() => import('@/features/services/DigCheckPage'))
const CollateralPage = lazy(() => import('@/features/services/CollateralPage'))
const AuditPage = lazy(() => import('@/features/audit/AuditPage'))
const ExportsPage = lazy(() => import('@/features/services/ExportsPage'))
const CitizenPage = lazy(() => import('@/features/citizen/CitizenPage'))
const VerifyPage = lazy(() => import('@/features/citizen/VerifyPage'))

function Loading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  )
}

const SCREEN_ELEMENTS: Record<ScreenId, ReactElement> = {
  dashboard: <DashboardPage />,
  explorer: <ExplorerPage />,
  pipeline: <PipelinePage />,
  analysis: <AnalysisPage />,
  validation: <ValidationPage />,
  registry: <RegistryPage />,
  deeds: <DeedsPage />,
  citizen: <CitizenPage />,
  verification: <VerificationPage />,
  digcheck: <DigCheckPage />,
  collateral: <CollateralPage />,
  audit: <AuditPage />,
  exports: <ExportsPage />,
}

export function AppRouter() {
  useEffect(() => {
    void useData.getState().init()
  }, [])
  return (
    <HashRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            {SCREENS.map((s) => (
              <Route key={s.id} path={s.path.replace('/app/', '')} element={SCREEN_ELEMENTS[s.id]} />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
