'use client';
import { ReactNode } from 'react';
import { LoadingProvider } from '@/context/LoadingContext';
import PWAIdentityUpdateNotice from '@/components/PWAIdentityUpdateNotice';

export default function Providers({ children }: { children: ReactNode }) {
  return <LoadingProvider>{children}<PWAIdentityUpdateNotice /></LoadingProvider>;
}
