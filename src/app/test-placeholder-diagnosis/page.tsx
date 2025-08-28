/**
 * 占位符诊断测试页面
 * 用于测试和验证占位符替换问题的诊断功能
 */

'use client';

import React, { useState } from 'react';
import { Upload, FileText, Search, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface DiagnosisResult {
  templateInfo: {
    name: string;
    size: number;
    placeholderCount: number;
  };
  dataInfo: {
    keyCount: number;
    keys: string[];
  };
  matchingAnalysis: {
    totalPlaceholders: number;
    totalDataKeys: number;
    matchedCount: number;
    unmatchedTemplateCount: number;
    unmatchedDataCount: number;
    matchingRate: string;
  };
  details: {
    templatePlaceholders: string[];
    dataKeys: string[];
    matchedKeys: string[];
    unmatchedTemplateKeys: string[];
    unmatchedDataKeys: string[];
  };
  recommendations: string[];
  xmlSample: string;
}

export default function PlaceholderDiagnosisTest() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [testData, setTestData] = useState<string>('{\n  "甲方公司名称": "测试公司A",\n  "乙方公司名称": "测试公司B",\n  "合同金额": "100000",\n  "签署日期": "2024-01-01",\n  "产品清单": [\n    {"产品名称": "产品A", "数量": 10, "单价": 1000},\n    {"产品名称": "产品B", "数量": 5, "单价": 2000}\n  ]\n}');
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.docx')) {
      setTemplateFile(file);
      setError(null);
    } else {
      setError('请选择.docx格式的Word文档');
    }
  };

  const runDiagnosis = async () => {
    if (!templateFile) {
      setError('请先选择模板文件');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(testData);
    } catch (err) {
      setError('测试数据JSON格式无效');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('template', templateFile);
      formData.append('data', JSON.stringify(parsedData));

      const response = await fetch('/api/local-docs/diagnose', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setDiagnosisResult(result.data);
      } else {
        setError(result.error?.message || '诊断失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '诊断请求失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchingRateColor = (rate: string) => {
    const percentage = parseFloat(rate);
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMatchingRateIcon = (rate: string) => {
    const percentage = parseFloat(rate);
    if (percentage >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (percentage >= 70) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-6">
            <Search className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">占位符诊断测试</h1>
          </div>

          {/* 输入区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 模板文件上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Word模板文件
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="template-upload"
                />
                <label
                  htmlFor="template-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {templateFile ? templateFile.name : '点击选择.docx文件'}
                  </span>
                </label>
              </div>
            </div>

            {/* 测试数据 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                测试数据 (JSON格式)
              </label>
              <textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="输入测试数据..."
              />
            </div>
          </div>

          {/* 诊断按钮 */}
          <div className="flex justify-center mb-6">
            <button
              onClick={runDiagnosis}
              disabled={isLoading || !templateFile}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  诊断中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  开始诊断
                </>
              )}
            </button>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* 诊断结果 */}
          {diagnosisResult && (
            <div className="space-y-6">
              {/* 概览 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-900 mb-3">诊断概览</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {diagnosisResult.templateInfo.placeholderCount}
                    </div>
                    <div className="text-sm text-gray-600">模板占位符</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {diagnosisResult.dataInfo.keyCount}
                    </div>
                    <div className="text-sm text-gray-600">数据字段</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {diagnosisResult.matchingAnalysis.matchedCount}
                    </div>
                    <div className="text-sm text-gray-600">匹配成功</div>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className={`text-2xl font-bold flex items-center ${getMatchingRateColor(diagnosisResult.matchingAnalysis.matchingRate)}`}>
                      {getMatchingRateIcon(diagnosisResult.matchingAnalysis.matchingRate)}
                      <span className="ml-1">{diagnosisResult.matchingAnalysis.matchingRate}</span>
                    </div>
                    <div className="text-sm text-gray-600">匹配率</div>
                  </div>
                </div>
              </div>

              {/* 详细分析 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 匹配成功 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">
                    ✅ 匹配成功 ({diagnosisResult.details.matchedKeys.length})
                  </h3>
                  <div className="space-y-1">
                    {diagnosisResult.details.matchedKeys.map((key, index) => (
                      <div key={index} className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                        {key}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 未匹配的模板占位符 */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">
                    ❌ 模板中未匹配 ({diagnosisResult.details.unmatchedTemplateKeys.length})
                  </h3>
                  <div className="space-y-1">
                    {diagnosisResult.details.unmatchedTemplateKeys.map((key, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-100 px-2 py-1 rounded">
                        {key}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 未匹配的数据字段 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                    ⚠️ 数据中未匹配 ({diagnosisResult.details.unmatchedDataKeys.length})
                  </h3>
                  <div className="space-y-1">
                    {diagnosisResult.details.unmatchedDataKeys.map((key, index) => (
                      <div key={index} className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                        {key}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 建议 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 建议</h3>
                  <div className="space-y-2">
                    {diagnosisResult.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm text-blue-700">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* XML样本 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📄 XML内容样本</h3>
                <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                  {diagnosisResult.xmlSample}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
