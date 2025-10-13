/**
 * 模板上传组件
 */
'use client';

import { useState, useRef } from 'react';
import { documentApi } from '@/lib/api-client';
import { useTemplateStore, useUIStore } from '@/lib/store';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

export default function TemplateUploader() {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { setCurrentTemplate, setVariables } = useTemplateStore();
  const { setLoading, setError, setCurrentStep } = useUIStore();

  // 处理文件
  const handleFile = async (file: File) => {
    // 验证文件
    if (!file.name.endsWith('.docx')) {
      setError('只支持 .docx 格式的文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    try {
      setLoading(true, '正在解析文档...');
      setError(null);

      // 1. 解析文档
      const parseResult = await documentApi.parse(file);
      
      if (!parseResult.valid) {
        throw new Error(parseResult.message || '文档解析失败');
      }

      console.log('文档解析成功:', parseResult);

      // 2. 使用后端返回的完整变量信息（包含类型、验证规则等）
      setLoading(true, '正在生成表单...');
      const placeholderDetails = (window as any).__placeholderDetails || [];
      
      const variables = placeholderDetails.length > 0 
        ? placeholderDetails.map((detail: any) => ({
            name: detail.name,
            label: detail.name,
            type: detail.type || 'text',
            required: detail.required !== false,
            placeholder: detail.placeholder || `请输入${detail.name}`,
            description: detail.description,
            validation: detail.validation,
            options: detail.options,
          }))
        : parseResult.placeholders.map((placeholder) => {
            // 降级方案：如果后端没有返回详细信息，使用简单推断
            const lowerName = placeholder.toLowerCase();
            let type: 'text' | 'textarea' | 'number' | 'date' | 'phone' | 'email' = 'text';
            
            if (lowerName.includes('日期') || lowerName.includes('时间')) {
              type = 'date';
            } else if (lowerName.includes('电话') || lowerName.includes('手机')) {
              type = 'phone';
            } else if (lowerName.includes('邮箱') || lowerName.includes('email')) {
              type = 'email';
            } else if (lowerName.includes('金额') || lowerName.includes('价格') || lowerName.includes('数量')) {
              type = 'number';
            } else if (lowerName.includes('地址') || lowerName.includes('描述') || lowerName.includes('内容')) {
              type = 'textarea';
            }
            
            return {
              name: placeholder,
              label: placeholder,
              type,
              required: true,
              placeholder: `请输入${placeholder}`,
            };
          });
      
      console.log('生成变量:', variables);

      // 3. 更新状态
      setCurrentTemplate({
        id: Date.now().toString(), // 使用时间戳作为临时 ID
        name: file.name,
        file,
        text: parseResult.text,
        placeholders: parseResult.placeholders,
      });
      
      // 保存文件引用供文档生成使用
      (window as any).__currentTemplateFile = file;
      
      setVariables(variables);

      // 4. 进入下一步
      setCurrentStep(2);
      
    } catch (error: any) {
      console.error('处理文件失败:', error);
      setError(error.response?.data?.detail || error.message || '处理文件失败');
    } finally {
      setLoading(false);
    }
  };

  // 拖拽事件
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  // 点击上传
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center
          transition-colors cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="hidden"
        />

        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            上传合同模板
          </p>
          <p className="mt-2 text-sm text-gray-600">
            拖拽文件到此处，或点击选择文件
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            选择文件
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          支持 .docx 格式，最大 10MB
        </p>
      </div>

      {/* 示例提示 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900">
          💡 模板格式要求：
        </h3>
        <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>使用 Word .docx 格式</li>
          <li>变量使用双大括号标记，如：{'{{甲方}}'}</li>
          <li>支持中文变量名</li>
          <li>AI 会自动识别变量类型（文本、日期、金额等）</li>
        </ul>
      </div>
    </div>
  );
}
