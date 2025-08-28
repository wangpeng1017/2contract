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
    diagnosis?: {
      totalPlaceholders: number;
      matchedPlaceholders: number;
      unmatchedPlaceholders: number;
    };
  };
}

/**
 * Word文档处理器类
 */
export class WordProcessor {

  /**
   * 安全过滤错误信息，防止XML内容泄露
   */
  private static sanitizeErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof Error) {
      const message = error.message;
      // 检查是否包含XML标签或过长的内容
      if (message &&
          !message.includes('<') &&
          !message.includes('>') &&
          !message.includes('w:') &&
          !message.includes('xml') &&
          message.length < 200) {
        return message;
      }
    }
    return defaultMessage;
  }

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
      throw new Error(this.sanitizeErrorMessage(error, '模板解析失败'));
    }
  }
  
  /**
   * 从XML内容中提取占位符
   */
  private static extractPlaceholders(xmlContent: string): PlaceholderInfo[] {
    const placeholders: PlaceholderInfo[] = [];
    const placeholderSet = new Set<string>();

    try {
      // 确保XML内容不会泄露到前端
      if (!xmlContent || typeof xmlContent !== 'string') {
        console.log('[WordProcessor] XML内容无效，返回示例占位符');
        return this.getDefaultPlaceholders();
      }

      // 匹配 {{placeholder}} 格式的占位符
      // 考虑到Word可能会将占位符分割到多个XML节点中，我们需要更复杂的匹配
      // 修复：只使用双花括号格式，避免重复识别
      const patterns = [
        /\{\{([^}]+)\}\}/g,  // 标准双花括号格式
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(xmlContent)) !== null) {
          const placeholderName = match[1].trim();

          // 过滤掉XML标签和无效内容
          if (placeholderName &&
              !placeholderName.includes('<') &&
              !placeholderName.includes('>') &&
              !placeholderName.includes('w:') &&
              placeholderName.length > 0 &&
              placeholderName.length < 100 && // 防止异常长的内容
              !placeholderSet.has(placeholderName)) {

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

    } catch (error) {
      console.error('[WordProcessor] 占位符提取失败:', error);
      // 确保错误情况下不会泄露XML内容
      return this.getDefaultPlaceholders();
    }
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
   * 诊断模板和数据匹配问题
   */
  static async diagnoseTemplatePlaceholders(
    templateBuffer: ArrayBuffer,
    data: Record<string, any>,
    templateName: string
  ): Promise<{
    templatePlaceholders: string[];
    dataKeys: string[];
    matchedKeys: string[];
    unmatchedTemplateKeys: string[];
    unmatchedDataKeys: string[];
    xmlContent: string;
  }> {
    try {
      console.log(`[WordProcessor] 开始诊断模板: ${templateName}`);

      // 解析模板文件
      const zip = new JSZip();
      await zip.loadAsync(templateBuffer);

      const documentXml = await zip.file('word/document.xml')?.async('string');
      if (!documentXml) {
        throw new Error('无法找到document.xml文件');
      }

      // 提取模板中的所有占位符（更全面的匹配）
      const templatePlaceholders = this.extractAllPlaceholdersFromXml(documentXml);
      const dataKeys = Object.keys(data);

      // 分析匹配情况
      const matchedKeys = templatePlaceholders.filter(placeholder =>
        dataKeys.includes(placeholder)
      );
      const unmatchedTemplateKeys = templatePlaceholders.filter(placeholder =>
        !dataKeys.includes(placeholder)
      );
      const unmatchedDataKeys = dataKeys.filter(key =>
        !templatePlaceholders.includes(key)
      );

      console.log(`[WordProcessor] 诊断结果:`);
      console.log(`  模板占位符 (${templatePlaceholders.length}):`, templatePlaceholders);
      console.log(`  数据键名 (${dataKeys.length}):`, dataKeys);
      console.log(`  匹配成功 (${matchedKeys.length}):`, matchedKeys);
      console.log(`  模板中未匹配 (${unmatchedTemplateKeys.length}):`, unmatchedTemplateKeys);
      console.log(`  数据中未匹配 (${unmatchedDataKeys.length}):`, unmatchedDataKeys);

      return {
        templatePlaceholders,
        dataKeys,
        matchedKeys,
        unmatchedTemplateKeys,
        unmatchedDataKeys,
        xmlContent: documentXml
      };
    } catch (error) {
      console.error('[WordProcessor] 诊断失败:', error);
      throw new Error(this.sanitizeErrorMessage(error, '模板诊断失败'));
    }
  }

  /**
   * 从XML中提取所有可能的占位符格式
   */
  private static extractAllPlaceholdersFromXml(xmlContent: string): string[] {
    const placeholders = new Set<string>();

    // 1. 标准双花括号格式
    const doublePattern = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = doublePattern.exec(xmlContent)) !== null) {
      placeholders.add(match[1].trim());
    }

    // 2. 处理被XML节点分割的占位符
    // Word经常会将占位符分割，如: <w:t>{{甲方</w:t><w:t>公司名称}}</w:t>
    const fragmentPattern = /\{\{[^}]*\}?\}?/g;
    const fragments: string[] = [];
    while ((match = fragmentPattern.exec(xmlContent)) !== null) {
      fragments.push(match[0]);
    }

    // 尝试重组分割的占位符
    const reassembledPlaceholders = this.reassembleFragmentedPlaceholders(fragments, xmlContent);
    reassembledPlaceholders.forEach(p => placeholders.add(p));

    // 3. 单花括号格式（备选）
    const singlePattern = /\{([^{}]+)\}/g;
    while ((match = singlePattern.exec(xmlContent)) !== null) {
      const content = match[1].trim();
      // 排除XML标签和其他非占位符内容
      if (!content.includes('<') && !content.includes('>') && content.length > 0) {
        placeholders.add(content);
      }
    }

    return Array.from(placeholders).sort();
  }

  /**
   * 重组被分割的占位符
   */
  private static reassembleFragmentedPlaceholders(fragments: string[], xmlContent: string): string[] {
    const reassembled: string[] = [];

    // 查找可能的占位符模式
    const possiblePatterns = [
      /\{\{[^}]*甲方[^}]*公司[^}]*名称[^}]*\}\}/g,
      /\{\{[^}]*乙方[^}]*公司[^}]*名称[^}]*\}\}/g,
      /\{\{[^}]*合同[^}]*金额[^}]*\}\}/g,
      /\{\{[^}]*产品[^}]*清单[^}]*\}\}/g,
      /\{\{[^}]*签署[^}]*日期[^}]*\}\}/g,
      // 通用模式：查找被分割的中文占位符
      /\{\{[^}]*[\u4e00-\u9fa5]+[^}]*\}\}/g
    ];

    possiblePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(xmlContent)) !== null) {
        const fullMatch = match[0];
        // 提取占位符内容
        const content = fullMatch.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
        if (content && content.length > 0) {
          reassembled.push(content);
        }
      }
    });

    return reassembled;
  }

  /**
   * 原生XML替换方法（备用方案）
   */
  static async generateDocumentWithNativeXML(
    templateBuffer: ArrayBuffer,
    data: Record<string, any>,
    templateName: string
  ): Promise<GenerationResult> {
    console.log('[WordProcessor] 使用原生XML替换方法');

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(templateBuffer);

      // 获取document.xml文件
      const documentXmlFile = zipContent.file('word/document.xml');
      if (!documentXmlFile) {
        throw new Error('无法找到document.xml文件，可能不是有效的Word文档');
      }

      let documentXml = await documentXmlFile.async('text');
      console.log('[WordProcessor] 原始XML长度:', documentXml.length);

      // 手动替换占位符
      let replacedCount = 0;
      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        const stringValue = String(value || '');

        if (documentXml.includes(placeholder)) {
          // 使用全局替换
          const regex = new RegExp(this.escapeRegExp(placeholder), 'g');
          const beforeLength = documentXml.length;
          documentXml = documentXml.replace(regex, stringValue);
          const afterLength = documentXml.length;

          if (beforeLength !== afterLength) {
            replacedCount++;
            console.log(`[WordProcessor] 替换 ${placeholder} -> ${stringValue}`);
          }
        }
      }

      console.log(`[WordProcessor] 原生XML替换完成，替换了 ${replacedCount} 个占位符`);

      // 更新ZIP文件中的document.xml
      zip.file('word/document.xml', documentXml);

      // 生成新的文档
      const newDocumentBuffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      return {
        documentBuffer: newDocumentBuffer,
        metadata: {
          generatedAt: new Date().toISOString(),
          templateName: templateName,
          filledFields: Object.keys(data),
          fileSize: newDocumentBuffer.byteLength,
          diagnosis: {
            totalPlaceholders: Object.keys(data).length,
            matchedPlaceholders: replacedCount,
            unmatchedPlaceholders: Object.keys(data).length - replacedCount
          }
        }
      };

    } catch (error) {
      console.error('[WordProcessor] 原生XML替换失败:', error);
      throw new Error(`原生XML替换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

      // 环境检测
      const isProduction = process.env.NODE_ENV === 'production';
      const isLinux = process.platform === 'linux';
      const nodeVersion = process.version;

      console.log(`[WordProcessor] 环境信息: NODE_ENV=${process.env.NODE_ENV}, platform=${process.platform}, nodeVersion=${nodeVersion}`);

      // 先进行诊断
      const diagnosis = await this.diagnoseTemplatePlaceholders(templateBuffer, data, templateName);

      // 如果有不匹配的情况，尝试修复数据键名
      const fixedData = this.fixDataKeyMapping(data, diagnosis);

      console.log(`[WordProcessor] 修复后的数据键名:`, Object.keys(fixedData));

      // 生产环境Linux系统使用原生XML替换作为主要方案
      if (isProduction && isLinux) {
        console.log(`[WordProcessor] 检测到生产环境Linux系统，使用原生XML替换方案`);
        try {
          return await this.generateDocumentWithNativeXML(templateBuffer, fixedData, templateName);
        } catch (nativeError) {
          console.error(`[WordProcessor] 原生XML替换失败，回退到docx-templates:`, nativeError);
          // 继续使用docx-templates作为备用方案
        }
      }

      // 使用docx-templates生成文档
      const documentBuffer = await createReport({
        template: new Uint8Array(templateBuffer),
        data: fixedData,
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
        },
        // 添加详细的错误处理
        processLineBreaks: true,
        failFast: false
      });

      const filledFields = Object.keys(fixedData).filter(key =>
        fixedData[key] !== undefined && fixedData[key] !== null && fixedData[key] !== ''
      );

      console.log(`[WordProcessor] 文档生成完成，大小: ${documentBuffer.byteLength} bytes`);
      console.log(`[WordProcessor] 实际填充字段:`, filledFields);

      return {
        documentBuffer: documentBuffer.buffer as ArrayBuffer,
        metadata: {
          generatedAt: new Date().toISOString(),
          templateName,
          filledFields,
          fileSize: documentBuffer.byteLength,
          diagnosis: {
            totalPlaceholders: diagnosis.templatePlaceholders.length,
            matchedPlaceholders: diagnosis.matchedKeys.length,
            unmatchedPlaceholders: diagnosis.unmatchedTemplateKeys.length
          }
        }
      };

    } catch (error) {
      console.error('[WordProcessor] 文档生成失败:', error);
      throw new Error(this.sanitizeErrorMessage(error, '文档生成失败'));
    }
  }

  /**
   * 修复数据键名映射问题
   */
  private static fixDataKeyMapping(
    data: Record<string, any>,
    diagnosis: {
      templatePlaceholders: string[];
      dataKeys: string[];
      matchedKeys: string[];
      unmatchedTemplateKeys: string[];
      unmatchedDataKeys: string[];
    }
  ): Record<string, any> {
    const fixedData = { ...data };

    console.log(`[WordProcessor] 开始修复数据键名映射`);

    // 1. 处理完全匹配的情况（无需修复）
    diagnosis.matchedKeys.forEach(key => {
      console.log(`[WordProcessor] ✓ 完全匹配: ${key}`);
    });

    // 2. 尝试修复不匹配的键名
    diagnosis.unmatchedDataKeys.forEach(dataKey => {
      // 查找最相似的模板占位符
      const bestMatch = this.findBestPlaceholderMatch(dataKey, diagnosis.unmatchedTemplateKeys);
      if (bestMatch) {
        console.log(`[WordProcessor] 🔧 键名映射: "${dataKey}" -> "${bestMatch}"`);
        fixedData[bestMatch] = fixedData[dataKey];
        // 保留原键名以防万一
        // delete fixedData[dataKey];
      } else {
        console.log(`[WordProcessor] ⚠️ 未找到匹配的占位符: ${dataKey}`);
      }
    });

    // 3. 为未匹配的模板占位符提供默认值
    diagnosis.unmatchedTemplateKeys.forEach(templateKey => {
      if (!fixedData[templateKey]) {
        // 尝试从相似的数据键中找到值
        const similarDataKey = this.findBestDataKeyMatch(templateKey, diagnosis.unmatchedDataKeys);
        if (similarDataKey && data[similarDataKey]) {
          console.log(`[WordProcessor] 🔄 反向映射: "${templateKey}" <- "${similarDataKey}"`);
          fixedData[templateKey] = data[similarDataKey];
        } else {
          // 提供默认值以避免模板错误
          console.log(`[WordProcessor] 📝 默认值: "${templateKey}" = "[未填写]"`);
          fixedData[templateKey] = '[未填写]';
        }
      }
    });

    console.log(`[WordProcessor] 键名映射修复完成`);
    return fixedData;
  }

  /**
   * 查找最匹配的占位符
   */
  private static findBestPlaceholderMatch(dataKey: string, templatePlaceholders: string[]): string | null {
    if (templatePlaceholders.length === 0) return null;

    // 1. 精确匹配（忽略大小写和空格）
    const normalizedDataKey = dataKey.toLowerCase().replace(/\s+/g, '');
    for (const placeholder of templatePlaceholders) {
      const normalizedPlaceholder = placeholder.toLowerCase().replace(/\s+/g, '');
      if (normalizedDataKey === normalizedPlaceholder) {
        return placeholder;
      }
    }

    // 2. 包含匹配
    for (const placeholder of templatePlaceholders) {
      if (placeholder.includes(dataKey) || dataKey.includes(placeholder)) {
        return placeholder;
      }
    }

    // 3. 相似度匹配（简单的字符串相似度）
    let bestMatch = null;
    let bestScore = 0;

    for (const placeholder of templatePlaceholders) {
      const score = this.calculateStringSimilarity(dataKey, placeholder);
      if (score > bestScore && score > 0.6) { // 相似度阈值
        bestScore = score;
        bestMatch = placeholder;
      }
    }

    return bestMatch;
  }

  /**
   * 查找最匹配的数据键
   */
  private static findBestDataKeyMatch(templateKey: string, dataKeys: string[]): string | null {
    return this.findBestPlaceholderMatch(templateKey, dataKeys);
  }

  /**
   * 计算字符串相似度（简单的Jaccard相似度）
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(''));
    const set2 = new Set(str2.toLowerCase().split(''));

    const arr1 = Array.from(set1);
    const arr2 = Array.from(set2);

    const intersection = new Set(arr1.filter(x => set2.has(x)));
    const union = new Set([...arr1, ...arr2]);

    return intersection.size / union.size;
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
