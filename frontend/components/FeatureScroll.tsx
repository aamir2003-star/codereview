'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Cpu, Users, ShieldCheck, Zap, GitBranch, RefreshCw } from 'lucide-react';

const features = [
  {
    icon: Cpu,
    title: 'Progressive Per-File Streaming',
    description:
      'Instead of blocking for minutes on entire repositories, Gemini analyzes diff hunks file-by-file and streams comments directly to your screen.',
    badge: 'Gemini 2.0',
  },
  {
    icon: Users,
    title: 'Multiplayer Real-Time Rooms',
    description:
      'Engineers can view the same PR simultaneously. Comments appear live, and teammates can upvote or resolve issues with zero page refresh.',
    badge: 'Socket.io',
  },
  {
    icon: ShieldCheck,
    title: 'Categorized Severity Triage',
    description:
      'Identifies critical vulnerabilities, logical runtime bugs, code smells, and styling nits with color-coded badges and line gutter markers.',
    badge: 'Categorized',
  },
  {
    icon: GitBranch,
    title: 'One-Click GitHub Integration',
    description:
      'Directly connect your GitHub account via OAuth to list repositories and pull requests with zero configuration overhead.',
    badge: 'GitHub OAuth',
  },
  {
    icon: Zap,
    title: 'Optimistic UI Updates',
    description:
      'Instant feedback when resolving comments or voting on suggestions, backed by immediate server reconciliation.',
    badge: 'Low Latency',
  },
  {
    icon: RefreshCw,
    title: 'Full Review Persistence',
    description:
      'MongoDB stores all historical review sessions and comment resolutions so you can revisit past reviews at any time.',
    badge: 'MongoDB',
  },
];

export function FeatureScroll() {
  return (
    <section id="features" className="py-20 md:py-32 border-t border-neutral-900 bg-neutral-950/60 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
            Why ReviewCopilot
          </h2>
          <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for modern engineering teams who value velocity and code quality
          </p>
          <p className="mt-4 text-sm text-neutral-400">
            Everything you need to turn slow, asynchronous code reviews into fast, collaborative sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group hover:border-neutral-700/80 hover:bg-neutral-900/60 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded-full border border-neutral-700/50">
                      {feature.badge}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-neutral-400 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
