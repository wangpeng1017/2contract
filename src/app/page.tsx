'use client';

import { useState } from 'react';
import { FileText, Upload, Settings, CheckCircle } from 'lucide-react';
import { LoginButton } from '@/components/auth/LoginButton';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const { isAuthenticated } = useAuth();

  const steps = [
    {
      id: 1,
      title: '用户认证',
      description: '登录飞书账号并授权访问',
      icon: CheckCircle,
      status: 'pending'
    },
    {
      id: 2,
      title: '选择文档',
      description: '输入飞书文档链接',
      icon: FileText,
      status: 'pending'
    },
    {
      id: 3,
      title: '设置更新方式',
      description: '选择文本替换或截图识别',
      icon: Settings,
      status: 'pending'
    },
    {
      id: 4,
      title: '执行更新',
      description: '自动更新文档内容',
      icon: Upload,
      status: 'pending'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* 欢迎区域 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          欢迎使用飞书合同内容更新助手
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          简化和自动化更新飞书云文档中的合同内容，提升工作效率
        </p>
        <div className="flex justify-center space-x-4">
          {isAuthenticated ? (
            <a href="/dashboard" className="btn-primary text-lg px-8 py-3 inline-block">
              进入工作台
            </a>
          ) : (
            <LoginButton className="text-lg px-8 py-3" />
          )}
          <button className="btn-secondary text-lg px-8 py-3">
            查看演示
          </button>
        </div>
      </div>

      {/* 功能步骤 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`card p-6 text-center transition-all duration-300 hover:shadow-md ${
                currentStep === step.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex justify-center mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentStep >= step.id 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon size={24} />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          );
        })}
      </div>

      {/* 功能特性 */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="card p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            🎯 智能文本替换
          </h3>
          <p className="text-gray-600 mb-4">
            通过简单的键值对指令，快速替换文档中的甲方、乙方、合同金额等关键信息。
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 支持批量替换规则</li>
            <li>• 精确匹配和模糊匹配</li>
            <li>• 实时预览替换结果</li>
          </ul>
        </div>

        <div className="card p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            📷 OCR截图识别
          </h3>
          <p className="text-gray-600 mb-4">
            上传包含新信息的截图，自动识别并提取文本信息，智能更新到文档中。
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 高精度文字识别</li>
            <li>• 智能信息提取</li>
            <li>• 支持多种图片格式</li>
          </ul>
        </div>
      </div>

      {/* 安全保障 */}
      <div className="card p-8 text-center bg-gradient-to-r from-feishu-50 to-blue-50">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          🔒 安全可靠
        </h3>
        <p className="text-gray-600 mb-6">
          基于飞书官方API构建，确保数据安全和隐私保护
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>OAuth 2.0认证</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>数据加密传输</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>权限严格控制</span>
          </div>
        </div>
      </div>
    </div>
  );
}
