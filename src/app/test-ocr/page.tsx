'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { OCRTester } from '@/components/ocr/OCRTester';

export default function TestOCRPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              OCR功能测试
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              使用此工具测试Gemini Vision API的OCR功能，包括基础文字识别和智能合同信息提取。
            </p>
          </div>
          
          <OCRTester />
          
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🔧 技术信息
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">当前配置</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• OCR引擎: Google Gemini 1.5 Flash</li>
                    <li>• 支持语言: 中文、英文</li>
                    <li>• 最大文件大小: 10MB</li>
                    <li>• 支持格式: JPEG, PNG, GIF, WebP</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">API端点</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 基础OCR: <code>/api/ocr/extract</code></li>
                    <li>• 合同提取: <code>/api/ocr/contract</code></li>
                    <li>• 认证方式: Cookie (access_token)</li>
                    <li>• 请求方式: POST (multipart/form-data)</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">✅ 功能特性</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-green-700">
                  <div>
                    <p className="font-medium mb-1">基础OCR功能:</p>
                    <ul className="space-y-1">
                      <li>• 高精度文字识别</li>
                      <li>• 保持原文格式</li>
                      <li>• 支持表格识别</li>
                      <li>• 多语言支持</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">智能合同提取:</p>
                    <ul className="space-y-1">
                      <li>• 自动识别甲乙方</li>
                      <li>• 提取合同金额</li>
                      <li>• 识别重要日期</li>
                      <li>• 生成替换规则</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
