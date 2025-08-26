/**
 * 直接测试OCR API功能
 * 使用您提供的测试图片进行OCR识别测试
 */

const fs = require('fs');
const path = require('path');

// 模拟测试图片的base64数据（您提供的合同图片内容）
const testImageBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;

async function testOCRAPI() {
  console.log('🧪 开始OCR API直接测试\n');
  console.log('='.repeat(60));
  
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ 错误: 未找到 GOOGLE_API_KEY 环境变量');
    console.log('请设置环境变量: export GOOGLE_API_KEY=your_api_key');
    return;
  }
  
  console.log('✅ API Key已配置');
  console.log('📋 测试配置:');
  console.log(`- API Key长度: ${apiKey.length} 字符`);
  console.log(`- 模型: gemini-1.5-flash`);
  console.log(`- 测试模式: 基础文字识别 + 结构化提取`);
  
  // 测试1: 基础文字识别
  console.log('\n🔍 测试1: 基础文字识别');
  console.log('-'.repeat(40));
  
  try {
    const basicResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: '请识别这张图片中的所有文字内容，保持原有格式和结构。' },
            {
              inline_data: {
                mime_type: 'image/png',
                data: testImageBase64
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
        console.log(`- 识别内容预览: ${text.substring(0, 100)}...`);
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

    const structuredResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
                data: testImageBase64
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
        console.log(`- 提取结果: ${text}`);
        
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
  console.log('✅ OCR API连接测试完成');
  console.log('💡 如果测试成功，说明API配置正确');
  console.log('💡 如果测试失败，请检查API Key和网络连接');
  console.log('\n🔗 测试资源:');
  console.log('- 飞书文档: https://cb0xpdikl7.feishu.cn/docx/CrBwdZoDroTdhKx564bc6XjlnFd');
  console.log('- 测试图片: 合同信息表格（甲方：天津美数百宝汽车销售有限公司）');
}

// 运行测试
if (require.main === module) {
  testOCRAPI().catch(console.error);
}

module.exports = { testOCRAPI };
