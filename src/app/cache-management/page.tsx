'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Info, FileText, Clock, HardDrive } from 'lucide-react';
import Link from 'next/link';
import { FileCacheManager } from '@/lib/file-cache-manager';

interface CacheStats {
  totalFiles: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
}

export default function CacheManagementPage() {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalFiles: 0,
    totalSize: 0,
    oldestEntry: 0,
    newestEntry: 0
  });
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = () => {
    const stats = FileCacheManager.getCacheStats();
    setCacheStats(stats);
  };

  const handleClearAllCache = async () => {
    if (!confirm('确定要清除所有文件缓存吗？这将删除所有缓存的文件信息。')) {
      return;
    }

    setIsClearing(true);
    try {
      FileCacheManager.clearAllCache();
      
      // 同时清除其他可能的缓存
      if (typeof window !== 'undefined') {
        // 清除localStorage中的模板相关缓存
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('template') || key.includes('placeholder') || key.includes('word')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // 清除sessionStorage
        const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
          key.includes('template') || key.includes('placeholder') || key.includes('word')
        );
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      }

      loadCacheStats();
      alert('所有缓存已清除！');
    } catch (error) {
      console.error('清除缓存失败:', error);
      alert('清除缓存失败，请重试');
    } finally {
      setIsClearing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return '无';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 页面头部 */}
        <div className="flex items-center mb-6">
          <Link href="/local-docs" className="text-blue-600 hover:text-blue-800 mr-4">
            ← 返回本地文档处理
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            文件缓存管理
          </h1>
        </div>

        {/* 说明信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="text-blue-600 mr-3 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">关于文件缓存</h3>
              <p className="text-blue-700 text-sm">
                系统会为每个上传的文件生成唯一标识符，避免相同文件名导致的缓存冲突。
                即使文件名相同，只要内容不同，系统都会重新解析。
              </p>
            </div>
          </div>
        </div>

        {/* 缓存统计 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <HardDrive className="mr-2 text-gray-600" size={20} />
            缓存统计信息
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">缓存文件数</p>
                  <p className="text-2xl font-semibold text-gray-900">{cacheStats.totalFiles}</p>
                </div>
                <FileText className="text-gray-400" size={24} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">总缓存大小</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatFileSize(cacheStats.totalSize)}
                  </p>
                </div>
                <HardDrive className="text-gray-400" size={24} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">最早缓存</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(cacheStats.oldestEntry)}
                  </p>
                </div>
                <Clock className="text-gray-400" size={24} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">最新缓存</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(cacheStats.newestEntry)}
                  </p>
                </div>
                <Clock className="text-gray-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* 缓存管理操作 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Trash2 className="mr-2 text-red-500" size={20} />
            缓存管理操作
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">清除所有文件缓存</h4>
                <p className="text-sm text-gray-600">
                  删除所有缓存的文件信息，下次上传时将重新生成唯一标识符
                </p>
              </div>
              <button
                onClick={handleClearAllCache}
                disabled={isClearing}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors flex items-center"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" size={16} />
                    清除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2" size={16} />
                    清除缓存
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">刷新缓存统计</h4>
                <p className="text-sm text-gray-600">
                  重新加载缓存统计信息
                </p>
              </div>
              <button
                onClick={loadCacheStats}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <RefreshCw className="mr-2" size={16} />
                刷新统计
              </button>
            </div>
          </div>
        </div>

        {/* 缓存机制说明 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">缓存机制说明</h3>
          
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">🔧 文件唯一标识符</h4>
              <p>
                系统为每个上传的文件生成唯一标识符，包含原始文件名、内容哈希、时间戳等信息。
                即使文件名相同，只要内容不同，就会生成不同的标识符。
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">🚀 解决的问题</h4>
              <p>
                避免了相同文件名导致的缓存冲突问题。当您修改Word模板内容后，
                即使保持相同的文件名，系统也能正确识别这是一个新文件并重新解析。
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">⏰ 缓存过期</h4>
              <p>
                缓存信息会在24小时后自动过期。系统最多保存100个文件的缓存信息，
                超过限制时会自动清理最旧的记录。
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">🔍 使用建议</h4>
              <p>
                正常情况下无需手动清除缓存。如果遇到文件识别问题，
                可以尝试清除缓存或使用强制重新解析功能。
              </p>
            </div>
          </div>
        </div>

        {/* 相关工具链接 */}
        <div className="mt-6 text-center">
          <div className="space-x-4">
            <Link 
              href="/template-cache-fix" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              模板缓存修复工具
            </Link>
            <Link 
              href="/local-docs" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              本地文档处理
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
