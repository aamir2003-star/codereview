import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'security' | 'bug' | 'smell' | 'nit' | 'outline' | 'default';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors',
        {
          'bg-rose-500/10 text-rose-400 border border-rose-500/20': variant === 'security',
          'bg-amber-500/10 text-amber-400 border border-amber-500/20': variant === 'bug',
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20': variant === 'smell',
          'bg-sky-500/10 text-sky-400 border border-sky-500/20': variant === 'nit',
          'bg-neutral-800 text-neutral-300 border border-neutral-700': variant === 'outline',
          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': variant === 'default',
        },
        className
      )}
      {...props}
    />
  );
}
