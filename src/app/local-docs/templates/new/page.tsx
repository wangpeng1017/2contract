'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WordProcessor } from '@/lib/word-processor';

interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  templateCount: number;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: '',
    author: ''
  });
  
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<any[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: 上传文件, 2: 填写信息, 3: 预览保存

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/local-docs/categories');
      const result = await response.json();

      if (result.success) {
        setCategories(result.data.categories);
      }
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('请选择 .docx 格式的Word文档');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      // 解析模板文件
      const arrayBuffer = await file.arrayBuffer();
      const documentTemplate = await WordProcessor.parseTemplate(arrayBuffer, file.name);
      
      setTemplateFile(file);
      setPlaceholders(documentTemplate.placeholders);
      setFormData(prev => ({
        ...prev,
        name: file.name.replace('.docx', '')
      }));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateFile || !formData.name || !formData.category) {
      setError('请填写必填字段');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description);
      formDataObj.append('category', formData.category);
      formDataObj.append('tags', formData.tags);
      formDataObj.append('author', formData.author);
      formDataObj.append('placeholders', JSON.stringify(placeholders));
      formDataObj.append('template', templateFile);

      const response = await fetch('/api/local-docs/templates', {
        method: 'POST',
        body: formDataObj
      });

      const result = await response.json();

      if (result.success) {
        router.push('/local-docs/templates');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('保存模板失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link
              href="/local-docs/templates"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              返回模板库
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">新建模板</h1>
              <p className="text-gray-600 mt-1">上传Word文档并创建可复用的模板</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>上传文件</span>
            <span>填写信息</span>
            <span>预览保存</span>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle size={20} className="text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* 步骤1: 上传文件 */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">上传Word模板文件</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              
              <div className="space-y-2">
                <p className="text-lg text-gray-700">
                  点击选择或拖拽Word文档到此处
                </p>
                <p className="text-sm text-gray-500">
                  支持 .docx 格式，文件大小不超过 10MB
                </p>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? '解析中...' : '选择文件'}
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <h3 className="font-medium mb-2">模板要求：</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>使用 <code className="bg-gray-100 px-1 rounded">{'{{变量名}}'}</code> 格式定义占位符</li>
                <li>确保文档格式正确，无损坏</li>
                <li>建议文件大小不超过 10MB</li>
                <li>支持表格、图片等复杂格式</li>
              </ul>
            </div>
          </div>
        )}

        {/* 步骤2: 填写信息 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">模板信息</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模板名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入模板名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择分类</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="描述模板的用途和特点"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="用逗号分隔多个标签"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    作者
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入作者姓名"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  上一步
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.name || !formData.category}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  下一步
                </button>
              </div>
            </div>

            {/* 占位符预览 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                检测到的占位符 ({placeholders.length})
              </h3>
              
              {placeholders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {placeholders.map((placeholder, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                      <div className="font-medium text-gray-900">{placeholder.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        类型: {placeholder.type}
                      </div>
                      {placeholder.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {placeholder.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">未检测到占位符</p>
              )}
            </div>
          </div>
        )}

        {/* 步骤3: 预览保存 */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">预览并保存</h2>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">模板名称:</span>
                  <p className="text-gray-900">{formData.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">分类:</span>
                  <p className="text-gray-900">
                    {categories.find(c => c.id === formData.category)?.name}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">描述:</span>
                  <p className="text-gray-900">{formData.description || '无'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">标签:</span>
                  <p className="text-gray-900">{formData.tags || '无'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">作者:</span>
                  <p className="text-gray-900">{formData.author || '无'}</p>
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">占位符数量:</span>
                <p className="text-gray-900">{placeholders.length} 个</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isProcessing}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Save size={16} className="mr-2" />
                {isProcessing ? '保存中...' : '保存模板'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
