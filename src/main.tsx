import '@fontsource/noto-sans/400.css'
import '@fontsource/noto-sans/500.css'
import '@fontsource/noto-sans/600.css'
import '@fontsource/noto-sans/700.css'
import '@fontsource/noto-sans-devanagari/400.css'
import '@fontsource/noto-sans-devanagari/500.css'
import '@fontsource/noto-sans-devanagari/600.css'
import '@fontsource/noto-sans-devanagari/700.css'
import './styles/index.css'
import './i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './app/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
