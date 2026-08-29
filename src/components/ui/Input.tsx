import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:  string
  error?:  string
  hint?:   string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-1.5 text-xs rounded-lg border outline-none transition-colors h-8.5',
            'text-slate-900 placeholder:text-slate-400 bg-white',
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
              : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>}
        {hint && !error && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
