import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 超时包装函数
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('请求超时，请尝试处理较短的文档'));
    }, timeoutMs);
    
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// 简单的拼音转换（仅用于常见汉字）
function simplePinyin(chinese: string): string {
  const pinyinMap: { [key: string]: string } = {
    '甲': 'jia', '乙': 'yi', '方': 'fang', '签': 'qian', '订': 'ding', 
    '日': 'ri', '期': 'qi', '合': 'he', '同': 'tong', '金': 'jin', '额': 'e',
    '丙': 'bing', '丁': 'ding', '名': 'ming', '称': 'cheng', '地': 'di', 
    '址': 'zhi', '联': 'lian', '系': 'xi', '人': 'ren', '电': 'dian', '话': 'hua'
  };
  
  return chinese.split('').map(char => pinyinMap[char] || char).join('');
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: "Missing 'text' field" },
        { status: 400 }
      );
    }

    // 限制文本长度避免超时
    const maxTextLength = 5000; // 限制5000字符
    const processedText = text.length > maxTextLength 
      ? text.substring(0, maxTextLength) + '...'
      : text;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `你是一个合同变量提取专家。分析用户提供的合同文本，识别所有需要填充的变量字段。
输出格式为JSON对象，包含一个variables数组，每个变量包含：
- key: 变量的ASCII键名（使用拼音，如 jiafang, yifang, sign_date）
- label: 变量的中文标签（如 甲方, 乙方, 签订日期）
- type: 数据类型（text, date, number）
- required: 是否必填（true/false）

示例输出：
{
  "variables": [
    {"key": "jiafang", "label": "甲方", "type": "text", "required": true},
    {"key": "yifang", "label": "乙方", "type": "text", "required": true},
    {"key": "sign_date", "label": "签订日期", "type": "date", "required": true},
    {"key": "amount", "label": "合同金额", "type": "number", "required": true}
  ]
}

合同文本：
${processedText}

请只返回JSON，不要包含其他文字。`;

    // 使用超时包装AI调用，25秒超时
    const result = await withTimeout(
      model.generateContent(prompt),
      25000
    );
    const response = result.response;
    let responseText = response.text().trim();

    // 移除markdown代码块标记
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7);
    }
    if (responseText.startsWith('```')) {
      responseText = responseText.slice(3);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3);
    }
    responseText = responseText.trim();

    const aiResult = JSON.parse(responseText);
    
    // 确保返回数组格式
    let variables = [];
    if (aiResult.variables && Array.isArray(aiResult.variables)) {
      variables = aiResult.variables;
    } else if (Array.isArray(aiResult)) {
      variables = aiResult;
    }

    // 为没有key的变量生成拼音key
    variables.forEach((variable: any) => {
      if (!variable.key && variable.label) {
        variable.key = simplePinyin(variable.label).toLowerCase().replace(/\s+/g, '_');
      }
    });

    return NextResponse.json({ variables });
    
  } catch (error: any) {
    console.error('Extract API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
