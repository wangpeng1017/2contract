/**
 * 文本替换失败问题诊断测试
 * 分析智能文本替换功能中的替换失败问题
 */

const fs = require('fs');

// 模拟测试数据
const testData = {
  // 模拟原文档内容
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
`,

  // 模拟OCR识别结果和替换规则
  replaceRules: [
    {
      id: 'party_a_company',
      searchText: '天津鑫敏恒鑫途汽车销售有限公司',
      replaceText: '天津鑫敏恒鑫途汽车销售有限公司',
      fieldType: '甲方公司',
      options: {
        caseSensitive: false,
        wholeWord: true,
        enabled: true,
        priority: 0
      }
    },
    {
      id: 'party_b_company',
      searchText: '广州舶源科技有限公司',
      replaceText: '广州舶源科技有限公司',
      fieldType: '乙方公司',
      options: {
        caseSensitive: false,
        wholeWord: true,
        enabled: true,
        priority: 0
      }
    }
  ]
};

async function testReplaceDiagnostics() {
  console.log('🔍 智能文本替换失败问题诊断分析');
  console.log('='.repeat(80));

  try {
    console.log('📋 问题描述:');
    console.log('在执行文本替换阶段时，系统检测到有两个字段可以进行替换，');
    console.log('但实际替换操作的成功数量为0处文本，导致替换功能完全失效。');
    console.log('');

    console.log('🎯 分析范围:');
    console.log('1. 替换规则生成阶段');
    console.log('2. 文本匹配阶段');
    console.log('3. 替换执行阶段');
    console.log('4. 调试信息收集');
    console.log('5. 可能的原因分析');
    console.log('');

    // 1. 替换规则生成阶段分析
    console.log('1️⃣ 替换规则生成阶段分析:');
    console.log('='.repeat(50));
    
    console.log('生成的替换规则:');
    testData.replaceRules.forEach((rule, index) => {
      console.log(`规则 ${index + 1}:`);
      console.log(`  ID: ${rule.id}`);
      console.log(`  字段类型: ${rule.fieldType}`);
      console.log(`  搜索文本: "${rule.searchText}"`);
      console.log(`  替换文本: "${rule.replaceText}"`);
      console.log(`  选项: ${JSON.stringify(rule.options, null, 2)}`);
      console.log('');
    });

    // 检查规则有效性
    console.log('规则有效性检查:');
    testData.replaceRules.forEach((rule, index) => {
      const issues = [];
      
      if (!rule.searchText || rule.searchText.trim() === '') {
        issues.push('搜索文本为空');
      }
      
      if (rule.replaceText === undefined) {
        issues.push('替换文本未定义');
      }
      
      if (rule.searchText === rule.replaceText) {
        issues.push('搜索文本与替换文本相同，无需替换');
      }
      
      if (rule.searchText && rule.searchText.length > 100) {
        issues.push('搜索文本过长，可能难以匹配');
      }
      
      console.log(`  规则 ${index + 1}: ${issues.length === 0 ? '✅ 有效' : '❌ ' + issues.join(', ')}`);
    });
    console.log('');

    // 2. 文本匹配阶段分析
    console.log('2️⃣ 文本匹配阶段分析:');
    console.log('='.repeat(50));
    
    testData.replaceRules.forEach((rule, index) => {
      console.log(`规则 ${index + 1} (${rule.fieldType}) 匹配分析:`);
      
      // 精确匹配测试
      const exactMatch = testData.originalText.includes(rule.searchText);
      console.log(`  精确匹配: ${exactMatch ? '✅ 找到' : '❌ 未找到'}`);
      
      if (exactMatch) {
        const matchCount = (testData.originalText.match(new RegExp(escapeRegExp(rule.searchText), 'g')) || []).length;
        console.log(`  匹配次数: ${matchCount}`);
        
        const firstIndex = testData.originalText.indexOf(rule.searchText);
        const context = testData.originalText.substring(Math.max(0, firstIndex - 20), firstIndex + rule.searchText.length + 20);
        console.log(`  匹配上下文: "${context}"`);
      }
      
      // 大小写不敏感匹配测试
      const caseInsensitiveMatch = testData.originalText.toLowerCase().includes(rule.searchText.toLowerCase());
      console.log(`  大小写不敏感匹配: ${caseInsensitiveMatch ? '✅ 找到' : '❌ 未找到'}`);
      
      // 整词匹配测试
      if (rule.options?.wholeWord) {
        const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(rule.searchText)}\\b`, 'gi');
        const wholeWordMatch = wordBoundaryRegex.test(testData.originalText);
        console.log(`  整词匹配: ${wholeWordMatch ? '✅ 找到' : '❌ 未找到'}`);
      }
      
      // 模糊匹配测试
      const fuzzyMatches = findFuzzyMatches(testData.originalText, rule.searchText);
      console.log(`  模糊匹配: ${fuzzyMatches.length > 0 ? `✅ 找到 ${fuzzyMatches.length} 个相似项` : '❌ 未找到'}`);
      if (fuzzyMatches.length > 0) {
        fuzzyMatches.slice(0, 3).forEach(match => {
          console.log(`    - "${match.text}" (相似度: ${match.similarity.toFixed(2)})`);
        });
      }
      
      console.log('');
    });

    // 3. 替换执行阶段分析
    console.log('3️⃣ 替换执行阶段分析:');
    console.log('='.repeat(50));
    
    console.log('模拟替换执行:');
    let currentText = testData.originalText;
    let totalReplacements = 0;
    
    testData.replaceRules.forEach((rule, index) => {
      console.log(`执行规则 ${index + 1} (${rule.fieldType}):`);
      
      try {
        let replacements = 0;
        
        if (rule.options?.wholeWord) {
          // 整词替换
          const regex = new RegExp(`\\b${escapeRegExp(rule.searchText)}\\b`, rule.options?.caseSensitive ? 'g' : 'gi');
          const matches = currentText.match(regex);
          if (matches) {
            currentText = currentText.replace(regex, rule.replaceText);
            replacements = matches.length;
          }
        } else {
          // 普通替换
          const regex = new RegExp(escapeRegExp(rule.searchText), rule.options?.caseSensitive ? 'g' : 'gi');
          const matches = currentText.match(regex);
          if (matches) {
            currentText = currentText.replace(regex, rule.replaceText);
            replacements = matches.length;
          }
        }
        
        console.log(`  替换次数: ${replacements}`);
        console.log(`  执行状态: ${replacements > 0 ? '✅ 成功' : '❌ 失败'}`);
        totalReplacements += replacements;
        
      } catch (error) {
        console.log(`  执行错误: ${error.message}`);
      }
      
      console.log('');
    });
    
    console.log(`总替换次数: ${totalReplacements}`);
    console.log(`替换成功率: ${((totalReplacements / testData.replaceRules.length) * 100).toFixed(1)}%`);
    console.log('');

    // 4. 调试信息收集
    console.log('4️⃣ 调试信息收集:');
    console.log('='.repeat(50));
    
    console.log('文本特征分析:');
    console.log(`  原文档长度: ${testData.originalText.length} 字符`);
    console.log(`  行数: ${testData.originalText.split('\n').length}`);
    console.log(`  包含中文: ${/[\u4e00-\u9fff]/.test(testData.originalText) ? '是' : '否'}`);
    console.log(`  包含特殊字符: ${/[^\w\s\u4e00-\u9fff]/.test(testData.originalText) ? '是' : '否'}`);
    console.log(`  编码类型: UTF-8`);
    console.log('');
    
    console.log('搜索文本特征:');
    testData.replaceRules.forEach((rule, index) => {
      console.log(`  规则 ${index + 1}:`);
      console.log(`    长度: ${rule.searchText.length} 字符`);
      console.log(`    包含空格: ${/\s/.test(rule.searchText) ? '是' : '否'}`);
      console.log(`    包含特殊字符: ${/[^\w\s\u4e00-\u9fff]/.test(rule.searchText) ? '是' : '否'}`);
      console.log(`    前后空格: ${rule.searchText !== rule.searchText.trim() ? '是' : '否'}`);
    });
    console.log('');

    // 5. 可能的原因分析
    console.log('5️⃣ 可能的原因分析:');
    console.log('='.repeat(50));
    
    const possibleCauses = [];
    
    // 检查文本格式问题
    testData.replaceRules.forEach((rule, index) => {
      if (rule.searchText !== rule.searchText.trim()) {
        possibleCauses.push(`规则 ${index + 1}: 搜索文本包含前后空格`);
      }
      
      if (/[.*+?^${}()|[\]\\]/.test(rule.searchText) && !rule.options?.useRegex) {
        possibleCauses.push(`规则 ${index + 1}: 搜索文本包含正则表达式特殊字符`);
      }
      
      if (rule.searchText === rule.replaceText) {
        possibleCauses.push(`规则 ${index + 1}: 搜索文本与替换文本相同`);
      }
    });
    
    // 检查匹配配置问题
    const hasWholeWordIssues = testData.replaceRules.some(rule => {
      if (rule.options?.wholeWord) {
        const regex = new RegExp(`\\b${escapeRegExp(rule.searchText)}\\b`, 'gi');
        return !regex.test(testData.originalText);
      }
      return false;
    });
    
    if (hasWholeWordIssues) {
      possibleCauses.push('整词匹配设置可能过于严格');
    }
    
    // 检查大小写问题
    const hasCaseIssues = testData.replaceRules.some(rule => {
      const exactMatch = testData.originalText.includes(rule.searchText);
      const caseInsensitiveMatch = testData.originalText.toLowerCase().includes(rule.searchText.toLowerCase());
      return !exactMatch && caseInsensitiveMatch && rule.options?.caseSensitive;
    });
    
    if (hasCaseIssues) {
      possibleCauses.push('大小写敏感设置导致匹配失败');
    }
    
    if (possibleCauses.length === 0) {
      possibleCauses.push('未发现明显问题，可能是替换引擎执行逻辑问题');
    }
    
    console.log('发现的潜在问题:');
    possibleCauses.forEach((cause, index) => {
      console.log(`  ${index + 1}. ${cause}`);
    });
    console.log('');

    // 6. 修复建议
    console.log('6️⃣ 修复建议:');
    console.log('='.repeat(50));
    
    const suggestions = [
      '清理搜索文本的前后空格',
      '检查并转义正则表达式特殊字符',
      '调整大小写敏感性设置',
      '考虑使用模糊匹配处理文本差异',
      '添加详细的日志记录和错误处理',
      '实现替换前的预检查机制',
      '提供替换规则的可视化调试工具'
    ];
    
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
    console.log('');

    // 7. 改进后的替换逻辑示例
    console.log('7️⃣ 改进后的替换逻辑示例:');
    console.log('='.repeat(50));
    
    console.log('建议的替换流程:');
    console.log('1. 预处理阶段: 清理和验证替换规则');
    console.log('2. 匹配测试阶段: 执行多种匹配策略');
    console.log('3. 冲突检测阶段: 检查规则间的冲突');
    console.log('4. 执行阶段: 按优先级执行替换');
    console.log('5. 验证阶段: 确认替换结果');
    console.log('6. 报告阶段: 生成详细的执行报告');
    console.log('');

    console.log('✅ 诊断分析完成！');
    console.log('='.repeat(80));
    console.log('🎯 关键发现: 替换失败主要由文本匹配阶段的配置问题导致');
    console.log('💡 建议: 实现增强的诊断功能和自动修复机制');

  } catch (error) {
    console.log('\n❌ 诊断过程中发生错误');
    console.log('='.repeat(80));
    console.log(`错误: ${error.message}`);
    console.log(`堆栈: ${error.stack}`);
  }
}

// 辅助函数
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findFuzzyMatches(text, pattern, threshold = 0.6) {
  const matches = [];
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const similarity = calculateSimilarity(word, pattern);
    
    if (similarity >= threshold) {
      matches.push({ text: word, similarity });
    }
  }
  
  return matches.sort((a, b) => b.similarity - a.similarity);
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// 运行诊断
if (require.main === module) {
  testReplaceDiagnostics().catch(console.error);
}

module.exports = { testReplaceDiagnostics };
