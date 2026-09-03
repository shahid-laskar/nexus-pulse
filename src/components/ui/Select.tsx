import { cn } from '@/lib/utils'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { Label, fieldBase } from './Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string | number; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={selectId}>{label}</Label>}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              fieldBase,
              'h-9 pl-3 pr-8 appearance-none cursor-pointer',
              error ? 'border-critical' : 'border-hairline',
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        {error && <p className="text-[11px] text-critical">{error}</p>}
        {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
