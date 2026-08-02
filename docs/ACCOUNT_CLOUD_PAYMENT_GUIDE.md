# NetBite Accounts, Cloud Progress, and Test Checkout

## Product Boundary

Accounts are optional. A guest can use Chapters 1-4 without network access. An authenticated account can synchronize learning progress and settings. Chapters 5-12 and the Network Sandbox require the `netbite_pro` entitlement.

NetBite Pro is an academic Stripe test-mode demonstration priced at PHP 149. The application must always display `TEST MODE / NO REAL CHARGE`. It is not a production App Store or Google Play billing implementation.

## Client Configuration

Copy `.env.example` to `.env.local` and provide only public client values:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME
```

Never place a Supabase service-role key, Stripe secret key, or Stripe webhook secret in an Expo environment variable. Never commit or send those secrets through chat.

The application scheme is `netbite`. Add these redirect patterns in Supabase Authentication URL Configuration:

```text
netbite://**
exp://**/--/**
```

The Expo development URL varies by machine and network. Add the exact redirect URL printed by the development build when testing OAuth in Expo Go. Configure Google as a Supabase Auth provider using Google web OAuth credentials and Supabase's callback URL.

## Database

Apply the tracked migration:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates:

- `profiles`: user-owned profile data.
- `learning_progress`: user-owned serialized learning and settings data.
- `entitlements`: owner-readable, server-writable access records.
- `purchases`: owner-readable, server-writable Stripe event records.

The profile backfill migration creates a `profiles` row for accounts that
already existed in Supabase Auth before the NetBite tables were deployed. It
copies only the user ID, display name, and avatar URL from Auth metadata;
credentials and provider tokens remain in Supabase Auth.

Row-level security limits profile, progress, entitlement, and purchase reads to the authenticated owner. Mobile clients cannot grant entitlements or write purchase records.

## Edge Functions and Secrets

Configure secrets in Supabase, not in the app:

```powershell
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_REPLACE_ME
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
npx supabase functions deploy create-pro-payment
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy delete-account
```

Configure Stripe test-mode webhook delivery to:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

Subscribe to PaymentIntent events, including success, failure, and cancellation. The webhook verifies Stripe's signature before it records a purchase. Only a signed, successful PHP 149 PaymentIntent with the expected product metadata grants `netbite_pro`.

## Progress Behavior

Zustand and Expo SQLite remain the immediate source of truth. The synchronized snapshot includes completed lessons and labs, versioned quiz scores, versioned flashcard reviews and positions, the CLI guide flag, haptics, and motion preference.

The topology lab and Network Sandbox workspace never leave the device. Signing in with guest progress opens a comparison modal. Merge unions completions, keeps the best score within the same content version, prefers a newer content version when versions differ, and uses the most recently updated settings and flashcard position.

Learning never waits for cloud synchronization. Status values are `LOCAL`, `SYNCING`, `SYNCED`, and `ACTION NEEDED`. Failed changes remain in SQLite and retry after another local change, when connectivity returns, or when the app becomes active.

## Manual Acceptance Flow

1. Start as a guest and complete one free lesson.
2. Register with email and verify the account through the `netbite` deep link.
3. Sign in and test all three progress choices: merge, cloud only, and cancel.
4. Sign out and confirm the separate guest snapshot returns.
5. Complete Google browser OAuth and confirm the same account is restored.
6. Request a password reset and verify the link opens the new-password screen.
7. On Android or iOS, open NetBite Pro and use a Stripe test card.
8. Confirm the UI does not unlock immediately from PaymentSheet alone; it unlocks after the signed webhook creates the entitlement.
9. Restart, sign out, and sign in again to confirm entitlement restoration.
10. Delete the test account and confirm authenticated application data is removed.

## Source References

- Supabase Expo React Native quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase native mobile deep linking: https://supabase.com/docs/guides/auth/native-mobile-deep-linking
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Expo SDK 57 Stripe module: https://docs.expo.dev/versions/v57.0.0/sdk/stripe/
- Stripe PaymentSheet: https://docs.stripe.com/payments/accept-a-payment?platform=react-native
- Stripe webhook signatures: https://docs.stripe.com/webhooks/signature
