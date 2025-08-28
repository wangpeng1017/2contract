'use client';

import React, { useState } from 'react';
import { Upload, Play, AlertTriangle, CheckCircle, Info, Bug } from 'lucide-react';

export default function DebugGenerationPage() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<string>('');
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTemplateFile(file);
      setError(null);
    }
  };

  const handleDebug = async () => {
    if (!templateFile) {
      setError('请选择模板文件');
      return;
    }

    if (!formData.trim()) {
      setError('请输入表单数据');
      return;
    }

    let parsedFormData;
    try {
      parsedFormData = JSON.parse(formData);
    } catch (err) {
      setError('表单数据格式错误，请输入有效的JSON');
      return;
    }

    setIsDebugging(true);
    setError(null);
    setDebugResult(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('template', templateFile);
      formDataObj.append('formData', JSON.stringify(parsedFormData));

      const response = await fetch('/api/local-docs/debug-generation', {
        method: 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        throw new Error(`调试请求失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDebugResult(result.data);
      } else {
        throw new Error(result.message || '调试失败');
      }
    } catch (err) {
      console.error('调试失败:', err);
      setError(err instanceof Error ? err.message : '调试失败');
    } finally {
      setIsDebugging(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="text-green-600" size={20} />
    ) : (
      <AlertTriangle className="text-red-600" size={20} />
    );
  };

  const getReplacementRateColor = (rate: number) => {
    if (rate >= 100) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* 头部 */}
          <div className="flex items-center mb-6">
            <Bug className="text-blue-600 mr-3" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">文档生成调试工具</h1>
              <p className="text-gray-600">深度诊断文档生成过程，定位字段替换问题</p>
            </div>
          </div>

          {/* 输入区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 模板文件上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板文件
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="template-upload"
                />
                <label
                  htmlFor="template-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="text-gray-400 mb-2" size={32} />
                  <span className="text-sm text-gray-600">
                    {templateFile ? templateFile.name : '点击选择Word模板文件'}
                  </span>
                </label>
              </div>
            </div>

            {/* 表单数据输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                表单数据 (JSON格式)
              </label>
              <textarea
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                placeholder={`{
  "甲方公司名称": "北京科技有限公司",
  "乙方公司名称": "上海贸易有限公司",
  "合同编号": "HT-2024-001",
  "合同金额": "100000"
}`}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="text-red-600 mr-3" size={20} />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* 调试按钮 */}
          <div className="mb-6">
            <button
              onClick={handleDebug}
              disabled={isDebugging}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="mr-2" size={20} />
              {isDebugging ? '调试中...' : '开始调试'}
            </button>
          </div>

          {/* 调试结果 */}
          {debugResult && (
            <div className="space-y-6">
              {/* 环境信息 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Info className="mr-2" size={20} />
                  环境信息
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Node版本:</span>
                    <div className="font-mono">{debugResult.environment.nodeVersion}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">平台:</span>
                    <div className="font-mono">{debugResult.environment.platform}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">架构:</span>
                    <div className="font-mono">{debugResult.environment.arch}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">模板大小:</span>
                    <div className="font-mono">{debugResult.environment.templateSize} bytes</div>
                  </div>
                </div>
              </div>

              {/* 占位符信息 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">占位符解析</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {debugResult.placeholders.count}
                    </div>
                    <div className="text-sm text-gray-600">识别到的占位符</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600 mb-2">占位符列表:</div>
                    <div className="flex flex-wrap gap-2">
                      {debugResult.placeholders.names.map((name: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 数据匹配分析 */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">数据匹配分析</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {debugResult.dataMatching.matched}
                    </div>
                    <div className="text-sm text-gray-600">匹配成功</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {debugResult.dataMatching.unmatched.length}
                    </div>
                    <div className="text-sm text-gray-600">未匹配</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {debugResult.dataMatching.extraFields.length}
                    </div>
                    <div className="text-sm text-gray-600">多余字段</div>
                  </div>
                </div>

                {debugResult.dataMatching.unmatched.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">未匹配的占位符:</div>
                    <div className="space-y-1">
                      {debugResult.dataMatching.unmatched.map((item: any, index: number) => (
                        <div key={index} className="text-sm text-red-600">
                          • {item.name} ({item.type})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 生成结果 */}
              <div className={`rounded-lg p-4 ${
                debugResult.generation.success ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  {getStatusIcon(debugResult.generation.success)}
                  <span className="ml-2">文档生成结果</span>
                </h3>

                {debugResult.generation.success ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {debugResult.generation.documentSize}
                        </div>
                        <div className="text-sm text-gray-600">文档大小 (bytes)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {debugResult.generation.analysis.remainingCount}
                        </div>
                        <div className="text-sm text-gray-600">剩余占位符</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getReplacementRateColor(debugResult.generation.analysis.replacementRate)}`}>
                          {debugResult.generation.analysis.replacementRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">替换成功率</div>
                      </div>
                    </div>

                    {debugResult.generation.analysis.remainingPlaceholders.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">剩余的占位符:</div>
                        <div className="flex flex-wrap gap-2">
                          {debugResult.generation.analysis.remainingPlaceholders.map((placeholder: string, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs"
                            >
                              {placeholder}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-700">
                    <div className="font-medium">生成失败:</div>
                    <div className="mt-2 text-sm">{debugResult.generation.error.message}</div>
                  </div>
                )}
              </div>

              {/* 修复建议 */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">修复建议</h3>
                <ul className="space-y-2">
                  {debugResult.recommendations.map((recommendation: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span className="text-sm text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
