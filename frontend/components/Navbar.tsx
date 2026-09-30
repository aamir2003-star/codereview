'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { LogOut, LayoutDashboard, GitFork } from 'lucide-react';

export function Navbar() {
  const { user, login, logout, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262626] bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Section / Brand Mark */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Wordmark Display */}
            <span className="font-display text-sm tracking-[6px] text-white font-normal uppercase select-none group-hover:text-[#e6e6e6] transition-colors">
              REVIEW COPILOT
            </span>
          </Link>
        </div>

        {/* Center / Monospace Architecture Indicator (hidden on small screens) */}
        <div className="hidden md:flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
          <span className="font-mono text-[11px] uppercase tracking-[3px] text-[#999999]">
            PRECISION AI CODE AUDIT
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse bg-[#141414] border border-[#262626]" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <button className="h-9 px-5 rounded-full border border-[#3a3a3a] hover:border-white bg-transparent text-white font-mono text-xs uppercase tracking-[2px] transition-all cursor-pointer">
                  Dashboard
                </button>
              </Link>

              <div className="flex items-center gap-3 pl-3 border-l border-[#262626]">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-6 w-6 rounded-full border border-[#3a3a3a]"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-[#141414] border border-[#3a3a3a] flex items-center justify-center font-mono text-[10px] text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-mono text-xs uppercase tracking-[1.5px] text-[#cccccc] hidden sm:inline-block">
                  @{user.username}
                </span>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-[#262626] hover:border-white text-[#999999] hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={login}
              className="h-9 px-6 rounded-full border border-white hover:bg-white hover:text-black bg-transparent text-white font-mono text-xs uppercase tracking-[2.5px] transition-all cursor-pointer"
            >
              Connect GitHub
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
