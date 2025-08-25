import { NextRequest, NextResponse } from 'next/server';

/**
 * 环境变量调试接口 (临时开放用于诊断)
 */
export async function GET(request: NextRequest) {
  // 临时开放此接口用于诊断Vercel部署问题
  // TODO: 修复完成后应该限制为仅开发环境
  console.log('[Debug] Environment check requested');

  // 检查是否有特殊的调试参数
  const { searchParams } = new URL(request.url);
  const debugKey = searchParams.get('key');

  // 在生产环境中需要特殊的调试密钥
  if (process.env.NODE_ENV === 'production' && debugKey !== 'debug-2024') {
    return NextResponse.json(
      { error: 'Debug key required in production' },
      { status: 403 }
    );
  }

  const envCheck = {
    // 飞书配置
    FEISHU_APP_ID: {
      exists: !!process.env.FEISHU_APP_ID,
      length: process.env.FEISHU_APP_ID?.length || 0,
      value: process.env.FEISHU_APP_ID ? `${process.env.FEISHU_APP_ID.substring(0, 8)}...` : undefined,
    },
    FEISHU_APP_SECRET: {
      exists: !!process.env.FEISHU_APP_SECRET,
      length: process.env.FEISHU_APP_SECRET?.length || 0,
      value: process.env.FEISHU_APP_SECRET ? `${process.env.FEISHU_APP_SECRET.substring(0, 8)}...` : undefined,
    },
    FEISHU_REDIRECT_URI: {
      exists: !!process.env.FEISHU_REDIRECT_URI,
      value: process.env.FEISHU_REDIRECT_URI,
    },
    
    // 应用配置
    NEXT_PUBLIC_APP_URL: {
      exists: !!process.env.NEXT_PUBLIC_APP_URL,
      value: process.env.NEXT_PUBLIC_APP_URL,
    },
    NODE_ENV: {
      exists: !!process.env.NODE_ENV,
      value: process.env.NODE_ENV,
    },
    
    // 加密配置
    ENCRYPTION_KEY: {
      exists: !!process.env.ENCRYPTION_KEY,
      length: process.env.ENCRYPTION_KEY?.length || 0,
    },
    JWT_SECRET: {
      exists: !!process.env.JWT_SECRET,
      length: process.env.JWT_SECRET?.length || 0,
    },
    
    // 数据库配置
    DATABASE_URL: {
      exists: !!process.env.DATABASE_URL,
      hasPostgres: process.env.DATABASE_URL?.includes('postgres') || false,
    },
    
    // 存储配置
    BLOB_READ_WRITE_TOKEN: {
      exists: !!process.env.BLOB_READ_WRITE_TOKEN,
      length: process.env.BLOB_READ_WRITE_TOKEN?.length || 0,
    },
    
    // OCR配置
    GOOGLE_API_KEY: {
      exists: !!process.env.GOOGLE_API_KEY,
      length: process.env.GOOGLE_API_KEY?.length || 0,
    },
  };

  // 检查必需的环境变量
  const requiredVars = [
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'ENCRYPTION_KEY',
    'JWT_SECRET',
  ];

  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const hasAllRequired = missingRequired.length === 0;

  return NextResponse.json({
    success: true,
    data: {
      environment: process.env.NODE_ENV,
      hasAllRequired,
      missingRequired,
      envCheck,
      recommendations: {
        feishu: envCheck.FEISHU_APP_ID.exists && envCheck.FEISHU_APP_SECRET.exists 
          ? '✅ 飞书配置完整' 
          : '❌ 缺少飞书应用配置',
        database: envCheck.DATABASE_URL.exists 
          ? '✅ 数据库配置存在' 
          : '⚠️ 数据库配置缺失',
        storage: envCheck.BLOB_READ_WRITE_TOKEN.exists 
          ? '✅ 文件存储配置存在' 
          : '⚠️ 文件存储配置缺失',
        ocr: envCheck.GOOGLE_API_KEY.exists 
          ? '✅ OCR服务配置存在' 
          : '⚠️ OCR服务配置缺失',
      }
    }
  });
}
