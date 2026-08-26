import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { PurchaseStatus } from '@/core/account/types';
import { describeOperationError, withTimeout } from '@/core/reliability/recoverable-operation';
import { useAuth } from '@/features/account/auth-context';
import { createProPayment } from '@/services/payments';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { AppRoutes } from '@/shared/routes';
import { Palette, Space } from '@/shared/theme';

const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const requestId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
  const random = Math.floor(Math.random() * 16);
  const value = character === 'x' ? random : (random & 0x3) | 0x8;
  return value.toString(16);
});
const checkoutKey = (userId: string) => `netbite-pro-checkout-${userId}`;

function pendingCheckoutId(userId: string) {
  const key = checkoutKey(userId);
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = requestId();
  localStorage.setItem(key, next);
  return next;
}

function NativeCheckout() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user, refreshEntitlement } = useAuth();
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>('idle');
  const [message, setMessage] = useState<string>();

  const purchase = async () => {
    if (!user) {
      router.push(AppRoutes.auth);
      return;
    }
    setPurchaseStatus('preparing');
    setMessage(undefined);
    try {
      const result = await withTimeout(createProPayment(pendingCheckoutId(user.id)));
      if (result.alreadyOwned) {
        localStorage.removeItem(checkoutKey(user.id));
        await refreshEntitlement();
        setPurchaseStatus('owned');
        return;
      }
      const { error: initError } = await withTimeout(initPaymentSheet({
        merchantDisplayName: 'NetBite',
        paymentIntentClientSecret: result.payment!.clientSecret,
        returnURL: Linking.createURL('/pro'),
        allowsDelayedPaymentMethods: false,
      }));
      if (initError) throw new Error(initError.message);
      setPurchaseStatus('presenting');
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          setPurchaseStatus('idle');
          setMessage('Checkout canceled. Nothing was charged.');
          return;
        }
        throw new Error(presentError.message);
      }
      setPurchaseStatus('verifying');
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await wait(1000);
        if (await refreshEntitlement()) {
          localStorage.removeItem(checkoutKey(user.id));
          setPurchaseStatus('owned');
          setMessage('NetBite Pro is active.');
          return;
        }
      }
      setMessage('Payment submitted. Waiting for the signed webhook to confirm Pro access.');
    } catch (nextError) {
      setPurchaseStatus('failed');
      setMessage(describeOperationError(nextError, 'Checkout could not be completed.').message);
    }
  };

  const label = purchaseStatus === 'idle'
    ? 'Open test checkout'
    : purchaseStatus === 'failed'
      ? 'Retry test checkout'
      : purchaseStatus === 'preparing'
        ? 'Preparing...'
        : purchaseStatus === 'presenting'
          ? 'Checkout open...'
          : purchaseStatus === 'owned'
            ? 'Pro active'
            : 'Confirming Pro access...';

  return (
    <>
      <AppButton
        disabled={purchaseStatus !== 'idle' && purchaseStatus !== 'failed'}
        label={label}
        onPress={() => void purchase()}
      />
      {message ? <Text variant="bodySmall" style={styles.message}>{message}</Text> : null}
    </>
  );
}

export function ProCheckout() {
  if (!stripeKey) {
    return <Text variant="bodySmall" style={styles.message}>Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable test checkout.</Text>;
  }
  return (
    <StripeProvider publishableKey={stripeKey} urlScheme="netbite">
      <NativeCheckout />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  message: { color: Palette.orange, marginBottom: Space.md },
});
