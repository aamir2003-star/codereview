'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  GitFork,
  GitPullRequest,
  ShieldAlert,
  Bug,
  Lightbulb,
  CheckCircle2,
  Terminal,
  Zap,
  Activity,
  Layers,
  Cpu,
} from 'lucide-react';

export function HeroSection() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'diff' | 'ai'>('diff');

  // Interactive 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 200, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 200, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-12, 12]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-10 sm:px-6 lg:pb-28 lg:pt-16">
      {/* 3D Glowing Orb Background */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/15 via-cyan-500/10 to-violet-500/10 blur-[130px]" />

      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Headlines & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 max-w-2xl"
          >
            {/* Pill Badge */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-500/10 backdrop-blur-md mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span>Next-Gen AI Code Review Engine</span>
              <Sparkles className="h-3 w-3 text-emerald-300" />
            </motion.div>

            {/* Main Hero Headline */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-6.5xl leading-[1.08]">
              Automate code reviews with{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-teal-200 bg-clip-text text-transparent underline decoration-emerald-500/30 decoration-wavy decoration-2">
                AI precision
              </span>{' '}
              in real-time.
            </h1>

            <p className="mt-6 text-base text-neutral-400 sm:text-lg leading-relaxed max-w-xl">
              Connect your GitHub repository. Traces subtle bugs, security vulnerabilities, and code smells across pull request diffs with streaming live updates.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {user ? (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="gap-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-neutral-950 font-bold shadow-lg shadow-emerald-500/25 px-6"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={login}
                  size="lg"
                  className="gap-2.5 bg-white hover:bg-neutral-100 text-neutral-950 font-bold shadow-xl shadow-white/10 px-6"
                >
                  <GitFork className="h-4 w-4" />
                  <span>Connect GitHub</span>
                </Button>
              )}

              <a href="#features">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-200 hover:text-white backdrop-blur-xl"
                >
                  Explore Capabilities
                </Button>
              </a>
            </div>

            {/* Stats / Trust Badges */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-neutral-800/80 pt-6 text-xs text-neutral-400">
              <div className="flex flex-col">
                <span className="text-xl font-bold font-mono text-white">&lt; 3 sec</span>
                <span className="text-[11px] text-neutral-400 mt-0.5">Streaming Latency</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold font-mono text-emerald-400">4-Tier</span>
                <span className="text-[11px] text-neutral-400 mt-0.5">Severity Triage</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold font-mono text-cyan-300">100% Live</span>
                <span className="text-[11px] text-neutral-400 mt-0.5">Socket Collaboration</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3D Holographic Interactive Terminal */}
          <div
            className="lg:col-span-6 [perspective:1400px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <motion.div
              style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }}
              className="relative rounded-2xl border border-neutral-800 bg-neutral-950/80 p-1.5 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-shadow duration-300 hover:shadow-[0_30px_70px_rgba(16,185,129,0.15)] hover:border-emerald-500/40"
            >
              {/* Top Laser Scanning Line animation */}
              <motion.div
                animate={{ y: ['0%', '100%', '0%'] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.8)] z-30"
              />

              {/* Holographic Header */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/90 px-4 py-3 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="ml-2 font-mono text-xs text-neutral-400 flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" /> auth.controller.ts
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Zap className="h-2.5 w-2.5" /> AI SCAN ACTIVE
                  </span>
                </div>
              </div>

              {/* Code Diff Simulation View */}
              <div className="p-4 font-mono text-xs space-y-1.5 overflow-hidden bg-neutral-950/90 rounded-b-xl leading-relaxed select-none">
                <div className="text-neutral-400 text-[11px] pb-1">@@ -14,7 +14,9 @@ async function authenticateUser()</div>

                <div className="text-neutral-400 px-2"> const token = req.headers.authorization;</div>
                <div className="bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 px-2 py-0.5 rounded-r">
                  {"- const user = await db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`);"}
                </div>

                <div className="bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5 rounded-r">
                  + const user = await User.findById(req.params.id).select(&#39;-password&#39;);
                </div>

                {/* Floating 3D AI Comment Card 1 (Security) */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="my-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-rose-200 shadow-xl backdrop-blur-md font-sans"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                        SECURITY
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">Line 15</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                        <Sparkles className="h-2.5 w-2.5" /> Gemini
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Resolved
                    </span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-normal">
                    SQL injection vulnerability fixed by switching to parameterized Mongoose query.
                  </p>
                </motion.div>

                <div className="text-neutral-400 px-2"> if (!user) return res.status(404).send();</div>
                <div className="bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 px-2 py-0.5 rounded-r">
                  {'+ return res.status(200).json({ success: true, user });'}
                </div>

                {/* Floating 3D AI Comment Card 2 (Performance) */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="my-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-amber-200 shadow-xl backdrop-blur-md font-sans"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                      BUG / RELIABILITY
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">Line 18</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-normal">
                    Added password omission to prevent sensitive credential leakage in API response.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
