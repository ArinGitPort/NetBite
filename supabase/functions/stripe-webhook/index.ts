import Stripe from 'npm:stripe@^22';

import { json, preflight } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';

const PRODUCT_ID = 'netbite_pro';
const AMOUNT = 14900;
const CURRENCY = 'php';

Deno.serve(async (request) => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing Stripe signature.' }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return json({ error: 'Invalid Stripe signature.' }, 400);
  }

  if (!event.type.startsWith('payment_intent.')) return json({ received: true });
  const intent = event.data.object as Stripe.PaymentIntent;
  const userId = intent.metadata.user_id;
  const productId = intent.metadata.product_id;
  if (!userId || productId !== PRODUCT_ID) return json({ error: 'Unrecognized payment metadata.' }, 400);

  const status = event.type === 'payment_intent.succeeded'
    ? 'succeeded'
    : event.type === 'payment_intent.canceled'
      ? 'canceled'
      : event.type === 'payment_intent.payment_failed'
        ? 'failed'
        : 'pending';
  const admin = adminClient();
  const { data: existingPurchase } = await admin.from('purchases')
    .select('status')
    .eq('provider_payment_id', intent.id)
    .maybeSingle();
  const durableStatus = existingPurchase?.status === 'succeeded' ? 'succeeded' : status;
  const { error: purchaseError } = await admin.from('purchases').upsert({
    provider_payment_id: intent.id,
    user_id: userId,
    product_id: productId,
    amount: intent.amount,
    currency: intent.currency,
    status: durableStatus,
  }, { onConflict: 'provider_payment_id' });
  if (purchaseError) return json({ error: 'Payment state could not be recorded.' }, 500);

  if (durableStatus === 'succeeded' && intent.amount === AMOUNT && intent.currency === CURRENCY) {
    const { error: entitlementError } = await admin.from('entitlements').upsert({
      user_id: userId,
      product_id: PRODUCT_ID,
      status: 'active',
      source: 'stripe_test',
      granted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id' });
    if (entitlementError) return json({ error: 'The entitlement could not be granted.' }, 500);
  }

  return json({ received: true });
});
