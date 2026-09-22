'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { GitFork, Code2, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Code2 className="h-6 w-6 text-neutral-950" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ReviewCopilot</span>
          </Link>
          <p className="text-xs text-neutral-400">
            Real-time collaborative AI code reviews for GitHub teams
          </p>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Authentication Error</p>
              <p className="mt-0.5 text-neutral-300">{decodeURIComponent(error)}</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="border-neutral-800 bg-neutral-900/70 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-white">Welcome</CardTitle>
            <CardDescription className="text-xs text-neutral-400 mt-1">
              Sign in with your GitHub account to access your repositories and review pull requests.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              onClick={login}
              size="lg"
              className="w-full gap-3 font-semibold bg-white hover:bg-neutral-100 text-neutral-950 border-0 shadow-lg shadow-white/5"
            >
              <GitFork className="h-5 w-5" />
              <span>Continue with GitHub</span>
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col items-center justify-center text-center pt-6 text-[11px] text-neutral-400 space-y-1">
            <p className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              Powered by Gemini 2.0 &amp; Socket.io
            </p>
            <p className="text-neutral-400">
              We only request read access to your public/private repositories.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
          Loading login...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
