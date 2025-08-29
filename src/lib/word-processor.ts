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
   * 从XML内容中提取占位符（使用增强算法）
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

      console.log('[WordProcessor] 开始使用增强算法提取占位符...');

      // 使用增强的占位符识别算法
      const extractedPlaceholderNames = this.extractAllPlaceholdersFromXml(xmlContent);

      console.log(`[WordProcessor] 增强算法识别到 ${extractedPlaceholderNames.length} 个占位符:`, extractedPlaceholderNames);

      // 将识别到的占位符名称转换为PlaceholderInfo对象
      extractedPlaceholderNames.forEach(placeholderName => {
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
      });

      // 如果没有找到占位符，返回一些示例占位符用于演示
      if (placeholders.length === 0) {
        console.log('[WordProcessor] 增强算法也未找到占位符，返回示例占位符');
        return this.getDefaultPlaceholders();
      }

      console.log(`[WordProcessor] 最终生成 ${placeholders.length} 个占位符对象`);
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
   * 从XML中提取所有可能的占位符格式（专业版）
   */
  private static extractAllPlaceholdersFromXml(xmlContent: string): string[] {
    const placeholders = new Set<string>();

    console.log('[WordProcessor] 开始专业级占位符识别...');

    // 1. 标准双花括号格式
    const doublePattern = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = doublePattern.exec(xmlContent)) !== null) {
      const placeholder = match[1].trim();
      placeholders.add(placeholder);
      console.log(`[WordProcessor] 找到双花括号占位符: {{${placeholder}}}`);
    }

    // 2. 单花括号格式
    const singlePattern = /\{([^{}]+)\}/g;
    while ((match = singlePattern.exec(xmlContent)) !== null) {
      const content = match[1].trim();
      // 排除XML标签和其他非占位符内容
      if (!content.includes('<') && !content.includes('>') &&
          !content.includes('w:') && content.length > 0 && content.length < 50) {
        placeholders.add(content);
        console.log(`[WordProcessor] 找到单花括号占位符: {${content}}`);
      }
    }

    // 3. Word内容控件 (Content Controls)
    const contentControlPlaceholders = this.extractContentControlPlaceholders(xmlContent);
    contentControlPlaceholders.forEach(p => {
      placeholders.add(p);
      console.log(`[WordProcessor] 找到内容控件占位符: ${p}`);
    });

    // 4. Word书签 (Bookmarks)
    const bookmarkPlaceholders = this.extractBookmarkPlaceholders(xmlContent);
    bookmarkPlaceholders.forEach(p => {
      placeholders.add(p);
      console.log(`[WordProcessor] 找到书签占位符: ${p}`);
    });

    // 5. Word域代码格式 (MERGEFIELD)
    const mergeFieldPattern = /MERGEFIELD\s+([^\s\\]+)/gi;
    while ((match = mergeFieldPattern.exec(xmlContent)) !== null) {
      const fieldName = match[1].trim();
      placeholders.add(fieldName);
      console.log(`[WordProcessor] 找到MERGEFIELD占位符: ${fieldName}`);
    }

    // 6. 表格中的占位符
    const tablePlaceholders = this.extractTablePlaceholders(xmlContent);
    tablePlaceholders.forEach(p => {
      placeholders.add(p);
      console.log(`[WordProcessor] 找到表格占位符: ${p}`);
    });

    // 7. 处理被XML节点分割的占位符
    const reassembledPlaceholders = this.reassembleFragmentedPlaceholders(xmlContent);
    reassembledPlaceholders.forEach(p => {
      placeholders.add(p);
      console.log(`[WordProcessor] 找到重组占位符: ${p}`);
    });

    // 8. 专门处理Word分割问题的高级算法
    const wordSplitPlaceholders = this.extractWordSplitPlaceholders(xmlContent);
    wordSplitPlaceholders.forEach(p => {
      placeholders.add(p);
      console.log(`[WordProcessor] 找到Word分割占位符: ${p}`);
    });

    // 9. 智能字段名推断（基于已知字段模式）
    const inferredPlaceholders = this.inferPlaceholdersFromContent(xmlContent);
    inferredPlaceholders.forEach(p => {
      placeholders.add(p);
      console.log(`[WordProcessor] 推断占位符: ${p}`);
    });

    const result = Array.from(placeholders).sort();
    console.log(`[WordProcessor] 专业级占位符识别完成，共找到 ${result.length} 个:`, result);

    return result;
  }

  /**
   * 专门处理Word分割占位符的高级算法
   * 解决Word将{甲方}分割为 <w:t>{</w:t><w:t>甲方</w:t><w:t>}</w:t> 的问题
   */
  private static extractWordSplitPlaceholders(xmlContent: string): string[] {
    const placeholders: string[] = [];

    console.log('[WordProcessor] 开始Word分割占位符高级识别...');

    try {
      // 1. 提取所有w:t元素的文本内容，保持顺序
      const textElements: string[] = [];
      const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let match;

      while ((match = textPattern.exec(xmlContent)) !== null) {
        const text = match[1];
        if (text) {
          textElements.push(text);
        }
      }

      console.log(`[WordProcessor] 提取到 ${textElements.length} 个文本元素`);

      // 2. 重新组合文本，寻找占位符模式
      const combinedText = textElements.join('');
      console.log(`[WordProcessor] 组合文本长度: ${combinedText.length}`);

      // 3. 在组合文本中查找占位符
      const patterns = [
        /\{([^{}]+)\}/g,     // 单花括号
        /\{\{([^}]+)\}\}/g,  // 双花括号
      ];

      patterns.forEach((pattern, index) => {
        const patternName = index === 0 ? '单花括号' : '双花括号';
        pattern.lastIndex = 0; // 重置正则表达式

        while ((match = pattern.exec(combinedText)) !== null) {
          const placeholder = match[1].trim();
          if (placeholder &&
              placeholder.length > 0 &&
              placeholder.length < 50 &&
              !placeholder.includes('<') &&
              !placeholder.includes('>') &&
              !placeholder.includes('w:')) {

            placeholders.push(placeholder);
            console.log(`[WordProcessor] Word分割算法找到${patternName}占位符: ${placeholder}`);
          }
        }
      });

      // 4. 滑动窗口算法：处理更复杂的分割情况
      const windowPlaceholders = this.extractWithSlidingWindow(textElements);
      windowPlaceholders.forEach(p => {
        if (!placeholders.includes(p)) {
          placeholders.push(p);
          console.log(`[WordProcessor] 滑动窗口算法找到占位符: ${p}`);
        }
      });

    } catch (error) {
      console.error('[WordProcessor] Word分割占位符识别失败:', error);
    }

    console.log(`[WordProcessor] Word分割算法完成，找到 ${placeholders.length} 个占位符`);
    return placeholders;
  }

  /**
   * 滑动窗口算法：处理复杂的分割情况
   */
  private static extractWithSlidingWindow(textElements: string[]): string[] {
    const placeholders: string[] = [];
    const windowSize = 10; // 检查前后10个元素

    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i];

      // 如果当前元素包含开始括号
      if (element.includes('{')) {
        // 向前查找，组合可能的占位符
        let combined = '';
        let foundEnd = false;

        for (let j = i; j < Math.min(i + windowSize, textElements.length); j++) {
          combined += textElements[j];

          // 如果找到结束括号
          if (textElements[j].includes('}')) {
            foundEnd = true;
            break;
          }
        }

        if (foundEnd) {
          // 尝试提取占位符
          const patterns = [
            /\{([^{}]+)\}/g,
            /\{\{([^}]+)\}\}/g
          ];

          patterns.forEach(pattern => {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(combined)) !== null) {
              const placeholder = match[1].trim();
              if (placeholder &&
                  placeholder.length > 0 &&
                  placeholder.length < 50 &&
                  !placeholder.includes('<') &&
                  !placeholder.includes('>')) {

                placeholders.push(placeholder);
                console.log(`[WordProcessor] 滑动窗口找到: ${placeholder} (组合文本: ${combined})`);
              }
            }
          });
        }
      }
    }

    return Array.from(new Set(placeholders)); // 去重
  }

  /**
   * 重组被分割的占位符（专门处理Word分割问题）
   */
  private static reassembleFragmentedPlaceholders(xmlContent: string): string[] {
    const reassembled: string[] = [];

    console.log('[WordProcessor] 开始重组被分割的占位符...');

    // 1. 处理单花括号分割占位符 {内容}
    // 模式：<w:t>{</w:t>...其他节点...<w:t>内容</w:t>...其他节点...<w:t>}</w:t>
    const singleBracePattern = new RegExp('<w:t[^>]*>\\{</w:t>.*?<w:t[^>]*>\\}</w:t>', 'g');
    let match;
    while ((match = singleBracePattern.exec(xmlContent)) !== null) {
      const fragment = match[0];
      console.log(`[WordProcessor] 找到单花括号分割片段: ${fragment.substring(0, 100)}...`);

      // 提取所有w:t节点中的文本
      const textMatches = fragment.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        let combined = '';
        textMatches.forEach(textMatch => {
          const text = textMatch.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
          combined += text;
        });

        console.log(`[WordProcessor] 重组后的文本: ${combined}`);

        // 检查是否形成完整的单花括号占位符
        const placeholderMatch = combined.match(/\{([^{}]+)\}/);
        if (placeholderMatch) {
          const placeholder = placeholderMatch[1].trim();
          if (placeholder && placeholder.length > 0) {
            reassembled.push(placeholder);
            console.log(`[WordProcessor] 重组成功: {${placeholder}}`);
          }
        }
      }
    }

    // 2. 处理双花括号分割占位符 {{内容}}
    const doubleBracePattern = new RegExp('<w:t[^>]*>\\{\\{</w:t>.*?<w:t[^>]*>\\}\\}</w:t>', 'g');
    while ((match = doubleBracePattern.exec(xmlContent)) !== null) {
      const fragment = match[0];
      console.log(`[WordProcessor] 找到双花括号分割片段: ${fragment.substring(0, 100)}...`);

      const textMatches = fragment.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        let combined = '';
        textMatches.forEach(textMatch => {
          const text = textMatch.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
          combined += text;
        });

        console.log(`[WordProcessor] 重组后的文本: ${combined}`);

        const placeholderMatch = combined.match(/\{\{([^}]+)\}\}/);
        if (placeholderMatch) {
          const placeholder = placeholderMatch[1].trim();
          if (placeholder && placeholder.length > 0) {
            reassembled.push(placeholder);
            console.log(`[WordProcessor] 重组成功: {{${placeholder}}}`);
          }
        }
      }
    }

    // 3. 更激进的方法：查找所有可能的占位符模式
    // 查找 { 开始的节点，然后向后查找对应的 } 结束节点
    const aggressiveReassembly = this.aggressiveReassemblePlaceholders(xmlContent);
    aggressiveReassembly.forEach(placeholder => {
      if (!reassembled.includes(placeholder)) {
        reassembled.push(placeholder);
        console.log(`[WordProcessor] 激进重组成功: ${placeholder}`);
      }
    });

    const uniqueReassembled = Array.from(new Set(reassembled));
    console.log(`[WordProcessor] 重组完成，共找到 ${uniqueReassembled.length} 个占位符:`, uniqueReassembled);

    return uniqueReassembled;
  }

  /**
   * 激进的占位符重组方法
   */
  private static aggressiveReassemblePlaceholders(xmlContent: string): string[] {
    const reassembled: string[] = [];

    // 提取所有文本节点的内容和位置
    const textNodes: { text: string; index: number }[] = [];
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;

    while ((match = textPattern.exec(xmlContent)) !== null) {
      textNodes.push({
        text: match[1],
        index: match.index
      });
    }

    // 查找占位符模式
    for (let i = 0; i < textNodes.length; i++) {
      const currentNode = textNodes[i];

      // 查找以 { 开始的节点
      if (currentNode.text.includes('{')) {
        let placeholderContent = '';
        let foundClosing = false;

        // 从当前节点开始，向后查找直到找到 }
        for (let j = i; j < textNodes.length && j < i + 10; j++) { // 限制搜索范围
          const nodeText = textNodes[j].text;
          placeholderContent += nodeText;

          if (nodeText.includes('}')) {
            foundClosing = true;
            break;
          }
        }

        if (foundClosing) {
          // 尝试提取占位符
          const singleBraceMatch = placeholderContent.match(/\{([^{}]+)\}/);
          if (singleBraceMatch) {
            const placeholder = singleBraceMatch[1].trim();
            if (placeholder && placeholder.length > 0 && placeholder.length < 100) {
              reassembled.push(placeholder);
            }
          }

          const doubleBraceMatch = placeholderContent.match(/\{\{([^}]+)\}\}/);
          if (doubleBraceMatch) {
            const placeholder = doubleBraceMatch[1].trim();
            if (placeholder && placeholder.length > 0 && placeholder.length < 100) {
              reassembled.push(placeholder);
            }
          }
        }
      }
    }

    return Array.from(new Set(reassembled));
  }

  /**
   * 从内容中智能推断占位符（专业合同模板版）
   */
  private static inferPlaceholdersFromContent(xmlContent: string): string[] {
    const inferred: string[] = [];

    // 提取所有文本内容
    const textElements = xmlContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const allText = textElements.map(t => t.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1')).join(' ');

    console.log('[WordProcessor] 开始专业合同模板字段推断...');
    console.log(`[WordProcessor] 文档文本长度: ${allText.length} 字符`);

    // 专业合同模板的字段映射规则
    const professionalFieldMappings = [
      {
        systemField: "甲方公司名称",
        patterns: ["卖方", "SELLER", "卖方公司", "卖方名称"],
        contextPatterns: ["卖方SELLER\\s*[：:]\\s*\\{([^}]+)\\}"]
      },
      {
        systemField: "乙方公司名称",
        patterns: ["买方", "BUYER", "买方公司", "买方名称"],
        contextPatterns: ["买方BUYER\\s*[：:]\\s*\\{([^}]+)\\}", "{{买方BUYER:\\s*([^}]+)\\s*}}"]
      },
      {
        systemField: "合同类型",
        patterns: ["合同", "CONTRACT", "销售合同", "SALES CONTRACT"],
        contextPatterns: ["SALES\\s+CONTRACT", "销售合同"]
      },
      {
        systemField: "合同金额",
        patterns: ["合同金额", "总金额", "TOTAL AMOUNT", "合同总金额"],
        contextPatterns: ["合同总金额\\s*\\(USD\\)", "TOTAL\\s+AMOUNT\\s+OF\\s+CONTRACT"]
      },
      {
        systemField: "签署日期",
        patterns: ["Date", "日期", "签署日期", "合同日期"],
        contextPatterns: ["Date:\\s*(\\d{4}\\.\\d{1,2}\\.\\d{1,2})", "签署日期"]
      },
      {
        systemField: "甲方联系人",
        patterns: ["联系人", "CONTACT", "卖方联系人"],
        contextPatterns: ["联系人", "CONTACT"]
      },
      {
        systemField: "甲方电话",
        patterns: ["电话", "TEL", "PHONE", "联系电话"],
        contextPatterns: ["电话", "TEL", "PHONE"]
      },
      {
        systemField: "乙方联系人",
        patterns: ["买方联系人", "BUYER CONTACT"],
        contextPatterns: ["买方联系人"]
      },
      {
        systemField: "联系邮箱",
        patterns: ["邮箱", "EMAIL", "E-MAIL"],
        contextPatterns: ["邮箱", "EMAIL"]
      },
      {
        systemField: "付款方式",
        patterns: ["付款方式", "PAYMENT", "Terms of payment", "支付方式"],
        contextPatterns: ["付款方式", "Terms\\s+of\\s+payment"]
      },
      {
        systemField: "产品清单",
        patterns: ["产品", "PRODUCT", "货物明细", "Details of goods"],
        contextPatterns: ["货物明细", "Details\\s+of\\s+goods"]
      },
      {
        systemField: "是否包含保险",
        patterns: ["保险", "INSURANCE"],
        contextPatterns: ["保险", "Insurance"]
      },
      {
        systemField: "特别约定",
        patterns: ["约定", "条款", "TERMS", "特别条款"],
        contextPatterns: ["特别约定", "约定", "条款"]
      }
    ];

    // 对每个字段进行智能推断
    professionalFieldMappings.forEach(mapping => {
      let fieldFound = false;

      // 1. 检查上下文模式
      for (const contextPattern of mapping.contextPatterns) {
        const regex = new RegExp(contextPattern, 'gi');
        if (regex.test(allText)) {
          inferred.push(mapping.systemField);
          fieldFound = true;
          console.log(`[WordProcessor] 通过上下文模式找到字段: ${mapping.systemField} (模式: ${contextPattern})`);
          break;
        }
      }

      // 2. 如果上下文模式没找到，检查基本模式
      if (!fieldFound) {
        for (const pattern of mapping.patterns) {
          if (allText.includes(pattern)) {
            inferred.push(mapping.systemField);
            fieldFound = true;
            console.log(`[WordProcessor] 通过基本模式找到字段: ${mapping.systemField} (模式: ${pattern})`);
            break;
          }
        }
      }
    });

    // 3. 特殊处理：查找表格中的数值字段
    this.inferNumericFieldsFromTables(xmlContent, inferred);

    const uniqueInferred = Array.from(new Set(inferred));
    console.log(`[WordProcessor] 专业合同模板字段推断完成，共推断出 ${uniqueInferred.length} 个字段:`, uniqueInferred);

    return uniqueInferred;
  }

  /**
   * 从表格中推断数值字段
   */
  private static inferNumericFieldsFromTables(xmlContent: string, inferred: string[]): void {
    // 查找表格中的数值模式
    const tablePattern = /<w:tbl[^>]*>.*?<\/w:tbl>/g;
    let match;

    while ((match = tablePattern.exec(xmlContent)) !== null) {
      const tableContent = match[0];
      const textElements = tableContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      const tableText = textElements.map(t => t.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1')).join(' ');

      // 查找金额相关模式
      const amountPatterns = [
        /\d+\s*USD/gi,
        /USD\s*\d+/gi,
        /\d{4,}/g, // 4位以上数字，可能是金额
        /合同.*?金额/gi,
        /总.*?金额/gi
      ];

      amountPatterns.forEach(pattern => {
        if (pattern.test(tableText)) {
          if (!inferred.includes("合同金额")) {
            inferred.push("合同金额");
            console.log(`[WordProcessor] 从表格中推断出合同金额字段`);
          }
        }
      });
    }
  }

  /**
   * 提取Word内容控件中的占位符
   */
  private static extractContentControlPlaceholders(xmlContent: string): string[] {
    const placeholders: string[] = [];

    // 查找所有内容控件 <w:sdt>
    const sdtPattern = /<w:sdt[^>]*>.*?<\/w:sdt>/g;
    let match;

    while ((match = sdtPattern.exec(xmlContent)) !== null) {
      const sdtContent = match[0];

      // 提取标签属性 (w:tag)
      const tagMatch = sdtContent.match(/<w:tag w:val="([^"]*)"/);
      if (tagMatch) {
        const tagValue = tagMatch[1].trim();
        if (tagValue && tagValue.length > 0) {
          placeholders.push(tagValue);
        }
      }

      // 提取别名属性 (w:alias)
      const aliasMatch = sdtContent.match(/<w:alias w:val="([^"]*)"/);
      if (aliasMatch) {
        const aliasValue = aliasMatch[1].trim();
        if (aliasValue && aliasValue.length > 0) {
          placeholders.push(aliasValue);
        }
      }

      // 提取占位符文本
      const placeholderMatch = sdtContent.match(/<w:placeholder>.*?<w:docPart w:val="([^"]*)"/);
      if (placeholderMatch) {
        const placeholderValue = placeholderMatch[1].trim();
        if (placeholderValue && placeholderValue.length > 0) {
          placeholders.push(placeholderValue);
        }
      }

      // 提取内容控件内的文本，查找可能的占位符
      const textMatches = sdtContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        const allText = textMatches.map(t => t.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1')).join('');

        // 在文本中查找占位符模式
        const textPlaceholders = this.extractPlaceholdersFromText(allText);
        placeholders.push(...textPlaceholders);
      }
    }

    return Array.from(new Set(placeholders));
  }

  /**
   * 提取Word书签中的占位符
   */
  private static extractBookmarkPlaceholders(xmlContent: string): string[] {
    const placeholders: string[] = [];

    // 查找书签开始标记
    const bookmarkPattern = /<w:bookmarkStart[^>]*w:name="([^"]*)"[^>]*>/g;
    let match;

    while ((match = bookmarkPattern.exec(xmlContent)) !== null) {
      const bookmarkName = match[1].trim();

      // 书签名称本身可能就是字段名
      if (bookmarkName && bookmarkName.length > 0) {
        placeholders.push(bookmarkName);

        // 查找书签内容
        const bookmarkContentPattern = new RegExp(
          `<w:bookmarkStart[^>]*w:name="${bookmarkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>.*?<w:bookmarkEnd[^>]*>`,
          's'
        );

        const contentMatch = xmlContent.match(bookmarkContentPattern);
        if (contentMatch) {
          const bookmarkContent = contentMatch[0];

          // 提取书签内的文本
          const textMatches = bookmarkContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
          if (textMatches) {
            const allText = textMatches.map(t => t.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1')).join('');
            const textPlaceholders = this.extractPlaceholdersFromText(allText);
            placeholders.push(...textPlaceholders);
          }
        }
      }
    }

    return Array.from(new Set(placeholders));
  }

  /**
   * 提取表格中的占位符
   */
  private static extractTablePlaceholders(xmlContent: string): string[] {
    const placeholders: string[] = [];

    // 查找所有表格
    const tablePattern = /<w:tbl[^>]*>.*?<\/w:tbl>/g;
    let match;

    while ((match = tablePattern.exec(xmlContent)) !== null) {
      const tableContent = match[0];

      // 提取表格中的所有文本
      const textMatches = tableContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        const allText = textMatches.map(t => t.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1')).join(' ');

        // 在表格文本中查找占位符
        const textPlaceholders = this.extractPlaceholdersFromText(allText);
        placeholders.push(...textPlaceholders);

        // 特别查找已知字段名
        const knownFields = [
          "甲方公司名称", "乙方公司名称", "合同类型", "合同金额", "签署日期",
          "甲方联系人", "甲方电话", "乙方联系人", "联系邮箱", "付款方式",
          "产品清单", "是否包含保险", "特别约定"
        ];

        knownFields.forEach(field => {
          if (allText.includes(field)) {
            placeholders.push(field);
          }
        });
      }
    }

    return Array.from(new Set(placeholders));
  }

  /**
   * 从文本中提取占位符
   */
  private static extractPlaceholdersFromText(text: string): string[] {
    const placeholders: string[] = [];

    // 各种占位符格式
    const patterns = [
      /\{\{([^}]+)\}\}/g,      // 双花括号
      /\{([^{}]+)\}/g,         // 单花括号
      /\[([^\]]+)\]/g,         // 方括号
      /_{3,}/g,                // 下划线
      /\.{3,}/g,               // 点线
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          const placeholder = match[1].trim();
          if (placeholder && placeholder.length > 0 && placeholder.length < 50) {
            placeholders.push(placeholder);
          }
        }
      }
    });

    return placeholders;
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

      // 增强的多格式占位符替换
      let replacedCount = 0;
      for (const [key, value] of Object.entries(data)) {
        const stringValue = String(value || '');
        let fieldReplaced = false;

        // 尝试多种占位符格式
        const placeholderFormats = [
          `{{${key}}}`,           // 标准双花括号
          `{${key}}`,             // 单花括号
          `{{${key.trim()}}}`,    // 去除空格的双花括号
          `{${key.trim()}}`,      // 去除空格的单花括号
        ];

        for (const placeholder of placeholderFormats) {
          if (documentXml.includes(placeholder)) {
            const regex = new RegExp(this.escapeRegExp(placeholder), 'g');
            const beforeLength = documentXml.length;
            documentXml = documentXml.replace(regex, stringValue);
            const afterLength = documentXml.length;

            if (beforeLength !== afterLength) {
              replacedCount++;
              fieldReplaced = true;
              console.log(`[WordProcessor] 替换 ${placeholder} -> ${stringValue}`);
              break; // 找到一种格式就停止
            }
          }
        }

        // 如果标准格式都没找到，尝试智能匹配
        if (!fieldReplaced) {
          const smartReplaced = this.smartReplaceField(documentXml, key, stringValue);
          if (smartReplaced.replaced) {
            documentXml = smartReplaced.xml;
            replacedCount++;
            console.log(`[WordProcessor] 智能替换 ${key} -> ${stringValue}`);
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
   * 智能字段替换（处理特殊格式和分割情况）- 专业版
   */
  private static smartReplaceField(xmlContent: string, fieldName: string, value: string): { xml: string; replaced: boolean } {
    let xml = xmlContent;
    let replaced = false;

    console.log(`[WordProcessor] 开始智能替换字段: ${fieldName} -> ${value}`);

    // 1. 尝试替换内容控件
    const contentControlResult = this.replaceInContentControls(xml, fieldName, value);
    if (contentControlResult.replaced) {
      xml = contentControlResult.xml;
      replaced = true;
      console.log(`[WordProcessor] 通过内容控件替换成功: ${fieldName}`);
    }

    // 2. 尝试替换书签
    if (!replaced) {
      const bookmarkResult = this.replaceInBookmarks(xml, fieldName, value);
      if (bookmarkResult.replaced) {
        xml = bookmarkResult.xml;
        replaced = true;
        console.log(`[WordProcessor] 通过书签替换成功: ${fieldName}`);
      }
    }

    // 3. 尝试替换表格中的字段
    if (!replaced) {
      const tableResult = this.replaceInTables(xml, fieldName, value);
      if (tableResult.replaced) {
        xml = tableResult.xml;
        replaced = true;
        console.log(`[WordProcessor] 通过表格替换成功: ${fieldName}`);
      }
    }

    // 4. 尝试替换跨节点分割的占位符
    if (!replaced) {
      const crossNodePatterns = [
        // 匹配 <w:t>{{字段</w:t>...<w:t>名}}</w:t> 这样的分割
        new RegExp(`<w:t[^>]*>\\{\\{[^<]*${fieldName.substring(0, Math.min(3, fieldName.length))}[^<]*</w:t>.*?<w:t[^>]*>[^<]*${fieldName.substring(-3)}[^<]*\\}\\}</w:t>`, 'g'),
        // 匹配包含字段名关键词的模式
        new RegExp(`<w:t[^>]*>[^<]*${fieldName}[^<]*</w:t>`, 'g'),
      ];

      for (const pattern of crossNodePatterns) {
        const matches = xml.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // 简单替换：将整个匹配替换为值
            xml = xml.replace(match, `<w:t>${value}</w:t>`);
            replaced = true;
          });
        }
      }
    }

    // 5. 尝试替换Word域代码
    if (!replaced) {
      const fieldCodePattern = new RegExp(`MERGEFIELD\\s+${fieldName}\\s*`, 'gi');
      if (fieldCodePattern.test(xml)) {
        xml = xml.replace(fieldCodePattern, value);
        replaced = true;
        console.log(`[WordProcessor] 通过域代码替换成功: ${fieldName}`);
      }
    }

    // 6. 尝试模糊匹配和替换
    if (!replaced) {
      // 查找包含字段名的文本节点
      const textNodePattern = new RegExp(`<w:t[^>]*>([^<]*${fieldName}[^<]*)</w:t>`, 'g');
      const textMatches = xml.match(textNodePattern);

      if (textMatches) {
        textMatches.forEach(match => {
          // 如果文本节点只包含字段名（可能有一些格式字符），就替换它
          const textContent = match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
          if (textContent.trim() === fieldName ||
              textContent.includes(fieldName) && textContent.length < fieldName.length + 10) {
            xml = xml.replace(match, `<w:t>${value}</w:t>`);
            replaced = true;
            console.log(`[WordProcessor] 通过模糊匹配替换成功: ${fieldName}`);
          }
        });
      }
    }

    if (!replaced) {
      console.log(`[WordProcessor] 智能替换失败: ${fieldName}`);
    }

    return { xml, replaced };
  }

  /**
   * 在内容控件中替换字段
   */
  private static replaceInContentControls(xmlContent: string, fieldName: string, value: string): { xml: string; replaced: boolean } {
    let xml = xmlContent;
    let replaced = false;

    // 查找匹配的内容控件
    const sdtPattern = /<w:sdt[^>]*>.*?<\/w:sdt>/g;
    let match;

    while ((match = sdtPattern.exec(xmlContent)) !== null) {
      const sdtContent = match[0];
      let shouldReplace = false;

      // 检查标签属性
      const tagMatch = sdtContent.match(/<w:tag w:val="([^"]*)"/);
      if (tagMatch && tagMatch[1].trim() === fieldName) {
        shouldReplace = true;
      }

      // 检查别名属性
      const aliasMatch = sdtContent.match(/<w:alias w:val="([^"]*)"/);
      if (aliasMatch && aliasMatch[1].trim() === fieldName) {
        shouldReplace = true;
      }

      // 检查内容是否包含字段名
      if (sdtContent.includes(fieldName)) {
        shouldReplace = true;
      }

      if (shouldReplace) {
        // 替换内容控件的内容
        const newSdtContent = sdtContent.replace(
          /<w:t[^>]*>([^<]*)<\/w:t>/g,
          `<w:t>${value}</w:t>`
        );
        xml = xml.replace(sdtContent, newSdtContent);
        replaced = true;
      }
    }

    return { xml, replaced };
  }

  /**
   * 在书签中替换字段
   */
  private static replaceInBookmarks(xmlContent: string, fieldName: string, value: string): { xml: string; replaced: boolean } {
    let xml = xmlContent;
    let replaced = false;

    // 查找匹配的书签
    const bookmarkPattern = /<w:bookmarkStart[^>]*w:name="([^"]*)"[^>]*>/g;
    let match;

    while ((match = bookmarkPattern.exec(xmlContent)) !== null) {
      const bookmarkName = match[1].trim();

      if (bookmarkName === fieldName || bookmarkName.includes(fieldName)) {
        // 查找书签内容并替换
        const bookmarkContentPattern = new RegExp(
          `<w:bookmarkStart[^>]*w:name="${bookmarkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>.*?<w:bookmarkEnd[^>]*>`,
          's'
        );

        const contentMatch = xml.match(bookmarkContentPattern);
        if (contentMatch) {
          const bookmarkContent = contentMatch[0];
          const newBookmarkContent = bookmarkContent.replace(
            /<w:t[^>]*>([^<]*)<\/w:t>/g,
            `<w:t>${value}</w:t>`
          );
          xml = xml.replace(bookmarkContent, newBookmarkContent);
          replaced = true;
        }
      }
    }

    return { xml, replaced };
  }

  /**
   * 在表格中替换字段（专业合同模板版）
   */
  private static replaceInTables(xmlContent: string, fieldName: string, value: string): { xml: string; replaced: boolean } {
    let xml = xmlContent;
    let replaced = false;

    console.log(`[WordProcessor] 开始表格字段替换: ${fieldName} -> ${value}`);

    // 专业合同模板的字段替换规则
    const professionalReplacementRules = this.getProfessionalReplacementRules();
    const rule = professionalReplacementRules[fieldName];

    if (!rule) {
      console.log(`[WordProcessor] 未找到字段 ${fieldName} 的专业替换规则`);
      return { xml, replaced: false };
    }

    // 查找所有表格
    const tablePattern = /<w:tbl[^>]*>.*?<\/w:tbl>/g;
    let match;

    while ((match = tablePattern.exec(xmlContent)) !== null) {
      const tableContent = match[0];
      const textElements = tableContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      const tableText = textElements.map(t => t.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1')).join(' ');

      // 检查表格是否包含相关模式
      let shouldProcessTable = false;
      for (const pattern of rule.searchPatterns) {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(tableText)) {
          shouldProcessTable = true;
          console.log(`[WordProcessor] 表格匹配模式: ${pattern}`);
          break;
        }
      }

      if (shouldProcessTable) {
        let newTableContent = tableContent;

        // 应用替换规则
        for (const replaceRule of rule.replacePatterns) {
          const regex = new RegExp(replaceRule.pattern, replaceRule.flags || 'gi');
          if (regex.test(newTableContent)) {
            newTableContent = newTableContent.replace(regex, replaceRule.replacement.replace('$VALUE', value));
            replaced = true;
            console.log(`[WordProcessor] 应用替换规则: ${replaceRule.pattern} -> ${replaceRule.replacement}`);
          }
        }

        // 如果标准规则没有匹配，尝试智能替换
        if (!replaced) {
          const smartResult = this.smartReplaceInTableCells(tableContent, fieldName, value, rule);
          if (smartResult.replaced) {
            newTableContent = smartResult.xml;
            replaced = true;
          }
        }

        if (replaced) {
          xml = xml.replace(tableContent, newTableContent);
        }
      }
    }

    console.log(`[WordProcessor] 表格字段替换结果: ${fieldName} -> ${replaced ? '成功' : '失败'}`);
    return { xml, replaced };
  }

  /**
   * 获取专业合同模板的替换规则
   */
  private static getProfessionalReplacementRules(): Record<string, any> {
    return {
      "甲方公司名称": {
        searchPatterns: ["卖方", "SELLER", "卖方公司"],
        replacePatterns: [
          {
            pattern: "卖方SELLER\\s*[：:]\\s*\\{([^}]+)\\}",
            replacement: "卖方SELLER ： { $VALUE }",
            flags: "gi"
          },
          {
            pattern: "(<w:t[^>]*>)([^<]*卖方[^<]*)(</w:t>)",
            replacement: "$1$VALUE$3",
            flags: "gi"
          }
        ]
      },
      "乙方公司名称": {
        searchPatterns: ["买方", "BUYER", "买方公司"],
        replacePatterns: [
          {
            pattern: "\\{\\{买方BUYER:\\s*([^}]*)\\s*\\}\\}",
            replacement: "{{买方BUYER: $VALUE }}",
            flags: "gi"
          },
          {
            pattern: "买方BUYER\\s*[：:]\\s*\\{([^}]+)\\}",
            replacement: "买方BUYER ： { $VALUE }",
            flags: "gi"
          }
        ]
      },
      "合同金额": {
        searchPatterns: ["合同金额", "总金额", "TOTAL AMOUNT", "合同总金额"],
        replacePatterns: [
          {
            pattern: "(合同总金额\\s*\\(USD\\)\\s*TOTAL\\s+AMOUNT\\s+OF\\s+CONTRACT\\s*[：:]\\s*)([^\\s]+)",
            replacement: "$1$VALUE",
            flags: "gi"
          },
          {
            pattern: "(TOTAL\\s+AMOUNT\\s+OF\\s+CONTRACT\\s*[：:]\\s*)([^\\s]+)",
            replacement: "$1$VALUE",
            flags: "gi"
          }
        ]
      },
      "付款方式": {
        searchPatterns: ["付款方式", "PAYMENT", "Terms of payment"],
        replacePatterns: [
          {
            pattern: "(付款方式[^【]*【[^】]*】)([^【]*)",
            replacement: "$1$VALUE",
            flags: "gi"
          }
        ]
      },
      "签署日期": {
        searchPatterns: ["Date", "日期", "签署日期"],
        replacePatterns: [
          {
            pattern: "(Date:\\s*)(\\d{4}\\.\\d{1,2}\\.\\d{1,2})",
            replacement: "$1$VALUE",
            flags: "gi"
          }
        ]
      }
    };
  }

  /**
   * 在表格单元格中进行智能替换
   */
  private static smartReplaceInTableCells(tableContent: string, fieldName: string, value: string, rule: any): { xml: string; replaced: boolean } {
    let xml = tableContent;
    let replaced = false;

    // 查找包含相关模式的单元格
    const cellPattern = /<w:tc[^>]*>.*?<\/w:tc>/g;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(tableContent)) !== null) {
      const cellContent = cellMatch[0];
      const textElements = cellContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      const cellText = textElements.map(t => t.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1')).join(' ');

      // 检查单元格是否包含相关模式
      for (const pattern of rule.searchPatterns) {
        if (cellText.includes(pattern)) {
          // 尝试智能替换
          let newCellContent = cellContent;

          // 如果单元格包含空格占位符，替换它们
          if (/\s{5,}/.test(cellText)) {
            const spaceRegex = new RegExp('(<w:t[^>]*>)([^<]*\\s{5,}[^<]*)(</w:t>)', 'g');
            newCellContent = newCellContent.replace(
              spaceRegex,
              `$1$2 ${value}$3`
            );
            replaced = true;
          }

          // 如果单元格只包含模式关键词，在其后添加值
          else if (cellText.trim() === pattern) {
            const textRegex = new RegExp('(<w:t[^>]*>)([^<]*)(</w:t>)', 'g');
            newCellContent = newCellContent.replace(
              textRegex,
              `$1$2: ${value}$3`
            );
            replaced = true;
          }

          if (replaced) {
            xml = xml.replace(cellContent, newCellContent);
            break;
          }
        }
      }
    }

    return { xml, replaced };
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
