'use client';

import { FileText, Cloud, Download, Zap, Shield, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {

  return (
    <div className="max-w-6xl mx-auto">
      {/* 欢迎区域 - 压缩高度 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          智能文档处理助手
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          提供本地文档处理和飞书云文档处理两种解决方案
        </p>
        <p className="text-sm text-gray-500">
          选择适合您需求的文档处理方式，提升工作效率
        </p>
      </div>

      {/* 核心功能模块 - 压缩间距 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* 本地文档处理模块 */}
        <div className="card p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              本地文档处理
            </h2>
            <p className="text-sm text-gray-600">
              智能合同模板填充系统，无需注册，本地处理
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">上传Word模板文件</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">自动识别占位符</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">动态生成填写表单</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">一键生成完整文档</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="flex items-center space-x-1">
              <Shield size={14} className="text-green-600" />
              <span className="text-xs text-gray-600">无需注册</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download size={14} className="text-green-600" />
              <span className="text-xs text-gray-600">本地处理</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap size={14} className="text-green-600" />
              <span className="text-xs text-gray-600">即时生成</span>
            </div>
          </div>

          <Link
            href="/local-docs"
            className="btn-primary w-full text-center block py-2 text-base font-semibold"
          >
            开始使用本地处理
          </Link>
        </div>

        {/* 飞书文档处理模块 */}
        <div className="card p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Cloud size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              飞书文档处理
            </h2>
            <p className="text-sm text-gray-600">
              云端协作文档智能更新，OCR识别与文本替换
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-700">飞书账号登录</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-700">OCR图片识别</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-700">智能文本替换</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-700">云端文档更新</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="flex items-center space-x-1">
              <Users size={14} className="text-blue-600" />
              <span className="text-xs text-gray-600">团队协作</span>
            </div>
            <div className="flex items-center space-x-1">
              <Cloud size={14} className="text-blue-600" />
              <span className="text-xs text-gray-600">云端同步</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap size={14} className="text-blue-600" />
              <span className="text-xs text-gray-600">智能识别</span>
            </div>
          </div>

          <Link
            href="/workspace"
            className="btn-secondary w-full text-center block py-2 text-base font-semibold border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            进入飞书文档处理
          </Link>
        </div>
      </div>

      {/* 功能对比说明 - 压缩版本 */}
      <div className="card p-4 bg-gradient-to-r from-gray-50 to-blue-50 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
          选择适合您的文档处理方式
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-blue-700 mb-2">本地文档处理适用于：</h4>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>• 需要快速生成标准化合同文档</li>
              <li>• 对数据隐私有严格要求</li>
              <li>• 不需要团队协作功能</li>
              <li>• 希望离线使用的场景</li>
              <li>• 基于模板的批量文档生成</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-700 mb-2">飞书文档处理适用于：</h4>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>• 需要团队协作和云端同步</li>
              <li>• 已有飞书文档需要更新</li>
              <li>• 需要OCR图片识别功能</li>
              <li>• 希望智能化文本替换</li>
              <li>• 多人协作编辑的场景</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
