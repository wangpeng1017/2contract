'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Eye, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
  structuredData?: any;
}

interface TestResult {
  success: boolean;
  result?: OCRResult;
  error?: string;
  metadata?: any;
}

export function OCRTester() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testMode, setTestMode] = useState<'basic' | 'contract'>('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
      }

      setSelectedFile(file);
      setTestResult(null);
    }

    // 清空input值，允许重复选择同一文件
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setTestResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const testOCR = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setTestResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      if (testMode === 'basic') {
        formData.append('extractStructured', 'false');
        formData.append('language', 'zh-CN');
      } else {
        formData.append('generateRules', 'true');
      }

      const endpoint = testMode === 'basic' ? '/api/ocr/extract' : '/api/ocr/contract';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          result: data.data.result || data.data.contractInfo,
          metadata: data.data.metadata
        });
      } else {
        setTestResult({
          success: false,
          error: data.error?.message || '未知错误'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : '网络错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResult = () => {
    if (!testResult?.result) return;

    const content = JSON.stringify(testResult, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-result-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          🧪 OCR功能测试工具
        </h2>

        {/* 测试模式选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试模式
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="basic"
                checked={testMode === 'basic'}
                onChange={(e) => setTestMode(e.target.value as 'basic' | 'contract')}
                className="mr-2"
              />
              <span>基础文字识别</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="contract"
                checked={testMode === 'contract'}
                onChange={(e) => setTestMode(e.target.value as 'basic' | 'contract')}
                className="mr-2"
              />
              <span>合同信息提取</span>
            </label>
          </div>
        </div>

        {/* 文件上传区域 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择测试图片
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="flex items-center justify-center space-x-2">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  拖拽图片到此处或点击下方按钮选择文件
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  选择图片文件
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  支持 JPEG、PNG、GIF、WebP 格式，最大 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="mb-6">
          <button
            onClick={testOCR}
            disabled={!selectedFile || isLoading}
            className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>处理中...</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>开始{testMode === 'basic' ? '文字识别' : '合同信息提取'}测试</span>
              </>
            )}
          </button>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                {testResult.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>测试成功</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span>测试失败</span>
                  </>
                )}
              </h3>
              
              {testResult.success && (
                <button
                  onClick={downloadResult}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  <span>下载结果</span>
                </button>
              )}
            </div>

            {testResult.success ? (
              <div className="space-y-4">
                {/* 元数据 */}
                {testResult.metadata && (
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium mb-2">处理信息</h4>
                    <div className="text-sm space-y-1">
                      <p>文件名: {testResult.metadata.fileName}</p>
                      <p>文件大小: {(testResult.metadata.fileSize / 1024).toFixed(2)} KB</p>
                      {testResult.metadata.processingTime && (
                        <p>处理时间: {testResult.metadata.processingTime} ms</p>
                      )}
                    </div>
                  </div>
                )}

                {/* OCR结果 */}
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-medium mb-2">识别结果</h4>
                  {testMode === 'basic' ? (
                    <div className="text-sm">
                      <p className="mb-2">置信度: {testResult.result?.confidence || 'N/A'}</p>
                      <div className="bg-white p-2 rounded border max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs">
                          {testResult.result?.text || '无文字内容'}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <div className="bg-white p-2 rounded border">
                        <pre className="whitespace-pre-wrap text-xs">
                          {JSON.stringify(testResult.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 p-3 rounded">
                <p className="text-red-700">错误信息: {testResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">💡 测试建议</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 使用清晰、光线充足的图片</li>
            <li>• 确保文字内容清晰可读</li>
            <li>• 合同测试请使用包含甲方、乙方、金额等信息的图片</li>
            <li>• 如果识别效果不佳，尝试调整图片角度和清晰度</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
