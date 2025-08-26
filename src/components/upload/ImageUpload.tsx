'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Image, X, Eye, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface ImageUploadProps {
  onOCRComplete?: (result: any) => void;
  onNext?: () => void;
}

export function ImageUpload({ onOCRComplete, onNext }: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOCRResult, setError, updateStepStatus, importRules } = useAppStore();

  const handleFileSelect = useCallback((file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('文件大小不能超过10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // 创建预览URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [setError]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processOCR = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    updateStepStatus('ocr_upload', 'active');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('generateRules', 'true');

      const response = await fetch('/api/ocr/contract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const result = {
          text: data.data.contractInfo ? JSON.stringify(data.data.contractInfo, null, 2) : '',
          confidence: 0.9, // 默认置信度
          processingTime: Date.now(),
          structuredData: data.data.contractInfo
        };

        setOCRResult(result);
        updateStepStatus('ocr_upload', 'completed');

        // 如果有生成的替换规则，导入到store
        if (data.data.replacementRules && data.data.replacementRules.length > 0) {
          importRules(data.data.replacementRules.map((rule: any) => ({
            id: rule.id,
            searchText: rule.searchText,
            replaceText: rule.replaceText,
            enabled: rule.options?.enabled !== false,
            caseSensitive: rule.options?.caseSensitive || false,
            wholeWord: rule.options?.wholeWord || false,
            priority: rule.options?.priority || 0
          })));
        }

        if (onOCRComplete) {
          onOCRComplete(result);
        }

        if (onNext) {
          onNext();
        }
      } else {
        const errorMessage = data.error?.message || 'OCR处理失败';
        setError(errorMessage);
        updateStepStatus('ocr_upload', 'error', errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      setError(errorMessage);
      updateStepStatus('ocr_upload', 'error', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Image className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">OCR识别</h2>
          <p className="text-gray-600">上传合同截图，自动提取关键信息</p>
        </div>
      </div>

      {!selectedFile ? (
        // 文件上传区域
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            上传合同截图
          </h3>
          <p className="text-gray-600 mb-4">
            点击选择文件或拖拽图片到此处
          </p>
          
          <div className="text-sm text-gray-500 space-y-1">
            <p>支持格式：JPEG、PNG、GIF、WebP</p>
            <p>文件大小：最大 10MB</p>
          </div>
          
          <button
            type="button"
            className="mt-4 btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            选择文件
          </button>
        </div>
      ) : (
        // 文件预览和处理区域
        <div className="space-y-4">
          {/* 文件预览 */}
          <div className="relative bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {previewUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="预览"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-sm text-gray-600">
                  类型: {selectedFile.type}
                </p>
              </div>
              
              <button
                onClick={removeFile}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 处理按钮 */}
          <div className="flex justify-between items-center">
            <button
              onClick={removeFile}
              className="btn-secondary"
              disabled={isProcessing}
            >
              重新选择
            </button>
            
            <button
              onClick={processOCR}
              disabled={isProcessing}
              className="btn-primary flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>识别中...</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>开始识别</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2">📸 拍摄建议</h4>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• 确保合同文字清晰可读</li>
          <li>• 光线充足，避免阴影和反光</li>
          <li>• 尽量正面拍摄，避免倾斜</li>
          <li>• 包含甲方、乙方、金额等关键信息</li>
          <li>• 建议使用高分辨率图片</li>
        </ul>
      </div>

      {/* 支持的信息类型 */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">🔍 可识别信息</h4>
        <div className="grid grid-cols-2 gap-2 text-blue-700 text-sm">
          <div>• 甲方公司名称</div>
          <div>• 乙方公司名称</div>
          <div>• 合同金额</div>
          <div>• 合同编号</div>
          <div>• 签署日期</div>
          <div>• 联系人信息</div>
        </div>
      </div>
    </div>
  );
}
