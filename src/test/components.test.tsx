import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'

describe('ConfirmDialog Component', () => {
  it('renders modal content when isOpen is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Confirm Action"
        description="Hidden text"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirmation Required"
        confirmText="Yes, Proceed"
        description="Proceed?"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Yes, Proceed' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('disables button when loading or isLoading is true', () => {
    render(<Button isLoading={true}>Saving</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })
})

describe('StatusBadge Component', () => {
  it('renders status text correctly', () => {
    render(<StatusBadge status="READY" />)
    expect(screen.getByText('READY')).toBeInTheDocument()
  })
})
