'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useState } from 'react';
import { SocketProvider } from '@/lib/socket';

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
    <SessionProvider>
      <SocketProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SocketProvider>
    </SessionProvider>
  );
}
