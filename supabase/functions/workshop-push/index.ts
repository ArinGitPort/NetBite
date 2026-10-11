import { adminClient } from '../_shared/supabase.ts';
import { isUnsentDeliveryExpired, isValidCanaryClassId, privatePushBody, privatePushTitle } from '../_shared/workshop-push-safety.ts';

type Delivery = {
  id: string; token_id: string; class_id: string; assessment_id: string | null;
  event_key: string; title: string; body: string; attempt_count: number; expo_ticket_id: string | null;
  attempted_at: string | null; created_at: string;
};
type ExpoTicket = { status: 'ok' | 'error'; id?: string; details?: { error?: string } };

const expoEndpoint = 'https://exp.host/--/api/v2/push';
const db = adminClient();

async function updateDelivery(id: string, values: Record<string, unknown>) {
  const { error } = await db.from('workshop_push_deliveries').update(values).eq('id', id);
  if (error) throw error;
}

async function expireUnsentDeliveries() {
  const cutoff = new Date(Date.now() - 60 * 60_000).toISOString();
  const { error } = await db.from('workshop_push_deliveries')
    .update({ status: 'failed', expo_receipt: 'expired' })
    .in('status', ['pending', 'processing']).lt('created_at', cutoff);
  if (error) throw error;
}

async function processReceipts(classId: string) {
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data, error } = await db.from('workshop_push_deliveries')
    .select('id,token_id,expo_ticket_id,attempted_at').eq('class_id', classId).eq('status', 'sent')
    .is('expo_receipt', null).lt('attempted_at', cutoff).not('expo_ticket_id', 'is', null).limit(100);
  if (error) throw error;
  const deliveries = data ?? [];
  if (!deliveries.length) return 0;
  const response = await fetch(`${expoEndpoint}/getReceipts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: deliveries.map((item) => item.expo_ticket_id) }),
  });
  if (!response.ok) throw new Error(`Expo receipt lookup failed: ${response.status}`);
  const payload = await response.json() as { data?: Record<string, ExpoTicket> };
  for (const delivery of deliveries) {
    const receipt = payload.data?.[delivery.expo_ticket_id!];
    if (!receipt) {
      if (Date.now() - Date.parse(delivery.attempted_at!) > 23 * 60 * 60_000) await updateDelivery(delivery.id, { status: 'failed', expo_receipt: 'missing' });
      continue;
    }
    const invalid = receipt.details?.error === 'DeviceNotRegistered';
    await updateDelivery(delivery.id, { status: invalid ? 'invalid' : receipt.status === 'ok' ? 'sent' : 'failed', expo_receipt: receipt.status === 'ok' ? 'ok' : receipt.details?.error ?? 'error' });
    if (invalid) await db.from('workshop_push_tokens').update({ enabled: false, invalidated_at: new Date().toISOString() }).eq('id', delivery.token_id);
  }
  return deliveries.length;
}

async function processPending(classId: string) {
  const { data, error } = await db.rpc('claim_workshop_push_deliveries_for_class', { p_class_id: classId, p_limit: 100 });
  if (error) throw error;
  const deliveries = (data ?? []) as Delivery[];
  if (!deliveries.length) return 0;
  const { data: tokens, error: tokenError } = await db.from('workshop_push_tokens')
    .select('id,student_id,token,enabled,invalidated_at').in('id', deliveries.map((item) => item.token_id));
  if (tokenError) throw tokenError;
  const tokenById = new Map((tokens ?? []).map((item) => [item.id, item]));
  const classIds = [...new Set(deliveries.map((item) => item.class_id))];
  const studentIds = [...new Set((tokens ?? []).map((item) => item.student_id))];
  const [classResult, enrollmentResult, attemptResult] = await Promise.all([
    db.from('workshop_classes').select('id,archived').in('id', classIds),
    db.from('workshop_enrollments').select('class_id,student_id').in('class_id', classIds).in('student_id', studentIds).is('left_at', null),
    db.from('workshop_attempts').select('class_id,student_id,assessment_id').in('class_id', classIds).in('student_id', studentIds),
  ]);
  if (classResult.error || enrollmentResult.error || attemptResult.error) throw classResult.error ?? enrollmentResult.error ?? attemptResult.error;
  const classes = classResult.data;
  const enrollments = enrollmentResult.data;
  const attempts = attemptResult.data;
  const activeClasses = new Set((classes ?? []).filter((item) => !item.archived).map((item) => item.id));
  const enrolled = new Set((enrollments ?? []).map((item) => `${item.class_id}:${item.student_id}`));
  const submitted = new Set((attempts ?? []).map((item) => `${item.class_id}:${item.student_id}:${item.assessment_id}`));
  const expired = deliveries.filter((delivery) => isUnsentDeliveryExpired(delivery.created_at));
  for (const delivery of expired) await updateDelivery(delivery.id, { status: 'failed', expo_receipt: 'expired' });
  const sendable = deliveries.filter((delivery) => {
    const token = tokenById.get(delivery.token_id);
    return !expired.includes(delivery) && token?.enabled && !token.invalidated_at && activeClasses.has(delivery.class_id) &&
      enrolled.has(`${delivery.class_id}:${token.student_id}`) &&
      (!delivery.assessment_id || !submitted.has(`${delivery.class_id}:${token.student_id}:${delivery.assessment_id}`)) &&
      /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token.token);
  });
  for (const delivery of deliveries) if (!sendable.includes(delivery) && !expired.includes(delivery)) await updateDelivery(delivery.id, { status: 'invalid', expo_receipt: 'token disabled' });
  if (!sendable.length) return 0;
  const response = await fetch(`${expoEndpoint}/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sendable.map((delivery) => ({
      to: tokenById.get(delivery.token_id)!.token,
      title: privatePushTitle, body: privatePushBody, sound: 'default', channelId: 'class-updates',
      data: { classId: delivery.class_id, assessmentId: delivery.assessment_id ?? undefined },
    }))),
  });
  if (!response.ok) {
    for (const delivery of sendable) await updateDelivery(delivery.id, { status: delivery.attempt_count >= 3 ? 'failed' : 'pending' });
    throw new Error(`Expo push send failed: ${response.status}`);
  }
  const payload = await response.json() as { data?: ExpoTicket[] };
  for (const [index, delivery] of sendable.entries()) {
    const ticket = payload.data?.[index];
    const invalid = ticket?.details?.error === 'DeviceNotRegistered';
    await updateDelivery(delivery.id, {
      status: ticket?.status === 'ok' && ticket.id ? 'sent' : invalid ? 'invalid' : 'failed',
      expo_ticket_id: ticket?.id ?? null,
      expo_receipt: ticket?.status === 'ok' ? null : ticket?.details?.error ?? 'send error',
    });
    if (invalid) await db.from('workshop_push_tokens').update({ enabled: false, invalidated_at: new Date().toISOString() }).eq('id', delivery.token_id);
  }
  return sendable.length;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST' || !Deno.env.get('WORKSHOP_PUSH_CRON_SECRET') ||
      request.headers.get('Authorization') !== `Bearer ${Deno.env.get('WORKSHOP_PUSH_CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    await expireUnsentDeliveries();
    if (Deno.env.get('WORKSHOP_PUSH_DELIVERY_ENABLED') !== 'true') return Response.json({ paused: true });
    const canaryClassId = Deno.env.get('WORKSHOP_PUSH_CANARY_CLASS_ID');
    if (!isValidCanaryClassId(canaryClassId)) {
      return Response.json({ error: 'A valid canary class is required before delivery.' }, { status: 503 });
    }
    const receipts = await processReceipts(canaryClassId);
    const { data: queued, error } = await db.rpc('enqueue_workshop_due_reminders_for_class', { p_class_id: canaryClassId });
    if (error) throw error;
    const sent = await processPending(canaryClassId);
    return Response.json({ queued, sent, receipts });
  } catch (error) {
    console.error('[workshop-push] job failed', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ error: 'Push processing failed; queued messages remain available for retry.' }, { status: 500 });
  }
});
