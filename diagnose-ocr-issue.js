/**
 * 诊断当前OCR问题
 */

const fs = require('fs');

async function diagnoseOCRIssue() {
  console.log('🔍 诊断OCR问题\n');
  console.log('='.repeat(60));

  try {
    // 检查环境变量
    console.log('📋 环境变量检查:');
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const googleApiKey = envContent.match(/GOOGLE_API_KEY=(.+)/)?.[1];
    
    console.log(`- Google API Key: ${googleApiKey ? '✅ 已配置' : '❌ 未配置'}`);
    if (googleApiKey) {
      console.log(`- API Key长度: ${googleApiKey.length} 字符`);
      console.log(`- API Key前缀: ${googleApiKey.substring(0, 10)}...`);
    }

    // 测试Gemini API连接
    console.log('\n🌐 测试Gemini API连接:');
    
    if (!googleApiKey) {
      console.log('❌ 无法测试：缺少Google API Key');
      return;
    }

    // 创建测试图片的base64数据（1x1像素的PNG）
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': googleApiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: '请识别这张图片中的内容' },
            {
              inline_data: {
                mime_type: 'image/png',
                data: testImageBase64
              }
            }
          ]
        }]
      })
    });

    console.log(`- HTTP状态: ${response.status}`);
    console.log(`- 响应状态: ${response.ok ? '✅ 成功' : '❌ 失败'}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('- 错误详情:', JSON.stringify(errorData, null, 2));
      
      if (response.status === 400) {
        console.log('💡 可能原因: API密钥无效或请求格式错误');
      } else if (response.status === 403) {
        console.log('💡 可能原因: API密钥权限不足或配额用完');
      } else if (response.status === 429) {
        console.log('💡 可能原因: 请求频率过高');
      }
    } else {
      const data = await response.json();
      console.log('- API响应结构:', {
        hasCandidates: !!data.candidates,
        candidatesCount: data.candidates?.length || 0,
        hasContent: !!(data.candidates?.[0]?.content),
        hasParts: !!(data.candidates?.[0]?.content?.parts)
      });
      
      if (data.candidates?.[0]?.content?.parts) {
        const text = data.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('\n');
        console.log('- 识别结果:', text || '(空)');
      }
    }

    // 检查本地OCR服务文件
    console.log('\n📁 检查OCR服务文件:');
    const ocrFiles = [
      'src/lib/gemini-ocr.ts',
      'src/app/api/ocr/extract/route.ts',
      'src/app/api/ocr/contract/route.ts'
    ];

    for (const file of ocrFiles) {
      const exists = fs.existsSync(file);
      console.log(`- ${file}: ${exists ? '✅ 存在' : '❌ 缺失'}`);
    }

    console.log('\n🔧 问题诊断结果:');
    
    if (!response.ok) {
      console.log('❌ 主要问题: Gemini API调用失败');
      console.log('📋 建议解决方案:');
      console.log('1. 检查Google API Key是否有效');
      console.log('2. 确认API Key有Gemini Vision权限');
      console.log('3. 检查网络连接和防火墙设置');
      console.log('4. 考虑切换到智谱AI GLM-4.5V模型');
    } else {
      console.log('✅ Gemini API连接正常');
      console.log('📋 可能的问题:');
      console.log('1. 图片格式或大小问题');
      console.log('2. 前端到后端的数据传输问题');
      console.log('3. 错误处理逻辑问题');
    }

  } catch (error) {
    console.log('\n❌ 诊断过程中发生错误');
    console.log('='.repeat(60));
    console.log(`错误: ${error.message}`);
    console.log(`堆栈: ${error.stack}`);
  }
}

// 运行诊断
if (require.main === module) {
  diagnoseOCRIssue().catch(console.error);
}

module.exports = { diagnoseOCRIssue };
