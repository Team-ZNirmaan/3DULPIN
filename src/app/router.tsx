import { lazy, Suspense, useEffect, type ReactElement } from 'react'
import { Loader2 } from 'lucide-react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { LandingPage } from '@/features/landing/LandingPage'
import { useData } from '@/store/data'
import { AppShell } from './AppShell'
import { FIRST_SCREEN, SCREENS, type ScreenId } from './screens'

const SurveyAiPage = lazy(() => import('@/features/survey/SurveyAiPage'))
const ExplorerPage = lazy(() => import('@/features/explorer/ExplorerPage'))
const ValidationPage = lazy(() => import('@/features/validation/ValidationPage'))
const RegistryPage = lazy(() => import('@/features/registry/RegistryPage'))
const CitizenPage = lazy(() => import('@/features/citizen/CitizenPage'))
const VerifyPage = lazy(() => import('@/features/citizen/VerifyPage'))

const SCREEN_ELEMENTS: Record<ScreenId, ReactElement> = {
  survey: <SurveyAiPage />,
  explorer: <ExplorerPage />,
  validation: <ValidationPage />,
  registry: <RegistryPage />,
  card: <CitizenPage />,
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  )
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
            <Route index element={<Navigate to={FIRST_SCREEN} replace />} />
            {SCREENS.map((s) => (
              <Route key={s.id} path={s.path.replace('/app/', '')} element={SCREEN_ELEMENTS[s.id]} />
            ))}
            <Route path="*" element={<Navigate to={FIRST_SCREEN} replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
