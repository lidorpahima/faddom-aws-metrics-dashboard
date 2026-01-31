import 'dotenv/config'

/**
 * Server and AWS config from environment.
 * Fails at startup if required AWS vars are missing (so you get a clear error).
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value?.trim()) {
    throw new Error(
      `Missing required env: ${name}. Copy .env.example to .env and set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.`
    )
  }
  return value.trim()
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  aws: {
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
    region: requireEnv('AWS_REGION'),
  },
} as const
