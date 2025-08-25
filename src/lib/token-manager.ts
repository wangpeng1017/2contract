import { encryptionService } from './encryption';
import { AuthToken, FeishuOAuthResponse } from '@/types';

/**
 * Token管理服务
 */
export class TokenManager {
  private static instance: TokenManager;
  
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * 存储访问令牌（加密存储）
   */
  async storeToken(userId: string, tokenData: FeishuOAuthResponse): Promise<AuthToken> {
    try {
      // 加密访问令牌
      const encryptedAccessToken = encryptionService.encrypt(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token 
        ? encryptionService.encrypt(tokenData.refresh_token)
        : undefined;

      // 计算过期时间
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      const authToken: AuthToken = {
        id: this.generateTokenId(),
        userId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        createdAt: new Date(),
      };

      // TODO: 存储到数据库
      // 这里暂时存储在内存中（生产环境应该使用数据库）
      await this.saveTokenToStorage(authToken);

      return authToken;
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store token');
    }
  }

  /**
   * 获取访问令牌（解密）
   */
  async getToken(userId: string): Promise<AuthToken | null> {
    try {
      // TODO: 从数据库获取
      const authToken = await this.getTokenFromStorage(userId);
      
      if (!authToken) {
        return null;
      }

      // 检查令牌是否过期
      if (this.isTokenExpired(authToken)) {
        console.log('Token expired for user:', userId);
        return null;
      }

      return authToken;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * 获取解密后的访问令牌
   */
  async getDecryptedAccessToken(userId: string): Promise<string | null> {
    try {
      const authToken = await this.getToken(userId);
      
      if (!authToken) {
        return null;
      }

      return encryptionService.decrypt(authToken.accessToken);
    } catch (error) {
      console.error('Error getting decrypted access token:', error);
      return null;
    }
  }

  /**
   * 获取解密后的刷新令牌
   */
  async getDecryptedRefreshToken(userId: string): Promise<string | null> {
    try {
      const authToken = await this.getToken(userId);
      
      if (!authToken || !authToken.refreshToken) {
        return null;
      }

      return encryptionService.decrypt(authToken.refreshToken);
    } catch (error) {
      console.error('Error getting decrypted refresh token:', error);
      return null;
    }
  }

  /**
   * 更新访问令牌
   */
  async updateToken(userId: string, tokenData: FeishuOAuthResponse): Promise<AuthToken> {
    try {
      // 删除旧令牌
      await this.deleteToken(userId);
      
      // 存储新令牌
      return await this.storeToken(userId, tokenData);
    } catch (error) {
      console.error('Error updating token:', error);
      throw new Error('Failed to update token');
    }
  }

  /**
   * 删除令牌
   */
  async deleteToken(userId: string): Promise<void> {
    try {
      // TODO: 从数据库删除
      await this.deleteTokenFromStorage(userId);
    } catch (error) {
      console.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }

  /**
   * 检查令牌是否过期
   */
  isTokenExpired(authToken: AuthToken): boolean {
    const now = new Date();
    const expiresAt = new Date(authToken.expiresAt);
    
    // 提前5分钟认为令牌过期，给刷新留出时间
    const bufferTime = 5 * 60 * 1000; // 5分钟
    return now.getTime() > (expiresAt.getTime() - bufferTime);
  }

  /**
   * 验证令牌有效性
   */
  async validateToken(userId: string): Promise<boolean> {
    try {
      const authToken = await this.getToken(userId);
      return authToken !== null && !this.isTokenExpired(authToken);
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  /**
   * 清理过期令牌
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      // TODO: 实现清理过期令牌的逻辑
      console.log('Cleaning up expired tokens...');
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }

  /**
   * 生成令牌ID
   */
  private generateTokenId(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 存储令牌到存储系统（临时实现）
   */
  private async saveTokenToStorage(authToken: AuthToken): Promise<void> {
    // TODO: 实现数据库存储
    // 这里使用内存存储作为临时方案
    if (typeof window !== 'undefined') {
      const tokens = this.getTokensFromLocalStorage();
      tokens[authToken.userId] = authToken;
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }
  }

  /**
   * 从存储系统获取令牌（临时实现）
   */
  private async getTokenFromStorage(userId: string): Promise<AuthToken | null> {
    // TODO: 实现数据库查询
    // 这里使用内存存储作为临时方案
    if (typeof window !== 'undefined') {
      const tokens = this.getTokensFromLocalStorage();
      return tokens[userId] || null;
    }
    return null;
  }

  /**
   * 从存储系统删除令牌（临时实现）
   */
  private async deleteTokenFromStorage(userId: string): Promise<void> {
    // TODO: 实现数据库删除
    // 这里使用内存存储作为临时方案
    if (typeof window !== 'undefined') {
      const tokens = this.getTokensFromLocalStorage();
      delete tokens[userId];
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }
  }

  /**
   * 从localStorage获取令牌（临时实现）
   */
  private getTokensFromLocalStorage(): Record<string, AuthToken> {
    try {
      const stored = localStorage.getItem('auth_tokens');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error parsing tokens from localStorage:', error);
      return {};
    }
  }
}

/**
 * 默认Token管理器实例
 */
export const tokenManager = TokenManager.getInstance();
