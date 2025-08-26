/**
 * 直接测试Gemini Vision API
 * 绕过Next.js服务器，直接调用Google API
 */

const fs = require('fs');
const path = require('path');

// 从环境变量或直接设置API Key
const GOOGLE_API_KEY = 'AIzaSyBtw7WLw0Lf749k0j5yeKJpjz1AfWgDsuA';

async function testGeminiDirect() {
  console.log('🧪 直接测试Gemini Vision API\n');
  console.log('='.repeat(60));
  
  if (!GOOGLE_API_KEY) {
    console.log('❌ 错误: 未找到 Google API Key');
    return;
  }
  
  console.log('✅ API Key已配置');
  console.log(`📋 API Key长度: ${GOOGLE_API_KEY.length} 字符`);
  
  // 读取测试图片
  let imageBase64;
  try {
    if (fs.existsSync('test-image.png')) {
      const imageBuffer = fs.readFileSync('test-image.png');
      imageBase64 = imageBuffer.toString('base64');
      console.log('✅ 测试图片已读取');
      console.log(`📋 图片大小: ${imageBuffer.length} 字节`);
    } else {
      console.log('⚠️ 未找到test-image.png，使用默认测试图片');
      // 创建一个简单的测试图片base64
      imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
  } catch (error) {
    console.log('❌ 读取图片失败:', error.message);
    return;
  }
  
  // 测试1: 基础文字识别
  console.log('\n🔍 测试1: 基础文字识别');
  console.log('-'.repeat(40));
  
  try {
    const basicPrompt = `请识别这张图片中的所有文字内容，保持原有格式和结构。

注意事项：
1. 识别图片中的所有文字，包括标题、正文、表格、标注等
2. 保持原有的文本结构和格式
3. 如果有表格，请保持表格的行列结构
4. 主要语言：中文
5. 请确保识别的准确性，特别注意数字、日期、专有名词

请直接输出识别的文字内容，不要添加任何解释或说明。`;

    const basicResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: basicPrompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    });

    console.log(`- 请求状态: ${basicResponse.status}`);
    
    if (basicResponse.ok) {
      const basicData = await basicResponse.json();
      console.log('✅ 基础OCR测试成功');
      
      if (basicData.candidates && basicData.candidates[0]) {
        const text = basicData.candidates[0].content.parts[0].text;
        console.log(`- 识别文字长度: ${text.length} 字符`);
        console.log('- 识别内容:');
        console.log('---');
        console.log(text);
        console.log('---');
      }
    } else {
      const errorData = await basicResponse.json().catch(() => ({}));
      console.log('❌ 基础OCR测试失败');
      console.log(`- 错误信息: ${JSON.stringify(errorData, null, 2)}`);
    }
  } catch (error) {
    console.log('❌ 基础OCR测试异常');
    console.log(`- 异常信息: ${error.message}`);
  }

  // 测试2: 结构化信息提取
  console.log('\n🔍 测试2: 结构化合同信息提取');
  console.log('-'.repeat(40));
  
  try {
    const structuredPrompt = `请从这张合同或文档截图中提取关键信息，并以JSON格式返回。请仔细识别以下信息：

{
  "甲方": "甲方公司或个人名称",
  "乙方": "乙方公司或个人名称",
  "合同金额": "合同总金额（包含货币单位）",
  "合同编号": "合同编号或协议编号",
  "签署日期": "合同签署日期",
  "生效日期": "合同生效日期",
  "到期日期": "合同到期日期",
  "联系人": "主要联系人姓名",
  "联系电话": "联系电话号码",
  "其他信息": {
    "项目名称": "如果有项目名称",
    "付款方式": "付款方式说明",
    "违约责任": "违约责任条款",
    "备注": "其他重要信息"
  }
}

注意事项：
1. 如果某项信息在图片中不存在，请设置为null
2. 金额请保留原始格式（包含货币符号）
3. 日期请使用YYYY-MM-DD格式
4. 请确保提取的信息准确无误
5. 只返回JSON格式，不要添加其他说明

请仔细分析图片内容，准确提取信息：`;

    const structuredResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: structuredPrompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: imageBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      })
    });

    console.log(`- 请求状态: ${structuredResponse.status}`);
    
    if (structuredResponse.ok) {
      const structuredData = await structuredResponse.json();
      console.log('✅ 结构化提取测试成功');
      
      if (structuredData.candidates && structuredData.candidates[0]) {
        const text = structuredData.candidates[0].content.parts[0].text;
        console.log(`- 提取结果长度: ${text.length} 字符`);
        console.log('- 提取结果:');
        console.log('---');
        console.log(text);
        console.log('---');
        
        // 尝试解析JSON
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0]);
            console.log('✅ JSON解析成功');
            console.log('📋 提取的合同信息:');
            Object.entries(parsedData).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                console.log(`- ${key}: ${JSON.stringify(value, null, 2)}`);
              } else {
                console.log(`- ${key}: ${value}`);
              }
            });
          } else {
            console.log('⚠️ 未找到有效的JSON格式');
          }
        } catch (parseError) {
          console.log('❌ JSON解析失败');
          console.log(`- 解析错误: ${parseError.message}`);
        }
      }
    } else {
      const errorData = await structuredResponse.json().catch(() => ({}));
      console.log('❌ 结构化提取测试失败');
      console.log(`- 错误信息: ${JSON.stringify(errorData, null, 2)}`);
    }
  } catch (error) {
    console.log('❌ 结构化提取测试异常');
    console.log(`- 异常信息: ${error.message}`);
  }

  console.log('\n📊 测试总结');
  console.log('='.repeat(60));
  console.log('✅ Gemini Vision API直接测试完成');
  console.log('💡 如果测试成功，说明API配置正确，问题可能在Next.js服务器');
  console.log('💡 如果测试失败，请检查API Key和网络连接');
  console.log('\n🔗 测试资源:');
  console.log('- 飞书文档: https://cb0xpdikl7.feishu.cn/docx/CrBwdZoDroTdhKx564bc6XjlnFd');
  console.log('- 测试图片: test-image.png');
  console.log('- Gemini API: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
}

// 使用动态导入来支持fetch
async function getFetch() {
  if (typeof fetch === 'undefined') {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
  }
  return fetch;
}

// 运行测试
if (require.main === module) {
  getFetch().then(() => {
    testGeminiDirect().catch(console.error);
  });
}

module.exports = { testGeminiDirect };
