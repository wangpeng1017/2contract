/**
 * 文件名编码工具
 * 解决HTTP响应头中中文文件名的编码问题
 */

export interface EncodedFilename {
  /** 安全的ASCII文件名（用作fallback） */
  safeFilename: string;
  /** 完整的Content-Disposition头值 */
  contentDisposition: string;
  /** URL编码的原始文件名 */
  encodedOriginal: string;
}

/**
 * 编码文件名以用于HTTP响应头
 * 使用RFC 5987标准处理中文文件名
 * 
 * @param originalFilename 原始文件名（可能包含中文字符）
 * @param prefix 安全文件名的前缀（默认为'file'）
 * @returns 编码后的文件名信息
 */
export function encodeFilenameForHttp(
  originalFilename: string, 
  prefix: string = 'file'
): EncodedFilename {
  // 提取文件扩展名
  const fileExt = originalFilename.match(/\.[^/.]+$/)?.[0] || '';
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  
  // 生成安全的ASCII文件名（用作fallback）
  const timestamp = Date.now();
  const safeFilename = `${prefix}_${timestamp}${fileExt}`;
  
  // URL编码原始文件名
  const encodedOriginal = encodeURIComponent(originalFilename);
  
  // 构建符合RFC 5987标准的Content-Disposition头
  // 格式: attachment; filename="safe_name"; filename*=UTF-8''encoded_name
  const contentDisposition = `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedOriginal}`;
  
  return {
    safeFilename,
    contentDisposition,
    encodedOriginal
  };
}

/**
 * 为文档生成编码文件名
 * 
 * @param originalFilename 原始文件名
 * @returns 编码后的文件名信息
 */
export function encodeDocumentFilename(originalFilename: string): EncodedFilename {
  return encodeFilenameForHttp(originalFilename, 'generated');
}

/**
 * 为PDF导出编码文件名
 * 
 * @param originalFilename 原始文件名
 * @returns 编码后的文件名信息
 */
export function encodePdfFilename(originalFilename: string): EncodedFilename {
  // 将扩展名改为.pdf
  const nameWithoutExt = originalFilename.replace(/\.(docx?)$/i, '');
  const pdfFilename = `${nameWithoutExt}.pdf`;
  
  return encodeFilenameForHttp(pdfFilename, 'pdf_export');
}

/**
 * 为模板下载编码文件名
 * 
 * @param templateName 模板名称
 * @param templateId 模板ID
 * @returns 编码后的文件名信息
 */
export function encodeTemplateFilename(templateName: string, templateId: string): EncodedFilename {
  const templateFilename = `${templateName}.docx`;
  return encodeFilenameForHttp(templateFilename, `template_${templateId}`);
}

/**
 * 检查字符串是否包含非ASCII字符
 * 
 * @param str 要检查的字符串
 * @returns 是否包含非ASCII字符
 */
export function hasNonAsciiChars(str: string): boolean {
  return /[^\x00-\x7F]/.test(str);
}

/**
 * 生成安全的文件名（仅包含ASCII字符）
 * 
 * @param originalFilename 原始文件名
 * @param prefix 前缀
 * @returns 安全的文件名
 */
export function generateSafeFilename(originalFilename: string, prefix: string = 'file'): string {
  const fileExt = originalFilename.match(/\.[^/.]+$/)?.[0] || '';
  const timestamp = Date.now();
  return `${prefix}_${timestamp}${fileExt}`;
}

/**
 * 验证Content-Disposition头是否安全
 * 
 * @param contentDisposition Content-Disposition头值
 * @returns 是否安全
 */
export function isContentDispositionSafe(contentDisposition: string): boolean {
  try {
    // 检查是否包含非Latin-1字符
    for (let i = 0; i < contentDisposition.length; i++) {
      const charCode = contentDisposition.charCodeAt(i);
      if (charCode > 255) {
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 创建带有正确编码的HTTP响应头
 * 
 * @param originalFilename 原始文件名
 * @param contentType MIME类型
 * @param additionalHeaders 额外的响应头
 * @returns HTTP响应头对象
 */
export function createFileResponseHeaders(
  originalFilename: string,
  contentType: string,
  additionalHeaders: Record<string, string> = {}
): Record<string, string> {
  const encoded = encodeFilenameForHttp(originalFilename);
  
  return {
    'Content-Type': contentType,
    'Content-Disposition': encoded.contentDisposition,
    'X-Original-Filename': encoded.encodedOriginal,
    ...additionalHeaders
  };
}
