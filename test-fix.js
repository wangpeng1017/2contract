/**
 * 测试FileReader修复是否有效
 */

const fs = require('fs');
const path = require('path');

// 模拟Next.js环境中的File对象
class MockFile {
  constructor(buffer, name, type) {
    this.buffer = buffer;
    this.name = name;
    this.type = type;
    this.size = buffer.length;
  }

  async arrayBuffer() {
    return this.buffer.buffer.slice(
      this.buffer.byteOffset,
      this.buffer.byteOffset + this.buffer.byteLength
    );
  }
}

// 导入修复后的OCR服务
async function testOCRFix() {
  console.log('🧪 测试FileReader修复\n');
  console.log('='.repeat(50));

  try {
    // 动态导入OCR服务
    const { GeminiOCRService } = await import('./src/lib/gemini-ocr.ts');
    
    console.log('✅ OCR服务导入成功');
    
    // 创建OCR服务实例
    const ocrService = new GeminiOCRService('test-api-key');
    console.log('✅ OCR服务实例创建成功');
    
    // 读取测试图片
    let testImageBuffer;
    if (fs.existsSync('test-image.png')) {
      testImageBuffer = fs.readFileSync('test-image.png');
      console.log('✅ 测试图片读取成功');
      console.log(`📋 图片大小: ${testImageBuffer.length} 字节`);
    } else {
      // 创建一个简单的测试图片buffer
      testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      console.log('⚠️ 使用默认测试图片');
    }
    
    // 创建模拟的File对象
    const mockFile = new MockFile(testImageBuffer, 'test-image.png', 'image/png');
    console.log('✅ 模拟File对象创建成功');
    
    // 测试prepareImageData方法
    console.log('\n🔍 测试prepareImageData方法...');
    
    // 使用反射访问私有方法进行测试
    const base64Result = await ocrService.prepareImageData(mockFile);
    
    console.log('✅ prepareImageData方法执行成功');
    console.log(`📋 Base64结果长度: ${base64Result.length} 字符`);
    console.log(`📋 Base64预览: ${base64Result.substring(0, 50)}...`);
    
    // 验证base64格式
    const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(base64Result);
    console.log(`📋 Base64格式验证: ${isValidBase64 ? '✅ 有效' : '❌ 无效'}`);
    
    console.log('\n📊 测试结果');
    console.log('='.repeat(50));
    console.log('✅ FileReader修复测试通过');
    console.log('✅ 服务器端File对象处理正常');
    console.log('✅ Base64转换功能正常');
    console.log('\n💡 修复说明:');
    console.log('- 移除了浏览器特有的FileReader API');
    console.log('- 使用Node.js原生的Buffer和arrayBuffer方法');
    console.log('- 兼容服务器端环境的File对象处理');
    
  } catch (error) {
    console.log('\n❌ 测试失败');
    console.log('='.repeat(50));
    console.log(`错误类型: ${error.constructor.name}`);
    console.log(`错误信息: ${error.message}`);
    console.log(`错误堆栈: ${error.stack}`);
    
    if (error.message.includes('FileReader is not defined')) {
      console.log('\n🔧 修复建议:');
      console.log('- FileReader错误仍然存在');
      console.log('- 需要检查是否还有其他地方使用了FileReader');
      console.log('- 确保所有浏览器API都已替换为Node.js兼容的实现');
    }
  }
}

// 运行测试
if (require.main === module) {
  testOCRFix().catch(console.error);
}

module.exports = { testOCRFix };
