import { describe, it, expect } from 'vitest'
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

describe('IPDRCompliancePage Component (Task 5.5)', () => {
  it('renders header, all three investigation tabs, and default Task 5.5 search inputs', () => {
    const qc = createTestQueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <IPDRCompliancePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Header & Tabs
    expect(screen.getByText('IPDR Regulatory Compliance & LEA Trace')).toBeInTheDocument()
    expect(screen.getByText('Subscriber / Account Search')).toBeInTheDocument()
    expect(screen.getByText('Subscriber IPDR Trace')).toBeInTheDocument()
    expect(screen.getByText('Law Enforcement Reverse NAT Trace (LEA)')).toBeInTheDocument()

    // Default Task 5.5 search controls
    expect(screen.getByText('Search Identifier Mode')).toBeInTheDocument()
    expect(screen.getByText('Query Term / Identifier')).toBeInTheDocument()
    expect(screen.getByText('Find Subscribers')).toBeInTheDocument()
  })

  it('switches between Subscriber Search, Subscriber IPDR Trace, and Reverse NAT tabs', () => {
    const qc = createTestQueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <IPDRCompliancePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // 1. Click Subscriber IPDR Trace tab
    fireEvent.click(screen.getByText('Subscriber IPDR Trace'))
    expect(screen.getByText('Subscriber Source IP (Private)')).toBeInTheDocument()
    expect(screen.getByText('Query IPDR Records')).toBeInTheDocument()

    // 2. Click Reverse NAT tab
    fireEvent.click(screen.getByText('Law Enforcement Reverse NAT Trace (LEA)'))
    expect(screen.getByText('Public NAT IP')).toBeInTheDocument()
    expect(screen.getByText('Public NAT Port (1–65535)')).toBeInTheDocument()
    expect(screen.getByText('Execute LEA Reverse NAT Trace')).toBeInTheDocument()

    // 3. Click back to Subscriber / Account Search tab
    fireEvent.click(screen.getByText('Subscriber / Account Search'))
    expect(screen.getByText('Find Subscribers')).toBeInTheDocument()
  })

  it('renders LEA Investigation Cases tab and allows switching to case management (Task 5.6)', () => {
    const qc = createTestQueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <IPDRCompliancePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Verify Tab 4 is rendered
    const casesTab = screen.getByText('LEA Investigation Cases')
    expect(casesTab).toBeInTheDocument()

    // Switch to cases tab
    fireEvent.click(casesTab)

    // Verify Case Management Dashboard is displayed
    expect(screen.getByText('Law Enforcement & Regulatory Investigation Cases')).toBeInTheDocument()
    expect(screen.getByText('New Investigation Case')).toBeInTheDocument()
    expect(screen.getByText('Active & Historic Investigation Files')).toBeInTheDocument()

    // Open New Investigation Case modal
    fireEvent.click(screen.getByText('New Investigation Case'))
    expect(screen.getByText('Create New Investigation Case')).toBeInTheDocument()
    expect(screen.getByText('Case Title *')).toBeInTheDocument()
    expect(screen.getByText('Requesting Agency *')).toBeInTheDocument()
    expect(screen.getByText('Investigating Officer Name *')).toBeInTheDocument()
    expect(screen.getByText('Legal Reference / Section *')).toBeInTheDocument()
  })
})

