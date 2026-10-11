# Feature expansion rollout

The current additive migration does not change the existing workshop package, submission payload, or score policy. Deploy database changes before the portal and Android builds that use them.

1. Run `supabase/migrations/202610110001_workshop_messaging_and_bank.sql` against a staging project, then check RLS and owner isolation with two instructors and two enrolled students. Confirm roster preview does not enroll anyone and that a committed import handles invalid, unmatched, duplicate, and already-enrolled rows.
2. Deploy `workshop-service` and `workshop-push` with the corresponding `supabase/config.toml` JWT settings. Set `WORKSHOP_PUSH_CRON_SECRET` to a strong server-only value. Keep `WORKSHOP_PUSH_DELIVERY_ENABLED=false` until an Android build with a valid EAS project ID and FCM credentials has passed physical-device testing.
3. Store `project_url` and the matching `workshop_push_cron_secret` in Supabase Vault, then run `supabase/operations/schedule-workshop-push.sql`. The job runs every five minutes. Check `workshop_push_deliveries` for ticket IDs, Expo receipts, retries, and invalid tokens before enabling delivery.
4. Configure `EXPO_PUBLIC_SENTRY_DSN` and `VITE_SENTRY_DSN` for production. Set `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` only in the release environment to upload source maps. Do not put the auth token in an `EXPO_PUBLIC_` or `VITE_` variable.
5. Build and test Android with `expo-notifications` and FCM credentials. Expo Go cannot verify remote push. Confirm permission denial, token rotation, notification-tap access checks, sign-out with push enabled, and both themes. Publish the portal after the database and function checks pass.

The new question bank and roster API are owner-scoped. Graded answer keys remain in the existing server-only table. The inbox works without push credentials; push delivery stays paused until explicitly enabled.

## NetBite live canary (2026-10-11)

The linked project is `jhusgyfbvbccybamdfbj`. The existing migration and the additive `20261011120439_workshop_push_canary.sql` migration are applied. Only `workshop-service` and `workshop-push` were deployed; the former keeps JWT verification on, and the latter uses a separate cron bearer secret with JWT verification off. The matching secret is stored in Edge Function secrets and Vault, not in this repository. One five-minute cron job is installed. Push delivery is **paused** and the worker additionally requires `WORKSHOP_PUSH_CANARY_CLASS_ID`, so setting the delivery flag alone cannot send to every class.

Complete these gated steps with disposable instructor/student accounts and a disposable class:

1. In `apps/mobile`, run `npx eas-cli login`, then `npx eas-cli init`. Confirm the new EAS project belongs to the intended Expo account and commit only the generated `extra.eas.projectId` in `app.json`. The Android package is `com.netbite.mobile`; `eas.json` contains an internal APK profile.
2. Configure Android FCM v1 credentials through EAS, never in Git or chat. Run `npx eas-cli build --platform android --profile internal` and install the APK on a physical device. Expo Go is not a remote-push test environment.
3. Create the disposable class and enroll the test student. In the local portal, test lesson/assessment duplication and templates, private question-bank isolation, roster preview before import, announcement creation, gradebook class selection, recorded/all question counts, and read-only attempt history. Verify the student inbox and read state on Android in both themes.
4. Test permission denial, then grant permission and confirm exactly one active `workshop_push_tokens` record for the test student. Configure the Edge Function secret `WORKSHOP_PUSH_CANARY_CLASS_ID` to that disposable class UUID. Send a direct Expo test push first.
5. Only then set `WORKSHOP_PUSH_DELIVERY_ENABLED=true`. Test an announcement and graded assessments due in 24 hours and one hour. Verify deduplication, Expo tickets/receipts, invalid-token handling, private lock-screen text, and taps after access changes. The worker will still process only the canary class and expires unsent items older than one hour.

Rollback push immediately with `npx supabase secrets set WORKSHOP_PUSH_DELIVERY_ENABLED=false`. Do not enable broader delivery in this release. Keep the previous `workshop-service` deployment/version available for redeployment if publish, submission, or gradebook regress.
