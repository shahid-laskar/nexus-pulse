import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   'primary' | 'secondary' | 'danger' | 'ghost'
  size?:      'xs' | 'sm' | 'md' | 'lg'
  loading?:   boolean
  isLoading?: boolean
}

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const busy = loading || isLoading

  return (
    <button
      disabled={disabled || busy}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          // Variants
          'bg-primary text-white hover:opacity-90 focus:ring-primary shadow-2xs': variant === 'primary',
          'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-300 shadow-2xs': variant === 'secondary',
          'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-2xs': variant === 'danger',
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300': variant === 'ghost',
          // Sizes
          'text-[11px] px-2 py-1 gap-1': size === 'xs',
          'text-xs px-3 py-1.5 gap-1.5': size === 'sm',
          'text-sm px-4 py-2 gap-2':     size === 'md',
          'text-base px-6 py-3 gap-2':   size === 'lg',
        },
        className
      )}
      {...props}
    >
      {busy && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
