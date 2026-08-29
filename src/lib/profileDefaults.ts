import type { BandwidthProfileConfig } from '@/types'

export const DEFAULT_BANDWIDTH_PROFILES: BandwidthProfileConfig[] = [
  {
    profile_name: 'bronze',
    display_name: 'Bronze - 2M/4M',
    rate_bandwidth_up: 2048,
    ceil_bandwidth_up: 4096,
    rate_bandwidth_down: 4096,
    ceil_bandwidth_down: 8192,
    priority: 4,
    is_active: true,
    is_lan_only: false,
  },
  {
    profile_name: 'silver',
    display_name: 'Silver - 5M/10M',
    rate_bandwidth_up: 5120,
    ceil_bandwidth_up: 10240,
    rate_bandwidth_down: 10240,
    ceil_bandwidth_down: 20480,
    priority: 3,
    is_active: false,
    is_lan_only: false,
  },
  {
    profile_name: 'gold',
    display_name: 'Gold - 10M/20M',
    rate_bandwidth_up: 10240,
    ceil_bandwidth_up: 20480,
    rate_bandwidth_down: 20480,
    ceil_bandwidth_down: 40960,
    priority: 2,
    is_active: false,
    is_lan_only: false,
  },
  {
    profile_name: 'platinum',
    display_name: 'Platinum - 40M/100M',
    rate_bandwidth_up: 40960,
    ceil_bandwidth_up: 81920,
    rate_bandwidth_down: 102400,
    ceil_bandwidth_down: 204800,
    priority: 1,
    is_active: false,
    is_lan_only: false,
  },
]

export type ProfilePresetType = 'bronze_only' | 'bronze_gold' | 'bronze_silver_gold' | 'all_four'

export function applyProfilePreset(
  currentProfiles: BandwidthProfileConfig[],
  preset: ProfilePresetType
): BandwidthProfileConfig[] {
  const activeTiers: Record<ProfilePresetType, Array<'bronze' | 'silver' | 'gold' | 'platinum'>> = {
    bronze_only: ['bronze'],
    bronze_gold: ['bronze', 'gold'],
    bronze_silver_gold: ['bronze', 'silver', 'gold'],
    all_four: ['bronze', 'silver', 'gold', 'platinum'],
  }

  const enabled = activeTiers[preset]
  return currentProfiles.map((p) => ({
    ...p,
    is_active: enabled.includes(p.profile_name),
  }))
}

export function kbpsToMbps(kbps: number): number {
  return Math.round((kbps / 1024) * 10) / 10
}

export function mbpsToKbps(mbps: number): number {
  return Math.round(mbps * 1024)
}
