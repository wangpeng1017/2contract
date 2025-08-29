'use client';

import React, { useState } from 'react';
import { Upload, RefreshCw, AlertTriangle, CheckCircle, FileText, Trash2, Download } from 'lucide-react';
import Link from 'next/link';

interface AnalysisResult {
  placeholders: any[];
  analysis: any;
  comparison: any;
  debugInfo: any;
  fileHash: string;
}

export default function TemplateCacheFixPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError('');
    }
  };

  const handleForceReparse = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('template', file);
      formData.append('forceReparse', 'true');
      formData.append('clearCache', 'true');

      const response = await fetch('/api/local-docs/force-reparse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || '强制解析失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearBrowserCache = () => {
    // 清除localStorage中的模板相关缓存
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('template') || key.includes('placeholder') || key.includes('word')
    );
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // 清除sessionStorage
    const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
      key.includes('template') || key.includes('placeholder') || key.includes('word')
    );
    
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

    alert(`已清除 ${keysToRemove.length + sessionKeysToRemove.length} 个缓存项`);
  };

  const downloadDiagnosisScript = () => {
    const script = `
// Word模板缓存问题诊断脚本
// 在浏览器控制台中运行此脚本

console.log('🔍 开始诊断Word模板缓存问题...');

// 1. 检查localStorage
const localStorageKeys = Object.keys(localStorage);
console.log('📦 localStorage项目数:', localStorageKeys.length);

const templateRelatedKeys = localStorageKeys.filter(key => 
  key.includes('template') || key.includes('placeholder') || key.includes('word')
);

if (templateRelatedKeys.length > 0) {
  console.log('🎯 发现模板相关缓存:', templateRelatedKeys);
  templateRelatedKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(\`  - \${key}: \${value ? value.substring(0, 100) + '...' : 'null'}\`);
  });
} else {
  console.log('✅ localStorage中无模板相关缓存');
}

// 2. 检查sessionStorage
const sessionStorageKeys = Object.keys(sessionStorage);
console.log('📦 sessionStorage项目数:', sessionStorageKeys.length);

const sessionTemplateKeys = sessionStorageKeys.filter(key => 
  key.includes('template') || key.includes('placeholder') || key.includes('word')
);

if (sessionTemplateKeys.length > 0) {
  console.log('🎯 发现会话相关缓存:', sessionTemplateKeys);
} else {
  console.log('✅ sessionStorage中无模板相关缓存');
}

// 3. 检查Cache API
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    console.log('💾 发现缓存存储:', cacheNames);
    const templateCaches = cacheNames.filter(name => 
      name.includes('template') || name.includes('word')
    );
    if (templateCaches.length > 0) {
      console.log('🎯 发现模板相关缓存存储:', templateCaches);
    } else {
      console.log('✅ 无模板相关缓存存储');
    }
  });
}

// 4. 清理建议
console.log('\\n💡 清理建议:');
console.log('1. 运行以下命令清理localStorage:');
console.log('   templateRelatedKeys.forEach(key => localStorage.removeItem(key));');
console.log('2. 运行以下命令清理sessionStorage:');
console.log('   sessionTemplateKeys.forEach(key => sessionStorage.removeItem(key));');
console.log('3. 按 Ctrl+Shift+Delete 清理浏览器缓存');
console.log('4. 重命名Word文件后重新上传');

console.log('\\n🎉 诊断完成！');
`;

    const blob = new Blob([script], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_cache_diagnosis.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 页面头部 */}
        <div className="flex items-center mb-6">
          <Link href="/local-docs" className="text-blue-600 hover:text-blue-800 mr-4">
            ← 返回本地文档处理
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Word模板缓存问题修复工具
          </h1>
        </div>

        {/* 问题说明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-600 mr-3 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">遇到占位符缓存问题？</h3>
              <p className="text-yellow-700 text-sm">
                如果您修改了Word模板文件，但系统仍然显示旧的占位符名称，这个工具可以帮您解决问题。
              </p>
            </div>
          </div>
        </div>

        {/* 快速解决方案 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Trash2 className="mr-2 text-red-500" size={20} />
              清除浏览器缓存
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              清除可能导致问题的浏览器缓存数据
            </p>
            <button
              onClick={clearBrowserCache}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
            >
              立即清除缓存
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Download className="mr-2 text-blue-500" size={20} />
              下载诊断脚本
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              下载浏览器控制台诊断脚本，深度分析缓存问题
            </p>
            <button
              onClick={downloadDiagnosisScript}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              下载诊断脚本
            </button>
          </div>
        </div>

        {/* 强制重新解析 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <RefreshCw className="mr-2 text-green-500" size={20} />
            强制重新解析模板
          </h3>
          
          <div className="space-y-4">
            {/* 文件上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传修改后的Word模板
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="template-upload"
                />
                <label htmlFor="template-upload" className="cursor-pointer">
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-600">
                    {file ? file.name : '点击选择或拖拽Word文档'}
                  </p>
                </label>
              </div>
            </div>

            {/* 处理按钮 */}
            {file && (
              <button
                onClick={handleForceReparse}
                disabled={isProcessing}
                className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" size={20} />
                    正在强制重新解析...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2" size={20} />
                    强制重新解析
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="text-red-600 mr-3 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">处理失败</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 结果显示 */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="mr-2 text-green-500" size={20} />
              强制解析结果
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 占位符信息 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">识别到的占位符</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    共发现 <span className="font-semibold">{result.placeholders.length}</span> 个占位符
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.placeholders.map((placeholder, index) => (
                      <div key={index} className="text-sm bg-white rounded px-2 py-1">
                        <span className="font-mono text-blue-600">{placeholder.name}</span>
                        {placeholder.description && (
                          <span className="text-gray-500 ml-2">- {placeholder.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 分析信息 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">详细分析</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">文件哈希:</span>
                    <span className="font-mono ml-2">{result.fileHash}</span>
                  </div>
                  {result.analysis && (
                    <>
                      <div className="text-sm">
                        <span className="text-gray-600">XML长度:</span>
                        <span className="ml-2">{result.analysis.xmlLength?.toLocaleString()} 字符</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">文本元素:</span>
                        <span className="ml-2">{result.analysis.textElements?.length || 0} 个</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">原始占位符:</span>
                        <span className="ml-2">{result.analysis.rawPlaceholders?.length || 0} 个</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">分割占位符:</span>
                        <span className="ml-2">{result.analysis.fragmentedPlaceholders?.length || 0} 个</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 比较结果 */}
            {result.comparison && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-800 mb-3">解析质量分析</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-blue-600">
                        {result.comparison.analysisFound}
                      </div>
                      <div className="text-xs text-gray-600">分析发现</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        {result.comparison.parserFound}
                      </div>
                      <div className="text-xs text-gray-600">解析器识别</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-purple-600">
                        {result.comparison.fragmentedFound}
                      </div>
                      <div className="text-xs text-gray-600">分割重组</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-600">
                        {Math.round(result.comparison.matchRate * 100)}%
                      </div>
                      <div className="text-xs text-gray-600">匹配率</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 使用建议 */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">✅ 解析成功！</h4>
              <p className="text-blue-700 text-sm">
                现在您可以使用这些最新识别的占位符进行文档生成。如果结果符合预期，
                说明缓存问题已解决。您可以返回到 
                <Link href="/local-docs" className="underline font-medium">本地文档处理页面</Link> 
                继续使用。
              </p>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <h3 className="font-semibold text-gray-900 mb-4">使用说明</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">1</span>
              <p>首先尝试"清除浏览器缓存"，这能解决大部分缓存问题</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">2</span>
              <p>如果问题持续，使用"强制重新解析"功能上传您修改后的Word文档</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">3</span>
              <p>查看解析结果，确认新的占位符是否正确识别</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">4</span>
              <p>如果仍有问题，下载诊断脚本进行深度分析</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
