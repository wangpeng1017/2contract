import { NextRequest, NextResponse } from 'next/server';
import { feishuClient } from './feishu';
import { createErrorResponse } from './utils';

/**
 * 认证中间件
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', '未授权访问'),
        { status: 401 }
      );
    }

    // 验证访问令牌
    const isValid = await feishuClient.validateAccessToken(accessToken);
    
    if (!isValid) {
      // 尝试刷新令牌
      const refreshToken = request.cookies.get('refresh_token')?.value;
      
      if (!refreshToken) {
        return NextResponse.json(
          createErrorResponse('TOKEN_EXPIRED', '令牌已过期'),
          { status: 401 }
        );
      }

      try {
        const tokenResponse = await feishuClient.refreshAccessToken(refreshToken);
        const userInfo = await feishuClient.getUserInfo(tokenResponse.access_token);
        
        // 创建响应并更新cookie
        const response = await handler(request, userInfo);
        
        response.cookies.set('access_token', tokenResponse.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: tokenResponse.expires_in,
        });
        
        if (tokenResponse.refresh_token) {
          response.cookies.set('refresh_token', tokenResponse.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400 * 30,
          });
        }
        
        return response;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          createErrorResponse('TOKEN_REFRESH_FAILED', '令牌刷新失败'),
          { status: 401 }
        );
      }
    }

    // 获取用户信息
    const userInfo = await feishuClient.getUserInfo(accessToken);
    
    // 调用处理函数
    return await handler(request, userInfo);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      createErrorResponse('AUTH_ERROR', '认证失败'),
      { status: 500 }
    );
  }
}

/**
 * 可选认证中间件（不强制要求认证）
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest, user?: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
      return await handler(request);
    }

    // 验证访问令牌
    const isValid = await feishuClient.validateAccessToken(accessToken);
    
    if (!isValid) {
      return await handler(request);
    }

    // 获取用户信息
    const userInfo = await feishuClient.getUserInfo(accessToken);
    
    // 调用处理函数
    return await handler(request, userInfo);
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // 即使认证失败，也继续处理请求
    return await handler(request);
  }
}

/**
 * 从请求中提取用户信息
 */
export function getUserFromRequest(request: NextRequest): any | null {
  try {
    const userInfoCookie = request.cookies.get('user_info')?.value;
    
    if (!userInfoCookie) {
      return null;
    }

    return JSON.parse(userInfoCookie);
  } catch (error) {
    console.error('Error parsing user info from request:', error);
    return null;
  }
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(user: any, permission: string): boolean {
  // TODO: 实现权限检查逻辑
  // 这里暂时返回true，实际应该根据用户角色和权限进行检查
  return true;
}

/**
 * 权限检查中间件
 */
export async function withPermission(
  permission: string,
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req, user) => {
    if (!hasPermission(user, permission)) {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', '权限不足'),
        { status: 403 }
      );
    }
    
    return await handler(req, user);
  });
}
