/**
 * 飞书合同内容更新助手 - 端到端自动化测试
 * 使用Playwright进行全面的功能和性能测试
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  baseURL: 'https://0823-3contract.vercel.app',
  timeout: 30000,
  screenshotDir: './test-screenshots',
  reportFile: './test-report.json'
};

// 测试结果收集器
class TestReporter {
  constructor() {
    this.results = {
      startTime: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  addTest(name, status, details = {}) {
    const test = {
      name,
      status, // 'passed', 'failed', 'warning'
      timestamp: new Date().toISOString(),
      ...details
    };
    
    this.results.tests.push(test);
    this.results.summary.total++;
    this.results.summary[status]++;
    
    const statusIcon = {
      passed: '✅',
      failed: '❌', 
      warning: '⚠️'
    }[status];
    
    console.log(`${statusIcon} ${name}`);
    if (details.error) {
      console.log(`   错误: ${details.error}`);
    }
    if (details.duration) {
      console.log(`   耗时: ${details.duration}ms`);
    }
  }

  generateReport() {
    this.results.endTime = new Date().toISOString();
    
    // 保存JSON报告
    fs.writeFileSync(TEST_CONFIG.reportFile, JSON.stringify(this.results, null, 2));
    
    // 打印汇总
    console.log('\n📊 测试结果汇总:');
    console.log('=' .repeat(50));
    console.log(`总计: ${this.results.summary.total} 个测试`);
    console.log(`✅ 通过: ${this.results.summary.passed}`);
    console.log(`❌ 失败: ${this.results.summary.failed}`);
    console.log(`⚠️  警告: ${this.results.summary.warnings}`);
    console.log('=' .repeat(50));
    
    return this.results;
  }
}

// 主测试类
class E2ETestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.reporter = new TestReporter();
    
    // 确保截图目录存在
    if (!fs.existsSync(TEST_CONFIG.screenshotDir)) {
      fs.mkdirSync(TEST_CONFIG.screenshotDir, { recursive: true });
    }
  }

  async setup() {
    console.log('🚀 启动Playwright浏览器...');
    this.browser = await chromium.launch({ 
      headless: false, // 显示浏览器窗口以便观察
      slowMo: 1000 // 减慢操作速度便于观察
    });
    
    this.page = await this.browser.newPage();
    
    // 设置视口大小
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // 设置超时时间
    this.page.setDefaultTimeout(TEST_CONFIG.timeout);
    
    console.log('✅ 浏览器启动成功');
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 浏览器已关闭');
    }
  }

  async takeScreenshot(name) {
    const filename = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
    const filepath = path.join(TEST_CONFIG.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  // 测试1: 页面加载测试
  async testPageLoad() {
    const startTime = Date.now();
    
    try {
      console.log('\n🔍 测试1: 页面加载测试');
      
      // 导航到主页
      await this.page.goto(TEST_CONFIG.baseURL);
      
      // 等待页面加载完成
      await this.page.waitForLoadState('networkidle');
      
      const duration = Date.now() - startTime;
      
      // 检查页面标题
      const title = await this.page.title();
      const expectedTitle = '飞书合同内容更新助手';
      
      if (title.includes(expectedTitle)) {
        await this.takeScreenshot('page_loaded_success');
        this.reporter.addTest('页面加载测试', 'passed', { 
          duration,
          title,
          url: TEST_CONFIG.baseURL
        });
      } else {
        await this.takeScreenshot('page_loaded_wrong_title');
        this.reporter.addTest('页面加载测试', 'failed', { 
          duration,
          error: `页面标题不匹配。期望包含: ${expectedTitle}, 实际: ${title}`
        });
      }
      
    } catch (error) {
      await this.takeScreenshot('page_load_error');
      this.reporter.addTest('页面加载测试', 'failed', { 
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  // 测试2: UI组件检查
  async testUIComponents() {
    const startTime = Date.now();
    
    try {
      console.log('\n🎨 测试2: UI组件检查');
      
      // 检查关键UI元素
      const components = [
        { selector: 'h1', name: '主标题' },
        { selector: '[class*="LoginButton"]', name: '登录按钮' },
        { selector: 'header', name: '页面头部' },
        { selector: 'footer', name: '页面底部' },
        { selector: 'main', name: '主内容区域' }
      ];
      
      let foundComponents = 0;
      
      for (const component of components) {
        try {
          const element = await this.page.waitForSelector(component.selector, { timeout: 5000 });
          if (element) {
            foundComponents++;
            console.log(`   ✅ ${component.name} 找到`);
          }
        } catch (error) {
          console.log(`   ❌ ${component.name} 未找到`);
        }
      }
      
      await this.takeScreenshot('ui_components_check');
      
      const duration = Date.now() - startTime;
      
      if (foundComponents >= components.length * 0.8) { // 80%的组件找到即为通过
        this.reporter.addTest('UI组件检查', 'passed', { 
          duration,
          foundComponents,
          totalComponents: components.length
        });
      } else {
        this.reporter.addTest('UI组件检查', 'warning', { 
          duration,
          foundComponents,
          totalComponents: components.length,
          error: `只找到 ${foundComponents}/${components.length} 个组件`
        });
      }
      
    } catch (error) {
      await this.takeScreenshot('ui_components_error');
      this.reporter.addTest('UI组件检查', 'failed', { 
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  // 测试3: 飞书登录按钮测试
  async testFeishuLogin() {
    const startTime = Date.now();
    
    try {
      console.log('\n🔐 测试3: 飞书登录按钮测试');
      
      // 查找登录按钮
      const loginSelectors = [
        'button:has-text("使用飞书登录")',
        'button:has-text("登录")',
        '[class*="login"]',
        'a[href*="auth"]'
      ];
      
      let loginButton = null;
      
      for (const selector of loginSelectors) {
        try {
          loginButton = await this.page.waitForSelector(selector, { timeout: 3000 });
          if (loginButton) {
            console.log(`   ✅ 找到登录按钮: ${selector}`);
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      if (loginButton) {
        // 截图登录按钮
        await this.takeScreenshot('login_button_found');
        
        // 点击登录按钮
        await loginButton.click();
        
        // 等待页面响应
        await this.page.waitForTimeout(2000);
        
        // 检查是否跳转或有反应
        const currentUrl = this.page.url();
        
        await this.takeScreenshot('after_login_click');
        
        const duration = Date.now() - startTime;
        
        this.reporter.addTest('飞书登录按钮测试', 'passed', { 
          duration,
          currentUrl,
          action: '登录按钮可点击'
        });
        
      } else {
        await this.takeScreenshot('login_button_not_found');
        this.reporter.addTest('飞书登录按钮测试', 'failed', { 
          duration: Date.now() - startTime,
          error: '未找到登录按钮'
        });
      }
      
    } catch (error) {
      await this.takeScreenshot('login_test_error');
      this.reporter.addTest('飞书登录按钮测试', 'failed', { 
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  // 测试4: API端点健康检查
  async testAPIEndpoints() {
    const startTime = Date.now();
    
    try {
      console.log('\n🔗 测试4: API端点健康检查');
      
      const endpoints = [
        '/api/health/database',
        '/api/auth/me',
        '/api/operations'
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await this.page.request.get(TEST_CONFIG.baseURL + endpoint);
          const status = response.status();
          const responseTime = Date.now() - startTime;
          
          results.push({
            endpoint,
            status,
            responseTime,
            success: status < 500 // 5xx错误才算失败
          });
          
          console.log(`   ${status < 500 ? '✅' : '❌'} ${endpoint}: ${status} (${responseTime}ms)`);
          
        } catch (error) {
          results.push({
            endpoint,
            error: error.message,
            success: false
          });
          console.log(`   ❌ ${endpoint}: ${error.message}`);
        }
      }
      
      const duration = Date.now() - startTime;
      const successfulEndpoints = results.filter(r => r.success).length;
      
      if (successfulEndpoints >= endpoints.length * 0.7) { // 70%成功即为通过
        this.reporter.addTest('API端点健康检查', 'passed', { 
          duration,
          results,
          successfulEndpoints,
          totalEndpoints: endpoints.length
        });
      } else {
        this.reporter.addTest('API端点健康检查', 'warning', { 
          duration,
          results,
          successfulEndpoints,
          totalEndpoints: endpoints.length,
          error: `只有 ${successfulEndpoints}/${endpoints.length} 个端点正常`
        });
      }
      
    } catch (error) {
      this.reporter.addTest('API端点健康检查', 'failed', { 
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🎯 开始端到端测试...');
    console.log(`📍 测试目标: ${TEST_CONFIG.baseURL}`);
    
    try {
      await this.setup();
      
      // 执行所有测试
      await this.testPageLoad();
      await this.testUIComponents();
      await this.testFeishuLogin();
      await this.testAPIEndpoints();
      
    } catch (error) {
      console.error('❌ 测试执行出错:', error);
    } finally {
      await this.teardown();
      
      // 生成报告
      const report = this.reporter.generateReport();
      
      console.log(`\n📄 详细报告已保存到: ${TEST_CONFIG.reportFile}`);
      console.log(`📸 截图已保存到: ${TEST_CONFIG.screenshotDir}`);
      
      return report;
    }
  }
}

// 主函数
async function main() {
  const testSuite = new E2ETestSuite();
  const report = await testSuite.runAllTests();
  
  // 根据测试结果设置退出码
  const hasFailures = report.summary.failed > 0;
  process.exit(hasFailures ? 1 : 0);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { E2ETestSuite, TestReporter };
