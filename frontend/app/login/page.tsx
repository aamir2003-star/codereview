'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { GitFork, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { LuxuryPreloader } from '@/components/ui/LuxuryPreloader';

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12 relative text-white">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Wordmark Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <span className="font-display text-sm tracking-[6px] text-white font-normal uppercase select-none">
              REVIEW COPILOT
            </span>
          </Link>
          <div className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
            PRECISION AI CODE AUDIT
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="flex items-start gap-3 rounded-none border border-[#3a3a3a] bg-[#141414] p-4 text-xs text-[#cccccc] font-serif">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#d4a017] mt-0.5" />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-white">AUTHENTICATION EXCEPTION</p>
              <p className="mt-0.5 text-xs text-[#999999]">{decodeURIComponent(error)}</p>
            </div>
          </div>
        )}

        {/* Login Container (Bugatti Style 0px corners, hairline border) */}
        <div className="border border-[#262626] bg-[#0d0d0d] p-8 rounded-none space-y-6">
          <div className="space-y-2 border-b border-[#262626] pb-4">
            <h2 className="font-display text-xl font-normal uppercase tracking-[2px] text-white">
              AUTHENTICATE SESSION
            </h2>
            <p className="font-serif text-sm text-[#cccccc] leading-relaxed">
              Connect your GitHub identity to synchronize repositories, inspect live pull requests, and stream AI code reviews.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={login}
              className="w-full h-11 rounded-full border border-white hover:bg-white hover:text-black bg-transparent text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              <GitFork className="h-4 w-4" />
              <span>CONTINUE WITH GITHUB</span>
            </button>
          </div>

          <div className="pt-4 border-t border-[#262626] text-center font-mono text-[10px] uppercase tracking-[2px] text-[#666666]">
            SCOPED READ PERMISSIONS &bull; ZERO CODE RETENTION
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <LuxuryPreloader stage="AUTHENTICATING SESSION" size="fullscreen" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
