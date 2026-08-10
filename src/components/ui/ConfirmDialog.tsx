import React from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmVariant = variant === 'danger' ? 'danger' : 'primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="p-6">
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-slate-900 mb-2">
            {title}
          </h3>
          <div className="text-sm text-slate-600 mb-6">{description}</div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
