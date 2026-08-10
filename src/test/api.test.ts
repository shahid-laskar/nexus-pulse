import { describe, it, expect } from 'vitest'
import { extractErrorMessage } from '@/lib/axios'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { customersApi, circlesApi, businessAreasApi } from '@/api/master-data'
import { ebApi } from '@/api/eb'
import { nocApi } from '@/api/noc'

describe('API Error Normalization', () => {
  it('extracts detail string error', () => {
    const error = {
      isAxiosError: true,
      response: { data: { detail: 'Invalid credentials' } },
    }
    expect(extractErrorMessage(error)).toBe('Invalid credentials')
  })

  it('extracts detail array error', () => {
    const error = {
      isAxiosError: true,
      response: { data: { detail: [{ msg: 'Field required' }] } },
    }
    expect(extractErrorMessage(error)).toBe('Field required')
  })

  it('extracts validation errors list', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          errors: [{ field: 'username', message: 'Already exists' }],
        },
      },
    }
    expect(extractErrorMessage(error)).toBe('username: Already exists')
  })

  it('falls back to Error message or default fallback', () => {
    expect(extractErrorMessage(new Error('Network error'))).toBe('Network error')
    expect(extractErrorMessage(null, 'Fallback error')).toBe('Fallback error')
  })
})

describe('API Client Method Structures', () => {
  it('defines all required authApi methods', () => {
    expect(typeof authApi.login).toBe('function')
    expect(typeof authApi.logout).toBe('function')
    expect(typeof authApi.getMe).toBe('function')
    expect(typeof authApi.changePassword).toBe('function')
  })

  it('defines all required usersApi methods', () => {
    expect(typeof usersApi.list).toBe('function')
    expect(typeof usersApi.get).toBe('function')
    expect(typeof usersApi.create).toBe('function')
    expect(typeof usersApi.update).toBe('function')
    expect(typeof usersApi.deactivate).toBe('function')
  })

  it('defines all required master data API methods', () => {
    expect(typeof circlesApi.list).toBe('function')
    expect(typeof circlesApi.create).toBe('function')
    expect(typeof circlesApi.update).toBe('function')
    expect(typeof businessAreasApi.list).toBe('function')
    expect(typeof businessAreasApi.create).toBe('function')
    expect(typeof businessAreasApi.update).toBe('function')
    expect(typeof customersApi.list).toBe('function')
    expect(typeof customersApi.get).toBe('function')
    expect(typeof customersApi.create).toBe('function')
    expect(typeof customersApi.update).toBe('function')
    expect(typeof customersApi.updateNetwork).toBe('function')
    expect(typeof customersApi.markReady).toBe('function')
    expect(typeof customersApi.deactivate).toBe('function')
  })

  it('defines all required ebApi methods', () => {
    expect(typeof ebApi.dashboard).toBe('function')
    expect(typeof ebApi.list).toBe('function')
    expect(typeof ebApi.get).toBe('function')
    expect(typeof ebApi.create).toBe('function')
    expect(typeof ebApi.update).toBe('function')
    expect(typeof ebApi.markReady).toBe('function')
    expect(typeof ebApi.deactivate).toBe('function')
  })

  it('defines all required nocApi methods', () => {
    expect(typeof nocApi.health).toBe('function')
    expect(typeof nocApi.listInstances).toBe('function')
    expect(typeof nocApi.onboard).toBe('function')
    expect(typeof nocApi.deboard).toBe('function')
    expect(typeof nocApi.listSessions).toBe('function')
    expect(typeof nocApi.flushSessions).toBe('function')
    expect(typeof nocApi.disconnectSession).toBe('function')
    expect(typeof nocApi.getTCStatus).toBe('function')
    expect(typeof nocApi.updateTCMaxBandwidth).toBe('function')
    expect(typeof nocApi.listProfiles).toBe('function')
    expect(typeof nocApi.provisionQoS).toBe('function')
    expect(typeof nocApi.removeQoS).toBe('function')
    expect(typeof nocApi.getQoSStats).toBe('function')
    expect(typeof nocApi.listConntrack).toBe('function')
    expect(typeof nocApi.flushConntrack).toBe('function')
    expect(typeof nocApi.getNftablesStatus).toBe('function')
    expect(typeof nocApi.listUpstreamUsers).toBe('function')
  })
})
