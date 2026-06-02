import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { loggerService } from './services/loggerService'

// 1. Capture Global JS Errors
window.addEventListener('error', (event) => {
  loggerService.error('GLOBAL_ERROR', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// 2. Capture Unhandled Promise Rejections
window.addEventListener('unhandledrejection', (event) => {
  loggerService.error('UNHANDLED_PROMISE', event.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
