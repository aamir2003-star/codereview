'use client';

import React from 'react';
import { OrgMember } from '@/lib/org-api';
import { User, Shield, Trash2 } from 'lucide-react';

interface TeamMemberListProps {
  members: OrgMember[];
  onRoleChange: (userId: string, newRole: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

export function TeamMemberList({ members, onRoleChange, onRemove }: TeamMemberListProps) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <span>Organization Members ({members.length})</span>
        </h3>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {members.map((member) => (
          <div key={member.userId._id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                {member.userId.username ? member.userId.username.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-200">{member.userId.username}</div>
                <div className="text-xs text-zinc-500">{member.userId.email || 'GitHub Member'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={member.role}
                onChange={(e) => onRoleChange(member.userId._id, e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="member">Member</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>

              <button
                onClick={() => onRemove(member.userId._id)}
                className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 transition-colors"
                title="Remove member"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
