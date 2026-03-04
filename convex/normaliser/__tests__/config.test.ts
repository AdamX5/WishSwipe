// Tests for convex/normaliser/config.ts
// Covers NORM-02: stores with missing or false STORE_*_ENABLED are silently skipped

const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = originalEnv
})

describe('loadStoreConfigs', () => {
  it('returns one config when STORE_BESTBUY_ENABLED=true', async () => {
    process.env.STORE_BESTBUY_ENABLED = 'true'
    process.env.STORE_BESTBUY_API_BASE = 'https://api.bestbuy.com/v1'
    process.env.STORE_BESTBUY_AFFILIATE_ID = 'test-affiliate'
    process.env.STORE_BESTBUY_ADAPTER = 'bestbuy'

    const { loadStoreConfigs } = await import('../config')
    const configs = loadStoreConfigs()

    expect(configs).toHaveLength(1)
    expect(configs[0].id).toBe('bestbuy')
    expect(configs[0].affiliateId).toBe('test-affiliate')
  })

  it('returns empty array when STORE_BESTBUY_ENABLED=false', async () => {
    process.env.STORE_BESTBUY_ENABLED = 'false'

    const { loadStoreConfigs } = await import('../config')
    const configs = loadStoreConfigs()

    expect(configs).toHaveLength(0)
  })

  it('returns empty array when STORE_BESTBUY_ENABLED is not set', async () => {
    delete process.env.STORE_BESTBUY_ENABLED

    const { loadStoreConfigs } = await import('../config')
    const configs = loadStoreConfigs()

    expect(configs).toHaveLength(0)
  })

  it('returns multiple configs when multiple stores are enabled', async () => {
    process.env.STORE_BESTBUY_ENABLED = 'true'
    process.env.STORE_BESTBUY_API_BASE = 'https://api.bestbuy.com/v1'
    process.env.STORE_ETSY_ENABLED = 'true'
    process.env.STORE_ETSY_API_BASE = 'https://openapi.etsy.com/v3'

    const { loadStoreConfigs } = await import('../config')
    const configs = loadStoreConfigs()

    expect(configs).toHaveLength(2)
    expect(configs.map(c => c.id)).toContain('bestbuy')
    expect(configs.map(c => c.id)).toContain('etsy')
  })
})
