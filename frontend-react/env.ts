import { z } from 'zod';

/**
 * Environment schema validation using Zod.
 * Ensures all required environment variables are present and valid at build time.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_ENABLE_MSW: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

/**
 * Parse and validate environment variables
 * @throws {Error} If validation fails
 */
const parseEnv = () => {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
    NEXT_PUBLIC_ENABLE_MSW: process.env.NEXT_PUBLIC_ENABLE_MSW,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};

/**
 * Validated and typed environment variables
 */
export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
