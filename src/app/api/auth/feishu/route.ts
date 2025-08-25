import { NextRequest, NextResponse } from 'next/server';
import { feishuClient } from '@/lib/feishu';
import { generateRandomString } from '@/lib/utils';

/**
 * 获取飞书OAuth授权链接
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
    const redirectUri = process.env.FEISHU_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    
    // 生成state参数用于防止CSRF攻击
    const state = generateRandomString(32);
    
    // 生成OAuth授权链接
    const authUrl = feishuClient.generateOAuthUrl(redirectUri, state);
    
    // 将state存储在cookie中，用于回调时验证
    const response = NextResponse.json({
      success: true,
      data: {
        authUrl,
        state,
      },
    });
    
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分钟
    });
    
    return response;
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OAUTH_URL_ERROR',
          message: '生成授权链接失败',
        },
      },
      { status: 500 }
    );
  }
}
