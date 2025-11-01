export type CarrierType =
  | 'UPS'
  | 'FedEx'
  | 'USPS'
  | 'DHL'
  | 'Amazon Logistics'
  | 'GS1 (SSCC)'
  | 'Generic'

export type TrackingConfidence = 'high' | 'medium'

export interface ParsedTrackingNumber {
  trackingNumber: string
  carrier: CarrierType
  confidence: TrackingConfidence
  raw: string
}

const UPS_PATTERN = /1Z(?:[\s-]*[0-9A-Z]){16}/gi
const AMAZON_PATTERN = /TBA(?:[\s-]*\d){12,}/gi
const GS1_PATTERN = /\(00\)\s*\d{18}/g

const MIN_TOKEN_LENGTH = 10

const SOURCE_TOKEN_PATTERN = /[A-Z0-9()\s-]{8,}/g

const sanitizeCandidate = (value: string) =>
  value
    .replace(/[\s-]/g, '')
    .replace(/[()]/g, '')

const isLikelyTrackingNumber = (value: string) => {
  if (!value) {
    return false
  }

  const normalized = value.toUpperCase()

  if (/^1Z[0-9A-Z]{16}$/.test(normalized)) {
    return true
  }

  if (/^TBA\d{12,}$/.test(normalized)) {
    return true
  }

  if (/^00\d{18}$/.test(normalized)) {
    return true
  }

  if (/^\d{10}$/.test(normalized)) {
    return true
  }

  if (/^\d{12}$/.test(normalized)) {
    return true
  }

  if (/^\d{13}$/.test(normalized)) {
    return true
  }

  if (/^\d{15}$/.test(normalized)) {
    return true
  }

  if (/^\d{20}$/.test(normalized)) {
    return true
  }

  if (/^\d{21}$/.test(normalized)) {
    return true
  }

  if (/^\d{22}$/.test(normalized)) {
    return true
  }

  return false
}

export const identifyCarrier = (trackingNumber: string): CarrierType => {
  const normalized = trackingNumber.toUpperCase()

  if (normalized.startsWith('1Z') && normalized.length === 18) {
    return 'UPS'
  }

  if (normalized.startsWith('TBA')) {
    return 'Amazon Logistics'
  }

  if (normalized.startsWith('00') && normalized.length === 20) {
    return 'GS1 (SSCC)'
  }

  if (/^\d{10}$/.test(normalized)) {
    return 'DHL'
  }

  if (/^\d{12}$/.test(normalized)) {
    return 'FedEx'
  }

  if (/^\d{15}$/.test(normalized)) {
    return 'FedEx'
  }

  if (/^\d{20}$/.test(normalized) && normalized.startsWith('96')) {
    return 'FedEx'
  }

  if (/^\d{20,22}$/.test(normalized)) {
    return 'USPS'
  }

  return 'Generic'
}

const deriveConfidence = (carrier: CarrierType): TrackingConfidence =>
  carrier === 'Generic' ? 'medium' : 'high'

const buildParsed = (value: string, raw: string): ParsedTrackingNumber => {
  const carrier = identifyCarrier(value)
  return {
    trackingNumber: value,
    carrier,
    confidence: deriveConfidence(carrier),
    raw
  }
}

export const extractTrackingNumbers = (input: string): ParsedTrackingNumber[] => {
  if (!input.trim()) {
    return []
  }

  const seen = new Set<string>()
  const results: ParsedTrackingNumber[] = []
  const workingInput = input.toUpperCase()

  const collect = (matches: IterableIterator<RegExpMatchArray>, normalizer: (value: string) => string) => {
    for (const match of matches) {
      const normalized = normalizer(match[0])
      if (!normalized || seen.has(normalized) || !isLikelyTrackingNumber(normalized)) {
        continue
      }
      seen.add(normalized)
      results.push(buildParsed(normalized, match[0]))
    }
  }

  collect(workingInput.matchAll(new RegExp(UPS_PATTERN)), value => sanitizeCandidate(value).toUpperCase())
  collect(workingInput.matchAll(new RegExp(AMAZON_PATTERN)), value => sanitizeCandidate(value).toUpperCase())
  collect(workingInput.matchAll(new RegExp(GS1_PATTERN)), value => sanitizeCandidate(value))

  const lines = workingInput.split(/\r?\n/)

  for (const line of lines) {
    const tokens = line.match(SOURCE_TOKEN_PATTERN) || []

    for (const token of tokens) {
      if (!token) continue
      const sanitized = sanitizeCandidate(token)
      if (sanitized.length < MIN_TOKEN_LENGTH || seen.has(sanitized)) {
        continue
      }

      if (!isLikelyTrackingNumber(sanitized)) {
        continue
      }

      seen.add(sanitized)
      results.push(buildParsed(sanitized, token))
    }
  }

  return results
}

export const summarizeCarrierMix = (packages: Array<{ carrier: CarrierType }>): string => {
  if (packages.length === 0) {
    return ''
  }

  const counts = packages.reduce<Record<string, number>>((acc, pkg) => {
    acc[pkg.carrier] = (acc[pkg.carrier] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([carrier, count]) => `${carrier} (${count})`)
    .join(', ')
}
