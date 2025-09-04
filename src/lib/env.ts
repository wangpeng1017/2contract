import { z } from 'zod';

// 仅在服务端使用的敏感环境变量校验
const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FEISHU_APP_ID: z.string().min(1, '缺少 FEISHU_APP_ID').optional(),
  FEISHU_APP_SECRET: z.string().min(1, '缺少 FEISHU_APP_SECRET').optional(),
  POSTGRES_PRISMA_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  ZHIPU_API_KEY: z.string().optional(),
  GEMINI_OCR_MODEL: z.string().optional(),
  ZHIPU_OCR_MODEL: z.string().optional(),
});

let parsedServerEnv: z.infer<typeof ServerEnvSchema> | null = null;

export function getServerEnv() {
  if (typeof window !== 'undefined') {
    // 避免在客户端侧意外访问敏感变量
    throw new Error('getServerEnv() 只能在服务端调用');
  }
  if (!parsedServerEnv) {
    const result = ServerEnvSchema.safeParse(process.env);
    if (!result.success) {
      // 不在此处抛错，保持与现有行为兼容（feishu.ts 中已有构建期占位符/运行时校验）
      // 但记录下验证信息，便于调试
      console.warn('[env] 服务器环境变量校验警告:', result.error.flatten());
      // 仍然提供一个尽可能完整的对象，避免破坏现有流程
      parsedServerEnv = {
        NODE_ENV: process.env.NODE_ENV as any,
        FEISHU_APP_ID: process.env.FEISHU_APP_ID,
        FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
        POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
        POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        ZHIPU_API_KEY: process.env.ZHIPU_API_KEY,
        GEMINI_OCR_MODEL: process.env.GEMINI_OCR_MODEL,
        ZHIPU_OCR_MODEL: process.env.ZHIPU_OCR_MODEL,
      } as any;
    } else {
      parsedServerEnv = result.data;
    }
  }
  return parsedServerEnv!;
}

export function hasFeishuCredentials() {
  if (typeof window !== 'undefined') return false;
  const env = getServerEnv();
  return Boolean(env.FEISHU_APP_ID && env.FEISHU_APP_SECRET);
}

