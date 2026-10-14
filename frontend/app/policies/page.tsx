'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/lib/auth-context';
import { RuleBuilder } from '@/components/policies/RuleBuilder';
import { fetchOrgPolicy, updateOrgPolicy, PolicyRule, OrgPolicy } from '@/lib/policy-api';
import { Shield, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PoliciesPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrganization();
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [policy, setPolicy] = useState<OrgPolicy | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!token || !currentOrg) return;
    fetchOrgPolicy(token, currentOrg._id).then((res) => {
      setPolicy(res.policy);
      setRules(res.availableRules);
    });
  }, [token, currentOrg]);

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
    );
  };

  const handleSeverityChange = (ruleId: string, severity: 'error' | 'warning' | 'info') => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, severity } : r))
    );
  };

  const handleSavePolicy = async () => {
    if (!token || !currentOrg || !policy) return;
    try {
      setIsSaving(true);
      const ruleConfigs: Record<string, { enabled: boolean; severity?: string }> = {};
      for (const r of rules) {
        ruleConfigs[r.id] = { enabled: r.enabled, severity: r.severity };
      }

      await updateOrgPolicy(token, currentOrg._id, {
        rules: ruleConfigs,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-400" />
              <span>Review Policy & Static Rules</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Customize automated linting rules, AST checks, and security gates enforced across all pull requests.
            </p>
          </div>

          <Button
            onClick={handleSavePolicy}
            disabled={isSaving}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs flex items-center gap-1.5"
          >
            {saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-950" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Policy'}</span>
          </Button>
        </div>

        <RuleBuilder
          rules={rules}
          onToggleRule={handleToggleRule}
          onSeverityChange={handleSeverityChange}
        />
      </div>
    </div>
  );
}
