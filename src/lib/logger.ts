type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProd = process.env.NODE_ENV === 'production';

function mask(value: string | undefined | null, opts: { showLen?: number } = {}) {
  if (!value) return '';
  const show = opts.showLen ?? 2;
  if (value.length <= show) return '*'.repeat(value.length);
  return value.slice(0, show) + '***' + '*'.repeat(Math.max(0, value.length - show - 3));
}

function log(level: LogLevel, ...args: any[]) {
  // 生产环境默认屏蔽 debug
  if (isProd && level === 'debug') return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](prefix, ...args);
}

export const logger = {
  debug: (...args: any[]) => log('debug', ...args),
  info: (...args: any[]) => log('info', ...args),
  warn: (...args: any[]) => log('warn', ...args),
  error: (...args: any[]) => log('error', ...args),
  mask,
};

// 一些常见敏感字段的专用记录工具
export const redact = {
  feishuCredentials(appId?: string | null, appSecret?: string | null) {
    return { appId: mask(appId || ''), appSecret: mask(appSecret || '') };
  },
};

