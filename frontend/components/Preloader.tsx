'use client';

import { useEffect, useState } from 'react';
import { Bot, Check, GitPullRequest, Orbit } from 'lucide-react';

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    ['Identity verified', Check],
    ['Mapping repositories', GitPullRequest],
    ['Warming review engine', Bot],
  ] as const;

  useEffect(() => {
    if (step >= steps.length) {
      const timer = window.setTimeout(onComplete, 500);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 550);
    return () => window.clearTimeout(timer);
  }, [onComplete, step, steps.length]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090d] px-6 text-white">
      <div className="absolute h-[34rem] w-[34rem] rounded-full border border-violet-400/10 [animation:spin_18s_linear_infinite]" />
      <div className="absolute h-[23rem] w-[23rem] rounded-full border border-cyan-300/10 [animation:spin_12s_linear_infinite_reverse]" />
      <div className="absolute h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[.045] p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-300 text-neutral-950"><Orbit className="h-6 w-6" /></div><span className="text-[10px] font-bold tracking-[.22em] text-violet-200">SESSION READY</span></div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to the review room.</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">Preparing your GitHub workspace and the signals that matter.</p>
        <div className="mt-8 space-y-3">
          {steps.map(([label, Icon], index) => (
            <div key={label} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-all duration-500 ${index < step ? 'border-emerald-400/20 bg-emerald-400/[.08] text-emerald-100' : index === step ? 'border-violet-300/30 bg-white/[.06] text-white' : 'border-white/[.06] text-neutral-600'}`}>
              <Icon className={`h-4 w-4 ${index < step ? 'text-emerald-300' : 'text-violet-300'}`} />{label}
              {index < step && <Check className="ml-auto h-4 w-4 text-emerald-300" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
