import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "@/styles.css";
import { App } from "@/app";
import { TooltipProvider } from "@/components/ui/tooltip";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delayDuration={350} skipDelayDuration={100}>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
