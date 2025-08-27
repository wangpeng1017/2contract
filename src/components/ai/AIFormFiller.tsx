'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, CheckCircle, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';
import { PlaceholderInfo } from '@/lib/word-processor';

interface AIFormFillerProps {
  placeholders: PlaceholderInfo[];
  onFieldsUpdate: (fields: Record<string, any>) => void;
  currentValues: Record<string, any>;
  isVisible: boolean;
  onToggle: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface FieldMapping {
  fieldName: string;
  extractedValue: string;
  confidence: number;
  reasoning?: string;
}

export function AIFormFiller({ 
  placeholders, 
  onFieldsUpdate, 
  currentValues, 
  isVisible, 
  onToggle 
}: AIFormFillerProps) {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [lastMappings, setLastMappings] = useState<FieldMapping[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 检查AI服务状态
  useEffect(() => {
    checkAIStatus();
  }, []);

  // 自动滚动到聊天底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const checkAIStatus = async () => {
    try {
      const response = await fetch('/api/local-docs/ai-fill', {
        method: 'GET'
      });
      
      if (response.ok) {
        const result = await response.json();
        setAiStatus(result.data.available ? 'available' : 'unavailable');
      } else {
        setAiStatus('unavailable');
      }
    } catch (error) {
      console.error('AI状态检查失败:', error);
      setAiStatus('unavailable');
    }
  };

  const handleAIFill = async () => {
    if (!userInput.trim() || isProcessing) return;

    setIsProcessing(true);
    
    // 添加用户消息到聊天记录
    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    try {
      // 构建可用字段信息
      const availableFields = placeholders.map(p => ({
        name: p.name,
        type: p.type,
        description: p.description,
        options: p.options
      }));

      // 构建上下文信息
      const context = `当前表单包含 ${placeholders.length} 个字段。已填写的字段：${
        Object.keys(currentValues).filter(key => currentValues[key]).length
      } 个。`;

      const response = await fetch('/api/local-docs/ai-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          availableFields,
          context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AI填充失败');
      }

      const result = await response.json();
      const { mappings, unmappedContent, suggestions: aiSuggestions } = result.data;

      // 保存映射结果
      setLastMappings(mappings);
      
      // 应用字段映射
      if (mappings && mappings.length > 0) {
        const newValues = { ...currentValues };
        mappings.forEach((mapping: FieldMapping) => {
          newValues[mapping.fieldName] = mapping.extractedValue;
        });
        onFieldsUpdate(newValues);

        // 添加AI响应消息
        const successMessage = `我已经为您填写了 ${mappings.length} 个字段：\n${
          mappings.map((m: FieldMapping) => 
            `• ${m.fieldName}: ${m.extractedValue} (置信度: ${Math.round(m.confidence * 100)}%)`
          ).join('\n')
        }`;

        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: successMessage,
          timestamp: new Date().toISOString()
        };
        
        setChatMessages(prev => [...prev, aiMessage]);
      }

      // 处理建议
      if (aiSuggestions && aiSuggestions.length > 0) {
        setSuggestions(aiSuggestions);
        setShowSuggestions(true);
      }

      // 处理未映射内容
      if (unmappedContent) {
        const unmappedMessage: ChatMessage = {
          role: 'assistant',
          content: `以下内容我无法确定对应的字段，您可以手动填写或提供更多信息：\n"${unmappedContent}"`,
          timestamp: new Date().toISOString()
        };
        
        setChatMessages(prev => [...prev, unmappedMessage]);
      }

    } catch (error) {
      console.error('AI填充失败:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `抱歉，AI填充失败：${error instanceof Error ? error.message : '未知错误'}。请尝试手动填写或重新描述。`,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setUserInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAIFill();
    }
  };

  const applySuggestion = (suggestion: string) => {
    setUserInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-50"
        title="AI智能填充"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">AI智能填充</h3>
            <div className="flex items-center space-x-1">
              {aiStatus === 'checking' && (
                <>
                  <Loader2 size={12} className="animate-spin text-gray-400" />
                  <span className="text-xs text-gray-500">检查中...</span>
                </>
              )}
              {aiStatus === 'available' && (
                <>
                  <CheckCircle size={12} className="text-green-500" />
                  <span className="text-xs text-green-600">服务可用</span>
                </>
              )}
              {aiStatus === 'unavailable' && (
                <>
                  <AlertCircle size={12} className="text-red-500" />
                  <span className="text-xs text-red-600">服务不可用</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ×
        </button>
      </div>

      {/* 聊天区域 */}
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">描述您要填写的内容，我来帮您智能填充表单</p>
            <p className="text-xs text-gray-400 mt-1">
              例如：&ldquo;为张三公司生成合同，金额10万，期限一年&rdquo;
            </p>
          </div>
        )}
        
        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">AI正在分析...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* 建议区域 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <div className="text-xs text-gray-600 mb-2">建议问题：</div>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => applySuggestion(suggestion)}
                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={aiStatus === 'available' 
              ? "描述您要填写的内容..." 
              : "AI服务暂不可用"
            }
            disabled={aiStatus !== 'available' || isProcessing}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            rows={2}
          />
          <button
            onClick={handleAIFill}
            disabled={!userInput.trim() || aiStatus !== 'available' || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          按 Enter 发送，Shift+Enter 换行
        </div>
      </div>
    </div>
  );
}
