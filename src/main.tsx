import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { initTableStacking } from './utils/tableStacking';
// Global SweetAlert2 theme — makes all confirm prompts (delete, etc.)
// look like the app's LogoutConfirmModal. Side-effectful import.
import './utils/swalTheme';
// Offline mode: Dexie cache, sync engine + virtual driver.
import { OfflineProvider } from './offline/OfflineContext';
import { registerSW } from 'virtual:pwa-register';

// Turns every data table into stacked cards on phones (see index.css).
initTableStacking();

// Register the PWA service worker (app-shell precache for offline loads).
// autoUpdate + skipWaiting (configured in vite.config.ts) makes each new build
// take over on next launch, replacing stale precaches automatically.
registerSW({ immediate: true });

// Dismiss the inline preloader (from index.html) only once React has
// actually painted content into #root — covers slow WebView starts, so the
// preloader lasts exactly as long as the loading screen would.
function dismissPreloader() {
  const el = document.getElementById('web-preloader');
  if (el && !el.classList.contains('pl-done')) {
    el.classList.add('pl-done');
    setTimeout(() => el.remove(), 400);
  }
}
const rootEl = document.getElementById('root')!;
if (rootEl.childElementCount > 0) {
  requestAnimationFrame(dismissPreloader);
} else {
  const obs = new MutationObserver(() => {
    if (rootEl.childElementCount > 0) {
      obs.disconnect();
      // Wait one frame so the first app paint lands before the fade-out.
      requestAnimationFrame(() => requestAnimationFrame(dismissPreloader));
    }
  });
  obs.observe(rootEl, { childList: true });
}
// Safety net: never show the preloader for more than 15s.
setTimeout(dismissPreloader, 15000);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // cache data for 1 min, avoid refetch storms
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <OfflineProvider>
            <App />
            {/* Toast notifications are rendered inside App component */}
          </OfflineProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);