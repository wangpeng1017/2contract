/**
 * 语音识别API路由
 * 提供百度语音识别服务的后端代理
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/utils';

// 百度语音识别配置
const BAIDU_API_CONFIG = {
  // 注意：在实际项目中，这些配置应该从环境变量中读取
  APP_ID: process.env.BAIDU_SPEECH_APP_ID || '',
  API_KEY: process.env.BAIDU_SPEECH_API_KEY || '',
  SECRET_KEY: process.env.BAIDU_SPEECH_SECRET_KEY || '',
  // 百度语音识别API端点
  TOKEN_URL: 'https://aip.baidubce.com/oauth/2.0/token',
  RECOGNITION_URL: 'https://vop.baidu.com/server_api'
};

interface BaiduTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface BaiduRecognitionResponse {
  err_no: number;
  err_msg: string;
  corpus_no?: string;
  sn?: string;
  result?: string[];
}

/**
 * 获取百度API访问令牌
 */
async function getBaiduAccessToken(): Promise<string> {
  const { API_KEY, SECRET_KEY, TOKEN_URL } = BAIDU_API_CONFIG;
  
  if (!API_KEY || !SECRET_KEY) {
    throw new Error('百度语音API配置缺失');
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: API_KEY,
    client_secret: SECRET_KEY
  });

  const response = await fetch(`${TOKEN_URL}?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`获取访问令牌失败: ${response.status}`);
  }

  const data: BaiduTokenResponse = await response.json();
  
  if (data.error) {
    throw new Error(`百度API错误: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * 调用百度语音识别API
 */
async function recognizeWithBaidu(audioBuffer: ArrayBuffer, accessToken: string): Promise<string> {
  const { RECOGNITION_URL } = BAIDU_API_CONFIG;

  // 将音频数据转换为Base64
  const audioBase64 = Buffer.from(audioBuffer).toString('base64');

  const requestBody = {
    format: 'wav',
    rate: 16000,
    channel: 1,
    cuid: 'web_client',
    token: accessToken,
    speech: audioBase64,
    len: audioBuffer.byteLength
  };

  const response = await fetch(RECOGNITION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`语音识别请求失败: ${response.status}`);
  }

  const data: BaiduRecognitionResponse = await response.json();

  if (data.err_no !== 0) {
    throw new Error(`语音识别失败: ${data.err_msg}`);
  }

  if (!data.result || data.result.length === 0) {
    throw new Error('未识别到语音内容');
  }

  return data.result[0];
}

/**
 * POST /api/speech/recognize
 * 语音识别接口
 */
export async function POST(request: NextRequest) {
  try {
    // 检查是否配置了百度API
    if (!BAIDU_API_CONFIG.API_KEY || !BAIDU_API_CONFIG.SECRET_KEY) {
      return NextResponse.json(
        createErrorResponse('CONFIG_MISSING', '百度语音API未配置，请使用Web Speech API'),
        { status: 501 }
      );
    }

    // 获取上传的音频文件
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        createErrorResponse('MISSING_AUDIO', '缺少音频文件'),
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        createErrorResponse('INVALID_FILE_TYPE', '无效的音频文件类型'),
        { status: 400 }
      );
    }

    // 验证文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        createErrorResponse('FILE_TOO_LARGE', '音频文件过大，请限制在10MB以内'),
        { status: 400 }
      );
    }

    console.log(`[Speech Recognition] 开始处理音频文件: ${audioFile.name}, 大小: ${audioFile.size} bytes`);

    // 获取访问令牌
    const accessToken = await getBaiduAccessToken();
    console.log('[Speech Recognition] 获取百度API访问令牌成功');

    // 读取音频数据
    const audioBuffer = await audioFile.arrayBuffer();

    // 调用百度语音识别API
    const recognizedText = await recognizeWithBaidu(audioBuffer, accessToken);
    console.log(`[Speech Recognition] 识别成功: ${recognizedText}`);

    return NextResponse.json({
      success: true,
      data: {
        text: recognizedText,
        confidence: 0.85, // 百度API通常有较高的准确率
        provider: 'baidu'
      }
    });

  } catch (error) {
    console.error('[Speech Recognition] 语音识别失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '语音识别失败';
    
    return NextResponse.json(
      createErrorResponse('RECOGNITION_FAILED', errorMessage),
      { status: 500 }
    );
  }
}

/**
 * GET /api/speech/recognize
 * 检查语音识别服务状态
 */
export async function GET() {
  const isConfigured = !!(BAIDU_API_CONFIG.API_KEY && BAIDU_API_CONFIG.SECRET_KEY);
  
  return NextResponse.json({
    success: true,
    data: {
      webSpeechSupported: true, // Web Speech API在客户端检查
      baiduApiConfigured: isConfigured,
      supportedFormats: ['wav', 'mp3', 'pcm'],
      maxFileSize: '10MB',
      languages: ['zh-CN', 'en-US']
    }
  });
}
