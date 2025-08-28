const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * 使用Playwright调试生产环境的占位符识别问题
 */
async function debugProductionPlaceholderIssue() {
  console.log('🔍 使用Playwright调试生产环境占位符识别问题');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // 慢速执行，便于观察
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. 访问生产环境
    console.log('📱 访问生产环境...');
    await page.goto('https://fcontract.aifly.me/local-docs');
    await page.waitForLoadState('networkidle');
    
    // 2. 上传模板文件
    console.log('📤 上传模板文件...');
    
    // 查找文件上传元素
    const fileInput = await page.locator('input[type="file"]').first();
    
    // 上传您的模板文件
    const templatePath = path.resolve('./汽车采购合同.docx'); // 使用当前目录的文件
    
    if (!fs.existsSync(templatePath)) {
      console.log(`❌ 模板文件不存在: ${templatePath}`);
      console.log('📁 当前目录文件:');
      const files = fs.readdirSync('.').filter(f => f.endsWith('.docx'));
      files.forEach(file => console.log(`  - ${file}`));
      
      if (files.length > 0) {
        const alternativeTemplate = path.resolve(`./${files[0]}`);
        console.log(`🔄 使用替代模板: ${alternativeTemplate}`);
        await fileInput.setInputFiles(alternativeTemplate);
      } else {
        throw new Error('未找到可用的模板文件');
      }
    } else {
      await fileInput.setInputFiles(templatePath);
    }
    
    // 3. 等待模板解析完成
    console.log('⏳ 等待模板解析...');
    await page.waitForTimeout(3000);
    
    // 4. 检查页面上显示的占位符信息
    console.log('🔍 检查占位符识别结果...');
    
    // 查找占位符相关的UI元素
    const placeholderElements = await page.locator('[data-testid*="placeholder"], .placeholder, .field').all();
    
    console.log(`📊 页面上找到 ${placeholderElements.length} 个占位符相关元素`);
    
    // 提取占位符信息
    for (let i = 0; i < Math.min(placeholderElements.length, 20); i++) {
      const element = placeholderElements[i];
      const text = await element.textContent();
      const label = await element.getAttribute('data-label') || await element.getAttribute('placeholder') || '';
      console.log(`  ${i + 1}. ${text} ${label ? `(${label})` : ''}`);
    }
    
    // 5. 检查表单字段
    console.log('\n📝 检查表单字段...');
    const formFields = await page.locator('input, textarea, select').all();
    
    console.log(`📊 找到 ${formFields.length} 个表单字段`);
    
    for (let i = 0; i < Math.min(formFields.length, 15); i++) {
      const field = formFields[i];
      const placeholder = await field.getAttribute('placeholder') || '';
      const name = await field.getAttribute('name') || '';
      const id = await field.getAttribute('id') || '';
      
      console.log(`  ${i + 1}. ${name || id} - ${placeholder}`);
    }
    
    // 6. 检查是否有错误信息
    console.log('\n❌ 检查错误信息...');
    const errorElements = await page.locator('.error, .alert-error, [role="alert"]').all();
    
    if (errorElements.length > 0) {
      console.log(`⚠️  找到 ${errorElements.length} 个错误信息:`);
      for (const errorElement of errorElements) {
        const errorText = await errorElement.textContent();
        console.log(`  - ${errorText}`);
      }
    } else {
      console.log('✅ 未发现错误信息');
    }
    
    // 7. 检查网络请求
    console.log('\n🌐 监控网络请求...');
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') && (url.includes('parse') || url.includes('template'))) {
        console.log(`📡 API响应: ${response.status()} ${url}`);
        
        try {
          const responseBody = await response.text();
          console.log(`📄 响应内容: ${responseBody.substring(0, 500)}...`);
        } catch (e) {
          console.log(`❌ 无法读取响应内容: ${e.message}`);
        }
      }
    });
    
    // 8. 重新上传模板触发解析
    console.log('\n🔄 重新上传模板触发解析...');
    
    // 清除当前文件
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 重新上传
    const newFileInput = await page.locator('input[type="file"]').first();
    const testTemplate = path.resolve('./test-contract-template.docx');
    
    if (fs.existsSync(testTemplate)) {
      console.log('📤 上传测试模板进行对比...');
      await newFileInput.setInputFiles(testTemplate);
      await page.waitForTimeout(3000);
      
      // 检查测试模板的识别结果
      console.log('🔍 测试模板识别结果...');
      const testPlaceholderElements = await page.locator('[data-testid*="placeholder"], .placeholder, .field').all();
      console.log(`📊 测试模板识别到 ${testPlaceholderElements.length} 个占位符`);
    }
    
    // 9. 访问调试页面
    console.log('\n🛠️  访问调试页面...');
    await page.goto('https://fcontract.aifly.me/debug-generation');
    await page.waitForLoadState('networkidle');
    
    // 检查调试信息
    const debugInfo = await page.locator('.debug-info, .diagnostic').all();
    console.log(`🔧 找到 ${debugInfo.length} 个调试信息元素`);
    
    for (const info of debugInfo) {
      const text = await info.textContent();
      if (text && text.length > 10) {
        console.log(`  📋 ${text.substring(0, 100)}...`);
      }
    }
    
    // 10. 截图保存
    console.log('\n📸 保存调试截图...');
    await page.screenshot({ 
      path: 'debug-placeholder-issue.png',
      fullPage: true 
    });
    
    console.log('✅ 调试截图已保存: debug-placeholder-issue.png');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
    
    // 保存错误截图
    try {
      await page.screenshot({ 
        path: 'debug-error.png',
        fullPage: true 
      });
      console.log('📸 错误截图已保存: debug-error.png');
    } catch (screenshotError) {
      console.error('截图失败:', screenshotError);
    }
  } finally {
    await browser.close();
  }
}

/**
 * 分析本地模板文件
 */
async function analyzeLocalTemplate() {
  console.log('\n🔍 分析本地模板文件...');
  
  const templateFiles = fs.readdirSync('.').filter(f => f.endsWith('.docx'));
  
  console.log(`📁 找到 ${templateFiles.length} 个模板文件:`);
  templateFiles.forEach(file => {
    const stats = fs.statSync(file);
    console.log(`  - ${file} (${stats.size} bytes)`);
  });
  
  // 如果有汽车采购合同.docx，分析它
  if (templateFiles.includes('汽车采购合同.docx')) {
    console.log('\n📋 分析汽车采购合同.docx...');
    
    // 这里可以添加更多的本地分析逻辑
    // 比如解压docx文件，分析XML结构等
  }
}

async function main() {
  console.log('🚀 生产环境占位符识别问题调试工具');
  console.log('使用Playwright进行实时分析');
  console.log('=' .repeat(80));
  
  try {
    // 先分析本地模板
    await analyzeLocalTemplate();
    
    // 然后调试生产环境
    await debugProductionPlaceholderIssue();
    
    console.log('\n🎯 调试完成');
    console.log('请查看控制台输出和截图文件了解详细信息');
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

// 运行调试
main().catch(console.error);
