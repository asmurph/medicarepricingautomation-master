import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PowerProvider from './PowerProvider.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PowerProvider>
      <App />
    </PowerProvider>
  </StrictMode>,
)
