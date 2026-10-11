import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "@/styles.css";
import { App } from "@/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as Sentry from "@sentry/react";
import { configureErrorReporting } from "@/lib/error-reporting";

configureErrorReporting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<main className="grid min-h-screen place-items-center bg-canvas p-6 text-center text-copy" role="alert"><div className="grid gap-3"><h1 className="text-xl font-semibold">This page could not load</h1><p className="text-sm text-muted">Reload to try again. Unsaved edits may need to be re-entered.</p><button className="rounded-control bg-copy px-4 py-2 text-surface" onClick={() => window.location.reload()} type="button">RELOAD PAGE</button></div></main>}>
      <TooltipProvider delayDuration={350} skipDelayDuration={100}>
        <App />
      </TooltipProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
