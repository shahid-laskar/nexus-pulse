import { clsx } from 'clsx'
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
          <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wide text-[#6b7ea8]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full px-3 py-2.5 text-sm rounded-lg border outline-none transition-colors',
            'text-[#1a2340] placeholder:text-gray-400',
            error
              ? 'border-red-400 focus:border-red-500 bg-red-50'
              : 'border-[#d0d8ec] focus:border-[#1a3a6b] bg-white',
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
