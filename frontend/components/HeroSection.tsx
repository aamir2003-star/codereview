'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GitFork,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Bug,
  Lightbulb,
  CheckCircle2,
  ThumbsUp,
  GitPullRequest,
  Radio,
} from 'lucide-react';

const mockComments = [
  {
    id: 'c1',
    line: 42,
    severity: 'security' as const,
    icon: ShieldAlert,
    message: 'JWT secret is fallbacking to an unsecure hardcoded string in production mode.',
    upvotes: 3,
    resolved: false,
    file: 'src/middleware/auth.ts',
  },
  {
    id: 'c2',
    line: 58,
    severity: 'bug' as const,
    icon: Bug,
    message: 'Unchecked array index access could throw TypeError on empty diff payload.',
    upvotes: 5,
    resolved: true,
    resolvedBy: 'aamir',
    file: 'src/services/diff.ts',
  },
  {
    id: 'c3',
    line: 89,
    severity: 'smell' as const,
    icon: Lightbulb,
    message: 'Consider memoizing this expensive AST traversal across render cycles.',
    upvotes: 2,
    resolved: false,
    file: 'src/parser/hunk.ts',
  },
];

export function HeroSection() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'diff' | 'feed'>('diff');
  const [comments, setComments] = useState(mockComments);
  const [streamingProgress, setStreamingProgress] = useState(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setStreamingProgress((p) => (p >= 3 ? 1 : p + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const toggleResolve = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, resolved: !c.resolved, resolvedBy: !c.resolved ? 'You' : undefined } : c
      )
    );
  };

  const handleUpvote = (id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, upvotes: c.upvotes + 1 } : c))
    );
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[550px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 -z-10 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300 shadow-sm backdrop-blur-md mb-6">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Real-Time Collaborative Code Reviews</span>
            <span className="text-emerald-500/50">•</span>
            <span className="text-emerald-400 font-semibold">Gemini 2.0 Powered</span>
          </div>

          {/* Main Headline */}
          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
            GitHub PR Reviews,{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              AI Does The First Pass Live.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-base text-neutral-400 sm:text-lg">
            Connect your GitHub repositories, trigger instant file-by-file AI feedback, and resolve
            bugs, security flaws, and code smells with your team in real time.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <a href="/dashboard">
                <Button size="lg" className="gap-2.5">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            ) : (
              <Button onClick={login} size="lg" className="gap-2.5 shadow-xl shadow-emerald-500/25">
                <GitFork className="h-5 w-5" />
                <span>Start Reviewing with GitHub</span>
              </Button>
            )}
            <a href="#features">
              <Button variant="outline" size="lg" className="gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>How It Works</span>
              </Button>
            </a>
          </div>

          {/* Review Mock Interface */}
          <div className="relative mt-16 w-full max-w-5xl rounded-2xl border border-neutral-800 bg-neutral-900/60 p-2 shadow-2xl backdrop-blur-2xl sm:p-3">
            <div className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-950">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/80 px-4 py-3 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="ml-3 flex items-center gap-2 rounded-md bg-neutral-800/80 px-2.5 py-1 text-neutral-300 font-mono text-[11px]">
                    <GitPullRequest className="h-3 w-3 text-emerald-400" />
                    <span>feat/streaming-reviews #42</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Streaming... ({streamingProgress}/3 files)
                  </span>
                  <div className="hidden sm:flex items-center gap-1 bg-neutral-800/60 rounded-md p-0.5">
                    <button
                      onClick={() => setActiveTab('diff')}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        activeTab === 'diff' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                      }`}
                    >
                      Diff View
                    </button>
                    <button
                      onClick={() => setActiveTab('feed')}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        activeTab === 'feed' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                      }`}
                    >
                      Live Feed ({comments.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Window Body: Interactive Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] divide-y lg:divide-y-0 lg:divide-x divide-neutral-800/80 text-left font-mono text-xs">
                {/* Left Pane: Diff Preview */}
                <div className="lg:col-span-7 p-4 bg-neutral-950/90 overflow-x-auto">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-900 text-[11px] text-neutral-400">
                    <span className="font-semibold text-neutral-300">src/auth/jwt.service.ts</span>
                    <span className="text-emerald-400">+24 -8 lines</span>
                  </div>
                  <div className="space-y-1 leading-relaxed select-none">
                    <div className="text-neutral-400 opacity-60">40 | export function verifyToken(token: string) &#123;</div>
                    <div className="text-neutral-400 opacity-60">41 |   try &#123;</div>
                    <div className="bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 px-2 py-0.5 rounded-r">
                      42 -   const secret = process.env.JWT_SECRET || &apos;default_secret&apos;;
                    </div>
                    <div className="bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5 rounded-r">
                      43 +   const secret = getRequiredEnv(&apos;JWT_SECRET&apos;);
                    </div>
                    <div className="text-neutral-400 opacity-60">44 |     return jwt.verify(token, secret);</div>
                    <div className="text-neutral-400 opacity-60">45 |   &#125; catch (err) &#123;</div>
                    <div className="text-neutral-400 opacity-60">46 |     throw new AuthException(err);</div>
                    <div className="text-neutral-400 opacity-60">47 |   &#125;</div>
                    <div className="text-neutral-400 opacity-60">48 | &#125;</div>
                  </div>

                  {/* Inline Gemini Comment Callout */}
                  <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="security">Security</Badge>
                        <span className="text-[11px] text-neutral-400 font-sans">Line 42</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Gemini AI
                      </span>
                    </div>
                    <p className="text-xs text-neutral-200 font-sans leading-relaxed">
                      Fallback secret key could allow signature forgery in production environments
                      if JWT_SECRET is omitted.
                    </p>
                  </div>
                </div>

                {/* Right Pane: Live Comment Feed */}
                <div className="lg:col-span-5 p-4 bg-neutral-900/30 flex flex-col justify-between font-sans">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs">
                      <span className="font-semibold text-neutral-300">Live AI Feed</span>
                      <span className="text-neutral-400 text-[11px]">3 Issues Detected</span>
                    </div>

                    <div className="space-y-3">
                      {comments.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 transition-all duration-200 ${
                            item.resolved
                              ? 'border-emerald-900/40 bg-emerald-950/10 opacity-70'
                              : 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <Badge variant={item.severity}>{item.severity}</Badge>
                              <span className="text-[11px] font-mono text-neutral-400">
                                {item.file}:{item.line}
                              </span>
                            </div>
                            {item.resolved && (
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed">{item.message}</p>
                          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[11px]">
                            <button
                              onClick={() => handleUpvote(item.id)}
                              className="flex items-center gap-1 text-neutral-400 hover:text-emerald-400 transition-colors"
                            >
                              <ThumbsUp className="h-3 w-3" />
                              <span>{item.upvotes}</span>
                            </button>
                            <button
                              onClick={() => toggleResolve(item.id)}
                              className="text-xs text-neutral-400 hover:text-white transition-colors"
                            >
                              {item.resolved ? 'Reopen' : 'Mark Resolved'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Live session synced
                    </span>
                    <span>2 reviewers connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
