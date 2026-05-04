import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.startsWith('http') ? v : 'http://localhost:8000')),
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : 'NexusCare')),
  NEXT_PUBLIC_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_ENABLE_MSW: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

function parseEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
    NEXT_PUBLIC_ENABLE_MSW: process.env.NEXT_PUBLIC_ENABLE_MSW,
  });

  if (!parsed.success) {
    return {
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:8000',
      NEXT_PUBLIC_APP_NAME: 'NexusCare',
      NEXT_PUBLIC_ENV: 'development' as const,
      NEXT_PUBLIC_ENABLE_MSW: false,
    };
  }
  return parsed.data;
}

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
