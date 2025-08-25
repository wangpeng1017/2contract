'use client';

import { useState } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, Settings, Download, Upload } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface RuleEditorProps {
  onNext?: () => void;
}

export function RuleEditor({ onNext }: RuleEditorProps) {
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    searchText: '',
    replaceText: '',
    caseSensitive: false,
    wholeWord: false,
    priority: 0
  });

  const { rules, addRule, updateRule, deleteRule, toggleRule, clearRules, importRules } = useAppStore();

  const handleAddRule = () => {
    if (newRule.searchText.trim() && newRule.replaceText.trim()) {
      addRule({
        ...newRule,
        enabled: true
      });
      setNewRule({
        searchText: '',
        replaceText: '',
        caseSensitive: false,
        wholeWord: false,
        priority: 0
      });
      setIsAddingRule(false);
    }
  };

  const handleEditRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setNewRule({
        searchText: rule.searchText,
        replaceText: rule.replaceText,
        caseSensitive: rule.caseSensitive,
        wholeWord: rule.wholeWord,
        priority: rule.priority
      });
      setEditingRule(ruleId);
      setIsAddingRule(true);
    }
  };

  const handleUpdateRule = () => {
    if (editingRule && newRule.searchText.trim() && newRule.replaceText.trim()) {
      updateRule(editingRule, newRule);
      setNewRule({
        searchText: '',
        replaceText: '',
        caseSensitive: false,
        wholeWord: false,
        priority: 0
      });
      setEditingRule(null);
      setIsAddingRule(false);
    }
  };

  const handleCancelEdit = () => {
    setNewRule({
      searchText: '',
      replaceText: '',
      caseSensitive: false,
      wholeWord: false,
      priority: 0
    });
    setEditingRule(null);
    setIsAddingRule(false);
  };

  const exportRules = () => {
    const dataStr = JSON.stringify(rules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `replacement-rules-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importRulesFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedRules = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedRules)) {
            importRules(importedRules);
          }
        } catch (error) {
          console.error('导入规则失败:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const enabledRulesCount = rules.filter(rule => rule.enabled).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Edit3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">设置替换规则</h2>
            <p className="text-gray-600">
              配置文本替换规则 ({enabledRulesCount}/{rules.length} 个规则已启用)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".json"
            onChange={importRulesFromFile}
            className="hidden"
            id="import-rules"
          />
          <label
            htmlFor="import-rules"
            className="btn-secondary flex items-center space-x-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>导入</span>
          </label>
          
          <button
            onClick={exportRules}
            className="btn-secondary flex items-center space-x-2"
            disabled={rules.length === 0}
          >
            <Download className="w-4 h-4" />
            <span>导出</span>
          </button>

          <button
            onClick={() => setIsAddingRule(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>添加规则</span>
          </button>
        </div>
      </div>

      {/* 添加/编辑规则表单 */}
      {isAddingRule && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingRule ? '编辑规则' : '添加新规则'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索文本
              </label>
              <input
                type="text"
                value={newRule.searchText}
                onChange={(e) => setNewRule({ ...newRule, searchText: e.target.value })}
                placeholder="要替换的文本"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                替换文本
              </label>
              <input
                type="text"
                value={newRule.replaceText}
                onChange={(e) => setNewRule({ ...newRule, replaceText: e.target.value })}
                placeholder="替换后的文本"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newRule.caseSensitive}
                onChange={(e) => setNewRule({ ...newRule, caseSensitive: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">区分大小写</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newRule.wholeWord}
                onChange={(e) => setNewRule({ ...newRule, wholeWord: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">全词匹配</span>
            </label>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">优先级:</label>
              <input
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancelEdit}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={editingRule ? handleUpdateRule : handleAddRule}
              className="btn-primary"
              disabled={!newRule.searchText.trim() || !newRule.replaceText.trim()}
            >
              {editingRule ? '更新规则' : '添加规则'}
            </button>
          </div>
        </div>
      )}

      {/* 规则列表 */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Edit3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无替换规则</p>
            <p className="text-sm">点击"添加规则"开始配置</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 border rounded-lg ${
                rule.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`p-1 rounded ${
                        rule.enabled ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {rule.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                          {rule.searchText}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                          {rule.replaceText}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {rule.caseSensitive && <span>区分大小写</span>}
                        {rule.wholeWord && <span>全词匹配</span>}
                        <span>优先级: {rule.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditRule(rule.id)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 批量操作 */}
      {rules.length > 0 && (
        <div className="mt-6 flex justify-between items-center pt-4 border-t">
          <button
            onClick={clearRules}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            清空所有规则
          </button>
          
          {enabledRulesCount > 0 && onNext && (
            <button
              onClick={onNext}
              className="btn-primary"
            >
              继续下一步 ({enabledRulesCount} 个规则)
            </button>
          )}
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 规则配置提示</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 优先级数字越小，执行顺序越靠前</li>
          <li>• 区分大小写：严格匹配字母大小写</li>
          <li>• 全词匹配：只匹配完整的单词</li>
          <li>• 可以导出规则保存，下次使用时导入</li>
          <li>• 建议先预览替换结果再执行</li>
        </ul>
      </div>
    </div>
  );
}
