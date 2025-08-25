import axios, { AxiosInstance } from 'axios';
import { FeishuOAuthResponse, FeishuUserInfo, FeishuDocument, DocumentContent, DocumentBlock } from '@/types';

/**
 * 飞书API客户端类
 */
export class FeishuClient {
  private client: AxiosInstance;
  private appId: string;
  private appSecret: string;

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
    
    this.client = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Feishu API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Feishu API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Feishu API] Response:`, response.data);
        return response;
      },
      (error) => {
        console.error('[Feishu API] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取应用访问令牌
   */
  async getAppAccessToken(): Promise<string> {
    try {
      const response = await this.client.post('/auth/v3/app_access_token/internal', {
        app_id: this.appId,
        app_secret: this.appSecret,
      });

      if (response.data.code !== 0) {
        throw new Error(`Failed to get app access token: ${response.data.msg}`);
      }

      return response.data.app_access_token;
    } catch (error) {
      console.error('Error getting app access token:', error);
      throw error;
    }
  }

  /**
   * 生成OAuth授权链接
   */
  generateOAuthUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'contact:user.base:readonly contact:user.id:readonly docx:document',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://open.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
  }

  /**
   * 通过授权码获取用户访问令牌
   */
  async getAccessTokenByCode(code: string, redirectUri: string): Promise<FeishuOAuthResponse> {
    try {
      const appAccessToken = await this.getAppAccessToken();
      
      const response = await this.client.post(
        '/authen/v1/access_token',
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: {
            Authorization: `Bearer ${appAccessToken}`,
          },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to get access token: ${response.data.msg}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Error getting access token by code:', error);
      throw error;
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(refreshToken: string): Promise<FeishuOAuthResponse> {
    try {
      const appAccessToken = await this.getAppAccessToken();
      
      const response = await this.client.post(
        '/authen/v1/refresh_access_token',
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
        {
          headers: {
            Authorization: `Bearer ${appAccessToken}`,
          },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to refresh access token: ${response.data.msg}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<FeishuUserInfo> {
    try {
      const response = await this.client.get('/authen/v1/user_info', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.code !== 0) {
        throw new Error(`Failed to get user info: ${response.data.msg}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  /**
   * 验证访问令牌是否有效
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文档信息
   */
  async getDocument(documentId: string, accessToken: string): Promise<FeishuDocument> {
    try {
      const response = await this.client.get(`/docx/v1/documents/${documentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.code !== 0) {
        throw new Error(`Failed to get document: ${response.data.msg}`);
      }

      return response.data.data.document;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * 获取文档所有内容块
   */
  async getDocumentBlocks(documentId: string, accessToken: string): Promise<DocumentBlock[]> {
    try {
      const response = await this.client.get(`/docx/v1/documents/${documentId}/blocks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          page_size: 500, // 获取更多内容
        },
      });

      if (response.data.code !== 0) {
        throw new Error(`Failed to get document blocks: ${response.data.msg}`);
      }

      return response.data.data.items || [];
    } catch (error) {
      console.error('Error getting document blocks:', error);
      throw error;
    }
  }

  /**
   * 获取文档完整内容
   */
  async getDocumentContent(documentId: string, accessToken: string): Promise<DocumentContent> {
    try {
      const [document, blocks] = await Promise.all([
        this.getDocument(documentId, accessToken),
        this.getDocumentBlocks(documentId, accessToken),
      ]);

      return {
        document,
        blocks,
      };
    } catch (error) {
      console.error('Error getting document content:', error);
      throw error;
    }
  }

  /**
   * 更新文档块内容
   */
  async updateDocumentBlock(
    documentId: string,
    blockId: string,
    content: any,
    accessToken: string
  ): Promise<void> {
    try {
      const response = await this.client.patch(
        `/docx/v1/documents/${documentId}/blocks/${blockId}`,
        content,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to update document block: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('Error updating document block:', error);
      throw error;
    }
  }

  /**
   * 批量更新文档块
   */
  async batchUpdateDocumentBlocks(
    documentId: string,
    updates: Array<{ blockId: string; content: any }>,
    accessToken: string
  ): Promise<void> {
    try {
      const requests = updates.map(update =>
        this.updateDocumentBlock(documentId, update.blockId, update.content, accessToken)
      );

      await Promise.all(requests);
    } catch (error) {
      console.error('Error batch updating document blocks:', error);
      throw error;
    }
  }

  /**
   * 在文档中创建新的内容块
   */
  async createDocumentBlocks(
    documentId: string,
    blocks: any[],
    accessToken: string,
    index?: number
  ): Promise<void> {
    try {
      const response = await this.client.post(
        `/docx/v1/documents/${documentId}/blocks`,
        {
          children: blocks,
          index,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Failed to create document blocks: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('Error creating document blocks:', error);
      throw error;
    }
  }

  /**
   * 检查用户对文档的权限
   */
  async checkDocumentPermission(
    documentId: string,
    accessToken: string,
    permission: 'read' | 'write' | 'comment' = 'read'
  ): Promise<{
    hasPermission: boolean;
    permissions: string[];
    error?: string;
  }> {
    try {
      const response = await this.client.get(
        `/docx/v1/documents/${documentId}/permission`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.code !== 0) {
        // 如果权限API不可用，尝试通过获取文档信息来判断
        try {
          await this.getDocument(documentId, accessToken);
          return {
            hasPermission: true,
            permissions: ['read'], // 至少有读权限
          };
        } catch (docError) {
          return {
            hasPermission: false,
            permissions: [],
            error: '无权访问该文档',
          };
        }
      }

      const permissions = response.data.data?.permissions || [];
      const hasRequiredPermission = this.validatePermission(permissions, permission);

      return {
        hasPermission: hasRequiredPermission,
        permissions,
      };
    } catch (error) {
      console.error('Error checking document permission:', error);

      // 如果权限检查失败，尝试通过文档访问来判断基本权限
      try {
        await this.getDocument(documentId, accessToken);
        return {
          hasPermission: permission === 'read',
          permissions: ['read'],
        };
      } catch (docError) {
        return {
          hasPermission: false,
          permissions: [],
          error: '无权访问该文档或文档不存在',
        };
      }
    }
  }

  /**
   * 验证权限级别
   */
  private validatePermission(permissions: string[], requiredPermission: string): boolean {
    const permissionHierarchy = {
      read: ['read', 'comment', 'write', 'manage'],
      comment: ['comment', 'write', 'manage'],
      write: ['write', 'manage'],
      manage: ['manage'],
    };

    const validPermissions = permissionHierarchy[requiredPermission as keyof typeof permissionHierarchy] || [];
    return permissions.some(p => validPermissions.includes(p));
  }

  /**
   * 删除文档块
   */
  async deleteDocumentBlocks(
    documentId: string,
    blockIds: string[],
    accessToken: string
  ): Promise<void> {
    try {
      const requests = blockIds.map(blockId =>
        this.client.delete(`/docx/v1/documents/${documentId}/blocks/${blockId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // 检查所有请求是否成功
      responses.forEach((response, index) => {
        if (response.data.code !== 0) {
          throw new Error(`Failed to delete block ${blockIds[index]}: ${response.data.msg}`);
        }
      });
    } catch (error) {
      console.error('Error deleting document blocks:', error);
      throw error;
    }
  }
}

/**
 * 创建飞书客户端实例
 */
export function createFeishuClient(): FeishuClient {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('Missing Feishu app credentials');
  }

  return new FeishuClient(appId, appSecret);
}

/**
 * 默认飞书客户端实例
 */
export const feishuClient = createFeishuClient();
