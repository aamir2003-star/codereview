'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useOrganization } from '@/hooks/useOrganization';
import { TeamMemberList } from '@/components/settings/TeamMemberList';
import { updateMemberRole, removeOrgMember } from '@/lib/org-api';
import { useAuth } from '@/lib/auth-context';
import { Building, Settings, ShieldAlert, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { token } = useAuth();
  const { organizations, currentOrg, selectOrg, refreshOrgs } = useOrganization();
  const [activeTab, setActiveTab] = useState<'members' | 'general' | 'keys'>('members');

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token || !currentOrg) return;
    await updateMemberRole(token, currentOrg._id, userId, newRole);
    await refreshOrgs();
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !currentOrg) return;
    await removeOrgMember(token, currentOrg._id, userId);
    await refreshOrgs();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Building className="w-6 h-6 text-cyan-400" />
              <span>Workspace Settings</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage multi-tenant organization access, team members, and integration tokens.
            </p>
          </div>

          {organizations.length > 1 && (
            <select
              value={currentOrg?._id || ''}
              onChange={(e) => selectOrg(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 rounded-xl px-3 py-2"
            >
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-4 mb-6 border-b border-zinc-800/80 pb-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`text-sm font-medium pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Members & Roles
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`text-sm font-medium pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`text-sm font-medium pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'keys'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            CI/CD API Keys
          </button>
        </div>

        {activeTab === 'members' && currentOrg && (
          <TeamMemberList
            members={currentOrg.members || []}
            onRoleChange={handleRoleChange}
            onRemove={handleRemoveMember}
          />
        )}

        {activeTab === 'general' && currentOrg && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span>Review Engine Defaults</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-zinc-800/40 p-4 rounded-xl">
                <div className="text-zinc-400 text-xs">Default Target Branch</div>
                <div className="font-semibold text-zinc-200 mt-1">{currentOrg.settings?.defaultBranch || 'main'}</div>
              </div>
              <div className="bg-zinc-800/40 p-4 rounded-xl">
                <div className="text-zinc-400 text-xs">Max Concurrency</div>
                <div className="font-semibold text-zinc-200 mt-1">{currentOrg.settings?.maxConcurrentReviews || 5} workers</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center py-12">
            <Key className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-200">Continuous Integration Keys</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-4">
              Generate long-lived bearer tokens to trigger automated reviews directly from GitHub Actions or GitLab CI.
            </p>
            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs">
              Generate New Token
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
