/**
 * 动态表单组件 - 模块三核心组件
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTemplateStore, useUIStore } from '@/lib/store';
import { generateApi, downloadFile, type Variable } from '@/lib/api-client';

// ==================== Schema 生成 ====================

/**
 * 根据变量定义动态生成 Zod Schema
 */
function generateZodSchema(variables: Variable[]) {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  variables.forEach((variable) => {
    let field: z.ZodTypeAny;

    switch (variable.type) {
      case 'text':
      case 'textarea':
        field = z.string();
        if (variable.validation?.min) {
          field = (field as z.ZodString).min(variable.validation.min, 
            `至少需要 ${variable.validation.min} 个字符`
          );
        }
        if (variable.validation?.max) {
          field = (field as z.ZodString).max(variable.validation.max,
            `最多 ${variable.validation.max} 个字符`
          );
        }
        if (variable.validation?.pattern) {
          field = (field as z.ZodString).regex(
            new RegExp(variable.validation.pattern),
            '格式不正确'
          );
        }
        break;

      case 'number':
        field = z.number({
          invalid_type_error: '请输入有效的数字',
        });
        if (variable.validation?.min !== undefined) {
          field = (field as z.ZodNumber).min(variable.validation.min,
            `最小值为 ${variable.validation.min}`
          );
        }
        if (variable.validation?.max !== undefined) {
          field = (field as z.ZodNumber).max(variable.validation.max,
            `最大值为 ${variable.validation.max}`
          );
        }
        break;

      case 'date':
        field = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '请输入有效的日期');
        break;

      case 'phone':
      case 'tel':
        // 支持多种电话格式
        field = z.string();
        if (variable.validation?.pattern) {
          field = (field as z.ZodString).regex(
            new RegExp(variable.validation.pattern),
            '请输入有效的电话号码'
          );
        } else {
          field = (field as z.ZodString).regex(
            /^[0-9+\-\s()]+$/,
            '请输入有效的电话号码'
          );
        }
        break;

      case 'email':
        field = z.string().email('请输入有效的邮箱地址');
        break;

      case 'select':
        if (variable.options && variable.options.length > 0) {
          field = z.enum(variable.options as [string, ...string[]]);
        } else {
          field = z.string();
        }
        break;

      case 'table':
        // 表格类型暂时跳过验证，后续实现
        field = z.any();
        break;

      default:
        field = z.string();
    }

    // 处理必填/非必填
    if (variable.required) {
      schemaFields[variable.name] = field;
    } else {
      schemaFields[variable.name] = field.optional();
    }
  });

  return z.object(schemaFields);
}

// ==================== 表单组件 ====================

export default function DynamicForm() {
  const { variables, formData, currentTemplate, setGeneratedDocument } = useTemplateStore();
  const { setLoading, setError, setCurrentStep } = useUIStore();

  // 生成表单 Schema
  const schema = generateZodSchema(variables);
  type FormData = z.infer<typeof schema>;

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: formData,
  });

  // 提交表单
  const onSubmit = async (data: FormData) => {
    if (!currentTemplate) return;

    try {
      setLoading(true, '正在生成文档...');
      setError(null);

      console.log('表单数据:', data);

      // 调用生成 API
      const result = await generateApi.generate(
        currentTemplate.id,
        data,
        `${currentTemplate.name.replace('.docx', '')}_generated.docx`
      );

      console.log('文档生成成功:', result);

      // 更新状态
      setGeneratedDocument({
        id: result.document_id,
        filename: result.filename,
        downloadUrl: result.download_url,
        fileSize: result.file_size,
      });

      // 进入下一步
      setCurrentStep(3);

    } catch (error: any) {
      console.error('生成文档失败:', error);
      setError(error.response?.data?.detail || error.message || '生成文档失败');
    } finally {
      setLoading(false);
    }
  };

  // 渲染不同类型的输入框
  const renderField = (variable: Variable) => {
    const error = errors[variable.name as keyof FormData];
    const commonClasses = `
      mt-1 block w-full rounded-md border-gray-300 shadow-sm
      focus:border-blue-500 focus:ring-blue-500
      ${error ? 'border-red-500' : ''}
    `;

    switch (variable.type) {
      case 'textarea':
        return (
          <textarea
            {...register(variable.name as any)}
            placeholder={variable.placeholder || `请输入${variable.label}`}
            className={`${commonClasses} min-h-[100px]`}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            {...register(variable.name as any, { valueAsNumber: true })}
            placeholder={variable.placeholder || `请输入${variable.label}`}
            className={commonClasses}
            step="0.01"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            {...register(variable.name as any)}
            className={commonClasses}
          />
        );

      case 'phone':
      case 'tel':
        return (
          <input
            type="tel"
            {...register(variable.name as any)}
            placeholder={variable.placeholder || '138-0000-0000'}
            className={commonClasses}
            maxLength={variable.validation?.maxLength || 20}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            {...register(variable.name as any)}
            placeholder={variable.placeholder || 'example@example.com'}
            className={commonClasses}
          />
        );

      case 'select':
        return (
          <select
            {...register(variable.name as any)}
            className={commonClasses}
          >
            <option value="">请选择</option>
            {variable.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'table':
        // 表格类型暂时显示提示，后续实现复杂表格编辑器
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ 表格类型暂不支持在线编辑，将在文档生成后手动填写
            </p>
          </div>
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            {...register(variable.name as any)}
            placeholder={variable.placeholder || `请输入${variable.label}`}
            className={commonClasses}
          />
        );
    }
  };

  if (variables.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无可填写的字段</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">
          填写合同信息
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {variables.map((variable) => (
            <div
              key={variable.name}
              className={
                variable.type === 'textarea' || variable.type === 'table' 
                  ? 'md:col-span-2' 
                  : ''
              }
            >
              <label className="block text-sm font-medium text-gray-700">
                {variable.label}
                {variable.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>

              {renderField(variable)}

              {/* 描述或帮助文本 */}
              {(variable.description || variable.helpText) && (
                <p className="mt-1 text-xs text-gray-500">
                  {variable.description || variable.helpText}
                </p>
              )}

              {/* 错误信息 */}
              {errors[variable.name as keyof FormData] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors[variable.name as keyof FormData]?.message as string}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>

        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          生成合同
        </button>
      </div>
    </form>
  );
}
