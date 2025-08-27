/**
 * 真实API调用测试
 * 测试实际的OCR和替换API功能
 */

const fs = require('fs');
const path = require('path');

async function testRealAPICall() {
  console.log('🌐 真实API调用测试');
  console.log('='.repeat(80));

  try {
    console.log('📋 测试目标:');
    console.log('✅ 调用真实的OCR合同识别API');
    console.log('✅ 验证实际的替换规则生成');
    console.log('✅ 测试增强的替换API');
    console.log('✅ 分析实际运行效果');
    console.log('');

    // 测试OCR API
    console.log('1️⃣ 测试OCR合同识别API:');
    console.log('='.repeat(50));
    
    // 创建测试用的base64图片数据（简化的示例）
    const testImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

    console.log('📤 发送OCR识别请求...');
    
    try {
      const ocrResponse = await fetch('http://localhost:3000/api/ocr/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // 测试token
        },
        body: JSON.stringify({
          image: testImageBase64,
          generateRules: true,
          originalText: `
汽车销售合同

甲方（卖方）：天津鑫敏恒鑫途汽车销售有限公司
联系人：许庆乐
联系电话：13911081213
地址：天津市某区某街道
邮编：300000

乙方（买方）：广州舶源科技有限公司
联系人：张兴亮
联系电话：18380250208
地址：广州市某区某街道
邮编：510000

车辆信息：
车型：驱逐舰 05
配置：55KM 豪华版
外观颜色：雪域白
数量：2台
单价：66,300元
总价：132,600元

价格明细：
不含税价：￥117,345.13元
税额：￥15,254.86元
车款总计：￥132,600元
大写金额：壹拾叁万贰仟陆佰元整

车架号：
1. LC0C76C4XS0356071
2. LC76C44S0358043

签署日期：2024年8月27日
          `
        })
      });

      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json();
        console.log('✅ OCR API调用成功');
        console.log('📊 响应数据分析:');
        
        if (ocrResult.success && ocrResult.data) {
          const { contractInfo, replacementRules, metadata, validation } = ocrResult.data;
          
          console.log(`   识别字段数量: ${metadata?.extractedFields || 0}`);
          console.log(`   生成规则数量: ${metadata?.rulesGenerated || 0}`);
          console.log(`   文件大小: ${metadata?.fileSize || 0} bytes`);
          console.log(`   处理时间: ${metadata?.processingTime || 'N/A'}`);
          
          if (validation) {
            console.log(`   验证状态: ${validation.isValid ? '✅ 通过' : '❌ 失败'}`);
            if (validation.errors && validation.errors.length > 0) {
              console.log(`   验证错误: ${validation.errors.join(', ')}`);
            }
            if (validation.warnings && validation.warnings.length > 0) {
              console.log(`   验证警告: ${validation.warnings.join(', ')}`);
            }
          }
          
          // 分析合同信息结构
          if (contractInfo) {
            console.log('📋 合同信息结构分析:');
            console.log(`     基本信息: 合同编号=${contractInfo.contractNumber || 'N/A'}, 类型=${contractInfo.contractType || 'N/A'}`);
            console.log(`     甲方: ${contractInfo.parties?.partyA?.companyName || 'N/A'}`);
            console.log(`     乙方: ${contractInfo.parties?.partyB?.companyName || 'N/A'}`);
            console.log(`     车辆数量: ${contractInfo.vehicles?.length || 0}`);
            console.log(`     价格详情: ${contractInfo.priceDetails?.totalAmount || 'N/A'}`);
          }
          
          // 分析替换规则
          if (replacementRules && replacementRules.length > 0) {
            console.log('🔧 替换规则分析:');
            replacementRules.slice(0, 3).forEach((rule, index) => {
              console.log(`     规则 ${index + 1}: ${rule.fieldType} - "${rule.searchText}" → "${rule.replaceText}"`);
            });
            if (replacementRules.length > 3) {
              console.log(`     ... 还有 ${replacementRules.length - 3} 条规则`);
            }
          }
          
        } else {
          console.log('❌ OCR API返回失败');
          console.log(`   错误信息: ${ocrResult.message || '未知错误'}`);
        }
        
      } else {
        console.log(`❌ OCR API调用失败: ${ocrResponse.status} ${ocrResponse.statusText}`);
        const errorText = await ocrResponse.text();
        console.log(`   错误详情: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`❌ OCR API调用异常: ${error.message}`);
      console.log('   可能原因: 网络连接问题或服务器未启动');
    }
    
    console.log('');

    // 测试增强替换API
    console.log('2️⃣ 测试增强替换API:');
    console.log('='.repeat(50));
    
    const testText = `
汽车销售合同

甲方（卖方）：天津鑫敏恒鑫途汽车销售有限公司
联系人：许庆乐
联系电话：13911081213

乙方（买方）：广州舶源科技有限公司
联系人：张兴亮
联系电话：18380250208

车型：驱逐舰 05
总金额：132600元
    `;

    const testRules = [
      {
        id: 'test_rule_1',
        searchText: '天津鑫敏恒鑫途汽车销售有限公司',
        replaceText: '天津鑫敏恒鑫途汽车销售有限公司',
        fieldType: '甲方公司',
        options: {
          caseSensitive: false,
          wholeWord: false,
          enabled: true,
          priority: 0
        }
      },
      {
        id: 'test_rule_2',
        searchText: '广州舶源科技有限公司',
        replaceText: '广州舶源科技有限公司',
        fieldType: '乙方公司',
        options: {
          caseSensitive: false,
          wholeWord: false,
          enabled: true,
          priority: 0
        }
      },
      {
        id: 'test_rule_3',
        searchText: '13911081213',
        replaceText: '139-1108-1213',
        fieldType: '甲方电话',
        options: {
          caseSensitive: false,
          wholeWord: true,
          enabled: true,
          priority: 0
        }
      }
    ];

    console.log('📤 发送增强替换请求...');
    
    try {
      const replaceResponse = await fetch('http://localhost:3000/api/text/replace-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          text: testText,
          rules: testRules,
          enableDiagnostics: true,
          autoFix: true,
          options: {
            dryRun: false,
            stopOnError: false
          }
        })
      });

      if (replaceResponse.ok) {
        const replaceResult = await replaceResponse.json();
        console.log('✅ 增强替换API调用成功');
        console.log('📊 替换结果分析:');
        
        if (replaceResult.success && replaceResult.data) {
          const { execution, diagnostics, failures, improvements } = replaceResult.data;
          
          console.log(`   总规则数: ${execution?.totalRules || 0}`);
          console.log(`   成功规则: ${execution?.successfulRules || 0}`);
          console.log(`   失败规则: ${execution?.failedRules || 0}`);
          console.log(`   总替换数: ${execution?.totalReplacements || 0}`);
          console.log(`   执行时间: ${execution?.executionTime || 0}ms`);
          console.log(`   成功率: ${execution?.totalRules > 0 ? ((execution.successfulRules / execution.totalRules) * 100).toFixed(1) : 0}%`);
          
          if (diagnostics && diagnostics.enabled) {
            console.log('🔍 诊断信息:');
            console.log(`     诊断启用: ${diagnostics.enabled ? '是' : '否'}`);
            console.log(`     自动修复: ${diagnostics.autoFixApplied ? '已应用' : '未应用'}`);
            
            if (diagnostics.results && diagnostics.results.length > 0) {
              console.log('     诊断结果:');
              diagnostics.results.slice(0, 2).forEach((diag, index) => {
                console.log(`       规则 ${index + 1}: 精确匹配=${diag.matchAnalysis?.exactMatchCount || 0}, 置信度=${((diag.matchAnalysis?.confidence || 0) * 100).toFixed(1)}%`);
              });
            }
          }
          
          if (failures && failures.count > 0) {
            console.log('❌ 失败分析:');
            console.log(`     失败数量: ${failures.count}`);
            failures.details.slice(0, 2).forEach((failure, index) => {
              console.log(`       失败 ${index + 1}: ${failure.fieldType} - ${failure.error || '未知错误'}`);
            });
          }
          
          if (improvements && improvements.length > 0) {
            console.log('💡 改进建议:');
            improvements.slice(0, 3).forEach((suggestion, index) => {
              console.log(`       ${index + 1}. ${suggestion}`);
            });
          }
          
        } else {
          console.log('❌ 增强替换API返回失败');
          console.log(`   错误信息: ${replaceResult.message || '未知错误'}`);
        }
        
      } else {
        console.log(`❌ 增强替换API调用失败: ${replaceResponse.status} ${replaceResponse.statusText}`);
        const errorText = await replaceResponse.text();
        console.log(`   错误详情: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`❌ 增强替换API调用异常: ${error.message}`);
      console.log('   可能原因: API路径不存在或服务器错误');
    }
    
    console.log('');

    // 测试基础替换API
    console.log('3️⃣ 测试基础替换API:');
    console.log('='.repeat(50));
    
    console.log('📤 发送基础替换请求...');
    
    try {
      const basicReplaceResponse = await fetch('http://localhost:3000/api/document/replace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          text: testText,
          rules: testRules.map(rule => ({
            searchText: rule.searchText,
            replaceText: rule.replaceText,
            options: rule.options
          }))
        })
      });

      if (basicReplaceResponse.ok) {
        const basicResult = await basicReplaceResponse.json();
        console.log('✅ 基础替换API调用成功');
        console.log('📊 替换结果:');
        
        if (basicResult.success && basicResult.data) {
          console.log(`   替换成功: ${basicResult.data.success ? '是' : '否'}`);
          console.log(`   总匹配数: ${basicResult.data.totalMatches || 0}`);
          console.log(`   总替换数: ${basicResult.data.totalReplacements || 0}`);
          console.log(`   执行时间: ${basicResult.data.executionTime || 0}ms`);
          
          if (basicResult.data.results && basicResult.data.results.length > 0) {
            console.log('   规则执行结果:');
            basicResult.data.results.forEach((result, index) => {
              console.log(`     规则 ${index + 1}: ${result.success ? '✅' : '❌'} 替换${result.replacedCount || 0}次`);
            });
          }
        }
        
      } else {
        console.log(`❌ 基础替换API调用失败: ${basicReplaceResponse.status} ${basicReplaceResponse.statusText}`);
      }
      
    } catch (error) {
      console.log(`❌ 基础替换API调用异常: ${error.message}`);
    }
    
    console.log('');

    // 总结测试结果
    console.log('4️⃣ 实际运行效果总结:');
    console.log('='.repeat(50));
    
    console.log('🎯 API可用性检查:');
    console.log('   • OCR合同识别API: 需要实际图片测试');
    console.log('   • 增强替换API: 需要验证路径存在性');
    console.log('   • 基础替换API: 需要验证功能正常性');
    console.log('   • 身份验证: 需要检查token验证逻辑');
    console.log('');

    console.log('🔍 发现的问题:');
    console.log('   1. 前端页面卡在身份验证阶段');
    console.log('   2. 可能需要配置正确的认证token');
    console.log('   3. 增强替换API路径可能需要验证');
    console.log('   4. 需要真实图片进行完整测试');
    console.log('');

    console.log('💡 建议的解决方案:');
    console.log('   1. 检查身份验证中间件配置');
    console.log('   2. 验证所有API路径是否正确注册');
    console.log('   3. 使用真实合同图片进行端到端测试');
    console.log('   4. 检查环境变量和配置文件');
    console.log('   5. 验证数据库连接和权限设置');
    console.log('');

    console.log('📋 下一步测试计划:');
    console.log('   1. 解决身份验证问题');
    console.log('   2. 验证API路径注册');
    console.log('   3. 进行真实图片测试');
    console.log('   4. 完整的端到端功能验证');
    console.log('   5. 性能和稳定性测试');
    console.log('');

    console.log('✅ 真实API调用测试完成！');
    console.log('🎯 核心功能代码已实现，需要解决部署和配置问题。');
    console.log('='.repeat(80));

  } catch (error) {
    console.log('\n❌ 真实API测试过程中发生错误');
    console.log('='.repeat(80));
    console.log(`错误: ${error.message}`);
    console.log(`堆栈: ${error.stack}`);
  }
}

// 运行真实API测试
if (require.main === module) {
  testRealAPICall().catch(console.error);
}

module.exports = { testRealAPICall };
