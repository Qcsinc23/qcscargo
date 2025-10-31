/**
 * Draft storage utility for auto-saving form data
 * Uses localStorage with expiration
 */

const DRAFT_PREFIX = 'shipment_draft_'
const DRAFT_EXPIRY_HOURS = 24
const DRAFT_EXPIRY_MS = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000

interface DraftData {
  data: unknown
  timestamp: number
  version: number
}

export const draftStorage = {
  /**
   * Save draft data
   */
  save: (key: string, data: unknown): void => {
    try {
      const draft: DraftData = {
        data,
        timestamp: Date.now(),
        version: 1
      }
      localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(draft))
    } catch (error) {
      console.warn('Failed to save draft:', error)
    }
  },

  /**
   * Load draft data
   */
  load: <T>(key: string): T | null => {
    try {
      const stored = localStorage.getItem(`${DRAFT_PREFIX}${key}`)
      if (!stored) return null

      const draft: DraftData = JSON.parse(stored)
      
      // Check expiry
      const age = Date.now() - draft.timestamp
      if (age > DRAFT_EXPIRY_MS) {
        localStorage.removeItem(`${DRAFT_PREFIX}${key}`)
        return null
      }

      return draft.data as T
    } catch (error) {
      console.warn('Failed to load draft:', error)
      return null
    }
  },

  /**
   * Clear draft data
   */
  clear: (key: string): void => {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${key}`)
    } catch (error) {
      console.warn('Failed to clear draft:', error)
    }
  },

  /**
   * Check if draft exists
   */
  exists: (key: string): boolean => {
    try {
      const stored = localStorage.getItem(`${DRAFT_PREFIX}${key}`)
      if (!stored) return false

      const draft: DraftData = JSON.parse(stored)
      const age = Date.now() - draft.timestamp
      return age <= DRAFT_EXPIRY_MS
    } catch {
      return false
    }
  }
}

