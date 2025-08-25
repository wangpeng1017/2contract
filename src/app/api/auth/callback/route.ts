import { NextRequest, NextResponse } from 'next/server';
import { feishuClient } from '@/lib/feishu';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils';

/**
 * 处理飞书OAuth回调
 */
export async function GET(request: NextRequest) {
  try {
    // 检查环境变量
    if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
      console.error('Missing Feishu app credentials in runtime');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // 检查是否有错误
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=oauth_error&message=${encodeURIComponent(error)}`
      );
    }
    
    // 检查必需参数
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=missing_code&message=${encodeURIComponent('缺少授权码')}`
      );
    }
    
    // 验证state参数（防止CSRF攻击）
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=invalid_state&message=${encodeURIComponent('无效的状态参数')}`
      );
    }
    
    const redirectUri = process.env.FEISHU_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    
    // 使用授权码获取访问令牌
    const tokenResponse = await feishuClient.getAccessTokenByCode(code, redirectUri);
    
    // 获取用户信息
    const userInfo = await feishuClient.getUserInfo(tokenResponse.access_token);
    
    // TODO: 将用户信息和令牌存储到数据库
    // 这里暂时将信息存储在cookie中（生产环境应该使用数据库）
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
    
    // 设置用户信息cookie
    response.cookies.set('user_info', JSON.stringify({
      sub: userInfo.sub,
      name: userInfo.name,
      picture: userInfo.picture,
      open_id: userInfo.open_id,
      union_id: userInfo.union_id,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24小时
    });
    
    // 设置访问令牌cookie（注意：生产环境应该加密存储）
    response.cookies.set('access_token', tokenResponse.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenResponse.expires_in,
    });
    
    // 如果有刷新令牌，也存储起来
    if (tokenResponse.refresh_token) {
      response.cookies.set('refresh_token', tokenResponse.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 30, // 30天
      });
    }
    
    // 清除state cookie
    response.cookies.delete('oauth_state');
    
    return response;
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=callback_error&message=${encodeURIComponent('授权回调处理失败')}`
    );
  }
}
