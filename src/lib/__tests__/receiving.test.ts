import { describe, expect, it } from 'vitest'
import { extractTrackingNumbers, identifyCarrier, summarizeCarrierMix } from '../receiving'

describe('identifyCarrier', () => {
  it('detects UPS tracking numbers', () => {
    expect(identifyCarrier('1Z999AA10123456784')).toBe('UPS')
  })

  it('detects Amazon Logistics tracking numbers', () => {
    expect(identifyCarrier('TBA123456789012')).toBe('Amazon Logistics')
  })

  it('detects GS1 SSCC tracking numbers', () => {
    expect(identifyCarrier('00001234567890123456')).toBe('GS1 (SSCC)')
  })
})

describe('extractTrackingNumbers', () => {
  it('parses UPS labels with spacing', () => {
    const parsed = extractTrackingNumbers('1Z 999 9A1 01 2345 6784')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].trackingNumber).toBe('1Z9999A10123456784')
    expect(parsed[0].carrier).toBe('UPS')
  })

  it('extracts multiple carriers from a manifest block', () => {
    const sample = `Shipment Manifest\nTracking: 1Z999AA10123456784\nAlt Ref: TBA123456789012\nSecondary: 96110209876543210987\n`
    const parsed = extractTrackingNumbers(sample)
    expect(parsed.map((item) => item.trackingNumber)).toEqual([
      '1Z999AA10123456784',
      'TBA123456789012',
      '96110209876543210987'
    ])
  })

  it('handles GS1 SSCC application identifiers', () => {
    const parsed = extractTrackingNumbers('SSCC (00) 001234567890123456')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].trackingNumber).toBe('00001234567890123456')
    expect(parsed[0].carrier).toBe('GS1 (SSCC)')
  })
})

describe('summarizeCarrierMix', () => {
  it('summarizes carrier counts', () => {
    const summary = summarizeCarrierMix([
      { carrier: 'UPS' },
      { carrier: 'UPS' },
      { carrier: 'FedEx' }
    ])
    expect(summary).toBe('FedEx (1), UPS (2)')
  })

  it('returns empty string when there are no packages', () => {
    expect(summarizeCarrierMix([])).toBe('')
  })
})
