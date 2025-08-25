'use client';

import { useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StepIndicator } from '@/components/workflow/StepIndicator';
import { DocumentInput } from '@/components/document/DocumentInput';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { RuleEditor } from '@/components/rules/RuleEditor';
import { useAppStore } from '@/store/useAppStore';
import { ArrowLeft, RotateCcw } from 'lucide-react';

export default function WorkspacePage() {
  const { 
    currentStep, 
    setCurrentStep, 
    resetWorkflow,
    document,
    ocrResult,
    rules
  } = useAppStore();

  // 自动推进工作流
  useEffect(() => {
    if (currentStep === 0 && document?.isValid) {
      // 文档验证完成，进入OCR步骤
      setCurrentStep(1);
    } else if (currentStep === 1 && ocrResult) {
      // OCR完成，进入规则设置步骤
      setCurrentStep(2);
    }
  }, [document, ocrResult, currentStep, setCurrentStep]);

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <DocumentInput 
            onNext={() => setCurrentStep(1)}
          />
        );
      
      case 1:
        return (
          <ImageUpload 
            onNext={() => setCurrentStep(2)}
          />
        );
      
      case 2:
        return (
          <RuleEditor 
            onNext={() => setCurrentStep(3)}
          />
        );
      
      case 3:
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">预览更改</h2>
            <p className="text-gray-600 mb-6">
              在执行替换之前，请预览将要进行的更改。
            </p>
            
            {/* 预览内容区域 */}
            <div className="space-y-4">
              {document && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">目标文档</h3>
                  <p className="text-blue-700">{document.title}</p>
                  <p className="text-blue-600 text-sm">ID: {document.id}</p>
                </div>
              )}
              
              {rules.filter(r => r.enabled).length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">
                    替换规则 ({rules.filter(r => r.enabled).length} 个)
                  </h3>
                  <div className="space-y-2">
                    {rules.filter(r => r.enabled).map(rule => (
                      <div key={rule.id} className="text-sm">
                        <span className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded mr-2">
                          {rule.searchText}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                          {rule.replaceText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={handlePreviousStep}
                className="btn-secondary flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>上一步</span>
              </button>
              
              <button
                onClick={() => setCurrentStep(4)}
                className="btn-primary"
                disabled={rules.filter(r => r.enabled).length === 0}
              >
                确认并执行替换
              </button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">执行替换</h2>
            <p className="text-gray-600 mb-6">
              正在执行文本替换操作...
            </p>
            
            {/* 这里将来会添加实际的替换执行逻辑 */}
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">正在处理中，请稍候...</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  飞书合同内容更新助手
                </h1>
                <p className="text-gray-600 mt-2">
                  通过OCR识别和智能替换，快速更新合同文档内容
                </p>
              </div>
              
              <button
                onClick={resetWorkflow}
                className="btn-secondary flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新开始</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左侧：步骤指示器 */}
            <div className="lg:col-span-1">
              <StepIndicator />
            </div>

            {/* 右侧：主要内容区域 */}
            <div className="lg:col-span-3">
              {renderCurrentStep()}
            </div>
          </div>

          {/* 底部导航 */}
          {currentStep > 0 && currentStep < 3 && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={handlePreviousStep}
                className="btn-secondary flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>上一步</span>
              </button>
              
              <div className="text-sm text-gray-500">
                步骤 {currentStep + 1} / 5
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
