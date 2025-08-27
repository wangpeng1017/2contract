/**
 * 模板管理系统
 * 提供模板的保存、分类、复用、版本管理功能
 */

import { PlaceholderInfo } from './word-processor';

export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  fileSize: number;
  placeholderCount: number;
  isPublic: boolean;
  downloadCount: number;
  rating?: number;
  thumbnail?: string; // Base64 encoded thumbnail
}

export interface SavedTemplate {
  metadata: TemplateMetadata;
  placeholders: PlaceholderInfo[];
  templateData: ArrayBuffer; // 原始模板文件数据
}

export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  templateCount: number;
}

export interface TemplateVersion {
  version: string;
  createdAt: string;
  changes: string;
  templateData: ArrayBuffer;
  placeholders: PlaceholderInfo[];
}

export interface TemplateSearchFilter {
  category?: string;
  tags?: string[];
  author?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  minRating?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'downloadCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface TemplateUsageStats {
  templateId: string;
  usageCount: number;
  lastUsed: string;
  avgGenerationTime: number;
  successRate: number;
}

/**
 * 模板管理器类
 */
export class TemplateManager {
  private static readonly STORAGE_KEY = 'local-doc-templates';
  private static readonly CATEGORIES_KEY = 'local-doc-categories';
  private static readonly STATS_KEY = 'local-doc-template-stats';

  /**
   * 保存模板
   */
  static async saveTemplate(
    name: string,
    description: string,
    category: string,
    tags: string[],
    placeholders: PlaceholderInfo[],
    templateData: ArrayBuffer,
    author?: string
  ): Promise<string> {
    const templateId = this.generateTemplateId();
    const now = new Date().toISOString();
    
    const metadata: TemplateMetadata = {
      id: templateId,
      name: name.trim(),
      description: description.trim(),
      category,
      tags: tags.map(tag => tag.trim()).filter(Boolean),
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      author,
      fileSize: templateData.byteLength,
      placeholderCount: placeholders.length,
      isPublic: false,
      downloadCount: 0,
      rating: 0,
      thumbnail: await this.generateThumbnail(templateData)
    };

    const savedTemplate: SavedTemplate = {
      metadata,
      placeholders,
      templateData
    };

    // 保存到本地存储
    const templates = this.getAllTemplates();
    templates[templateId] = savedTemplate;
    this.saveToStorage(templates);

    // 更新分类统计
    this.updateCategoryCount(category, 1);

    console.log(`[TemplateManager] 模板已保存: ${name} (ID: ${templateId})`);
    return templateId;
  }

  /**
   * 获取所有模板
   */
  static getAllTemplates(): Record<string, SavedTemplate> {
    try {
      // 检查是否在浏览器环境
      if (typeof window === 'undefined') {
        return {};
      }
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[TemplateManager] 读取模板失败:', error);
      return {};
    }
  }

  /**
   * 根据ID获取模板
   */
  static getTemplate(templateId: string): SavedTemplate | null {
    const templates = this.getAllTemplates();
    return templates[templateId] || null;
  }

  /**
   * 搜索模板
   */
  static searchTemplates(filter: TemplateSearchFilter = {}): SavedTemplate[] {
    const templates = this.getAllTemplates();
    let results = Object.values(templates);

    // 按分类过滤
    if (filter.category) {
      results = results.filter(t => t.metadata.category === filter.category);
    }

    // 按标签过滤
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(t => 
        filter.tags!.some(tag => t.metadata.tags.includes(tag))
      );
    }

    // 按作者过滤
    if (filter.author) {
      results = results.filter(t => t.metadata.author === filter.author);
    }

    // 按日期范围过滤
    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start);
      const end = new Date(filter.dateRange.end);
      results = results.filter(t => {
        const created = new Date(t.metadata.createdAt);
        return created >= start && created <= end;
      });
    }

    // 按评分过滤
    if (filter.minRating) {
      results = results.filter(t => (t.metadata.rating || 0) >= filter.minRating!);
    }

    // 排序
    if (filter.sortBy) {
      results.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filter.sortBy) {
          case 'name':
            aValue = a.metadata.name.toLowerCase();
            bValue = b.metadata.name.toLowerCase();
            break;
          case 'createdAt':
            aValue = new Date(a.metadata.createdAt);
            bValue = new Date(b.metadata.createdAt);
            break;
          case 'updatedAt':
            aValue = new Date(a.metadata.updatedAt);
            bValue = new Date(b.metadata.updatedAt);
            break;
          case 'downloadCount':
            aValue = a.metadata.downloadCount;
            bValue = b.metadata.downloadCount;
            break;
          case 'rating':
            aValue = a.metadata.rating || 0;
            bValue = b.metadata.rating || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return filter.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return filter.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return results;
  }

  /**
   * 删除模板
   */
  static deleteTemplate(templateId: string): boolean {
    const templates = this.getAllTemplates();
    const template = templates[templateId];
    
    if (!template) {
      return false;
    }

    delete templates[templateId];
    this.saveToStorage(templates);

    // 更新分类统计
    this.updateCategoryCount(template.metadata.category, -1);

    console.log(`[TemplateManager] 模板已删除: ${template.metadata.name}`);
    return true;
  }

  /**
   * 更新模板
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<TemplateMetadata>,
    newPlaceholders?: PlaceholderInfo[],
    newTemplateData?: ArrayBuffer
  ): Promise<boolean> {
    const templates = this.getAllTemplates();
    const template = templates[templateId];
    
    if (!template) {
      return false;
    }

    // 更新元数据
    template.metadata = {
      ...template.metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // 更新占位符
    if (newPlaceholders) {
      template.placeholders = newPlaceholders;
      template.metadata.placeholderCount = newPlaceholders.length;
    }

    // 更新模板数据
    if (newTemplateData) {
      template.templateData = newTemplateData;
      template.metadata.fileSize = newTemplateData.byteLength;
      template.metadata.thumbnail = await this.generateThumbnail(newTemplateData);
    }

    templates[templateId] = template;
    this.saveToStorage(templates);

    console.log(`[TemplateManager] 模板已更新: ${template.metadata.name}`);
    return true;
  }

  /**
   * 获取所有分类
   */
  static getCategories(): TemplateCategory[] {
    try {
      // 检查是否在浏览器环境
      if (typeof window === 'undefined') {
        return this.getDefaultCategories();
      }

      const stored = localStorage.getItem(this.CATEGORIES_KEY);
      const categories = stored ? JSON.parse(stored) : this.getDefaultCategories();

      // 更新模板数量统计
      const templates = this.getAllTemplates();
      const categoryCounts: Record<string, number> = {};

      Object.values(templates).forEach(template => {
        const category = template.metadata.category;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      return categories.map((cat: TemplateCategory) => ({
        ...cat,
        templateCount: categoryCounts[cat.id] || 0
      }));
    } catch (error) {
      console.error('[TemplateManager] 读取分类失败:', error);
      return this.getDefaultCategories();
    }
  }

  /**
   * 记录模板使用统计
   */
  static recordTemplateUsage(templateId: string, generationTime: number, success: boolean): void {
    try {
      // 检查是否在浏览器环境
      if (typeof window === 'undefined') {
        console.warn('[TemplateManager] 服务器端无法记录使用统计');
        return;
      }

      const stored = localStorage.getItem(this.STATS_KEY);
      const stats: Record<string, TemplateUsageStats> = stored ? JSON.parse(stored) : {};

      if (!stats[templateId]) {
        stats[templateId] = {
          templateId,
          usageCount: 0,
          lastUsed: '',
          avgGenerationTime: 0,
          successRate: 0
        };
      }

      const stat = stats[templateId];
      stat.usageCount += 1;
      stat.lastUsed = new Date().toISOString();

      // 更新平均生成时间
      stat.avgGenerationTime = (stat.avgGenerationTime + generationTime) / 2;

      // 更新成功率
      const totalAttempts = stat.usageCount;
      const successCount = success ? 1 : 0;
      stat.successRate = ((stat.successRate * (totalAttempts - 1)) + successCount) / totalAttempts;

      localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));

      // 更新模板的下载计数
      const templates = this.getAllTemplates();
      if (templates[templateId]) {
        templates[templateId].metadata.downloadCount += 1;
        this.saveToStorage(templates);
      }
    } catch (error) {
      console.error('[TemplateManager] 记录使用统计失败:', error);
    }
  }

  /**
   * 生成模板ID
   */
  private static generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存到本地存储
   */
  private static saveToStorage(templates: Record<string, SavedTemplate>): void {
    try {
      // 检查是否在浏览器环境
      if (typeof window === 'undefined') {
        console.warn('[TemplateManager] 服务器端无法保存到localStorage');
        return;
      }
      // 由于localStorage有大小限制，我们需要处理大文件
      const serialized = JSON.stringify(templates);
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('[TemplateManager] 保存失败:', error);
      throw new Error('模板保存失败，可能是存储空间不足');
    }
  }

  /**
   * 更新分类统计
   */
  private static updateCategoryCount(categoryId: string, delta: number): void {
    // 这里可以实现分类统计的更新逻辑
    // 当前版本中，统计在getCategories中动态计算
  }

  /**
   * 生成缩略图
   */
  private static async generateThumbnail(templateData: ArrayBuffer): Promise<string> {
    // 简化实现：返回一个基于文件大小的占位符
    const size = templateData.byteLength;
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // 绘制简单的文档图标
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 200, 150);
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Word 模板', 100, 75);
      ctx.fillText(`${(size / 1024).toFixed(1)} KB`, 100, 95);
    }
    
    return canvas.toDataURL('image/png');
  }

  /**
   * 获取默认分类
   */
  private static getDefaultCategories(): TemplateCategory[] {
    return [
      {
        id: 'contract',
        name: '合同协议',
        description: '各类合同和协议模板',
        icon: '📄',
        color: '#3b82f6',
        templateCount: 0
      },
      {
        id: 'business',
        name: '商务文档',
        description: '商务相关的文档模板',
        icon: '💼',
        color: '#10b981',
        templateCount: 0
      },
      {
        id: 'hr',
        name: '人力资源',
        description: '人事管理相关模板',
        icon: '👥',
        color: '#f59e0b',
        templateCount: 0
      },
      {
        id: 'finance',
        name: '财务报表',
        description: '财务和会计相关模板',
        icon: '💰',
        color: '#ef4444',
        templateCount: 0
      },
      {
        id: 'legal',
        name: '法律文书',
        description: '法律相关的文档模板',
        icon: '⚖️',
        color: '#8b5cf6',
        templateCount: 0
      },
      {
        id: 'other',
        name: '其他',
        description: '其他类型的模板',
        icon: '📋',
        color: '#6b7280',
        templateCount: 0
      }
    ];
  }
}
