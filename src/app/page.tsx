'use client';

import { FileText, Cloud, Download, Zap, Shield, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {

  return (
    <div className="max-w-6xl mx-auto">
      {/* 欢迎区域 */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          智能文档处理助手
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          提供本地文档处理和飞书云文档处理两种解决方案
        </p>
        <p className="text-lg text-gray-500">
          选择适合您需求的文档处理方式，提升工作效率
        </p>
      </div>

      {/* 核心功能模块 */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {/* 本地文档处理模块 */}
        <div className="card p-8 hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              本地文档处理
            </h2>
            <p className="text-gray-600">
              智能合同模板填充系统，无需注册，本地处理
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">上传Word模板文件</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">自动识别占位符</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">动态生成填写表单</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">一键生成完整文档</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <Shield size={16} className="text-green-600" />
              <span className="text-xs text-gray-600">无需注册</span>
            </div>
            <div className="flex items-center space-x-2">
              <Download size={16} className="text-green-600" />
              <span className="text-xs text-gray-600">本地处理</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap size={16} className="text-green-600" />
              <span className="text-xs text-gray-600">即时生成</span>
            </div>
          </div>

          <Link
            href="/local-docs"
            className="btn-primary w-full text-center block py-3 text-lg font-semibold"
          >
            开始使用本地处理
          </Link>
        </div>

        {/* 飞书文档处理模块 */}
        <div className="card p-8 hover:shadow-lg transition-all duration-300 border-2 hover:border-feishu-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-feishu-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cloud size={32} className="text-feishu-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              飞书文档处理
            </h2>
            <p className="text-gray-600">
              云端协作文档智能更新，OCR识别与文本替换
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-feishu-500 rounded-full"></div>
              <span className="text-sm text-gray-700">飞书账号登录</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-feishu-500 rounded-full"></div>
              <span className="text-sm text-gray-700">OCR图片识别</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-feishu-500 rounded-full"></div>
              <span className="text-sm text-gray-700">智能文本替换</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-feishu-500 rounded-full"></div>
              <span className="text-sm text-gray-700">云端文档更新</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <Users size={16} className="text-feishu-600" />
              <span className="text-xs text-gray-600">团队协作</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cloud size={16} className="text-feishu-600" />
              <span className="text-xs text-gray-600">云端同步</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap size={16} className="text-feishu-600" />
              <span className="text-xs text-gray-600">智能识别</span>
            </div>
          </div>

          <Link
            href="/workspace"
            className="btn-secondary w-full text-center block py-3 text-lg font-semibold border-feishu-300 text-feishu-700 hover:bg-feishu-50"
          >
            进入飞书文档处理
          </Link>
        </div>
      </div>

      {/* 功能对比说明 */}
      <div className="card p-8 bg-gradient-to-r from-gray-50 to-blue-50 mb-12">
        <h3 className="text-2xl font-semibold text-gray-900 text-center mb-8">
          选择适合您的文档处理方式
        </h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-blue-700 mb-4">本地文档处理适用于：</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• 需要快速生成标准化合同文档</li>
              <li>• 对数据隐私有严格要求</li>
              <li>• 不需要团队协作功能</li>
              <li>• 希望离线使用的场景</li>
              <li>• 基于模板的批量文档生成</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-feishu-700 mb-4">飞书文档处理适用于：</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• 需要团队协作和云端同步</li>
              <li>• 已有飞书文档需要更新</li>
              <li>• 需要OCR图片识别功能</li>
              <li>• 希望智能化文本替换</li>
              <li>• 多人协作编辑的场景</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 安全保障 */}
      <div className="card p-8 text-center bg-gradient-to-r from-green-50 to-blue-50">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          🔒 安全可靠的文档处理
        </h3>
        <p className="text-gray-600 mb-6">
          无论选择哪种处理方式，我们都确保您的数据安全和隐私保护
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>本地处理保护隐私</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>飞书官方API认证</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>数据加密传输</span>
          </div>
        </div>
      </div>
    </div>
  );
}
