import { z } from 'zod';

const ConfigSchema = z.object({
  swaggerUrl: z.string().url().optional(),
  auth: z.object({
    type: z.enum(['none', 'basic', 'bearer', 'apiKey']),
    credentials: z.object({
      username: z.string().optional(),
      password: z.string().optional(),
      token: z.string().optional(),
      apiKey: z.string().optional(),
      apiKeyHeader: z.string().default('X-API-Key'),
    }).optional(),
  }).default({ type: 'none' }),
  cacheTTL: z.number().default(300000), // 5 minutes in milliseconds
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const config: Config = {
    swaggerUrl: process.env.SWAGGER_URL,
    auth: {
      type: (process.env.AUTH_TYPE as any),
      credentials: {
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD,
        token: process.env.AUTH_TOKEN,
        apiKey: process.env.API_KEY,
        apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
      },
    },
    cacheTTL: parseInt(process.env.CACHE_TTL || '300000', 10),
  };

  return ConfigSchema.parse(config);
}