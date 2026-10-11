import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function configureErrorReporting() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || __DEV__) return;
  Sentry.init({
    dsn,
    release: `netbite-mobile@${Constants.expoConfig?.version ?? '1.0.0'}`,
    environment: 'production',
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.breadcrumbs;
      delete event.contexts;
      delete event.extra;
      delete event.message;
      delete event.tags;
      delete event.fingerprint;
      event.exception?.values?.forEach((value) => { value.value = 'Application error'; });
      return event;
    },
  });
}
