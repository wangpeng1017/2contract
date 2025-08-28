'use client';

import { useState } from 'react';
import { ArrowLeft, Scale, Download, Copy, Share2 } from 'lucide-react';
import Link from 'next/link';
import { ClauseGenerator } from '@/components/ai/ClauseGenerator';

interface GeneratedClause {
  title: string;
  content: string;
  type: string;
  confidence: number;
  legalBasis?: string;
  risks?: string[];
  suggestions?: string[];
}

export default function AIClausesPage() {
  const [generatedClauses, setGeneratedClauses] = useState<GeneratedClause[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);

  const handleClauseGenerated = (clauses: GeneratedClause[]) => {
    setGeneratedClauses(clauses);
    setShowGenerator(false);
  };

  const handleCopyClause = (clause: GeneratedClause) => {
    const text = `${clause.title}\n\n${clause.content}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('条款已复制到剪贴板');
    });
  };

  const handleCopyAllClauses = () => {
    const text = generatedClauses.map(clause => 
      `${clause.title}\n\n${clause.content}`
    ).join('\n\n---\n\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert('所有条款已复制到剪贴板');
    });
  };

  const handleDownloadClauses = () => {
    const text = generatedClauses.map(clause => 
      `${clause.title}\n\n${clause.content}\n\n类型：${clause.type}\n置信度：${Math.round(clause.confidence * 100)}%${
        clause.legalBasis ? `\n法律依据：${clause.legalBasis}` : ''
      }${
        clause.risks && clause.risks.length > 0 ? `\n潜在风险：${clause.risks.join('；')}` : ''
      }${
        clause.suggestions && clause.suggestions.length > 0 ? `\n优化建议：${clause.suggestions.join('；')}` : ''
      }`
    ).join('\n\n' + '='.repeat(50) + '\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI生成条款_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 头部导航 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/local-docs"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            返回文档处理
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Scale size={20} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI智能条款生成</h1>
              <p className="text-gray-600">基于人工智能技术生成专业法律条款</p>
            </div>
          </div>
        </div>
      </div>

      {/* 功能介绍 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Scale size={24} className="text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">智能生成</h3>
            <p className="text-sm text-gray-600">基于AI技术，根据需求描述自动生成专业法律条款</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Share2 size={24} className="text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">多种类型</h3>
            <p className="text-sm text-gray-600">支持保密、责任、终止、争议解决等多种条款类型</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Download size={24} className="text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">质量保证</h3>
            <p className="text-sm text-gray-600">提供置信度评估、风险提示和优化建议</p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      {generatedClauses.length === 0 ? (
        // 空状态
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Scale size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-4">开始生成智能条款</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            描述您的需求，AI将为您生成专业的法律条款，包括保密条款、责任条款、争议解决条款等
          </p>
          <button
            onClick={() => setShowGenerator(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg transition-colors inline-flex items-center"
          >
            <Scale size={20} className="mr-2" />
            开始生成条款
          </button>
        </div>
      ) : (
        // 条款展示
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              生成的条款 ({generatedClauses.length})
            </h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowGenerator(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                重新生成
              </button>
              <button
                onClick={handleCopyAllClauses}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm inline-flex items-center"
              >
                <Copy size={16} className="mr-2" />
                复制全部
              </button>
              <button
                onClick={handleDownloadClauses}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm inline-flex items-center"
              >
                <Download size={16} className="mr-2" />
                下载条款
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {generatedClauses.map((clause, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{clause.title}</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">类型: {clause.type}</span>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500">置信度: </span>
                        <div className={`text-sm px-2 py-1 rounded ml-1 ${
                          clause.confidence >= 0.8 
                            ? 'bg-green-100 text-green-800'
                            : clause.confidence >= 0.6
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(clause.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyClause(clause)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="复制条款"
                  >
                    <Copy size={20} />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{clause.content}</p>
                </div>

                {clause.legalBasis && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">法律依据</h4>
                    <p className="text-sm text-blue-800">{clause.legalBasis}</p>
                  </div>
                )}

                {clause.risks && clause.risks.length > 0 && (
                  <div className="mb-3 p-3 bg-red-50 rounded-lg">
                    <h4 className="text-sm font-medium text-red-900 mb-1">潜在风险</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {clause.risks.map((risk, riskIndex) => (
                        <li key={riskIndex}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {clause.suggestions && clause.suggestions.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-1">优化建议</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      {clause.suggestions.map((suggestion, suggestionIndex) => (
                        <li key={suggestionIndex}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 免责声明 */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">重要声明</h4>
            <p className="text-sm text-yellow-800">
              AI生成的条款仅供参考，不构成法律建议。在正式使用前，请务必咨询专业法律顾问，
              确保条款符合您的具体情况和相关法律法规要求。使用AI生成的条款所产生的任何法律后果，
              由使用者自行承担。
            </p>
          </div>
        </div>
      )}

      {/* 条款生成器弹窗 */}
      {showGenerator && (
        <ClauseGenerator
          onClauseGenerated={handleClauseGenerated}
          documentType="合同协议"
          existingClauses={generatedClauses.map(c => c.content)}
        />
      )}
    </div>
  );
}
