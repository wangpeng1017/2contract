/**
 * 直接测试OCR API功能
 * 使用真实的合同图片进行测试
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

// 创建测试图片的base64数据（合同表格内容）
function createTestImageBase64() {
  // 这是一个简单的1x1像素PNG图片的base64，用于测试
  // 在实际使用中，您应该使用真实的合同图片
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
}

async function testOCRAPI() {
  console.log('🧪 开始OCR API直接测试\n');
  console.log('='.repeat(60));

  const fetch = await getFetch();
  const baseUrl = 'http://localhost:3001';

  // 创建测试图片文件
  const testImageBase64 = createTestImageBase64();
  const imageBuffer = Buffer.from(testImageBase64, 'base64');
  const testImagePath = path.join(__dirname, 'test-contract-image.png');

  // 写入测试图片文件
  fs.writeFileSync(testImagePath, imageBuffer);
  console.log('✅ 测试图片已创建:', testImagePath);

  // 测试1: 基础文字识别
  console.log('\n🔍 测试1: 基础文字识别');
  console.log('-'.repeat(40));

  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('extractStructured', 'false');
    formData.append('language', 'zh-CN');

    const response = await fetch(`${baseUrl}/api/ocr/extract`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log(`- 请求状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 基础OCR测试成功');
      console.log('- 响应数据:', JSON.stringify(data, null, 2));

      if (data.success && data.data.result) {
        console.log(`- 识别文字长度: ${data.data.result.text?.length || 0} 字符`);
        console.log(`- 置信度: ${data.data.result.confidence || 0}`);
        console.log(`- 处理时间: ${data.data.result.processingTime || 0}ms`);
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ 基础OCR测试失败');
      console.log(`- 错误信息: ${JSON.stringify(errorData, null, 2)}`);
    }
  } catch (error) {
    console.log('❌ 基础OCR测试异常');
    console.log(`- 异常信息: ${error.message}`);
  }

  // 测试2: 合同信息提取
  console.log('\n🔍 测试2: 合同信息提取');
  console.log('-'.repeat(40));

  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('generateRules', 'true');

    const response = await fetch(`${baseUrl}/api/ocr/contract`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log(`- 请求状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ 合同信息提取测试成功');
      console.log('- 响应数据:', JSON.stringify(data, null, 2));

      if (data.success && data.data.contractInfo) {
        console.log('📋 提取的合同信息:');
        Object.entries(data.data.contractInfo).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            console.log(`- ${key}: ${JSON.stringify(value, null, 2)}`);
          } else {
            console.log(`- ${key}: ${value}`);
          }
        });

        if (data.data.replacementRules && data.data.replacementRules.length > 0) {
          console.log(`- 生成替换规则数量: ${data.data.replacementRules.length}`);
        }
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ 合同信息提取测试失败');
      console.log(`- 错误信息: ${JSON.stringify(errorData, null, 2)}`);
    }
  } catch (error) {
    console.log('❌ 合同信息提取测试异常');
    console.log(`- 异常信息: ${error.message}`);
  }

  // 清理测试文件
  try {
    fs.unlinkSync(testImagePath);
    console.log('\n🧹 测试文件已清理');
  } catch (error) {
    console.log('\n⚠️ 清理测试文件失败:', error.message);
  }

  console.log('\n📊 测试总结');
  console.log('='.repeat(60));
  console.log('✅ OCR API连接测试完成');
  console.log('💡 如果测试成功，说明API配置正确');
  console.log('💡 如果测试失败，请检查服务器状态和API配置');
  console.log('\n🔗 测试资源:');
  console.log('- 飞书文档: https://cb0xpdikl7.feishu.cn/docx/CrBwdZoDroTdhKx564bc6XjlnFd');
  console.log('- 本地服务器: http://localhost:3001');
  console.log('- OCR API端点: /api/ocr/extract, /api/ocr/contract');
}

// 运行测试
if (require.main === module) {
  testOCRAPI().catch(console.error);
}

module.exports = { testOCRAPI };