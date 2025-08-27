'use client';

import { useState } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { TableEditor, TableColumn, TableData } from './TableEditor';

interface Placeholder {
  name: string;
  type: 'text' | 'date' | 'number' | 'email' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'url' | 'tel' | 'file' | 'table';
  required: boolean;
  description?: string;
  defaultValue?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  placeholder?: string;
  helpText?: string;
  tableConfig?: {
    columns: TableColumn[];
    minRows?: number;
    maxRows?: number;
    allowAddRows?: boolean;
    allowDeleteRows?: boolean;
  };
}

interface AdvancedFormFieldProps {
  placeholder: Placeholder;
  value: string | string[] | TableData[];
  onChange: (value: string | string[] | TableData[]) => void;
  error?: string;
}

export function AdvancedFormField({ placeholder, value, onChange, error }: AdvancedFormFieldProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    onChange(files.map(f => f.name).join(', '));
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onChange(newFiles.map(f => f.name).join(', '));
  };

  const handleMultiSelectChange = (option: string, checked: boolean) => {
    const currentValues = Array.isArray(value) && typeof value[0] === 'string'
      ? value as string[]
      : (value as string)?.split(',').filter(Boolean) || [];

    if (checked) {
      const newValues = [...currentValues, option];
      onChange(newValues);
    } else {
      const newValues = currentValues.filter(v => v !== option);
      onChange(newValues);
    }
  };

  const renderField = () => {
    switch (placeholder.type) {
      case 'table':
        if (!placeholder.tableConfig) {
          return <div className="text-red-500">表格配置缺失</div>;
        }
        return (
          <TableEditor
            columns={placeholder.tableConfig.columns}
            data={Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' ? value as TableData[] : []}
            onChange={(data) => onChange(data)}
            minRows={placeholder.tableConfig.minRows}
            maxRows={placeholder.tableConfig.maxRows}
            allowAddRows={placeholder.tableConfig.allowAddRows}
            allowDeleteRows={placeholder.tableConfig.allowDeleteRows}
            error={error}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
            placeholder={placeholder.placeholder || placeholder.description}
            required={placeholder.required}
            minLength={placeholder.validation?.minLength}
            maxLength={placeholder.validation?.maxLength}
            rows={4}
          />
        );

      case 'select':
        return (
          <select
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={placeholder.required}
          >
            <option value="">请选择...</option>
            {placeholder.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) && typeof value[0] === 'string'
          ? value as string[]
          : (value as string)?.split(',').filter(Boolean) || [];
        return (
          <div className="space-y-2">
            {placeholder.options?.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => handleMultiSelectChange(option, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={placeholder.name}
                value="true"
                checked={(value as string) === 'true'}
                onChange={(e) => onChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              是
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={placeholder.name}
                value="false"
                checked={(value as string) === 'false'}
                onChange={(e) => onChange(e.target.value)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              否
            </label>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id={`file-${placeholder.name}`}
                multiple
              />
              <label
                htmlFor={`file-${placeholder.name}`}
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload size={24} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">点击选择文件</span>
                <span className="text-xs text-gray-500 mt-1">
                  {placeholder.helpText || '支持多个文件上传'}
                </span>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={placeholder.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder.placeholder || placeholder.description}
            required={placeholder.required}
            min={placeholder.validation?.min}
            max={placeholder.validation?.max}
            step={placeholder.name.toLowerCase().includes('金额') ? '0.01' : '1'}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder.placeholder || placeholder.description}
            required={placeholder.required}
            pattern={placeholder.validation?.pattern}
          />
        );

      case 'tel':
        return (
          <input
            type="tel"
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder.placeholder || placeholder.description}
            required={placeholder.required}
            pattern={placeholder.validation?.pattern}
            minLength={placeholder.validation?.minLength}
            maxLength={placeholder.validation?.maxLength}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder.placeholder || placeholder.description}
            required={placeholder.required}
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value as string || placeholder.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder.placeholder || placeholder.description}
            required={placeholder.required}
            minLength={placeholder.validation?.minLength}
            maxLength={placeholder.validation?.maxLength}
            pattern={placeholder.validation?.pattern}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {placeholder.name}
        {placeholder.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {placeholder.description && (
        <p className="text-xs text-gray-600">{placeholder.description}</p>
      )}
      
      {renderField()}
      
      {placeholder.helpText && (
        <p className="text-xs text-gray-500">{placeholder.helpText}</p>
      )}
      
      {error && (
        <div className="flex items-center text-red-600 text-xs">
          <AlertCircle size={12} className="mr-1" />
          {error}
        </div>
      )}
    </div>
  );
}
