import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_SECRET: z.string().min(32),
  DEVICE_UID_PEPPER: z.string().min(32),
  ADMIN_JWT_SECRET: z.string().min(32),
  LICENSE_ED25519_PRIVATE_JWK: z.string().optional(),
  LICENSE_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  CLIENT_POLL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(300),
  APNS_KEY_ID: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_BUNDLE_ID: z.string().optional(),
  APNS_PRIVATE_KEY: z.string().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().url().default('http://localhost:8443'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3001'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function getConfig(): AppConfig {
  const config = configSchema.parse(process.env);
  if (config.NODE_ENV === 'production' && !config.PUBLIC_BASE_URL.startsWith('https://')) {
    throw new Error('PUBLIC_BASE_URL must use HTTPS in production for iOS Profile Service');
  }
  return config;
}
