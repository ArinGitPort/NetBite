import Stripe from 'npm:stripe@^22';

import { json, preflight } from '../_shared/http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

const PRODUCT_ID = 'netbite_pro';
const AMOUNT = 14900;
const CURRENCY = 'php';

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const { data: { user }, error: authError } = await userClient(request).auth.getUser();
  if (authError || !user) return json({ error: 'Sign in before purchasing NetBite Pro.' }, 401);

  const admin = adminClient();
  const { data: existing } = await admin.from('entitlements')
    .select('status')
    .eq('user_id', user.id)
    .eq('product_id', PRODUCT_ID)
    .maybeSingle();
  if (existing?.status === 'active') return json({ alreadyOwned: true });

  let requestId = '';
  try {
    requestId = String((await request.json())?.requestId ?? '');
  } catch {
    return json({ error: 'A checkout request ID is required.' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: 'Invalid checkout request ID.' }, 400);

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const intent = await stripe.paymentIntents.create({
    amount: AMOUNT,
    currency: CURRENCY,
    automatic_payment_methods: { enabled: true },
    metadata: { user_id: user.id, product_id: PRODUCT_ID, environment: 'academic_test' },
    description: 'NetBite Pro academic test unlock',
    receipt_email: user.email,
  }, { idempotencyKey: `${user.id}:${PRODUCT_ID}:${requestId}` });

  const { error: purchaseError } = await admin.from('purchases').upsert({
    provider_payment_id: intent.id,
    user_id: user.id,
    product_id: PRODUCT_ID,
    amount: AMOUNT,
    currency: CURRENCY,
    status: intent.status === 'canceled' ? 'canceled' : 'pending',
  }, { onConflict: 'provider_payment_id' });
  if (purchaseError) return json({ error: 'The payment attempt could not be recorded.' }, 500);

  return json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: AMOUNT,
    currency: CURRENCY,
    productId: PRODUCT_ID,
  });
});
