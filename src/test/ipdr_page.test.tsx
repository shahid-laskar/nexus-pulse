import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { IPDRCompliancePage } from '@/pages/admin/IPDRCompliancePage'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

describe('IPDRCompliancePage Component', () => {
  it('renders header, tabs, and default form inputs', () => {
    const qc = createTestQueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <IPDRCompliancePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('IPDR Regulatory Compliance & LEA Trace')).toBeInTheDocument()
    expect(screen.getByText('Subscriber IPDR Trace')).toBeInTheDocument()
    expect(screen.getByText('Law Enforcement Reverse NAT Trace (LEA)')).toBeInTheDocument()
    expect(screen.getByText('Subscriber Source IP (Private)')).toBeInTheDocument()
  })

  it('switches between Subscriber Trace and Reverse NAT tabs', () => {
    const qc = createTestQueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <IPDRCompliancePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Click Reverse NAT tab
    fireEvent.click(screen.getByText('Law Enforcement Reverse NAT Trace (LEA)'))
    expect(screen.getByText('Public NAT IP')).toBeInTheDocument()
    expect(screen.getByText('Public NAT Port (1–65535)')).toBeInTheDocument()
    expect(screen.getByText('Execute LEA Reverse NAT Trace')).toBeInTheDocument()

    // Click Subscriber tab back
    fireEvent.click(screen.getByText('Subscriber IPDR Trace'))
    expect(screen.getByText('Subscriber Source IP (Private)')).toBeInTheDocument()
    expect(screen.getByText('Query IPDR Records')).toBeInTheDocument()
  })
})
