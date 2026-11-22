import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Shell } from '@/app/shell';
import { Loading, EmptyState } from '@/components/common';
import '@/styles/globals.css';
const Dashboard = lazy(() => import('@/routes/dashboard'));
const Movements = lazy(() => import('@/routes/movements'));
const Subscriptions = lazy(() => import('@/routes/subscriptions'));
const Analytics = lazy(() => import('@/routes/analytics'));
const Settings = lazy(() => import('@/routes/settings'));
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="app-loading">
              <Loading />
            </div>
          }
        >
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Movements key="expenses" kind="expenses" />} />
              <Route path="/income" element={<Movements key="income" kind="income" />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/categories" element={<Settings categoriesOnly />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <EmptyState
                    title="Esta página no existe"
                    description="Vuelve al resumen para seguir con tus finanzas."
                    action={<Link to="/">Ir al resumen</Link>}
                  />
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster richColors position="bottom-right" closeButton />
    </QueryClientProvider>
  </StrictMode>,
);
