'use client';

import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Preloader } from '@/components/Preloader';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthToken } = useAuth();
  const processedRef = useRef(false);
  const authStatusRef = useRef<'pending' | 'success' | 'failed'>('pending');

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      authStatusRef.current = 'failed';
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    setAuthToken(token || undefined).then((success) => {
      if (success) {
        authStatusRef.current = 'success';
      } else {
        authStatusRef.current = 'failed';
        router.push('/login?error=Failed+to+authenticate.+Please+try+again.');
      }
    });
  }, [searchParams, router, setAuthToken]);

  const handlePreloaderComplete = useCallback(() => {
    if (authStatusRef.current === 'success') {
      router.replace('/dashboard');
    } else if (authStatusRef.current === 'failed') {
      router.replace('/login');
    } else {
      // If auth request is still finishing, wait for it then route
      const checkTimer = setInterval(() => {
        if (authStatusRef.current === 'success') {
          clearInterval(checkTimer);
          router.replace('/dashboard');
        } else if (authStatusRef.current === 'failed') {
          clearInterval(checkTimer);
          router.replace('/login');
        }
      }, 100);
    }
  }, [router]);

  return <Preloader onComplete={handlePreloaderComplete} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Preloader />}>
      <CallbackHandler />
    </Suspense>
  );
}
