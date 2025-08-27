'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Download, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Placeholder {
  name: string;
  type: 'text' | 'date' | 'number' | 'email' | 'boolean';
  required: boolean;
  description?: string;
  defaultValue?: string;
}

interface FormData {
  [key: string]: string;
}

export default function LocalDocsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [formData, setFormData] = useState<FormData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('请上传 .docx 格式的Word文档');
      return;
    }

    setError(null);
    setUploadedFile(file);
    setIsProcessing(true);
    setProcessingStatus('正在解析模板文件...');

    try {
      // 创建FormData对象
      const formDataObj = new FormData();
      formDataObj.append('template', file);

      setProcessingStatus('正在识别占位符...');

      // 调用后端API解析模板
      const response = await fetch('/api/local-docs/parse-template', {
        method: 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '模板解析失败');
      }

      const result = await response.json();

      if (result.success) {
        setPlaceholders(result.data.placeholders);
        setProcessingStatus(`成功识别 ${result.data.placeholders.length} 个占位符`);
        setTimeout(() => {
          setCurrentStep(2);
          setProcessingStatus('');
        }, 1000);
      } else {
        throw new Error(result.message || '模板解析失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '模板解析失败');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必填字段
    const missingFields = placeholders
      .filter(p => p.required && !formData[p.name])
      .map(p => p.name);
    
    if (missingFields.length > 0) {
      setError(`请填写必填字段: ${missingFields.join(', ')}`);
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProcessingStatus('正在生成文档...');

    try {
      // 创建FormData对象
      const formDataObj = new FormData();
      if (uploadedFile) {
        formDataObj.append('template', uploadedFile);
      }
      formDataObj.append('data', JSON.stringify(formData));

      setProcessingStatus('正在填充数据...');

      // 调用后端API生成文档
      const response = await fetch('/api/local-docs/generate-document', {
        method: 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '文档生成失败';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // 如果不是JSON，使用默认错误消息
        }
        throw new Error(errorMessage);
      }

      setProcessingStatus('正在准备下载...');

      // 处理文件下载
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setGeneratedDocUrl(url);

      setProcessingStatus('文档生成成功！');
      setTimeout(() => {
        setCurrentStep(3);
        setProcessingStatus('');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档生成失败');
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (generatedDocUrl) {
      const a = document.createElement('a');
      a.href = generatedDocUrl;
      a.download = `generated_${uploadedFile?.name || 'document.docx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const resetProcess = () => {
    setCurrentStep(1);
    setUploadedFile(null);
    setPlaceholders([]);
    setFormData({});
    setError(null);
    setGeneratedDocUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              currentStep >= step 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-1 mx-2 ${
                currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center mb-8">
        <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
          <ArrowLeft size={20} className="mr-2" />
          返回首页
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          本地文档处理
        </h1>
      </div>

      {/* 步骤指示器 */}
      {renderStepIndicator()}

      {/* 错误提示 */}
      {error && (
        <div className="card p-4 mb-6 bg-red-50 border border-red-200">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 处理状态提示 */}
      {processingStatus && (
        <div className="card p-4 mb-6 bg-blue-50 border border-blue-200">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700">{processingStatus}</span>
          </div>
        </div>
      )}

      {/* 步骤1: 上传模板 */}
      {currentStep === 1 && (
        <div className="card p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              上传Word模板文件
            </h2>
            <p className="text-gray-600 mb-8">
              请上传包含占位符的Word文档模板（.docx格式）
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="btn-primary px-8 py-3 text-lg"
              >
                {isProcessing ? '解析中...' : '选择文件'}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                支持的占位符格式: {`{{变量名}}`}
              </p>
            </div>

            {uploadedFile && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <FileText size={20} className="text-green-600 mr-2" />
                  <span className="text-green-700">已选择: {uploadedFile.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 步骤2: 填写表单 */}
      {currentStep === 2 && (
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              填写模板数据
            </h2>
            <p className="text-gray-600">
              系统已识别到 {placeholders.length} 个占位符，请填写相应的内容
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {placeholders.map((placeholder) => (
                <div key={placeholder.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {placeholder.name}
                    {placeholder.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {placeholder.description && (
                    <p className="text-xs text-gray-500 mb-1">{placeholder.description}</p>
                  )}

                  {placeholder.type === 'boolean' ? (
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={placeholder.name}
                          value="true"
                          checked={formData[placeholder.name] === 'true'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [placeholder.name]: e.target.value
                          }))}
                          className="mr-2"
                        />
                        是
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={placeholder.name}
                          value="false"
                          checked={formData[placeholder.name] === 'false'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            [placeholder.name]: e.target.value
                          }))}
                          className="mr-2"
                        />
                        否
                      </label>
                    </div>
                  ) : (
                    <input
                      type={placeholder.type}
                      value={formData[placeholder.name] || placeholder.defaultValue || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [placeholder.name]: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={placeholder.description || `请输入${placeholder.name}`}
                      required={placeholder.required}
                      min={placeholder.type === 'number' ? '0' : undefined}
                      step={placeholder.type === 'number' ? '0.01' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={resetProcess}
                className="btn-secondary px-6 py-2"
              >
                重新上传
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary px-8 py-2"
              >
                {isProcessing ? '生成中...' : '生成文档'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 步骤3: 下载文档 */}
      {currentStep === 3 && (
        <div className="card p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              文档生成成功
            </h2>
            <p className="text-gray-600 mb-8">
              您的文档已经生成完成，可以下载使用了
            </p>
            
            <div className="space-y-4">
              <button
                onClick={handleDownload}
                className="btn-primary px-8 py-3 text-lg"
              >
                <Download size={20} className="mr-2" />
                下载文档
              </button>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={resetProcess}
                  className="btn-secondary px-6 py-2"
                >
                  处理新文档
                </button>
                <Link href="/" className="btn-secondary px-6 py-2 inline-block">
                  返回首页
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
