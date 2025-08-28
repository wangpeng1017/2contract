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

    const baseClassName = `w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
      cellError ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'
    }`;

    const handleInputChange = (newValue: string) => {
      updateCell(rowIndex, column.name, newValue);
    };

    const handleInputBlur = () => {
      const error = validateCell(rowIndex, column.name, value);
      if (error) {
        setErrors(prev => ({ ...prev, [errorKey]: error }));
      }
    };

    switch (column.type) {
      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleInputChange(e.target.value)}
            className={baseClassName}
            onBlur={handleInputBlur}
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
            onChange={(e) => handleInputChange(e.target.value)}
            className={baseClassName}
            onBlur={handleInputBlur}
            placeholder="选择日期"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value === 0 ? '0' : (value as string) || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            className={baseClassName}
            step="0.01"
            min="0"
            onBlur={handleInputBlur}
            placeholder="输入数字"
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleInputChange(e.target.value)}
            className={baseClassName}
            onBlur={handleInputBlur}
            placeholder={`输入${column.name}`}
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* 表格容器 */}
      <div className="overflow-x-auto border border-gray-300 rounded-lg bg-white shadow-sm">
        <div className="min-w-full">
          <table className="w-full table-fixed" style={{ minWidth: `${columns.length * 120 + (allowDeleteRows ? 64 : 0)}px` }}>
          <thead>
            <tr className="bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.name}
                  className="px-2 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap"
                  style={{
                    width: column.width || `${Math.floor(100 / columns.length)}%`,
                    minWidth: '120px'
                  }}
                >
                  <div className="truncate" title={column.name}>
                    {column.name}
                    {column.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                </th>
              ))}
              {allowDeleteRows && (
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-700 border-b border-gray-300 w-16 min-w-16">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.name}
                    className="px-2 py-2 border-b border-gray-200 relative"
                    style={{
                      width: column.width || `${Math.floor(100 / columns.length)}%`,
                      minWidth: '120px'
                    }}
                  >
                    <div className="w-full">
                      {renderCell(rowIndex, column)}
                      {errors[`${rowIndex}-${column.name}`] && (
                        <div className="text-xs text-red-600 mt-1 flex items-center">
                          <AlertCircle size={10} className="mr-1 flex-shrink-0" />
                          <span className="truncate">{errors[`${rowIndex}-${column.name}`]}</span>
                        </div>
                      )}
                    </div>
                  </td>
                ))}
                {allowDeleteRows && (
                  <td className="px-2 py-2 border-b border-gray-200 text-center w-16 min-w-16">
                    <button
                      type="button"
                      onClick={() => deleteRow(rowIndex)}
                      disabled={tableData.length <= minRows}
                      className={`p-1 rounded transition-colors ${
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
      </div>
      
      {allowAddRows && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={addRow}
            disabled={tableData.length >= maxRows}
            className={`flex items-center px-4 py-2 text-sm rounded-md border transition-colors ${
              tableData.length >= maxRows
                ? 'text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50'
                : 'text-blue-600 border-blue-200 hover:text-blue-800 hover:bg-blue-50 hover:border-blue-300'
            }`}
          >
            <Plus size={16} className="mr-1" />
            添加行
          </button>
          <div className="text-xs text-gray-500 flex items-center space-x-2">
            <span>{tableData.length} / {maxRows} 行</span>
            {tableData.length >= maxRows && (
              <span className="text-orange-500">已达到最大行数</span>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {/* 空状态提示 */}
      {tableData.length === 0 && allowAddRows && (
        <div className="text-center py-6 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <div className="text-sm">暂无数据</div>
          <div className="text-xs mt-1">点击上方&ldquo;添加行&rdquo;按钮开始填写表格数据</div>
        </div>
      )}

      {/* 移动端提示 */}
      <div className="block sm:hidden text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
        💡 提示：在小屏幕上可以左右滑动查看完整表格内容
      </div>
    </div>
  );
}
