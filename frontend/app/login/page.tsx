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
      <div className="w-full max-w-md space-y-6">
        {/* Brand Wordmark Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <span className="text-lg font-bold tracking-tight text-white uppercase select-none">
              ReviewCopilot
            </span>
          </Link>
          <div className="text-xs text-[#a1a1aa]">
            AI Code Review &amp; Architecture Engine
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Authentication Error</p>
              <p className="mt-0.5 text-xs text-[#a1a1aa]">{decodeURIComponent(error)}</p>
            </div>
          </div>
        )}

        {/* Login Container */}
        <div className="border border-[#262626] bg-[#0d0d0d] p-7 rounded-2xl space-y-6 shadow-xl">
          <div className="space-y-1.5 border-b border-[#262626] pb-4">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Sign in to your account
            </h2>
            <p className="text-xs sm:text-sm text-[#a1a1aa] leading-relaxed">
              Connect your GitHub identity to synchronize repositories, inspect pull requests, and stream AI code reviews.
            </p>
          </div>

          <div className="pt-1">
            <button
              onClick={login}
              className="w-full h-10 rounded-xl bg-white text-black hover:bg-[#e4e4e7] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
            >
              <GitFork className="h-4 w-4" />
              <span>Continue with GitHub</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#262626] text-center text-[11px] text-[#71717a]">
            Scoped read permissions &bull; Zero code retention
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
