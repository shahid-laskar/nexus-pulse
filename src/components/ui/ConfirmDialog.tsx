import React, { useEffect, useState } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
  /** When set, the user must type this exact string to enable the confirm button. */
  confirmPhrase?: string
  onConfirm: () => void
  onClose: () => void
}

const ICONS = {
  danger: ShieldAlert,
  warning: AlertTriangle,
  primary: Info,
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  confirmPhrase,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!isOpen) setTyped('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const Icon = ICONS[variant]
  const blocked = Boolean(confirmPhrase) && typed.trim() !== confirmPhrase

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-foreground/25 backdrop-blur-[2px] p-4">
      <div
        className="w-full max-w-md bg-popover text-popover-foreground rounded-xl border border-hairline shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                variant === 'danger' && 'bg-critical-soft text-critical',
                variant === 'warning' && 'bg-warn-soft text-warn',
                variant === 'primary' && 'bg-primary/10 text-primary'
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <h3 id="confirm-dialog-title" className="text-[15px] font-semibold tracking-tight">
                {title}
              </h3>
              <div className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
                {description}
              </div>
            </div>
          </div>

          {confirmPhrase && (
            <div className="mt-4">
              <Input
                label={`Type "${confirmPhrase}" to continue`}
                value={typed}
                autoFocus
                onChange={(e) => setTyped(e.target.value)}
                placeholder={confirmPhrase}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-hairline bg-surface-2/60">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={blocked}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
