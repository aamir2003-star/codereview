import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
          {
            'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 font-semibold shadow-lg shadow-emerald-500/20 active:scale-[0.98]':
              variant === 'default',
            'border border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800 hover:text-white hover:border-neutral-700':
              variant === 'outline',
            'text-neutral-400 hover:text-white hover:bg-neutral-800/60':
              variant === 'ghost',
            'bg-neutral-800 text-neutral-100 hover:bg-neutral-700':
              variant === 'secondary',
            'bg-rose-600 text-white hover:bg-rose-500':
              variant === 'danger',
            'text-xs px-2.5 py-1.5 rounded-lg gap-1.5': size === 'sm',
            'text-sm px-4 py-2 rounded-xl gap-2': size === 'md',
            'text-base px-6 py-3 rounded-xl gap-2.5 font-semibold': size === 'lg',
            'h-9 w-9 rounded-lg p-0': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
