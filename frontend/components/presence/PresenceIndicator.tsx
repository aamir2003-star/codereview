'use client';

import React from 'react';
import { PresenceUser } from '@/hooks/useReviewSocket';
import { Users } from 'lucide-react';

interface PresenceIndicatorProps {
  users: PresenceUser[];
  currentUserId?: string;
}

export function PresenceIndicator({ users, currentUserId }: PresenceIndicatorProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <Users className="h-3.5 w-3.5 text-emerald-400" />
        <span className="font-medium text-white">{users.length}</span>
        <span className="hidden sm:inline-block">
          reviewer{users.length === 1 ? '' : 's'} live
        </span>
      </div>

      <div className="flex -space-x-1.5 overflow-hidden pl-1">
        {users.slice(0, 4).map((user) => (
          <div
            key={user.userId}
            title={`${user.username}${user.userId === currentUserId ? ' (You)' : ''}`}
            className="inline-block h-5 w-5 rounded-full ring-2 ring-neutral-950 bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-300 font-bold flex items-center justify-center select-none"
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
        ))}
        {users.length > 4 && (
          <div className="inline-block h-5 w-5 rounded-full ring-2 ring-neutral-950 bg-neutral-800 text-[9px] text-neutral-300 font-semibold flex items-center justify-center">
            +{users.length - 4}
          </div>
        )}
      </div>
    </div>
  );
}
