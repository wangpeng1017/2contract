import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 验证飞书文档链接
 */
export function validateFeishuDocUrl(url: string): boolean {
  const patterns = [
    /^https:\/\/[a-zA-Z0-9-]+\.feishu\.cn\/docx\/[a-zA-Z0-9]+/,
    /^https:\/\/[a-zA-Z0-9-]+\.larksuite\.com\/docx\/[a-zA-Z0-9]+/,
  ];
  return patterns.some(pattern => pattern.test(url));
}

/**
 * 从飞书文档链接提取文档ID
 */
export function extractDocumentId(url: string): string | null {
  const patterns = [
    /\/docx\/([a-zA-Z0-9]+)/,
    /\/sheets\/([a-zA-Z0-9]+)/,
    /\/base\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * 解析飞书文档URL
 */
export function parseFeishuUrl(url: string): {
  isValid: boolean;
  type: 'document' | 'sheet' | 'bitable' | 'unknown';
  documentId: string | null;
  domain: string | null;
  error?: string;
} {
  try {
    if (!url || typeof url !== 'string') {
      return { isValid: false, type: 'unknown', documentId: null, domain: null, error: 'URL不能为空' };
    }

    const cleanedUrl = url.trim();

    // 检查是否是有效的URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanedUrl);
    } catch (error) {
      return { isValid: false, type: 'unknown', documentId: null, domain: null, error: '无效的URL格式' };
    }

    const hostname = parsedUrl.hostname;
    if (!hostname.includes('feishu.cn') && !hostname.includes('larksuite.com')) {
      return { isValid: false, type: 'unknown', documentId: null, domain: null, error: '不是有效的飞书域名' };
    }

    // 检查文档类型
    if (cleanedUrl.includes('/docx/')) {
      const documentId = extractDocumentId(cleanedUrl);
      return {
        isValid: !!documentId,
        type: 'document',
        documentId,
        domain: hostname,
        error: documentId ? undefined : '无法提取文档ID',
      };
    } else if (cleanedUrl.includes('/sheets/')) {
      const documentId = extractDocumentId(cleanedUrl);
      return {
        isValid: !!documentId,
        type: 'sheet',
        documentId,
        domain: hostname,
        error: documentId ? undefined : '无法提取表格ID',
      };
    } else if (cleanedUrl.includes('/base/')) {
      const documentId = extractDocumentId(cleanedUrl);
      return {
        isValid: !!documentId,
        type: 'bitable',
        documentId,
        domain: hostname,
        error: documentId ? undefined : '无法提取多维表格ID',
      };
    }

    return { isValid: false, type: 'unknown', documentId: null, domain: hostname, error: '不支持的文档类型' };
  } catch (error) {
    return { isValid: false, type: 'unknown', documentId: null, domain: null, error: '解析URL时发生错误' };
  }
}

/**
 * 文件大小格式化
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 检查是否为有效的图片文件
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * 错误处理工具
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * API响应格式化
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(code: string, message: string): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
