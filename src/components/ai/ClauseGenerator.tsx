'use client';

import { useState, useEffect } from 'react';
import { Scale, FileText, AlertTriangle, CheckCircle, Lightbulb, BookOpen, Plus, X } from 'lucide-react';

interface ClauseGeneratorProps {
  onClauseGenerated: (clauses: GeneratedClause[]) => void;
  documentType?: string;
  existingClauses?: string[];
}

interface GeneratedClause {
  title: string;
  content: string;
  type: string;
  confidence: number;
  legalBasis?: string;
  risks?: string[];
  suggestions?: string[];
}

interface ClauseTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  template: string;
}

export function ClauseGenerator({ onClauseGenerated, documentType = '合同', existingClauses = [] }: ClauseGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requirement, setRequirement] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState(documentType);
  const [legalJurisdiction, setLegalJurisdiction] = useState('中华人民共和国');
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    type: '',
    industry: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedClauses, setGeneratedClauses] = useState<GeneratedClause[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [clauseTemplates, setClauseTemplates] = useState<ClauseTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  // 文档类型选项
  const documentTypes = [
    '合同协议',
    '劳动合同',
    '服务协议',
    '采购合同',
    '销售合同',
    '保密协议',
    '合作协议',
    '租赁合同',
    '其他'
  ];

  // 加载条款模板
  useEffect(() => {
    loadClauseTemplates();
  }, []);

  const loadClauseTemplates = async () => {
    try {
      const response = await fetch('/api/local-docs/ai-clauses/templates');
      if (response.ok) {
        const result = await response.json();
        setClauseTemplates(result.data.templates || []);
      }
    } catch (error) {
      console.error('加载条款模板失败:', error);
    }
  };

  const handleGenerateClauses = async () => {
    if (!requirement.trim()) {
      alert('请输入条款需求描述');
      return;
    }

    setIsGenerating(true);
    
    try {
      const requestBody = {
        requirement,
        documentType: selectedDocumentType,
        context: `现有条款数量: ${existingClauses.length}`,
        existingClauses,
        legalJurisdiction,
        companyInfo: companyInfo.name ? companyInfo : undefined
      };

      const response = await fetch('/api/local-docs/ai-clauses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '条款生成失败');
      }

      const result = await response.json();
      const { clauses, warnings: aiWarnings, recommendations: aiRecommendations } = result.data;

      setGeneratedClauses(clauses);
      setWarnings(aiWarnings || []);
      setRecommendations(aiRecommendations || []);

      // 通知父组件
      onClauseGenerated(clauses);

    } catch (error) {
      console.error('条款生成失败:', error);
      alert(`条款生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (selectedTemplates.includes(templateId)) {
      setSelectedTemplates(prev => prev.filter(id => id !== templateId));
    } else {
      setSelectedTemplates(prev => [...prev, templateId]);
    }
  };

  const insertTemplateRequirement = () => {
    const selectedTemplateNames = clauseTemplates
      .filter(t => selectedTemplates.includes(t.id))
      .map(t => t.title)
      .join('、');
    
    if (selectedTemplateNames) {
      const templateRequirement = `请生成以下类型的条款：${selectedTemplateNames}`;
      setRequirement(prev => prev ? `${prev}\n\n${templateRequirement}` : templateRequirement);
      setSelectedTemplates([]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
      >
        <Scale size={16} className="mr-2" />
        AI智能条款生成
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Scale size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI智能条款生成</h2>
              <p className="text-sm text-gray-600">基于AI技术生成专业法律条款</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                文档类型
              </label>
              <select
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                法律管辖区
              </label>
              <select
                value={legalJurisdiction}
                onChange={(e) => setLegalJurisdiction(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="中华人民共和国">中华人民共和国</option>
                <option value="香港特别行政区">香港特别行政区</option>
                <option value="澳门特别行政区">澳门特别行政区</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          {/* 公司信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">公司信息（可选）</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">公司名称</label>
                <input
                  type="text"
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入公司名称"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">公司类型</label>
                <select
                  value={companyInfo.type}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">请选择</option>
                  <option value="有限责任公司">有限责任公司</option>
                  <option value="股份有限公司">股份有限公司</option>
                  <option value="个人独资企业">个人独资企业</option>
                  <option value="合伙企业">合伙企业</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">行业</label>
                <input
                  type="text"
                  value={companyInfo.industry}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="如：科技、金融、制造"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 条款模板选择 */}
          {clauseTemplates.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">常用条款模板</h3>
                {selectedTemplates.length > 0 && (
                  <button
                    onClick={insertTemplateRequirement}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    插入选中模板 ({selectedTemplates.length})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {clauseTemplates.map(template => (
                  <label
                    key={template.id}
                    className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${
                      selectedTemplates.includes(template.id)
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleTemplateSelect(template.id)}
                      className="mr-2"
                    />
                    <div>
                      <div className="text-xs font-medium">{template.title}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 需求描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              条款需求描述 *
            </label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="请详细描述您需要的条款内容，例如：&#10;- 需要一个保密条款，保护双方的商业机密&#10;- 添加违约责任条款，明确违约后果&#10;- 包含争议解决条款，优先仲裁解决"
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              请尽量详细描述您的需求，AI将根据描述生成相应的法律条款
            </p>
          </div>

          {/* 生成按钮 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleGenerateClauses}
              disabled={isGenerating || !requirement.trim()}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  生成中...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  生成条款
                </>
              )}
            </button>
          </div>

          {/* 生成结果 */}
          {generatedClauses.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">生成的条款</h3>
              
              {/* 警告和建议 */}
              {warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertTriangle size={16} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">重要提醒</h4>
                      <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                        {warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <Lightbulb size={16} className="text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">建议</h4>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        {recommendations.map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 条款列表 */}
              <div className="space-y-4">
                {generatedClauses.map((clause, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{clause.title}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">类型: {clause.type}</span>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500">置信度: </span>
                            <div className={`text-xs px-2 py-1 rounded ml-1 ${
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
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{clause.content}</p>
                    </div>

                    {clause.legalBasis && (
                      <div className="text-xs text-gray-600 mb-2">
                        <strong>法律依据：</strong> {clause.legalBasis}
                      </div>
                    )}

                    {clause.risks && clause.risks.length > 0 && (
                      <div className="text-xs text-red-600 mb-2">
                        <strong>潜在风险：</strong> {clause.risks.join('；')}
                      </div>
                    )}

                    {clause.suggestions && clause.suggestions.length > 0 && (
                      <div className="text-xs text-blue-600">
                        <strong>优化建议：</strong> {clause.suggestions.join('；')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>免责声明：</strong> 
                  AI生成的条款仅供参考，不构成法律建议。请在使用前咨询专业法律顾问，确保条款符合具体情况和法律要求。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
