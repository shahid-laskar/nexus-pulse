import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

export const fieldBase =
  'w-full rounded-lg border bg-surface text-foreground placeholder:text-muted-foreground/70 ' +
  'text-[12.5px] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              fieldBase,
              'h-9 px-3',
              icon && 'pl-8',
              suffix && 'pr-9',
              error
                ? 'border-critical focus:border-critical focus:ring-critical/25'
                : 'border-hairline',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-critical">{error}</p>}
        {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const tid = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={tid}>{label}</Label>}
        <textarea
          ref={ref}
          id={tid}
          className={cn(
            fieldBase,
            'px-3 py-2 min-h-20 resize-y',
            error ? 'border-critical' : 'border-hairline',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-critical">{error}</p>}
        {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export function Label({
  children,
  htmlFor,
  className,
  required,
}: {
  children: ReactNode
  htmlFor?: string
  className?: string
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-[11.5px] font-medium text-foreground/80', className)}
    >
      {children}
      {required && <span className="text-critical ml-0.5">*</span>}
    </label>
  )
}
