'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <Card variant="elevated" className="w-full max-w-xl border-accent-danger/20">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-danger/10 text-accent-danger">
            <AlertTriangle size={28} />
          </div>
          <CardTitle className="text-3xl font-display font-black text-white">Something broke</CardTitle>
          <CardDescription className="text-text-secondary">
            The page hit an unexpected error. You can try again or return to a safe page.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} leftIcon={<RefreshCw size={16} />}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => router.push('/')} leftIcon={<Home size={16} />}>
            Go home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}