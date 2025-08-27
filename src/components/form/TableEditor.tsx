'use client';

import { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: string[];
  width?: string;
}

export interface TableData {
  [columnName: string]: string | number;
}

interface TableEditorProps {
  columns: TableColumn[];
  data: TableData[];
  onChange: (data: TableData[]) => void;
  minRows?: number;
  maxRows?: number;
  allowAddRows?: boolean;
  allowDeleteRows?: boolean;
  error?: string;
}

export function TableEditor({
  columns,
  data,
  onChange,
  minRows = 1,
  maxRows = 20,
  allowAddRows = true,
  allowDeleteRows = true,
  error
}: TableEditorProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 确保至少有最小行数
  const ensureMinRows = (currentData: TableData[]) => {
    const newData = [...currentData];
    while (newData.length < minRows) {
      const newRow: TableData = {};
      columns.forEach(col => {
        newRow[col.name] = col.type === 'number' ? 0 : '';
      });
      newData.push(newRow);
    }
    return newData;
  };

  // 初始化数据
  const tableData = data.length === 0 ? ensureMinRows([]) : data;

  const addRow = () => {
    if (tableData.length >= maxRows) return;
    
    const newRow: TableData = {};
    columns.forEach(col => {
      newRow[col.name] = col.type === 'number' ? 0 : '';
    });
    
    const newData = [...tableData, newRow];
    onChange(newData);
  };

  const deleteRow = (index: number) => {
    if (tableData.length <= minRows) return;
    
    const newData = tableData.filter((_, i) => i !== index);
    onChange(newData);
    
    // 清除该行的错误
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`${index}-`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const updateCell = (rowIndex: number, columnName: string, value: string) => {
    const newData = [...tableData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = {};
    }
    
    // 类型转换
    const column = columns.find(col => col.name === columnName);
    if (column?.type === 'number') {
      newData[rowIndex][columnName] = value === '' ? 0 : parseFloat(value) || 0;
    } else {
      newData[rowIndex][columnName] = value;
    }
    
    onChange(newData);
    
    // 清除该单元格的错误
    const errorKey = `${rowIndex}-${columnName}`;
    if (errors[errorKey]) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  const validateCell = (rowIndex: number, columnName: string, value: string | number): string | null => {
    const column = columns.find(col => col.name === columnName);
    if (!column) return null;
    
    if (column.required && (!value || value === '')) {
      return `${column.name}是必填项`;
    }
    
    if (column.type === 'number' && value !== '' && value !== 0) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        return `${column.name}必须是数字`;
      }
    }
    
    return null;
  };

  const renderCell = (rowIndex: number, column: TableColumn) => {
    const value = tableData[rowIndex]?.[column.name] || '';
    const errorKey = `${rowIndex}-${column.name}`;
    const cellError = errors[errorKey];
    
    const baseClassName = `w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
      cellError ? 'border-red-300' : 'border-gray-300'
    }`;
    
    switch (column.type) {
      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => updateCell(rowIndex, column.name, e.target.value)}
            className={baseClassName}
            onBlur={() => {
              const error = validateCell(rowIndex, column.name, value);
              if (error) {
                setErrors(prev => ({ ...prev, [errorKey]: error }));
              }
            }}
          >
            <option value="">请选择...</option>
            {column.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
        
      case 'date':
        return (
          <input
            type="date"
            value={value as string}
            onChange={(e) => updateCell(rowIndex, column.name, e.target.value)}
            className={baseClassName}
            onBlur={() => {
              const error = validateCell(rowIndex, column.name, value);
              if (error) {
                setErrors(prev => ({ ...prev, [errorKey]: error }));
              }
            }}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) => updateCell(rowIndex, column.name, e.target.value)}
            className={baseClassName}
            step="0.01"
            onBlur={() => {
              const error = validateCell(rowIndex, column.name, value);
              if (error) {
                setErrors(prev => ({ ...prev, [errorKey]: error }));
              }
            }}
          />
        );
        
      default: // text
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => updateCell(rowIndex, column.name, e.target.value)}
            className={baseClassName}
            onBlur={() => {
              const error = validateCell(rowIndex, column.name, value);
              if (error) {
                setErrors(prev => ({ ...prev, [errorKey]: error }));
              }
            }}
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 rounded-lg">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.name}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b border-gray-300"
                  style={{ width: column.width }}
                >
                  {column.name}
                  {column.required && <span className="text-red-500 ml-1">*</span>}
                </th>
              ))}
              {allowDeleteRows && (
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 border-b border-gray-300 w-12">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.name} className="px-3 py-2 border-b border-gray-200">
                    {renderCell(rowIndex, column)}
                    {errors[`${rowIndex}-${column.name}`] && (
                      <div className="text-xs text-red-600 mt-1 flex items-center">
                        <AlertCircle size={10} className="mr-1" />
                        {errors[`${rowIndex}-${column.name}`]}
                      </div>
                    )}
                  </td>
                ))}
                {allowDeleteRows && (
                  <td className="px-3 py-2 border-b border-gray-200 text-center">
                    <button
                      type="button"
                      onClick={() => deleteRow(rowIndex)}
                      disabled={tableData.length <= minRows}
                      className={`p-1 rounded ${
                        tableData.length <= minRows
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title={tableData.length <= minRows ? `至少需要${minRows}行` : '删除此行'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {allowAddRows && (
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addRow}
            disabled={tableData.length >= maxRows}
            className={`flex items-center px-3 py-2 text-sm rounded-md ${
              tableData.length >= maxRows
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
            }`}
          >
            <Plus size={16} className="mr-1" />
            添加行
          </button>
          <span className="text-xs text-gray-500">
            {tableData.length} / {maxRows} 行
          </span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}
    </div>
  );
}
