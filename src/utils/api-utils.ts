import { toast } from 'react-hot-toast';

interface ApiCallOptions {
  timeout?: number;
  showLoadingToast?: boolean;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  onTimeout?: () => void;
}

/**
 * 包装API调用，提供超时处理、用户反馈等功能
 */
export async function withApiCall<T>(
  apiCall: () => Promise<T>,
  options: ApiCallOptions = {}
): Promise<T> {
  const {
    timeout = 25000,
    showLoadingToast = true,
    loadingMessage = '处理中...',
    successMessage,
    errorMessage,
    onTimeout
  } = options;

  let toastId: string | undefined;

  try {
    if (showLoadingToast) {
      toastId = toast.loading(loadingMessage);
    }

    // 创建超时Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('处理超时，请尝试处理较小的文档或稍后重试'));
      }, timeout);
    });

    // 使用Promise.race来实现超时控制
    const result = await Promise.race([
      apiCall(),
      timeoutPromise
    ]);

    if (toastId) {
      toast.dismiss(toastId);
    }

    if (successMessage) {
      toast.success(successMessage);
    }

    return result;

  } catch (error) {
    if (toastId) {
      toast.dismiss(toastId);
    }

    const isTimeoutError = error instanceof Error && 
      (error.message.includes('超时') || error.message.includes('timeout'));
    
    if (isTimeoutError && onTimeout) {
      onTimeout();
    }

    const finalErrorMessage = errorMessage || 
      (isTimeoutError 
        ? '处理超时，请尝试处理较小的文档或稍后重试'
        : '操作失败，请重试'
      );

    toast.error(finalErrorMessage);
    throw error;
  }
}

/**
 * 为大文档处理提供特殊的API调用包装
 */
export async function withLargeDocumentCall<T>(
  apiCall: () => Promise<T>,
  options: Partial<ApiCallOptions> = {}
): Promise<T> {
  return withApiCall(apiCall, {
    timeout: 30000,
    loadingMessage: '处理大文档中，请稍等...',
    errorMessage: '文档处理失败，可能文档过大或格式复杂，请尝试较小的文档',
    onTimeout: () => {
      toast.error('文档处理超时，建议：\n1. 减小文档大小\n2. 简化文档格式\n3. 分段处理');
    },
    ...options
  });
}

/**
 * 为AI处理提供特殊的API调用包装
 */
export async function withAICall<T>(
  apiCall: () => Promise<T>,
  options: Partial<ApiCallOptions> = {}
): Promise<T> {
  return withApiCall(apiCall, {
    timeout: 30000,
    loadingMessage: 'AI分析中，请稍等...',
    errorMessage: 'AI处理失败，请稍后重试',
    onTimeout: () => {
      toast.error('AI处理超时，建议：\n1. 缩短输入文本\n2. 稍后重试\n3. 检查网络连接');
    },
    ...options
  });
}

/**
 * 检查文档大小是否合适处理
 */
export function validateDocumentSize(file: File, maxSizeMB: number = 5): boolean {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    toast.error(`文档过大 (${sizeMB.toFixed(1)}MB)，请选择小于 ${maxSizeMB}MB 的文档`);
    return false;
  }
  return true;
}

/**
 * 检查文本长度是否合适AI处理
 */
export function validateTextLength(text: string, maxLength: number = 5000): string {
  if (text.length > maxLength) {
    toast.warning(`文本过长 (${text.length}字符)，将截取前 ${maxLength} 字符进行处理`);
    return text.substring(0, maxLength) + '...';
  }
  return text;
}

/**
 * 格式化错误消息，提供用户友好的提示
 */
export function formatApiError(error: any): string {
  if (typeof error === 'string') return error;
  
  if (error?.response?.status === 504) {
    return '服务处理超时，请尝试：\n1. 处理较小的文档\n2. 稍后重试\n3. 检查网络连接';
  }
  
  if (error?.message?.includes('timeout') || error?.message?.includes('超时')) {
    return '请求超时，建议处理较小的文档或稍后重试';
  }
  
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return '操作失败，请重试';
}