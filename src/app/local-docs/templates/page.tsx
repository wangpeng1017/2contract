'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Download, Edit, Trash2, Eye, Tag, Calendar, User } from 'lucide-react';
import Link from 'next/link';

interface TemplateMetadata {
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
  thumbnail?: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  templateCount: number;
}

interface SavedTemplate {
  metadata: TemplateMetadata;
  placeholders: any[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 搜索和过滤状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'downloadCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, [selectedCategory, sortBy, sortOrder]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/local-docs/templates?${params}`);
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data.templates);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/local-docs/categories');
      const result = await response.json();

      if (result.success) {
        setCategories(result.data.categories);
      }
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('确定要删除这个模板吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/local-docs/templates/${templateId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setTemplates(prev => prev.filter(t => t.metadata.id !== templateId));
      } else {
        alert('删除失败: ' + result.message);
      }
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleDownloadTemplate = async (templateId: string, templateName: string) => {
    try {
      const response = await fetch(`/api/local-docs/templates/${templateId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${templateName}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // 重新加载模板列表以更新下载计数
        loadTemplates();
      } else {
        alert('下载失败');
      }
    } catch (err) {
      alert('下载失败');
    }
  };

  // 过滤模板
  const filteredTemplates = templates.filter(template =>
    template.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.metadata.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">模板库</h1>
              <p className="text-gray-600 mt-1">管理和使用您的文档模板</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/local-docs"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                返回文档处理
              </Link>
              <Link
                href="/local-docs/templates/new"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                新建模板
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 侧边栏 - 分类和过滤 */}
          <div className="lg:w-64 space-y-6">
            {/* 搜索 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索模板..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 分类过滤 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-900 mb-3">分类</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedCategory === '' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  全部 ({templates.length})
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between ${
                      selectedCategory === category.id 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className="mr-2">{category.icon}</span>
                      {category.name}
                    </span>
                    <span className="text-sm">({category.templateCount})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 排序 */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-medium text-gray-900 mb-3">排序</h3>
              <div className="space-y-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt">创建时间</option>
                  <option value="name">名称</option>
                  <option value="downloadCount">下载次数</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </div>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">加载中...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">没有找到模板</p>
                <Link
                  href="/local-docs/templates/new"
                  className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} className="mr-2" />
                  创建第一个模板
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div key={template.metadata.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                    {/* 模板缩略图 */}
                    <div className="h-32 bg-gray-100 rounded-t-lg flex items-center justify-center">
                      {template.metadata.thumbnail ? (
                        <img 
                          src={template.metadata.thumbnail} 
                          alt={template.metadata.name}
                          className="h-full w-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="text-gray-400 text-center">
                          <div className="text-2xl mb-1">📄</div>
                          <div className="text-sm">Word 模板</div>
                        </div>
                      )}
                    </div>

                    {/* 模板信息 */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {template.metadata.name}
                      </h3>
                      
                      {template.metadata.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {template.metadata.description}
                        </p>
                      )}

                      {/* 标签 */}
                      {template.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.metadata.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                            >
                              <Tag size={10} className="mr-1" />
                              {tag}
                            </span>
                          ))}
                          {template.metadata.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{template.metadata.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* 元信息 */}
                      <div className="text-xs text-gray-500 space-y-1 mb-4">
                        <div className="flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {formatDate(template.metadata.createdAt)}
                        </div>
                        {template.metadata.author && (
                          <div className="flex items-center">
                            <User size={12} className="mr-1" />
                            {template.metadata.author}
                          </div>
                        )}
                        <div>
                          {template.metadata.placeholderCount} 个字段 • {formatFileSize(template.metadata.fileSize)}
                        </div>
                        <div>
                          下载 {template.metadata.downloadCount} 次
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex space-x-2">
                        <Link
                          href={`/local-docs?template=${template.metadata.id}`}
                          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Download size={14} className="mr-1" />
                          使用
                        </Link>
                        <button
                          onClick={() => handleDeleteTemplate(template.metadata.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
