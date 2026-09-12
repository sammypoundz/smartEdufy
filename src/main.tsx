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

// Turns every data table into stacked cards on phones (see index.css).
initTableStacking();

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
          <App />
          {/* Toast notifications are rendered inside App component */}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);