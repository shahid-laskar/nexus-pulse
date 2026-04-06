import type { AxiosError } from 'axios'
import type { APIError } from '@/types'

/**
 * Extracts a user-friendly error message from an Axios error.
 */
export function useApiError() {
  const getError = (error: unknown): string => {
    if (!error) return 'An unexpected error occurred'

    const axiosError = error as AxiosError<APIError>
    const data = axiosError.response?.data

    if (data?.errors?.length) {
      return data.errors.map((e) => `${e.field}: ${e.message}`).join(', ')
    }
    if (typeof data?.detail === 'string') return data.detail
    if (axiosError.message) return axiosError.message
    return 'An unexpected error occurred'
  }

  return { getError }
}
