import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'subtle' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  isLoading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 shadow-[0_1px_2px_0_oklch(0_0_0/0.06)]',
  secondary:
    'bg-surface text-foreground border border-hairline hover:bg-surface-2 active:bg-muted',
  outline:
    'bg-transparent text-foreground border border-hairline hover:bg-surface-2',
  subtle: 'bg-surface-2 text-foreground hover:bg-muted border border-transparent',
  danger:
    'bg-critical text-white hover:brightness-110 active:brightness-95 shadow-[0_1px_2px_0_oklch(0_0_0/0.06)]',
  success: 'bg-healthy text-white hover:brightness-110 active:brightness-95',
  ghost: 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
}

const SIZES: Record<Size, string> = {
  xs: 'text-[11px] h-6 px-2 gap-1 rounded-md',
  sm: 'text-[12px] h-7.5 px-2.5 gap-1.5 rounded-lg',
  md: 'text-[13px] h-9 px-3.5 gap-2 rounded-lg',
  lg: 'text-[14px] h-10 px-5 gap-2 rounded-xl',
  icon: 'h-8 w-8 rounded-lg justify-center',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
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
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
        'transition-[background,color,filter,box-shadow] duration-100 ease-standard',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}
