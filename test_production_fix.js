const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * 测试生产环境的占位符识别修复效果
 */
async function testProductionFix() {
  console.log('🧪 测试生产环境占位符识别修复效果');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // 监控网络请求
  const apiResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/local-docs/parse-template')) {
      console.log(`📡 API调用: ${response.status()} ${url}`);
      
      try {
        const responseBody = await response.json();
        apiResponses.push({
          status: response.status(),
          url: url,
          body: responseBody
        });
        
        console.log(`📄 API响应:`, {
          success: responseBody.success,
          placeholderCount: responseBody.data?.placeholders?.length || 0,
          placeholders: responseBody.data?.placeholders?.map(p => p.name).slice(0, 10) || []
        });
        
      } catch (e) {
        console.log(`❌ 无法解析API响应: ${e.message}`);
      }
    }
  });

  try {
    // 1. 访问生产环境
    console.log('📱 访问生产环境...');
    await page.goto('https://fcontract.aifly.me/local-docs');
    await page.waitForLoadState('networkidle');
    
    // 2. 测试系统兼容模板
    console.log('\n📤 测试1: 上传系统兼容模板...');
    
    const compatibleTemplate = path.resolve('./系统兼容-采购合同模板.docx');
    if (fs.existsSync(compatibleTemplate)) {
      const fileInput = await page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(compatibleTemplate);
      
      // 等待解析完成
      await page.waitForTimeout(3000);
      
      console.log('✅ 系统兼容模板上传完成');
    }
    
    // 3. 测试汽车采购合同模板
    console.log('\n📤 测试2: 上传汽车采购合同模板...');
    
    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const carTemplate = path.resolve('./汽车采购合同.docx');
    if (fs.existsSync(carTemplate)) {
      const fileInput2 = await page.locator('input[type="file"]').first();
      await fileInput2.setInputFiles(carTemplate);
      
      // 等待解析完成
      await page.waitForTimeout(3000);
      
      console.log('✅ 汽车采购合同模板上传完成');
    }
    
    // 4. 检查页面上的字段
    console.log('\n🔍 检查页面字段...');
    
    const formFields = await page.locator('input, textarea, select').all();
    console.log(`📊 找到 ${formFields.length} 个表单字段`);
    
    const fieldInfo = [];
    for (let i = 0; i < Math.min(formFields.length, 20); i++) {
      const field = formFields[i];
      const placeholder = await field.getAttribute('placeholder') || '';
      const name = await field.getAttribute('name') || '';
      const type = await field.getAttribute('type') || '';
      
      fieldInfo.push({ name, placeholder, type });
      console.log(`  ${i + 1}. ${name} (${type}) - ${placeholder}`);
    }
    
    // 5. 检查是否显示了实际的占位符而不是示例
    console.log('\n🎯 分析字段来源...');
    
    const hasCustomFields = fieldInfo.some(field => 
      field.name && !['甲方公司名称', '乙方公司名称', '合同类型', '合同金额'].includes(field.name)
    );
    
    if (hasCustomFields) {
      console.log('✅ 发现自定义字段，说明系统识别了模板中的实际占位符');
    } else {
      console.log('❌ 只发现标准字段，说明系统仍在使用示例占位符');
    }
    
    // 6. 分析API响应
    console.log('\n📊 API响应分析...');
    
    if (apiResponses.length > 0) {
      apiResponses.forEach((response, index) => {
        console.log(`\n  响应 ${index + 1}:`);
        console.log(`    状态: ${response.status}`);
        console.log(`    成功: ${response.body.success}`);
        
        if (response.body.data?.placeholders) {
          const placeholders = response.body.data.placeholders;
          console.log(`    占位符数量: ${placeholders.length}`);
          console.log(`    占位符列表:`);
          
          placeholders.slice(0, 15).forEach((p, i) => {
            console.log(`      ${i + 1}. ${p.name} (${p.type})`);
          });
          
          // 检查是否包含模板特定的字段
          const templateSpecificFields = placeholders.filter(p => 
            !['甲方公司名称', '乙方公司名称', '合同类型', '合同金额', '签署日期'].includes(p.name)
          );
          
          if (templateSpecificFields.length > 0) {
            console.log(`    ✅ 发现 ${templateSpecificFields.length} 个模板特定字段:`);
            templateSpecificFields.forEach(field => {
              console.log(`      - ${field.name}`);
            });
          } else {
            console.log(`    ❌ 只发现标准示例字段`);
          }
        }
      });
    } else {
      console.log('❌ 未捕获到API响应');
    }
    
    // 7. 截图保存
    console.log('\n📸 保存测试截图...');
    await page.screenshot({ 
      path: 'production-fix-test.png',
      fullPage: true 
    });
    
    console.log('✅ 测试截图已保存: production-fix-test.png');
    
    // 8. 生成测试报告
    generateTestReport(apiResponses, fieldInfo);
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
    
    try {
      await page.screenshot({ 
        path: 'production-fix-error.png',
        fullPage: true 
      });
      console.log('📸 错误截图已保存: production-fix-error.png');
    } catch (screenshotError) {
      console.error('截图失败:', screenshotError);
    }
  } finally {
    await browser.close();
  }
}

function generateTestReport(apiResponses, fieldInfo) {
  console.log('\n📋 生产环境测试报告');
  console.log('=' .repeat(50));
  
  // API响应分析
  console.log('📡 API响应分析:');
  if (apiResponses.length > 0) {
    const lastResponse = apiResponses[apiResponses.length - 1];
    const placeholders = lastResponse.body.data?.placeholders || [];
    
    console.log(`  总API调用次数: ${apiResponses.length}`);
    console.log(`  最后响应状态: ${lastResponse.status}`);
    console.log(`  识别占位符数量: ${placeholders.length}`);
    
    // 分析占位符类型
    const standardFields = ['甲方公司名称', '乙方公司名称', '合同类型', '合同金额', '签署日期'];
    const standardCount = placeholders.filter(p => standardFields.includes(p.name)).length;
    const customCount = placeholders.length - standardCount;
    
    console.log(`  标准字段: ${standardCount} 个`);
    console.log(`  自定义字段: ${customCount} 个`);
    
    if (customCount > 0) {
      console.log('  ✅ 修复成功：系统识别了模板中的实际占位符');
    } else {
      console.log('  ❌ 修复失败：系统仍在使用示例占位符');
    }
  } else {
    console.log('  ❌ 未捕获到API响应');
  }
  
  // 页面字段分析
  console.log('\n📝 页面字段分析:');
  console.log(`  表单字段数量: ${fieldInfo.length}`);
  
  const uniqueFieldNames = [...new Set(fieldInfo.map(f => f.name).filter(Boolean))];
  console.log(`  唯一字段名称: ${uniqueFieldNames.length} 个`);
  
  // 修复效果评估
  console.log('\n🎯 修复效果评估:');
  
  const hasCustomFields = apiResponses.some(response => {
    const placeholders = response.body.data?.placeholders || [];
    return placeholders.some(p => !['甲方公司名称', '乙方公司名称', '合同类型', '合同金额', '签署日期'].includes(p.name));
  });
  
  if (hasCustomFields) {
    console.log('  ✅ 修复成功');
    console.log('  📈 系统现在能够识别模板中的实际占位符');
    console.log('  🎯 建议: 可以部署到生产环境');
  } else {
    console.log('  ❌ 修复未完全生效');
    console.log('  📈 系统仍在返回示例占位符');
    console.log('  🎯 建议: 需要进一步调试');
  }
  
  // 下一步建议
  console.log('\n🚀 下一步建议:');
  if (hasCustomFields) {
    console.log('  1. 部署修复到生产环境');
    console.log('  2. 通知用户重新测试模板');
    console.log('  3. 监控生产环境日志');
    console.log('  4. 收集用户反馈');
  } else {
    console.log('  1. 检查生产环境是否使用了最新代码');
    console.log('  2. 查看生产环境日志');
    console.log('  3. 进一步调试占位符识别算法');
    console.log('  4. 考虑使用更激进的识别策略');
  }
}

async function main() {
  console.log('🚀 生产环境占位符识别修复测试');
  console.log('使用Playwright验证修复效果');
  console.log('=' .repeat(80));
  
  try {
    await testProductionFix();
    
    console.log('\n🎯 测试完成');
    console.log('请查看控制台输出和截图文件了解详细结果');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
main().catch(console.error);
