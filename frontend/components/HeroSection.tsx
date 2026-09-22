'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Bot,
  Boxes,
  Check,
  CircleDot,
  Code2,
  GitFork,
  GitPullRequest,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

const stages = [
  { id: 'pull', label: 'Pull request', detail: 'GitHub event', icon: GitPullRequest, tone: 'from-violet-500 to-fuchsia-500' },
  { id: 'engine', label: 'Review engine', detail: 'Context-aware scan', icon: Bot, tone: 'from-cyan-400 to-blue-500' },
  { id: 'team', label: 'Your team', detail: 'Live decisions', icon: Users, tone: 'from-emerald-400 to-teal-500' },
];

export function HeroSection() {
  const { user, login } = useAuth();
  const [selectedStage, setSelectedStage] = useState('engine');
  const [rotation, setRotation] = useState({ x: -8, y: -10 });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setRotation({
      x: ((event.clientY - rect.top) / rect.height - 0.5) * -14,
      y: ((event.clientX - rect.left) / rect.width - 0.5) * 18,
    });
  };

  return (
    <section className="relative isolate overflow-hidden px-4 pb-24 pt-14 sm:px-6 lg:pb-32 lg:pt-24">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(139,92,246,.18),transparent_28%),radial-gradient(circle_at_82%_35%,rgba(45,212,191,.16),transparent_24%)]" />
      <div className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/[.04]" />

      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-14 lg:grid-cols-[.92fr_1.08fr]">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[.08] px-3 py-1.5 text-xs font-semibold text-violet-200">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative h-2 w-2 rounded-full bg-emerald-400" /></span>
              YOUR PRS, UNDERSTOOD IN CONTEXT
            </div>
            <h1 className="text-balance text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Turn every pull request into a{' '}
              <span className="bg-gradient-to-r from-violet-300 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">clearer decision.</span>
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-neutral-400 sm:text-lg">
              ReviewCopilot traces the path from change to consequence, then brings your team into the same conversation—while the code is still fresh.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {user ? (
                <Link href="/dashboard"><Button size="lg" className="gap-2 bg-white text-neutral-950 hover:bg-neutral-200"><span>Open command center</span><ArrowRight className="h-4 w-4" /></Button></Link>
              ) : (
                <Button onClick={login} size="lg" className="gap-2 bg-white text-neutral-950 hover:bg-neutral-200"><GitFork className="h-4 w-4" /><span>Connect GitHub</span></Button>
              )}
              <a href="#workflow"><Button variant="outline" size="lg" className="border-white/10 bg-white/[.03] text-neutral-200 hover:bg-white/[.08]">Explore the flow</Button></a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-neutral-400">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" />Scope-aware feedback</span>
              <span className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-cyan-300" />Human decisions stay human</span>
            </div>
          </div>

          <div className="[perspective:1200px]" onPointerMove={handlePointerMove} onPointerLeave={() => setRotation({ x: -8, y: -10 })}>
            <div className="relative min-h-[440px] cursor-crosshair select-none transition-transform duration-300 ease-out [transform-style:preserve-3d] sm:min-h-[500px]" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
              <div className="absolute inset-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[.09] to-white/[.01] shadow-[0_35px_90px_rgba(0,0,0,.45)] backdrop-blur-xl [transform:translateZ(-40px)]" />
              <div className="absolute left-[14%] right-[14%] top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent [transform:translateZ(5px)]" />
              <div className="absolute left-1/2 top-[18%] h-[65%] w-px bg-gradient-to-b from-transparent via-violet-300/50 to-transparent [transform:translateZ(2px)]" />
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const active = selectedStage === stage.id;
                const positions = ['left-[7%] top-[18%]', 'left-1/2 top-1/2', 'right-[7%] bottom-[17%]'];
                return (
                  <button key={stage.id} onClick={() => setSelectedStage(stage.id)} className={`absolute ${positions[index]} group -translate-x-1/2 -translate-y-1/2 text-left [transform-style:preserve-3d]`}>
                    <span className={`absolute -inset-5 rounded-full bg-gradient-to-r ${stage.tone} ${active ? 'opacity-25' : 'opacity-0'} blur-2xl transition-opacity group-hover:opacity-20`} />
                    <span className={`relative flex w-44 flex-col rounded-2xl border p-4 transition-all duration-300 sm:w-48 ${active ? 'border-white/30 bg-neutral-900/95 shadow-2xl [transform:translateZ(52px)]' : 'border-white/10 bg-neutral-950/75 [transform:translateZ(20px)] group-hover:border-white/25 group-hover:[transform:translateZ(38px)]'}`}>
                      <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stage.tone} text-neutral-950 shadow-lg`}><Icon className="h-5 w-5" /></span>
                      <span className="text-sm font-bold text-white">{stage.label}</span>
                      <span className="mt-1 text-[11px] text-neutral-400">{stage.detail}</span>
                      {active && <span className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><Check className="h-3 w-3" /> Observing</span>}
                    </span>
                  </button>
                );
              })}
              <div className="absolute bottom-[7%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-neutral-950/85 px-4 py-2 text-[11px] text-neutral-300 shadow-xl [transform:translateZ(42px)]"><Boxes className="h-3.5 w-3.5 text-cyan-300" />Drag your attention across the system</div>
              <div className="absolute right-[9%] top-[8%] flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-bold text-emerald-200 [transform:translateZ(58px)]"><Sparkles className="h-3.5 w-3.5" />LIVE CONTEXT</div>
            </div>
          </div>
        </div>

        <div id="workflow" className="mt-16 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          {['Connect a repository', 'Review the meaningful changes', 'Resolve with context'].map((item, index) => (
            <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="font-mono text-xs text-violet-300">0{index + 1}</span><span className="text-sm font-semibold text-neutral-200">{item}</span><Code2 className="ml-auto h-4 w-4 text-neutral-600" /></div>
          ))}
        </div>
      </div>
    </section>
  );
}
