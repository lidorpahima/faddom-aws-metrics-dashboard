/**
 * Vitest setup: Set required env vars so config module can load during tests.
 * Tests must not hit real AWS - all AWS calls are mocked.
 */
process.env.NODE_ENV = 'test'
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? 'test-secret-key'
process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1'
