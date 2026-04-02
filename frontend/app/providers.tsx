'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useEffect, useState } from 'react';
import { SocketProvider } from '@/lib/socket';
import { clearAccessToken, setAccessToken } from '@/lib/authToken';

function getJwtExpiryMs(accessToken?: string): number | null {
  if (!accessToken) return null;

  const parts = accessToken.split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    if (!payload?.exp) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function SessionExpiryHandler() {
  const { data: session, status } = useSession();
  const accessToken = (session?.user as any)?.accessToken as string | undefined;

  useEffect(() => {
    if (status === 'authenticated' && accessToken) {
      setAccessToken(accessToken);
      return;
    }

    clearAccessToken();
  }, [status, accessToken]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const expiryMs = getJwtExpiryMs(accessToken);
    if (!expiryMs) return;

    const checkExpiry = () => {
      if (Date.now() >= expiryMs) {
        void signOut({ callbackUrl: '/login' });
      }
    };

    checkExpiry();
    const intervalId = window.setInterval(checkExpiry, 30 * 1000);
    return () => window.clearInterval(intervalId);
  }, [status, accessToken]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <SessionExpiryHandler />
      <SocketProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SocketProvider>
    </SessionProvider>
  );
}
