import { cn } from '@/lib/utils'
import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string
  error?:    string
  options:   { value: string | number; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-3 py-2 text-[13px] rounded-md border outline-none transition-colors appearance-none',
            'text-foreground bg-surface-2',
            error
              ? 'border-critical focus:border-critical focus:ring-1 focus:ring-critical'
              : 'border-hairline focus:border-primary/50 focus:ring-1 focus:ring-primary/50',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-[11px] text-critical">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
