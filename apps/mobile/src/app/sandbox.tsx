import { useAuth } from '@/features/account/auth-context';
import { PremiumLockedScreen } from '@/features/account/components/premium-locked-screen';
import { SandboxScreen } from '@/features/sandbox/components/sandbox-screen';

export default function SandboxRoute() {
  const { hasContentAccess } = useAuth();
  return hasContentAccess ? <SandboxScreen /> : <PremiumLockedScreen label="NETWORK SANDBOX" />;
}
