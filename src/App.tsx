import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { MapPage } from './pages/MapPage'
import { DebugPage } from './pages/debug/DebugPage'
import { CardPage } from './pages/card/CardPage'
import { NotFoundPage } from './pages/placeholders'
import { SearchPage } from './pages/search/SearchPage'
import { RegisterPage } from './pages/register/RegisterPage'

// Hash routing so the site works on any static host without server rewrites.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/card/:code" element={<CardPage />} />
          {/* Internal review page for the demo data, not in the menu */}
          <Route path="/debug" element={<DebugPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
