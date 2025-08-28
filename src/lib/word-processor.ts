/**
 * Word文档处理引擎
 * 基于docx-templates和jszip实现真实的Word文档解析和生成
 */

import JSZip from 'jszip';
import { createReport } from 'docx-templates';

export interface PlaceholderInfo {
  name: string;
  type: 'text' | 'date' | 'number' | 'email' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'url' | 'tel' | 'file' | 'table';
  required: boolean;
  defaultValue?: string;
  description?: string;
  options?: string[]; // 用于select和multiselect类型
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  placeholder?: string;
  helpText?: string;
  // 表格相关属性
  tableConfig?: {
    columns: TableColumn[];
    minRows?: number;
    maxRows?: number;
    allowAddRows?: boolean;
    allowDeleteRows?: boolean;
  };
}

export interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: string[]; // 用于select类型
  width?: string; // CSS宽度
}

export interface TableData {
  [columnName: string]: string | number;
}

export interface DocumentTemplate {
  placeholders: PlaceholderInfo[];
  templateBuffer: ArrayBuffer;
  templateName: string;
  metadata: {
    extractedAt: string;
    fileSize: number;
    placeholderCount: number;
  };
}

export interface GenerationResult {
  documentBuffer: ArrayBuffer;
  metadata: {
    generatedAt: string;
    templateName: string;
    filledFields: string[];
    fileSize: number;
  };
}

/**
 * Word文档处理器类
 */
export class WordProcessor {
  
  /**
   * 解析Word模板，提取占位符信息
   */
  static async parseTemplate(templateBuffer: ArrayBuffer, templateName: string): Promise<DocumentTemplate> {
    try {
      console.log(`[WordProcessor] 开始解析模板: ${templateName}`);
      
      // 使用JSZip解析docx文件
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(templateBuffer);
      
      // 提取document.xml文件内容
      const documentXml = await zipContent.file('word/document.xml')?.async('text');
      
      if (!documentXml) {
        throw new Error('无法找到document.xml文件，可能不是有效的Word文档');
      }
      
      // 提取占位符
      const placeholders = this.extractPlaceholders(documentXml);
      
      console.log(`[WordProcessor] 解析完成，发现 ${placeholders.length} 个占位符`);
      
      return {
        placeholders,
        templateBuffer,
        templateName,
        metadata: {
          extractedAt: new Date().toISOString(),
          fileSize: templateBuffer.byteLength,
          placeholderCount: placeholders.length
        }
      };
      
    } catch (error) {
      console.error('[WordProcessor] 模板解析失败:', error);
      throw new Error(`模板解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 从XML内容中提取占位符
   */
  private static extractPlaceholders(xmlContent: string): PlaceholderInfo[] {
    const placeholders: PlaceholderInfo[] = [];
    const placeholderSet = new Set<string>();
    
    // 匹配 {{placeholder}} 格式的占位符
    // 考虑到Word可能会将占位符分割到多个XML节点中，我们需要更复杂的匹配
    const patterns = [
      /\{\{([^}]+)\}\}/g,  // 标准格式
      /\{([^}]+)\}/g,      // 单花括号格式
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(xmlContent)) !== null) {
        const placeholderName = match[1].trim();
        
        if (placeholderName && !placeholderSet.has(placeholderName)) {
          placeholderSet.add(placeholderName);
          
          const placeholderType = this.inferPlaceholderType(placeholderName);
          const placeholder: PlaceholderInfo = {
            name: placeholderName,
            type: placeholderType,
            required: true, // MVP阶段默认都是必填
            description: this.generatePlaceholderDescription(placeholderName),
            options: this.generatePlaceholderOptions(placeholderName, placeholderType),
            validation: this.generatePlaceholderValidation(placeholderName, placeholderType),
            placeholder: this.generatePlaceholderText(placeholderName, placeholderType),
            helpText: this.generateHelpText(placeholderName, placeholderType),
            tableConfig: placeholderType === 'table' ? this.generateTableConfig(placeholderName) : undefined
          };
          
          placeholders.push(placeholder);
        }
      }
    });
    
    // 如果没有找到占位符，返回一些示例占位符用于演示
    if (placeholders.length === 0) {
      console.log('[WordProcessor] 未找到占位符，返回示例占位符');
      return this.getDefaultPlaceholders();
    }
    
    return placeholders.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  /**
   * 推断占位符的数据类型
   */
  private static inferPlaceholderType(name: string): PlaceholderInfo['type'] {
    const lowerName = name.toLowerCase();

    // 日期类型
    if (lowerName.includes('日期') || lowerName.includes('时间') ||
        lowerName.includes('date') || lowerName.includes('time')) {
      return 'date';
    }

    // 数字类型
    if (lowerName.includes('金额') || lowerName.includes('价格') ||
        lowerName.includes('数量') || lowerName.includes('amount') ||
        lowerName.includes('price') || lowerName.includes('count') ||
        lowerName.includes('费用') || lowerName.includes('成本')) {
      return 'number';
    }

    // 邮箱类型
    if (lowerName.includes('邮箱') || lowerName.includes('邮件') ||
        lowerName.includes('email') || lowerName.includes('mail')) {
      return 'email';
    }

    // 电话类型
    if (lowerName.includes('电话') || lowerName.includes('手机') ||
        lowerName.includes('phone') || lowerName.includes('tel') ||
        lowerName.includes('mobile')) {
      return 'tel';
    }

    // URL类型
    if (lowerName.includes('网址') || lowerName.includes('链接') ||
        lowerName.includes('url') || lowerName.includes('website') ||
        lowerName.includes('网站')) {
      return 'url';
    }

    // 文件类型
    if (lowerName.includes('文件') || lowerName.includes('附件') ||
        lowerName.includes('file') || lowerName.includes('attachment') ||
        lowerName.includes('上传')) {
      return 'file';
    }

    // 多行文本类型
    if (lowerName.includes('备注') || lowerName.includes('说明') ||
        lowerName.includes('描述') || lowerName.includes('详情') ||
        lowerName.includes('内容') || lowerName.includes('comment') ||
        lowerName.includes('description') || lowerName.includes('note')) {
      return 'textarea';
    }

    // 表格类型
    if (lowerName.includes('表格') || lowerName.includes('列表') ||
        lowerName.includes('明细') || lowerName.includes('清单') ||
        lowerName.includes('table') || lowerName.includes('list') ||
        lowerName.includes('items') || lowerName.includes('details')) {
      return 'table';
    }

    // 选择类型（基于常见的选择字段）
    if (lowerName.includes('类型') || lowerName.includes('分类') ||
        lowerName.includes('状态') || lowerName.includes('级别') ||
        lowerName.includes('type') || lowerName.includes('category') ||
        lowerName.includes('status') || lowerName.includes('level')) {
      return 'select';
    }

    // 布尔类型
    if (lowerName.includes('是否') || lowerName.includes('启用') ||
        lowerName.includes('enable') || lowerName.includes('disable') ||
        lowerName.includes('同意') || lowerName.includes('确认')) {
      return 'boolean';
    }

    // 默认文本类型
    return 'text';
  }
  
  /**
   * 生成占位符描述
   */
  private static generatePlaceholderDescription(name: string): string {
    const typeDescriptions: Record<string, string> = {
      '公司': '请输入公司全称',
      '姓名': '请输入完整姓名',
      '日期': '请选择日期',
      '金额': '请输入金额（数字）',
      '电话': '请输入联系电话',
      '邮箱': '请输入邮箱地址',
      '地址': '请输入详细地址',
      '网址': '请输入网站地址',
      '文件': '请选择要上传的文件',
      '备注': '请输入详细说明',
      '类型': '请选择类型',
      '状态': '请选择状态'
    };

    for (const [key, desc] of Object.entries(typeDescriptions)) {
      if (name.includes(key)) {
        return desc;
      }
    }

    return `请输入${name}`;
  }

  /**
   * 生成选择类型字段的选项
   */
  private static generatePlaceholderOptions(name: string, type: PlaceholderInfo['type']): string[] | undefined {
    if (type !== 'select' && type !== 'multiselect') {
      return undefined;
    }

    const lowerName = name.toLowerCase();

    // 合同类型
    if (lowerName.includes('合同类型') || lowerName.includes('contract type')) {
      return ['销售合同', '采购合同', '服务合同', '租赁合同', '劳动合同'];
    }

    // 付款方式
    if (lowerName.includes('付款方式') || lowerName.includes('payment method')) {
      return ['现金', '银行转账', '支票', '信用卡', '分期付款'];
    }

    // 状态
    if (lowerName.includes('状态') || lowerName.includes('status')) {
      return ['待处理', '进行中', '已完成', '已取消', '已暂停'];
    }

    // 优先级
    if (lowerName.includes('优先级') || lowerName.includes('priority')) {
      return ['低', '中', '高', '紧急'];
    }

    // 部门
    if (lowerName.includes('部门') || lowerName.includes('department')) {
      return ['销售部', '市场部', '技术部', '财务部', '人事部', '行政部'];
    }

    // 职位
    if (lowerName.includes('职位') || lowerName.includes('position')) {
      return ['经理', '主管', '专员', '助理', '总监', '副总'];
    }

    // 默认选项
    return ['选项1', '选项2', '选项3'];
  }

  /**
   * 生成字段验证规则
   */
  private static generatePlaceholderValidation(name: string, type: PlaceholderInfo['type']): PlaceholderInfo['validation'] | undefined {
    const lowerName = name.toLowerCase();

    switch (type) {
      case 'number':
        if (lowerName.includes('金额') || lowerName.includes('价格')) {
          return { min: 0, max: 999999999 };
        }
        if (lowerName.includes('数量')) {
          return { min: 1, max: 10000 };
        }
        return { min: 0 };

      case 'text':
        if (lowerName.includes('姓名') || lowerName.includes('name')) {
          return { minLength: 2, maxLength: 50 };
        }
        if (lowerName.includes('公司')) {
          return { minLength: 2, maxLength: 100 };
        }
        return { maxLength: 200 };

      case 'textarea':
        return { maxLength: 1000 };

      case 'tel':
        return { pattern: '^[0-9+\\-\\s()]+$', minLength: 7, maxLength: 20 };

      case 'email':
        return { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' };

      default:
        return undefined;
    }
  }

  /**
   * 生成占位符提示文本
   */
  private static generatePlaceholderText(name: string, type: PlaceholderInfo['type']): string {
    switch (type) {
      case 'email':
        return 'example@company.com';
      case 'tel':
        return '138-0000-0000';
      case 'url':
        return 'https://www.example.com';
      case 'date':
        return '选择日期';
      case 'number':
        return '输入数字';
      case 'textarea':
        return '输入详细内容...';
      default:
        return `输入${name}`;
    }
  }

  /**
   * 生成帮助文本
   */
  private static generateHelpText(name: string, type: PlaceholderInfo['type']): string | undefined {
    const lowerName = name.toLowerCase();

    if (type === 'email') {
      return '请输入有效的邮箱地址';
    }

    if (type === 'tel') {
      return '请输入有效的电话号码';
    }

    if (type === 'url') {
      return '请输入完整的网址，包含http://或https://';
    }

    if (type === 'file') {
      return '支持常见文档格式：PDF、Word、Excel等';
    }

    if (lowerName.includes('金额')) {
      return '请输入数字，系统会自动格式化';
    }

    if (lowerName.includes('日期')) {
      return '请选择具体的日期';
    }

    return undefined;
  }

  /**
   * 生成表格配置
   */
  private static generateTableConfig(name: string): PlaceholderInfo['tableConfig'] {
    const lowerName = name.toLowerCase();

    // 费用明细表
    if (lowerName.includes('费用') || lowerName.includes('cost') || lowerName.includes('expense')) {
      return {
        columns: [
          { name: '项目名称', type: 'text', required: true, width: '30%' },
          { name: '数量', type: 'number', required: true, width: '15%' },
          { name: '单价', type: 'number', required: true, width: '20%' },
          { name: '金额', type: 'number', required: true, width: '20%' },
          { name: '备注', type: 'text', required: false, width: '15%' }
        ],
        minRows: 1,
        maxRows: 20,
        allowAddRows: true,
        allowDeleteRows: true
      };
    }

    // 产品清单
    if (lowerName.includes('产品') || lowerName.includes('商品') || lowerName.includes('product')) {
      return {
        columns: [
          { name: '产品名称', type: 'text', required: true, width: '25%' },
          { name: '规格型号', type: 'text', required: false, width: '20%' },
          { name: '数量', type: 'number', required: true, width: '15%' },
          { name: '单价', type: 'number', required: true, width: '15%' },
          { name: '总价', type: 'number', required: true, width: '15%' },
          { name: '交付日期', type: 'date', required: false, width: '10%' }
        ],
        minRows: 1,
        maxRows: 50,
        allowAddRows: true,
        allowDeleteRows: true
      };
    }

    // 人员信息
    if (lowerName.includes('人员') || lowerName.includes('员工') || lowerName.includes('staff') || lowerName.includes('personnel')) {
      return {
        columns: [
          { name: '姓名', type: 'text', required: true, width: '20%' },
          { name: '职位', type: 'select', required: true, width: '20%', options: ['经理', '主管', '专员', '助理'] },
          { name: '部门', type: 'select', required: true, width: '20%', options: ['销售部', '技术部', '财务部', '人事部'] },
          { name: '联系电话', type: 'text', required: false, width: '20%' },
          { name: '入职日期', type: 'date', required: false, width: '20%' }
        ],
        minRows: 1,
        maxRows: 100,
        allowAddRows: true,
        allowDeleteRows: true
      };
    }

    // 付款计划
    if (lowerName.includes('付款') || lowerName.includes('支付') || lowerName.includes('payment')) {
      return {
        columns: [
          { name: '期数', type: 'number', required: true, width: '15%' },
          { name: '付款日期', type: 'date', required: true, width: '25%' },
          { name: '付款金额', type: 'number', required: true, width: '25%' },
          { name: '付款方式', type: 'select', required: true, width: '20%', options: ['现金', '银行转账', '支票', '信用卡'] },
          { name: '备注', type: 'text', required: false, width: '15%' }
        ],
        minRows: 1,
        maxRows: 12,
        allowAddRows: true,
        allowDeleteRows: true
      };
    }

    // 默认通用表格
    return {
      columns: [
        { name: '序号', type: 'number', required: true, width: '10%' },
        { name: '名称', type: 'text', required: true, width: '30%' },
        { name: '数量', type: 'number', required: false, width: '15%' },
        { name: '单价', type: 'number', required: false, width: '15%' },
        { name: '金额', type: 'number', required: false, width: '15%' },
        { name: '备注', type: 'text', required: false, width: '15%' }
      ],
      minRows: 1,
      maxRows: 20,
      allowAddRows: true,
      allowDeleteRows: true
    };
  }
  
  /**
   * 获取默认占位符（用于演示）
   */
  private static getDefaultPlaceholders(): PlaceholderInfo[] {
    return [
      {
        name: '甲方公司名称',
        type: 'text',
        required: true,
        description: '请输入甲方公司全称',
        validation: { minLength: 2, maxLength: 100 },
        placeholder: '输入甲方公司名称'
      },
      {
        name: '乙方公司名称',
        type: 'text',
        required: true,
        description: '请输入乙方公司全称',
        validation: { minLength: 2, maxLength: 100 },
        placeholder: '输入乙方公司名称'
      },
      {
        name: '合同类型',
        type: 'select',
        required: true,
        description: '请选择合同类型',
        options: ['销售合同', '采购合同', '服务合同', '租赁合同', '劳动合同']
      },
      {
        name: '合同金额',
        type: 'number',
        required: true,
        description: '请输入合同金额（数字）',
        validation: { min: 0, max: 999999999 },
        placeholder: '输入数字',
        helpText: '请输入数字，系统会自动格式化'
      },
      {
        name: '签署日期',
        type: 'date',
        required: true,
        description: '请选择合同签署日期',
        placeholder: '选择日期',
        helpText: '请选择具体的日期'
      },
      {
        name: '甲方联系人',
        type: 'text',
        required: true,
        description: '请输入甲方联系人姓名',
        validation: { minLength: 2, maxLength: 50 },
        placeholder: '输入甲方联系人'
      },
      {
        name: '甲方电话',
        type: 'tel',
        required: true,
        description: '请输入甲方联系电话',
        validation: { pattern: '^[0-9+\\-\\s()]+$', minLength: 7, maxLength: 20 },
        placeholder: '138-0000-0000',
        helpText: '请输入有效的电话号码'
      },
      {
        name: '乙方联系人',
        type: 'text',
        required: true,
        description: '请输入乙方联系人姓名',
        validation: { minLength: 2, maxLength: 50 },
        placeholder: '输入乙方联系人'
      },
      {
        name: '联系邮箱',
        type: 'email',
        required: false,
        description: '请输入联系邮箱地址',
        validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
        placeholder: 'example@company.com',
        helpText: '请输入有效的邮箱地址'
      },
      {
        name: '付款方式',
        type: 'select',
        required: true,
        description: '请选择付款方式',
        options: ['现金', '银行转账', '支票', '信用卡', '分期付款']
      },
      {
        name: '是否包含保险',
        type: 'boolean',
        required: true,
        description: '请选择是否包含保险'
      },
      {
        name: '特别约定',
        type: 'textarea',
        required: false,
        description: '请输入特别约定内容',
        validation: { maxLength: 1000 },
        placeholder: '输入详细内容...'
      },
      {
        name: '产品清单',
        type: 'table',
        required: true,
        description: '请填写产品明细信息',
        helpText: '可以添加多行产品信息',
        tableConfig: {
          columns: [
            { name: '产品名称', type: 'text', required: true, width: '25%' },
            { name: '规格型号', type: 'text', required: false, width: '20%' },
            { name: '数量', type: 'number', required: true, width: '15%' },
            { name: '单价', type: 'number', required: true, width: '15%' },
            { name: '总价', type: 'number', required: true, width: '15%' },
            { name: '交付日期', type: 'date', required: false, width: '10%' }
          ],
          minRows: 1,
          maxRows: 10,
          allowAddRows: true,
          allowDeleteRows: true
        }
      }
    ];
  }
  
  /**
   * 生成填充数据后的Word文档
   */
  static async generateDocument(
    templateBuffer: ArrayBuffer,
    data: Record<string, any>,
    templateName: string
  ): Promise<GenerationResult> {
    try {
      console.log(`[WordProcessor] 开始生成文档: ${templateName}`);
      console.log(`[WordProcessor] 填充数据字段:`, Object.keys(data));
      console.log(`[WordProcessor] 填充数据详情:`, JSON.stringify(data, null, 2));

      // 使用docx-templates生成文档
      const documentBuffer = await createReport({
        template: new Uint8Array(templateBuffer),
        data: data,
        additionalJsContext: {
          // 添加一些辅助函数
          formatDate: (date: string) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('zh-CN');
          },
          formatNumber: (num: string | number) => {
            if (!num) return '';
            return Number(num).toLocaleString('zh-CN');
          },
          formatCurrency: (amount: string | number) => {
            if (!amount) return '';
            return `¥${Number(amount).toLocaleString('zh-CN')}`;
          }
        }
      });
      
      const filledFields = Object.keys(data).filter(key => 
        data[key] !== undefined && data[key] !== null && data[key] !== ''
      );
      
      console.log(`[WordProcessor] 文档生成完成，大小: ${documentBuffer.byteLength} bytes`);
      
      return {
        documentBuffer: documentBuffer.buffer as ArrayBuffer,
        metadata: {
          generatedAt: new Date().toISOString(),
          templateName,
          filledFields,
          fileSize: documentBuffer.byteLength
        }
      };
      
    } catch (error) {
      console.error('[WordProcessor] 文档生成失败:', error);
      throw new Error(`文档生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  
  /**
   * 验证模板文件
   */
  static async validateTemplate(buffer: ArrayBuffer): Promise<boolean> {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);
      
      // 检查必要的文件是否存在
      const requiredFiles = [
        'word/document.xml',
        '[Content_Types].xml',
        '_rels/.rels'
      ];
      
      for (const file of requiredFiles) {
        if (!zipContent.file(file)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('[WordProcessor] 模板验证失败:', error);
      return false;
    }
  }
  
  /**
   * 清理和标准化数据
   */
  static sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    console.log('[WordProcessor] 开始清理数据:', Object.keys(data));

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        console.log(`[WordProcessor] 处理字段 ${key}:`, typeof value, value);

        // 处理不同类型的数据
        if (typeof value === 'string') {
          sanitized[key] = value.trim().substring(0, 1000); // 限制长度
        } else if (typeof value === 'number') {
          sanitized[key] = isNaN(value) ? 0 : value;
        } else if (typeof value === 'boolean') {
          sanitized[key] = value ? '是' : '否';
        } else if (Array.isArray(value)) {
          // 处理数组数据（如表格数据）
          if (value.length > 0 && typeof value[0] === 'object') {
            // 表格数据：数组中包含对象
            sanitized[key] = value.map((item: any) => {
              if (typeof item === 'object' && item !== null) {
                const cleanItem: Record<string, any> = {};
                Object.entries(item).forEach(([itemKey, itemValue]) => {
                  if (itemValue !== undefined && itemValue !== null) {
                    if (typeof itemValue === 'string') {
                      cleanItem[itemKey] = itemValue.trim().substring(0, 500);
                    } else if (typeof itemValue === 'number') {
                      cleanItem[itemKey] = isNaN(itemValue) ? 0 : itemValue;
                    } else {
                      cleanItem[itemKey] = String(itemValue).trim().substring(0, 500);
                    }
                  }
                });
                return cleanItem;
              }
              return item;
            });
          } else {
            // 简单数组（字符串数组等）
            sanitized[key] = value.map((item: any) =>
              typeof item === 'string' ? item.trim().substring(0, 500) : String(item).trim().substring(0, 500)
            );
          }
        } else if (typeof value === 'object') {
          // 处理对象数据
          const cleanObject: Record<string, any> = {};
          Object.entries(value).forEach(([objKey, objValue]) => {
            if (objValue !== undefined && objValue !== null) {
              if (typeof objValue === 'string') {
                cleanObject[objKey] = objValue.trim().substring(0, 500);
              } else if (typeof objValue === 'number') {
                cleanObject[objKey] = isNaN(objValue) ? 0 : objValue;
              } else {
                cleanObject[objKey] = String(objValue).trim().substring(0, 500);
              }
            }
          });
          sanitized[key] = cleanObject;
        } else {
          // 其他类型转换为字符串
          sanitized[key] = String(value).trim().substring(0, 1000);
        }

        console.log(`[WordProcessor] 字段 ${key} 清理后:`, sanitized[key]);
      }
    });

    console.log('[WordProcessor] 数据清理完成:', Object.keys(sanitized));
    return sanitized;
  }
}
