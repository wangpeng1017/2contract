'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Download, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DocumentPreviewProps {
  documentBuffer?: ArrayBuffer | null;
  originalData: Record<string, any>;
  onDownload: () => void;
  onRegenerate: () => void;
  isVisible: boolean;
  onClose: () => void;
}

interface PreviewData {
  success: boolean;
  replacedFields: Array<{
    placeholder: string;
    originalValue: string;
    replacedValue: string;
    isReplaced: boolean;
  }>;
  documentSummary: {
    totalPlaceholders: number;
    replacedCount: number;
    failedCount: number;
    replacementRate: number;
  };
  contentPreview: string;
  error?: string;
}

export default function DocumentPreview({
  documentBuffer,
  originalData,
  onDownload,
  onRegenerate,
  isVisible,
  onClose
}: DocumentPreviewProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && documentBuffer) {
      analyzeDocument();
    }
  }, [isVisible, documentBuffer]);

  const analyzeDocument = async () => {
    if (!documentBuffer) return;

    setIsLoading(true);
    setError(null);

    try {
      // 创建FormData发送文档进行分析
      const formData = new FormData();
      const blob = new Blob([documentBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      formData.append('document', blob, 'generated-document.docx');
      formData.append('originalData', JSON.stringify(originalData));

      const response = await fetch('/api/local-docs/preview-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`预览分析失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setPreviewData(result.data);
      } else {
        throw new Error(result.message || '文档分析失败');
      }
    } catch (err) {
      console.error('文档预览分析失败:', err);
      setError(err instanceof Error ? err.message : '文档分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Eye className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">文档预览与验证</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-blue-600 mr-3" size={24} />
              <span className="text-gray-600">正在分析文档内容...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="text-red-600 mr-3" size={20} />
                <div>
                  <h3 className="font-medium text-red-800">预览分析失败</h3>
                  <p className="text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {previewData && (
            <div className="space-y-6">
              {/* 替换统计 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">替换统计</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {previewData.documentSummary.totalPlaceholders}
                    </div>
                    <div className="text-sm text-gray-600">总占位符</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {previewData.documentSummary.replacedCount}
                    </div>
                    <div className="text-sm text-gray-600">已替换</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {previewData.documentSummary.failedCount}
                    </div>
                    <div className="text-sm text-gray-600">替换失败</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      previewData.documentSummary.replacementRate >= 100 
                        ? 'text-green-600' 
                        : previewData.documentSummary.replacementRate >= 80
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {previewData.documentSummary.replacementRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">成功率</div>
                  </div>
                </div>
              </div>

              {/* 字段替换详情 */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">字段替换详情</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previewData.replacedFields.map((field, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        field.isReplaced
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {field.isReplaced ? (
                          <CheckCircle className="text-green-600" size={16} />
                        ) : (
                          <XCircle className="text-red-600" size={16} />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {field.placeholder}
                          </div>
                          <div className="text-sm text-gray-600">
                            {field.isReplaced 
                              ? `替换为: ${field.replacedValue}`
                              : `未替换，仍显示: ${field.originalValue}`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 内容预览 */}
              {previewData.contentPreview && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">文档内容预览</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {previewData.contentPreview}
                    </pre>
                  </div>
                </div>
              )}

              {/* 警告信息 */}
              {previewData.documentSummary.replacementRate < 100 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="text-yellow-600 mr-3" size={20} />
                    <div>
                      <h3 className="font-medium text-yellow-800">替换不完整</h3>
                      <p className="text-yellow-700 mt-1">
                        检测到 {previewData.documentSummary.failedCount} 个占位符未被正确替换。
                        建议重新生成文档或检查模板格式。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            关闭预览
          </button>
          
          <div className="flex space-x-3">
            {previewData && previewData.documentSummary.replacementRate < 100 && (
              <button
                onClick={onRegenerate}
                className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <RefreshCw size={16} className="mr-2" />
                重新生成
              </button>
            )}
            
            <button
              onClick={onDownload}
              className={`flex items-center px-6 py-2 rounded-lg transition-colors ${
                previewData && previewData.documentSummary.replacementRate >= 100
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Download size={16} className="mr-2" />
              {previewData && previewData.documentSummary.replacementRate >= 100 
                ? '下载完美文档' 
                : '仍然下载'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
