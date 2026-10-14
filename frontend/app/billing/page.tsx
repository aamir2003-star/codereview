'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { useOrganization } from '@/hooks/useOrganization';
import { useBillingQuota } from '@/hooks/useBillingQuota';
import { QuotaMeter } from '@/components/billing/QuotaMeter';
import { CreditCard, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingPage() {
  const { currentOrg } = useOrganization();
  const { billing, upgrade, isUpgrading } = useBillingQuota(currentOrg?._id);

  const plans = [
    {
      id: 'free',
      name: 'Free Tier',
      price: '$0',
      tokens: '50,000 tokens/mo',
      seats: '3 seats',
      features: ['Basic AI Review', 'PR Architecture Summary', 'Community Support'],
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      tokens: '250,000 tokens/mo',
      seats: '10 seats',
      features: ['Full AI Security Scanner', 'Custom Rule Engine', 'Priority Queue Processing'],
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$99',
      tokens: '1,000,000 tokens/mo',
      seats: '25 seats',
      features: ['Unlimited Cross-File Review', 'Slack Integration', 'PDF & Markdown Exports'],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="mb-8 pb-4 border-b border-zinc-800">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-amber-400" />
            <span>Usage & Subscription</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monitor real-time token consumption, review limits, and manage organization plan tiers.
          </p>
        </div>

        {billing && (
          <div className="mb-10">
            <QuotaMeter
              used={billing.quota.used}
              quota={billing.quota.quota}
              percentUsed={billing.quota.percentUsed}
              plan={billing.plan}
              onUpgrade={() => upgrade('pro')}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = billing?.plan === p.id;
            return (
              <div
                key={p.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-zinc-900/90 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                    : 'bg-zinc-900/40 border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg text-zinc-100">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <div className="text-3xl font-extrabold text-zinc-100 mb-1">
                  {p.price}
                  <span className="text-xs font-normal text-zinc-500">/mo</span>
                </div>
                <div className="text-xs text-zinc-400 mb-4">{p.tokens} • {p.seats}</div>

                <div className="space-y-2.5 mb-6 text-xs text-zinc-300">
                  {p.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Button
                  disabled={isCurrent || isUpgrading}
                  onClick={() => upgrade(p.id)}
                  className={`w-full text-xs font-semibold ${
                    isCurrent
                      ? 'bg-zinc-800 text-zinc-400 cursor-default'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-black'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : isUpgrading ? 'Upgrading...' : `Select ${p.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
