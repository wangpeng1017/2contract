'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const documentSchema = z.object({
  url: z.string()
    .url('请输入有效的URL')
    .refine(
      (url) => url.includes('feishu.cn') || url.includes('larksuite.com'),
      '请输入有效的飞书文档链接'
    )
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentInputProps {
  onNext?: () => void;
}

export function DocumentInput({ onNext }: DocumentInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const { document, setDocument, setError, updateStepStatus } = useAppStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      url: document?.url || ''
    }
  });

  const urlValue = watch('url');

  const validateDocument = async (url: string) => {
    setIsValidating(true);
    setError(null);
    updateStepStatus('document_input', 'active');

    try {
      const response = await fetch('/api/document/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentUrl: url }),
      });

      const data = await response.json();

      if (data.success) {
        const documentInfo = {
          id: data.data.documentId,
          url: url,
          title: data.data.document.title || '未命名文档',
          isValid: true
        };

        setDocument(documentInfo);
        updateStepStatus('document_input', 'completed');
        
        if (onNext) {
          onNext();
        }
      } else {
        setError(data.error?.message || '文档验证失败');
        updateStepStatus('document_input', 'error', data.error?.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      setError(errorMessage);
      updateStepStatus('document_input', 'error', errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = (data: DocumentFormData) => {
    validateDocument(data.url);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue('url', text);
      }
    } catch (error) {
      console.warn('无法读取剪贴板内容');
    }
  };

  const getUrlStatus = () => {
    if (!urlValue) return null;
    
    if (errors.url) {
      return { type: 'error', message: errors.url.message };
    }
    
    if (document?.url === urlValue && document.isValid) {
      return { type: 'success', message: '文档验证成功' };
    }
    
    return null;
  };

  const urlStatus = getUrlStatus();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Link className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">输入文档链接</h2>
          <p className="text-gray-600">请输入需要处理的飞书文档链接</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            飞书文档链接
          </label>
          <div className="relative">
            <input
              {...register('url')}
              type="url"
              id="url"
              placeholder="https://your-company.feishu.cn/docx/..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 ${
                urlStatus?.type === 'error' 
                  ? 'border-red-300 bg-red-50' 
                  : urlStatus?.type === 'success'
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
              }`}
              disabled={isValidating}
            />
            
            {/* 状态图标 */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isValidating ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : urlStatus?.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : urlStatus?.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : null}
            </div>
          </div>

          {/* 状态消息 */}
          {urlStatus && (
            <p className={`mt-2 text-sm ${
              urlStatus.type === 'error' ? 'text-red-600' : 'text-green-600'
            }`}>
              {urlStatus.message}
            </p>
          )}

          {/* 帮助文本 */}
          <div className="mt-2 text-sm text-gray-500">
            <p>支持的链接格式：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>https://your-company.feishu.cn/docx/...</li>
              <li>https://your-company.larksuite.com/docx/...</li>
            </ul>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={isValidating}
          >
            从剪贴板粘贴
          </button>
          
          {document?.url && (
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-700 font-medium flex items-center space-x-1"
            >
              <ExternalLink className="w-4 h-4" />
              <span>在新窗口打开</span>
            </a>
          )}
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isValidating || !urlValue || !!errors.url}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>验证中...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>验证文档</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 文档信息显示 */}
      {document && document.isValid && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900">文档验证成功</h3>
              <p className="text-green-700 mt-1">
                文档标题: {document.title}
              </p>
              <p className="text-green-600 text-sm mt-1">
                文档ID: {document.id}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 使用提示</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 确保您有该文档的访问权限</li>
          <li>• 建议使用文档的完整链接</li>
          <li>• 系统会自动验证文档的可访问性</li>
          <li>• 验证成功后可以进行下一步操作</li>
        </ul>
      </div>
    </div>
  );
}
