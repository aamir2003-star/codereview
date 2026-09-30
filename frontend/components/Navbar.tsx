'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LogOut, LayoutDashboard, GitFork, Home } from 'lucide-react';

export function Navbar() {
  const { user, login, logout, isLoading } = useAuth();
  const pathname = usePathname();

  // On home page → show "Dashboard"; on any other page → show "Home"
  const isHomePage = pathname === '/';
  const navLink = isHomePage ? '/dashboard' : '/';
  const navLabel = isHomePage ? 'Dashboard' : 'Home';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262626] bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-sm font-semibold tracking-wider text-white uppercase select-none group-hover:text-[#e4e4e7] transition-colors">
              ReviewCopilot
            </span>
          </Link>
        </div>

        {/* Center / Status Indicator */}
        <div className="hidden md:flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
          <span className="font-mono text-xs text-[#a1a1aa]">
            AI Code Review Engine
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse bg-[#141414] rounded-lg border border-[#262626]" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link href={navLink}>
                <button className="h-8 px-4 rounded-lg border border-[#3a3a3a] hover:border-white bg-transparent text-white text-xs font-medium transition-all cursor-pointer">
                  {navLabel}
                </button>
              </Link>

              <div className="flex items-center gap-2.5 pl-3 border-l border-[#262626]">
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
                <span className="text-xs text-[#d4d4d8] font-medium hidden sm:inline-block">
                  @{user.username}
                </span>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#262626] hover:border-white text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={login}
              className="h-8 px-4 rounded-lg border border-white hover:bg-white hover:text-black bg-transparent text-white text-xs font-medium transition-all cursor-pointer"
            >
              Connect GitHub
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
