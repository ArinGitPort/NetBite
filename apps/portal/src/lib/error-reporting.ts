import * as Sentry from "@sentry/react";

type PrivateErrorEvent = {
  user?: unknown; request?: unknown; breadcrumbs?: unknown; contexts?: unknown;
  extra?: unknown; message?: string; tags?: unknown; fingerprint?: unknown;
  exception?: { values?: Array<{ value?: string }> };
};

export function redactErrorEvent<T extends PrivateErrorEvent>(event: T): T {
  delete event.user;
  delete event.request;
  delete event.breadcrumbs;
  delete event.contexts;
  delete event.extra;
  delete event.message;
  delete event.tags;
  delete event.fingerprint;
  event.exception?.values?.forEach((value) => { value.value = "Application error"; });
  return event;
}

// Errors are useful without copying form values, question answers, credentials,
// URLs or request bodies into a third-party service.
export function configureErrorReporting() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || import.meta.env.DEV) return;
  Sentry.init({
    dsn,
    release: import.meta.env.VITE_RELEASE || "netbite-portal@1.0.0",
    environment: import.meta.env.MODE,
    integrations: [],
    beforeSend: redactErrorEvent,
  });
}
