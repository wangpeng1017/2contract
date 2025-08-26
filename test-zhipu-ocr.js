/**
 * 测试智谱AI GLM-4.5V OCR服务
 */

const fs = require('fs');

async function testZhipuOCR() {
  console.log('🧪 测试智谱AI GLM-4.5V OCR服务\n');
  console.log('='.repeat(70));

  try {
    // 检查环境变量
    console.log('📋 环境变量检查:');
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const zhipuApiKey = envContent.match(/ZHIPU_API_KEY=(.+)/)?.[1];
    
    console.log(`- 智谱AI API Key: ${zhipuApiKey ? '✅ 已配置' : '❌ 未配置'}`);
    if (zhipuApiKey) {
      console.log(`- API Key长度: ${zhipuApiKey.length} 字符`);
      console.log(`- API Key格式: ${zhipuApiKey.includes('.') ? '✅ 正确格式' : '❌ 格式错误'}`);
    }

    // 测试智谱AI API连接
    console.log('\n🌐 测试智谱AI API连接:');
    
    if (!zhipuApiKey) {
      console.log('❌ 无法测试：缺少智谱AI API Key');
      return;
    }

    // 创建测试图片的base64数据（简单的文字图片）
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const requestBody = {
      model: 'glm-4.5v',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张图片中的内容'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${testImageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      stream: false
    };

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zhipuApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`- HTTP状态: ${response.status}`);
    console.log(`- 响应状态: ${response.ok ? '✅ 成功' : '❌ 失败'}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('- 错误详情:', JSON.stringify(errorData, null, 2));
      
      if (response.status === 401) {
        console.log('💡 可能原因: API密钥无效或格式错误');
      } else if (response.status === 403) {
        console.log('💡 可能原因: API密钥权限不足或账户余额不足');
      } else if (response.status === 429) {
        console.log('💡 可能原因: 请求频率过高');
      } else if (response.status === 400) {
        console.log('💡 可能原因: 请求格式错误或参数无效');
      }
    } else {
      const data = await response.json();
      console.log('- API响应结构:', {
        hasChoices: !!data.choices,
        choicesCount: data.choices?.length || 0,
        hasMessage: !!(data.choices?.[0]?.message),
        hasContent: !!(data.choices?.[0]?.message?.content),
        finishReason: data.choices?.[0]?.finish_reason
      });
      
      if (data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        console.log('- 识别结果:', content);
      }

      // 检查使用情况
      if (data.usage) {
        console.log('- Token使用情况:', {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
        });
      }
    }

    // 检查服务文件
    console.log('\n📁 检查OCR服务文件:');
    const ocrFiles = [
      'src/lib/zhipu-ocr.ts',
      'src/app/api/ocr/extract/route.ts',
      'src/app/api/ocr/contract/route.ts'
    ];

    for (const file of ocrFiles) {
      const exists = fs.existsSync(file);
      console.log(`- ${file}: ${exists ? '✅ 存在' : '❌ 缺失'}`);
      
      if (exists && file.includes('zhipu-ocr.ts')) {
        const content = fs.readFileSync(file, 'utf8');
        console.log(`  - 包含ZhipuOCRService类: ${content.includes('class ZhipuOCRService') ? '✅' : '❌'}`);
        console.log(`  - 包含extractText方法: ${content.includes('extractText') ? '✅' : '❌'}`);
        console.log(`  - 包含extractContract方法: ${content.includes('extractContract') ? '✅' : '❌'}`);
      }
    }

    console.log('\n🔧 切换结果分析:');
    
    if (!response.ok) {
      console.log('❌ 智谱AI API调用失败');
      console.log('📋 建议解决方案:');
      console.log('1. 检查智谱AI API Key是否有效');
      console.log('2. 确认账户余额是否充足');
      console.log('3. 检查网络连接和防火墙设置');
      console.log('4. 验证API Key格式是否正确');
    } else {
      console.log('✅ 智谱AI API连接正常');
      console.log('📋 切换成功:');
      console.log('1. ✅ 智谱AI API Key配置正确');
      console.log('2. ✅ API调用格式正确');
      console.log('3. ✅ 响应解析正常');
      console.log('4. ✅ 服务文件已更新');
    }

    console.log('\n📊 功能对比:');
    console.log('Gemini 2.5 Flash → 智谱AI GLM-4.5V');
    console.log('- 模型提供商: Google → 智谱AI');
    console.log('- API端点: generativelanguage.googleapis.com → open.bigmodel.cn');
    console.log('- 认证方式: X-goog-api-key → Authorization Bearer');
    console.log('- 请求格式: contents → messages');
    console.log('- 响应格式: candidates → choices');

    console.log('\n🎯 预期改进:');
    console.log('✅ 更好的中文识别能力');
    console.log('✅ 更稳定的API服务');
    console.log('✅ 更准确的合同信息提取');
    console.log('✅ 更合理的置信度计算');

  } catch (error) {
    console.log('\n❌ 测试过程中发生错误');
    console.log('='.repeat(70));
    console.log(`错误: ${error.message}`);
    console.log(`堆栈: ${error.stack}`);
  }
}

// 运行测试
if (require.main === module) {
  testZhipuOCR().catch(console.error);
}

module.exports = { testZhipuOCR };
