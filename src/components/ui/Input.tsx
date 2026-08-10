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
          <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2.5 text-sm rounded-lg border outline-none transition-colors',
            'text-foreground placeholder:text-muted-foreground',
            error
              ? 'border-critical focus:border-critical bg-critical/10'
              : 'border-hairline focus:border-primary bg-surface',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-[#6b7ea8]">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
