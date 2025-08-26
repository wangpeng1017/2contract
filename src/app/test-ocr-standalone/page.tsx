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

export default function StandaloneOCRTestPage() {
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
      
      console.log('发送OCR请求:', { endpoint, testMode, fileName: selectedFile.name });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      console.log('OCR响应状态:', response.status);
      
      const data = await response.json();
      console.log('OCR响应数据:', data);

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
      console.error('OCR请求错误:', error);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            独立OCR测试工具
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            完全独立的OCR测试工具，支持基础文字识别和智能合同信息提取。
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              OCR测试工具
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
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
                    <p className="text-gray-600">
                      点击选择图片或拖拽图片到此处
                    </p>
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
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span>测试结果</span>
                  </h3>
                  {testResult.success && (
                    <button
                      onClick={downloadResult}
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>下载结果</span>
                    </button>
                  )}
                </div>

                {testResult.success ? (
                  <div className="space-y-4">
                    {testResult.result && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">识别结果:</h4>
                        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-96">
                          {typeof testResult.result === 'object' 
                            ? JSON.stringify(testResult.result, null, 2)
                            : testResult.result
                          }
                        </pre>
                      </div>
                    )}
                    
                    {testResult.metadata && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">处理信息:</h4>
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <p>文件名: {testResult.metadata.fileName}</p>
                          <p>文件大小: {(testResult.metadata.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                          <p>文件类型: {testResult.metadata.fileType}</p>
                          {testResult.metadata.processingTime && (
                            <p>处理时间: {testResult.metadata.processingTime}ms</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    <p>错误: {testResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 使用说明 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p><strong>基础文字识别:</strong> 识别图片中的所有文字内容，保持原有格式。</p>
              <p><strong>合同信息提取:</strong> 智能提取合同中的关键信息，如甲乙方、金额、日期等。</p>
              <p><strong>测试资源:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>飞书文档: <a href="https://cb0xpdikl7.feishu.cn/docx/CrBwdZoDroTdhKx564bc6XjlnFd" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">测试文档链接</a></li>
                <li>测试图片: 包含合同信息的表格截图</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
