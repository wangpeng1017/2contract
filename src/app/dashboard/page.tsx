'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoginButton } from '@/components/auth/LoginButton';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Upload, Settings, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto">
        {/* 用户欢迎区域 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                欢迎回来，{user?.name}！
              </h1>
              <p className="text-gray-600">
                开始使用飞书合同内容更新助手，让文档更新更简单高效
              </p>
            </div>
            <LoginButton showUserInfo={true} />
          </div>
        </div>

        {/* 快速操作卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">文本替换</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              使用自定义规则快速替换文档中的关键信息
            </p>
            <a href="/workspace" className="w-full btn-primary block text-center">
              开始工作
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Upload size={20} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">OCR识别</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              上传截图自动识别并提取文本信息
            </p>
            <a href="/test-ocr" className="w-full btn-primary block text-center">
              测试OCR
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings size={20} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">批量处理</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              设置多个替换规则，一次性处理多个文档
            </p>
            <button className="w-full btn-primary">
              批量设置
            </button>
          </div>
        </div>

        {/* 最近操作 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">最近操作</h2>
            <button className="text-feishu-600 hover:text-feishu-700 text-sm font-medium">
              查看全部
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">合同模板更新</p>
                <p className="text-sm text-gray-600">替换了甲方和乙方信息</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">2分钟前</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  成功
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Upload size={16} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">OCR识别处理</p>
                <p className="text-sm text-gray-600">从截图中提取了公司信息</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">15分钟前</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  成功
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Settings size={16} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">批量替换任务</p>
                <p className="text-sm text-gray-600">处理了5个合同文档</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">1小时前</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  成功
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">12</p>
            <p className="text-sm text-gray-600">处理文档数</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Upload size={24} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">8</p>
            <p className="text-sm text-gray-600">OCR识别次数</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Settings size={24} className="text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">24</p>
            <p className="text-sm text-gray-600">替换规则数</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <BarChart3 size={24} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">98%</p>
            <p className="text-sm text-gray-600">成功率</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
