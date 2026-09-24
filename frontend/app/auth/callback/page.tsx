'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import { Preloader } from '@/components/Preloader';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthToken } = useAuth();
  const [authenticated, setAuthenticated] = useState(false);
  const finishLogin = useCallback(() => router.replace('/dashboard'), [router]);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      setAuthToken(token).then((success) => {
        if (success) {
          setAuthenticated(true);
        } else {
          router.push('/login?error=Failed+to+fetch+user+profile.+Please+ensure+backend+is+running.');
        }
      });
    } else {
      router.push('/login');
    }
  }, [searchParams, router, setAuthToken]);

  if (authenticated) return <Preloader onComplete={finishLogin} />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-neutral-100">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      <p className="mt-4 text-sm text-neutral-400">Authenticating with GitHub...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
