import type { ProPayment } from '@/core/account/types';
import { supabase } from '@/services/supabase';

export async function createProPayment(requestId: string): Promise<{ alreadyOwned?: boolean; payment?: ProPayment }> {
  if (!supabase) throw new Error('Cloud services are not configured.');
  const { data, error } = await supabase.functions.invoke('create-pro-payment', { body: { requestId } });
  if (error) throw error;
  if (data?.alreadyOwned) return { alreadyOwned: true };
  if (!data?.clientSecret) throw new Error('The payment service returned an incomplete response.');
  return { payment: data as ProPayment };
}
