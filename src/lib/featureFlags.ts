export const featureFlags = {
  virtualMailboxUi: import.meta.env.VITE_VIRTUAL_MAILBOX_UI === 'true'
} as const

export type FeatureFlag = keyof typeof featureFlags

export function isFeatureEnabled(flag: FeatureFlag) {
  return featureFlags[flag]
}
