/**
 * 智能合同模板系统 - 主页面
 */
'use client';

import { useUIStore, useTemplateStore } from '@/lib/store';
import TemplateUploader from '@/components/TemplateUploader';
import DynamicForm from '@/components/DynamicForm';
import DocumentDownload from '@/components/DocumentDownload';
import { 
  DocumentTextIcon, 
  SparklesIcon, 
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function Home() {
  const { currentStep, isLoading, loadingMessage, error } = useUIStore();
  const { currentTemplate, variables } = useTemplateStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  智能合同模板系统
                </h1>
                <p className="text-sm text-gray-500">
                  AI 驱动 · 一键生成 · 高保真输出
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 步骤指示器 */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center space-x-4">
              {/* Step 1 */}
              <li className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${currentStep >= 1 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-white border-gray-300'
                    }
                  `}
                >
                  {currentStep > 1 ? (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  ) : (
                    <span className={`text-sm font-semibold ${currentStep === 1 ? 'text-white' : 'text-gray-400'}`}>
                      1
                    </span>
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                  上传模板
                </span>
              </li>

              <div className={`h-0.5 w-16 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />

              {/* Step 2 */}
              <li className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${currentStep >= 2 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-white border-gray-300'
                    }
                  `}
                >
                  {currentStep > 2 ? (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  ) : (
                    <span className={`text-sm font-semibold ${currentStep === 2 ? 'text-white' : 'text-gray-400'}`}>
                      2
                    </span>
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                  填写信息
                </span>
              </li>

              <div className={`h-0.5 w-16 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />

              {/* Step 3 */}
              <li className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2
                    ${currentStep >= 3 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-white border-gray-300'
                    }
                  `}
                >
                  <span className={`text-sm font-semibold ${currentStep === 3 ? 'text-white' : 'text-gray-400'}`}>
                    3
                  </span>
                </div>
                <span className={`ml-2 text-sm font-medium ${currentStep >= 3 ? 'text-gray-900' : 'text-gray-500'}`}>
                  下载合同
                </span>
              </li>
            </ol>
          </nav>
        </div>

        {/* 加载状态 */}
        {isLoading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-sm text-blue-800">
                {loadingMessage || '处理中...'}
              </p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ❌ {error}
            </p>
          </div>
        )}

        {/* 当前模板信息 */}
        {currentTemplate && currentStep > 1 && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  当前模板: {currentTemplate.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  识别变量: {variables.length} 个
                </p>
              </div>
              <SparklesIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="mt-8">
          {currentStep === 1 && <TemplateUploader />}
          {currentStep === 2 && <DynamicForm />}
          {currentStep === 3 && <DocumentDownload />}
        </div>

        {/* 特性介绍 */}
        {currentStep === 1 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <SparklesIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI 智能识别</h3>
              <p className="text-sm text-gray-600">
                自动识别变量类型（文本、日期、金额、电话等），智能生成表单
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <DocumentTextIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">高保真渲染</h3>
              <p className="text-sm text-gray-600">
                完全保留原模板格式，字体、颜色、表格、样式一致
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">极速生成</h3>
              <p className="text-sm text-gray-600">
                毫秒级生成速度，自动格式化日期和金额，一键下载
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="mt-12 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            智能合同模板系统 · Powered by FastAPI + Next.js + Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
