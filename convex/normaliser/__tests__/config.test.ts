// Tests for convex/normaliser/config.ts
// Covers NORM-02: stores with missing or false STORE_*_ENABLED are silently skipped

// Save original env
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = originalEnv
})

describe('loadStoreConfigs', () => {
  it('returns one config when STORE_ETSY_ENABLED=true', async () => {
    process.env.STORE_ETSY_ENABLED = 'true'
    process.env.STORE_ETSY_API_BASE = 'https://openapi.etsy.com/v3'
    process.env.STORE_ETSY_AFFILIATE_ID = 'test-affiliate'
    process.env.STORE_ETSY_ADAPTER = 'etsy'

    const { loadStoreConfigs } = await import('../config')
    const configs = loadStoreConfigs()

    expect(configs).toHaveLength(1)
    expect(configs[0].id).toBe('etsy')
    expect(configs[0].affiliateId).toBe('test-affiliate')
  })

  it('returns empty array when STORE_ETSY_ENABLED=false', async () => {
    process.env.STORE_ETSY_ENABLED = 'false'

    const { loadStoreConfigs } = await import('../config')
    const configs = loadStoreConfigs()

    expect(configs).toHaveLength(0)
  })

  it('returns empty array when STORE_ETSY_ENABLED is not set', async () => {
    delete process.env.STORE_ETSY_ENABLED

    const { loadStoreConfigs } = await import('../config')
    const configs = loadStoreConfigs()

    expect(configs).toHaveLength(0)
  })
})
