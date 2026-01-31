import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('config', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    // Restore env after each test to avoid leaking state
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  describe('when required env vars are set', () => {
    beforeEach(() => {
      process.env.AWS_ACCESS_KEY_ID = 'test-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'
      process.env.AWS_REGION = 'us-east-1'
      process.env.PORT = '4000'
      vi.resetModules()
    })

    it('should expose config with correct aws credentials and region', async () => {
      const { config } = await import('./config.js')

      expect(config.aws.accessKeyId).toBe('test-key')
      expect(config.aws.secretAccessKey).toBe('test-secret')
      expect(config.aws.region).toBe('us-east-1')
    })

    it('should use PORT from env when set', async () => {
      const { config } = await import('./config.js')
      expect(config.port).toBe(4000)
    })

    it('should default to port 3000 when PORT is not set', async () => {
      delete process.env.PORT
      vi.resetModules()
      const { config } = await import('./config.js')
      expect(config.port).toBe(3000)
    })

    it('should trim whitespace from env values', async () => {
      process.env.AWS_ACCESS_KEY_ID = '  key-with-spaces  '
      process.env.AWS_SECRET_ACCESS_KEY = '  secret  '
      process.env.AWS_REGION = '  eu-west-1  '
      vi.resetModules()
      const { config } = await import('./config.js')

      expect(config.aws.accessKeyId).toBe('key-with-spaces')
      expect(config.aws.secretAccessKey).toBe('secret')
      expect(config.aws.region).toBe('eu-west-1')
    })
  })

  describe('when required env vars are missing', () => {
    it('should throw when AWS_ACCESS_KEY_ID is missing', async () => {
      process.env.AWS_ACCESS_KEY_ID = ''
      process.env.AWS_SECRET_ACCESS_KEY = 'secret'
      process.env.AWS_REGION = 'us-east-1'
      vi.resetModules()

      await expect(import('./config.js')).rejects.toThrow(/Missing required env: AWS_ACCESS_KEY_ID/)
    })

    it('should throw when AWS_ACCESS_KEY_ID is whitespace only', async () => {
      process.env.AWS_ACCESS_KEY_ID = '   '
      process.env.AWS_SECRET_ACCESS_KEY = 'secret'
      process.env.AWS_REGION = 'us-east-1'
      vi.resetModules()

      await expect(import('./config.js')).rejects.toThrow(/Missing required env: AWS_ACCESS_KEY_ID/)
    })

    it('should throw when AWS_SECRET_ACCESS_KEY is missing', async () => {
      process.env.AWS_ACCESS_KEY_ID = 'key'
      process.env.AWS_SECRET_ACCESS_KEY = ''
      process.env.AWS_REGION = 'us-east-1'
      vi.resetModules()

      await expect(import('./config.js')).rejects.toThrow(/Missing required env: AWS_SECRET_ACCESS_KEY/)
    })

    it('should throw when AWS_REGION is missing', async () => {
      process.env.AWS_ACCESS_KEY_ID = 'key'
      process.env.AWS_SECRET_ACCESS_KEY = 'secret'
      process.env.AWS_REGION = ''
      vi.resetModules()

      await expect(import('./config.js')).rejects.toThrow(/Missing required env: AWS_REGION/)
    })
  })
})
