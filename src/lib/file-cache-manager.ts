/**
 * 文件缓存管理器
 * 解决相同文件名导致的缓存冲突问题
 */

import crypto from 'crypto';

export interface FileIdentifier {
  originalName: string;
  uniqueName: string;
  contentHash: string;
  timestamp: number;
  size: number;
}

export interface CachedFileInfo {
  identifier: FileIdentifier;
  lastAccessed: number;
  accessCount: number;
}

export class FileCacheManager {
  private static readonly CACHE_KEY = 'file_cache_registry';
  private static readonly MAX_CACHE_SIZE = 100; // 最多缓存100个文件记录
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时过期

  /**
   * 为上传的文件生成唯一标识符
   * 确保即使文件名相同，也能正确识别不同的文件内容
   */
  static async generateFileIdentifier(
    file: File | ArrayBuffer, 
    originalName: string
  ): Promise<FileIdentifier> {
    let buffer: ArrayBuffer;
    let size: number;

    if (file instanceof File) {
      buffer = await file.arrayBuffer();
      size = file.size;
    } else {
      buffer = file;
      size = buffer.byteLength;
    }

    // 计算文件内容哈希
    const contentHash = await this.calculateContentHash(buffer);
    
    // 生成时间戳
    const timestamp = Date.now();
    
    // 生成唯一文件名
    const uniqueName = this.generateUniqueName(originalName, contentHash, timestamp);

    const identifier: FileIdentifier = {
      originalName,
      uniqueName,
      contentHash,
      timestamp,
      size
    };

    console.log(`[FileCacheManager] 生成文件标识符:`, {
      originalName,
      uniqueName,
      contentHash: contentHash.substring(0, 8) + '...',
      size
    });

    return identifier;
  }

  /**
   * 检查文件是否已存在于缓存中
   */
  static checkFileExists(contentHash: string): CachedFileInfo | null {
    try {
      if (typeof window === 'undefined') return null;

      const cache = this.getCache();
      const fileInfo = cache[contentHash];

      if (!fileInfo) {
        return null;
      }

      // 检查是否过期
      if (Date.now() - fileInfo.lastAccessed > this.CACHE_TTL) {
        this.removeFromCache(contentHash);
        return null;
      }

      // 更新访问时间
      fileInfo.lastAccessed = Date.now();
      fileInfo.accessCount++;
      this.updateCache(contentHash, fileInfo);

      console.log(`[FileCacheManager] 发现缓存文件:`, {
        originalName: fileInfo.identifier.originalName,
        contentHash: contentHash.substring(0, 8) + '...',
        accessCount: fileInfo.accessCount
      });

      return fileInfo;
    } catch (error) {
      console.error('[FileCacheManager] 检查文件缓存失败:', error);
      return null;
    }
  }

  /**
   * 将文件信息添加到缓存
   */
  static addToCache(identifier: FileIdentifier): void {
    try {
      if (typeof window === 'undefined') return;

      const cache = this.getCache();
      
      // 检查缓存大小，如果超过限制则清理旧记录
      if (Object.keys(cache).length >= this.MAX_CACHE_SIZE) {
        this.cleanupOldEntries(cache);
      }

      const fileInfo: CachedFileInfo = {
        identifier,
        lastAccessed: Date.now(),
        accessCount: 1
      };

      cache[identifier.contentHash] = fileInfo;
      this.saveCache(cache);

      console.log(`[FileCacheManager] 文件已添加到缓存:`, {
        originalName: identifier.originalName,
        uniqueName: identifier.uniqueName,
        contentHash: identifier.contentHash.substring(0, 8) + '...'
      });
    } catch (error) {
      console.error('[FileCacheManager] 添加文件到缓存失败:', error);
    }
  }

  /**
   * 强制清除特定文件的缓存
   */
  static clearFileCache(contentHash: string): void {
    try {
      if (typeof window === 'undefined') return;

      this.removeFromCache(contentHash);
      console.log(`[FileCacheManager] 已清除文件缓存: ${contentHash.substring(0, 8)}...`);
    } catch (error) {
      console.error('[FileCacheManager] 清除文件缓存失败:', error);
    }
  }

  /**
   * 清除所有文件缓存
   */
  static clearAllCache(): void {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem(this.CACHE_KEY);
      console.log('[FileCacheManager] 已清除所有文件缓存');
    } catch (error) {
      console.error('[FileCacheManager] 清除所有缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): {
    totalFiles: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    try {
      if (typeof window === 'undefined') {
        return { totalFiles: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
      }

      const cache = this.getCache();
      const entries = Object.values(cache);

      if (entries.length === 0) {
        return { totalFiles: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
      }

      const totalFiles = entries.length;
      const totalSize = entries.reduce((sum, entry) => sum + entry.identifier.size, 0);
      const timestamps = entries.map(entry => entry.identifier.timestamp);
      const oldestEntry = Math.min(...timestamps);
      const newestEntry = Math.max(...timestamps);

      return { totalFiles, totalSize, oldestEntry, newestEntry };
    } catch (error) {
      console.error('[FileCacheManager] 获取缓存统计失败:', error);
      return { totalFiles: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
    }
  }

  /**
   * 计算文件内容哈希
   */
  private static async calculateContentHash(buffer: ArrayBuffer): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // 浏览器环境使用Web Crypto API
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js环境使用crypto模块
      const hash = crypto.createHash('sha256');
      hash.update(Buffer.from(buffer));
      return hash.digest('hex');
    }
  }

  /**
   * 生成唯一文件名
   */
  private static generateUniqueName(
    originalName: string, 
    contentHash: string, 
    timestamp: number
  ): string {
    const fileExt = originalName.match(/\.[^/.]+$/)?.[0] || '';
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const shortHash = contentHash.substring(0, 8);
    
    return `${nameWithoutExt}_${timestamp}_${shortHash}${fileExt}`;
  }

  /**
   * 获取缓存数据
   */
  private static getCache(): Record<string, CachedFileInfo> {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[FileCacheManager] 读取缓存失败:', error);
      return {};
    }
  }

  /**
   * 保存缓存数据
   */
  private static saveCache(cache: Record<string, CachedFileInfo>): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('[FileCacheManager] 保存缓存失败:', error);
      // 如果保存失败，可能是存储空间不足，尝试清理缓存
      this.cleanupOldEntries(cache, Math.floor(this.MAX_CACHE_SIZE / 2));
      try {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      } catch (retryError) {
        console.error('[FileCacheManager] 重试保存缓存仍然失败:', retryError);
      }
    }
  }

  /**
   * 更新缓存中的特定条目
   */
  private static updateCache(contentHash: string, fileInfo: CachedFileInfo): void {
    const cache = this.getCache();
    cache[contentHash] = fileInfo;
    this.saveCache(cache);
  }

  /**
   * 从缓存中移除特定条目
   */
  private static removeFromCache(contentHash: string): void {
    const cache = this.getCache();
    delete cache[contentHash];
    this.saveCache(cache);
  }

  /**
   * 清理旧的缓存条目
   */
  private static cleanupOldEntries(
    cache: Record<string, CachedFileInfo>, 
    targetSize?: number
  ): void {
    const entries = Object.entries(cache);
    const target = targetSize || this.MAX_CACHE_SIZE - 10;

    if (entries.length <= target) return;

    // 按最后访问时间排序，删除最旧的条目
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toDelete = entries.length - target;
    for (let i = 0; i < toDelete; i++) {
      delete cache[entries[i][0]];
    }

    console.log(`[FileCacheManager] 清理了 ${toDelete} 个旧缓存条目`);
  }
}
