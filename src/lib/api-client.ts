/**
 * API 客户端 - 统一管理后端 API 调用
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

// API 基础配置
// 使用相对路径调用 Next.js API Routes（同源）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_TIMEOUT = 30000; // 30 秒

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // TODO: 添加 JWT token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 400:
          console.error('请求参数错误:', data.detail);
          break;
        case 401:
          console.error('未授权，请登录');
          // TODO: 跳转登录页
          break;
        case 404:
          console.error('资源不存在:', data.detail);
          break;
        case 500:
          console.error('服务器错误:', data.detail);
          break;
        default:
          console.error('请求失败:', data.detail || error.message);
      }
    } else if (error.request) {
      console.error('网络错误，请检查网络连接');
    } else {
      console.error('请求配置错误:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ==================== 类型定义 ====================

export interface Variable {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'phone' | 'email' | 'tel' | 'table';
  required: boolean;
  default_value?: any;
  description?: string;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  tableConfig?: any; // 表格配置
  helpText?: string;
}

export interface ParseResponse {
  text: string;
  structure: {
    paragraphs_count: number;
    tables_count: number;
    sections?: string[];
  };
  placeholders: string[];
  valid: boolean;
  message?: string;
}

export interface ExtractResponse {
  variables: Variable[];
  count: number;
  from_cache: boolean;
  extraction_time_ms?: number;
}

export interface GenerateResponse {
  document_id: string;
  download_url: string;
  filename: string;
  file_size: number;
  generation_time_ms: number;
}

// ==================== 文档处理 API ====================

export const documentApi = {
  /**
   * 解析 Word 文档
   */
  parse: async (file: File): Promise<ParseResponse> => {
    const formData = new FormData();
    formData.append('template', file);
    
    const response = await apiClient.post<ParseResponse>(
      '/api/local-docs/parse-template',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    // 转换响应格式以匹配接口
    const data = response.data as any;
    if (data.success) {
      // 后端返回的是对象数组，需要提取 name 字段为字符串数组
      const placeholders = (data.data.placeholders || []).map((p: any) => p.name || p);
      
      // 保存完整的变量信息供后续使用
      (window as any).__placeholderDetails = data.data.placeholders || [];
      
      return {
        text: '', // Next.js API 不返回全文
        structure: {
          paragraphs_count: 0,
          tables_count: 0,
        },
        placeholders: placeholders,
        valid: true,
      };
    }
    throw new Error(data.error?.message || '解析失败');
  },

  /**
   * 验证文档
   */
  validate: async (file: File): Promise<{ valid: boolean; message?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(
      '/api/v1/documents/validate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
};

// ==================== 变量提取 API ====================

export const variableApi = {
  /**
   * 提取变量（暂时返回模拟数据，等待 AI 服务集成）
   */
  extract: async (text: string, useCache = true): Promise<ExtractResponse> => {
    // TODO: 集成真实的 AI 变量提取服务
    // 暂时返回空数组，让用户手动填写
    return {
      variables: [],
      count: 0,
      from_cache: false,
    };
  },

  /**
   * 获取缓存统计
   */
  getCacheStats: async (): Promise<{
    total_keys: number;
    memory_usage_mb?: number;
  }> => {
    const response = await apiClient.get('/api/v1/variables/cache/stats');
    return response.data;
  },

  /**
   * 清空缓存
   */
  clearCache: async (pattern?: string): Promise<{ cleared: number }> => {
    const response = await apiClient.delete('/api/v1/variables/cache/clear', {
      params: pattern ? { pattern } : {},
    });
    return response.data;
  },
};

// ==================== 文档生成 API ====================

export const generateApi = {
  /**
   * 生成文档（直接返回文档 Blob）
   */
  generate: async (
    templateId: string,
    data: Record<string, any>,
    filename?: string
  ): Promise<GenerateResponse> => {
    // 从 Zustand store 获取模板文件
    const templateFile = (window as any).__currentTemplateFile;
    
    if (!templateFile) {
      throw new Error('模板文件未找到，请重新上传');
    }
    
    const formData = new FormData();
    formData.append('template', templateFile);
    formData.append('data', JSON.stringify(data));
    
    const response = await apiClient.post(
      '/api/local-docs/generate-document',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      }
    );
    
    // Next.js API 直接返回 Blob，需要构造响应格式
    const blob = response.data as Blob;
    const generatedFilename = filename || `generated_${Date.now()}.docx`;
    
    // 创建下载 URL
    const downloadUrl = window.URL.createObjectURL(blob);
    
    return {
      document_id: Date.now().toString(),
      download_url: downloadUrl,
      filename: generatedFilename,
      file_size: blob.size,
      generation_time_ms: 0,
    };
  },

  /**
   * 下载文档（已在 generate 中完成，此方法保留兼容性）
   */
  download: async (documentId: string): Promise<Blob> => {
    throw new Error('此方法已废弃，请直接使用 download_url');
  },

  /**
   * 转换模板
   */
  convertTemplate: async (
    file: File,
    variableMapping: Record<string, string>
  ): Promise<{ converted_template_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('variable_mapping', JSON.stringify(variableMapping));
    
    const response = await apiClient.post(
      '/api/v1/generate/template/convert',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },

  /**
   * 验证模板
   */
  validateTemplate: async (file: File): Promise<{
    valid: boolean;
    issues?: string[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(
      '/api/v1/generate/template/validate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
};

// ==================== 系统 API ====================

export const systemApi = {
  /**
   * 健康检查
   */
  health: async (): Promise<{ status: string }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  /**
   * 获取应用信息
   */
  info: async (): Promise<{
    name: string;
    version: string;
    environment: string;
  }> => {
    const response = await apiClient.get('/');
    return response.data;
  },
};

// ==================== 工具函数 ====================

/**
 * 触发文件下载
 */
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 验证文件类型
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some((type) => file.name.endsWith(type));
};

/**
 * 验证文件大小
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};

export default apiClient;
