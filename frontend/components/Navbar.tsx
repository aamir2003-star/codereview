'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { GitFork, Code2, Sparkles, LogOut, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  const { user, login, logout, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/60 bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Code2 className="h-5 w-5 text-neutral-950" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">ReviewCopilot</span>
              <span className="flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-2.5 w-2.5" /> AI Live
              </span>
            </div>
          </div>
        </Link>

        {/* Navigation / Actions */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-32 animate-pulse rounded-xl bg-neutral-800" />
          ) : user ? (
            /* ── Authenticated state ── */
            <div className="flex items-center gap-2">
              {/* Dashboard link */}
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs hidden sm:flex">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Button>
              </Link>

              {/* Divider + user info */}
              <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
                {/* Avatar */}
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-7 w-7 rounded-full ring-1 ring-neutral-700 shrink-0"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Username — hidden on mobile */}
                <span className="text-xs font-medium text-neutral-300 hidden sm:inline-block max-w-[120px] truncate">
                  {user.username}
                </span>

                {/* Logout button — clear, labelled, always visible */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-1.5 text-xs text-neutral-400 hover:bg-rose-500/10 hover:text-rose-300 border border-transparent hover:border-rose-500/20 transition-all"
                  title="Sign out and clear session"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline-block">Logout</span>
                </Button>
              </div>
            </div>
          ) : (
            /* ── Unauthenticated state ── */
            <Button
              onClick={login}
              size="sm"
              className="gap-2 text-xs font-semibold bg-white hover:bg-neutral-100 text-neutral-950 border-0 shadow-none"
            >
              <GitFork className="h-4 w-4" />
              <span>Connect GitHub</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
