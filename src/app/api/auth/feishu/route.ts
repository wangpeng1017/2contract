import { NextRequest, NextResponse } from 'next/server';
import { feishuClient } from '@/lib/feishu';
import { generateRandomString } from '@/lib/utils';

/**
 * 获取飞书OAuth授权链接
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Auth] Starting Feishu OAuth flow...');

    // 详细检查环境变量
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    console.log('[Auth] Environment check:', {
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasAppUrl: !!appUrl,
      appIdLength: appId?.length || 0,
      appSecretLength: appSecret?.length || 0,
    });

    if (!appId || !appSecret) {
      console.error('[Auth] Missing Feishu app credentials:', {
        FEISHU_APP_ID: !!appId,
        FEISHU_APP_SECRET: !!appSecret,
      });
      return NextResponse.json(
        {
          error: 'Server configuration error',
          details: 'Missing Feishu app credentials',
          debug: {
            hasAppId: !!appId,
            hasAppSecret: !!appSecret,
          }
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const redirectUri = process.env.FEISHU_REDIRECT_URI || `${appUrl}/api/auth/callback`;

    console.log('[Auth] OAuth configuration:', {
      redirectUri,
      appUrl,
    });

    // 生成state参数用于防止CSRF攻击
    const state = generateRandomString(32);
    console.log('[Auth] Generated state:', state);

    // 生成OAuth授权链接
    console.log('[Auth] Generating OAuth URL...');
    const authUrl = feishuClient.generateOAuthUrl(redirectUri, state);
    console.log('[Auth] Generated OAuth URL:', authUrl);

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

    console.log('[Auth] OAuth flow setup completed successfully');
    return response;
  } catch (error) {
    console.error('[Auth] Error generating OAuth URL:', error);

    // 详细的错误信息
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[Auth] Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OAUTH_URL_ERROR',
          message: '生成授权链接失败',
          details: errorMessage,
          debug: process.env.NODE_ENV === 'development' ? {
            stack: errorStack,
            type: typeof error,
          } : undefined,
        },
      },
      { status: 500 }
    );
  }
}
