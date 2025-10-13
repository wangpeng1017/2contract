/**
 * 文档下载组件
 */
'use client';

import { useState } from 'react';
import { useTemplateStore, useUIStore } from '@/lib/store';
import { formatFileSize } from '@/lib/api-client';
import { 
  DocumentCheckIcon, 
  ArrowDownTrayIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function DocumentDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const { generatedDocument, reset } = useTemplateStore();
  const { setError, setCurrentStep } = useUIStore();

  // 下载文档
  const handleDownload = () => {
    if (!generatedDocument) return;

    try {
      setIsDownloading(true);
      setError(null);

      // 直接使用 Blob URL 下载
      const link = document.createElement('a');
      link.href = generatedDocument.downloadUrl;
      link.download = generatedDocument.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('文档下载成功');

    } catch (error: any) {
      console.error('下载失败:', error);
      setError(error.message || '下载失败');
    } finally {
      setIsDownloading(false);
    }
  };

  // 开始新的生成
  const handleNewGeneration = () => {
    reset();
    setCurrentStep(1);
  };

  if (!generatedDocument) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无生成的文档</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 成功提示 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-center">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-green-900">
              文档生成成功！
            </h3>
            <p className="mt-1 text-sm text-green-700">
              您的合同已经生成，可以下载了
            </p>
          </div>
        </div>
      </div>

      {/* 文档信息 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start">
          <DocumentCheckIcon className="h-12 w-12 text-blue-600" />
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {generatedDocument.filename}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              文件大小: {formatFileSize(generatedDocument.fileSize)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              文档 ID: {generatedDocument.id.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* 下载按钮 */}
        <div className="mt-6 flex space-x-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="
              flex-1 flex items-center justify-center px-6 py-3 
              bg-blue-600 text-white rounded-lg 
              hover:bg-blue-700 disabled:bg-gray-400 
              transition-colors
            "
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            {isDownloading ? '下载中...' : '下载文档'}
          </button>
        </div>
      </div>

      {/* 下一步操作 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">
          接下来您可以：
        </h4>
        <div className="space-y-3">
          <button
            onClick={handleNewGeneration}
            className="
              w-full text-left px-4 py-3 bg-white rounded-lg 
              border border-gray-200 hover:border-blue-500 
              transition-colors
            "
          >
            <p className="font-medium text-gray-900">
              生成新的合同
            </p>
            <p className="text-sm text-gray-500">
              上传新模板或使用相同模板重新填写
            </p>
          </button>

          <button
            onClick={() => setCurrentStep(2)}
            className="
              w-full text-left px-4 py-3 bg-white rounded-lg 
              border border-gray-200 hover:border-blue-500 
              transition-colors
            "
          >
            <p className="font-medium text-gray-900">
              修改数据重新生成
            </p>
            <p className="text-sm text-gray-500">
              返回上一步修改填写的信息
            </p>
          </button>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>提示：</strong>生成的文档会保留 1 小时，请及时下载保存
        </p>
      </div>
    </div>
  );
}
