import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useStore } from '@/store/useStore'

declare global {
  interface Window {
    __SNOW_VILLAGE_STORE__: typeof useStore;
  }
}

window.__SNOW_VILLAGE_STORE__ = useStore;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
