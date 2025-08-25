'use client';

import { CheckCircle, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function StepIndicator() {
  const { steps, currentStep } = useAppStore();

  const getStepIcon = (step: any, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'active':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return (
          <Circle 
            className={`w-6 h-6 ${
              index <= currentStep ? 'text-blue-500' : 'text-gray-300'
            }`} 
          />
        );
    }
  };

  const getStepColor = (step: any, index: number) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-700';
      case 'active':
        return 'text-blue-700';
      case 'error':
        return 'text-red-700';
      default:
        return index <= currentStep ? 'text-gray-700' : 'text-gray-400';
    }
  };

  const getConnectorColor = (index: number) => {
    if (index >= steps.length - 1) return '';
    
    const currentStepStatus = steps[index].status;
    const nextStepStatus = steps[index + 1].status;
    
    if (currentStepStatus === 'completed') {
      return 'bg-green-300';
    } else if (currentStepStatus === 'active' || nextStepStatus === 'active') {
      return 'bg-blue-300';
    } else if (currentStepStatus === 'error') {
      return 'bg-red-300';
    } else {
      return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">工作流程</h2>
      
      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* 步骤内容 */}
            <div className="flex items-start space-x-4 pb-8">
              {/* 步骤图标 */}
              <div className="flex-shrink-0 relative z-10">
                {getStepIcon(step, index)}
              </div>
              
              {/* 步骤信息 */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${getStepColor(step, index)}`}>
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {step.description}
                </p>
                
                {/* 错误信息 */}
                {step.status === 'error' && step.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {step.error}
                  </div>
                )}
                
                {/* 状态标签 */}
                <div className="mt-2">
                  {step.status === 'completed' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      已完成
                    </span>
                  )}
                  {step.status === 'active' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      进行中
                    </span>
                  )}
                  {step.status === 'error' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      出错
                    </span>
                  )}
                  {step.status === 'pending' && index <= currentStep && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      待处理
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* 连接线 */}
            {index < steps.length - 1 && (
              <div 
                className={`absolute left-3 top-6 w-0.5 h-8 ${getConnectorColor(index)}`}
                style={{ transform: 'translateX(-1px)' }}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* 进度条 */}
      <div className="mt-6 pt-6 border-t">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>整体进度</span>
          <span>
            {steps.filter(s => s.status === 'completed').length} / {steps.length}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}
