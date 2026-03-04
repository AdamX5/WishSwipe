// Unit tests for swipe snapshot shape and direction validation
// Tests pure helper functions — no Convex SDK imports

type ProductSnapshot = {
  title: string
  imageUrl: string
  priceAmount: number
  priceCurrency: string
  affiliateUrl: string
  sourceStore: string
  [key: string]: unknown
}

const VALID_FIELDS = new Set([
  'title',
  'imageUrl',
  'priceAmount',
  'priceCurrency',
  'affiliateUrl',
  'sourceStore',
])

const FORBIDDEN_URL_FIELDS = new Set(['rawUrl', 'productUrl', 'storeUrl'])

function validateSnapshotShape(snapshot: unknown): boolean {
  if (typeof snapshot !== 'object' || snapshot === null) return false

  const obj = snapshot as Record<string, unknown>

  // Must have all required fields
  for (const field of VALID_FIELDS) {
    if (!(field in obj)) return false
  }

  // Must not have forbidden URL fields
  for (const forbidden of FORBIDDEN_URL_FIELDS) {
    if (forbidden in obj) return false
  }

  // Type checks for required fields
  if (typeof obj.title !== 'string') return false
  if (typeof obj.imageUrl !== 'string') return false
  if (typeof obj.priceAmount !== 'number') return false
  if (typeof obj.priceCurrency !== 'string') return false
  if (typeof obj.affiliateUrl !== 'string') return false
  if (typeof obj.sourceStore !== 'string') return false

  return true
}

function validateDirection(direction: unknown): boolean {
  return direction === 'right' || direction === 'left'
}

describe('validateSnapshotShape', () => {
  const validSnapshot: ProductSnapshot = {
    title: 'Test Product',
    imageUrl: 'https://example.com/image.jpg',
    priceAmount: 999,
    priceCurrency: 'USD',
    affiliateUrl: 'https://example.com/affiliate?ref=wishswipe',
    sourceStore: 'etsy',
  }

  it('accepts a snapshot with all required fields', () => {
    expect(validateSnapshotShape(validSnapshot)).toBe(true)
  })

  it('rejects a snapshot missing affiliateUrl', () => {
    const { affiliateUrl: _removed, ...missingAffiliateUrl } = validSnapshot
    expect(validateSnapshotShape(missingAffiliateUrl)).toBe(false)
  })

  it('rejects a snapshot missing title', () => {
    const { title: _removed, ...missingTitle } = validSnapshot
    expect(validateSnapshotShape(missingTitle)).toBe(false)
  })

  it('rejects a snapshot missing imageUrl', () => {
    const { imageUrl: _removed, ...missingImageUrl } = validSnapshot
    expect(validateSnapshotShape(missingImageUrl)).toBe(false)
  })

  it('rejects a snapshot with rawUrl instead of affiliateUrl (URL hygiene)', () => {
    const { affiliateUrl: _removed, ...rest } = validSnapshot
    const badSnapshot = { ...rest, rawUrl: 'https://example.com/raw' }
    expect(validateSnapshotShape(badSnapshot)).toBe(false)
  })

  it('rejects a snapshot with productUrl instead of affiliateUrl (URL hygiene)', () => {
    const { affiliateUrl: _removed, ...rest } = validSnapshot
    const badSnapshot = { ...rest, productUrl: 'https://example.com/product' }
    expect(validateSnapshotShape(badSnapshot)).toBe(false)
  })

  it('rejects a snapshot with storeUrl field present (URL hygiene)', () => {
    const badSnapshot = { ...validSnapshot, storeUrl: 'https://example.com/store' }
    expect(validateSnapshotShape(badSnapshot)).toBe(false)
  })

  it('rejects null', () => {
    expect(validateSnapshotShape(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(validateSnapshotShape('string')).toBe(false)
  })
})

describe('validateDirection', () => {
  it('accepts "right" as valid direction', () => {
    expect(validateDirection('right')).toBe(true)
  })

  it('accepts "left" as valid direction', () => {
    expect(validateDirection('left')).toBe(true)
  })

  it('rejects "up" as invalid direction', () => {
    expect(validateDirection('up')).toBe(false)
  })

  it('rejects "down" as invalid direction', () => {
    expect(validateDirection('down')).toBe(false)
  })

  it('rejects empty string as invalid direction', () => {
    expect(validateDirection('')).toBe(false)
  })

  it('rejects null as invalid direction', () => {
    expect(validateDirection(null)).toBe(false)
  })

  it('rejects "Right" (case-sensitive) as invalid direction', () => {
    expect(validateDirection('Right')).toBe(false)
  })
})
