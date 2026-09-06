import { createRoot } from 'react-dom/client'
import ErrorBoundary from './components/ErrorBoundary'
import App from './app/App'
import './styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemen #root tidak ditemukan.')

const globalRoot = window.__SIPERAN_ROOT__ || (window.__SIPERAN_ROOT__ = createRoot(rootElement))
globalRoot.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
