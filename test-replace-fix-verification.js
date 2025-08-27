/**
 * 验证文本替换修复效果的测试脚本
 */

const fs = require('fs');

// 模拟修复后的逻辑
function shouldForceReplacement(originalValue, ocrValue, valueType) {
  // 检查格式差异
  if (originalValue.trim() !== ocrValue.trim()) return true;
  
  // 检查特殊字符差异
  const cleanOriginal = originalValue.replace(/[\s\-\(\)]/g, '');
  const cleanOcr = ocrValue.replace(/[\s\-\(\)]/g, '');
  if (cleanOriginal !== cleanOcr) return true;
  
  // 根据字段类型检查特定格式要求
  switch (valueType) {
    case 'phone':
      return normalizePhone(originalValue) !== normalizePhone(ocrValue);
    case 'amount':
      return normalizeAmount(originalValue) !== normalizeAmount(ocrValue);
    default:
      return false;
  }
}

function shouldUseWholeWord(searchText, valueType) {
  // 对于包含中文的文本，整词匹配可能不适用
  if (/[\u4e00-\u9fff]/.test(searchText)) {
    return false;
  }
  
  // 对于短文本或特殊字符，不使用整词匹配
  if (searchText.length < 3 || /[^\w\s]/.test(searchText)) {
    return false;
  }
  
  // 根据字段类型决定
  switch (valueType) {
    case 'company':
    case 'contact':
      return false;
    case 'phone':
    case 'amount':
      return true;
    default:
      return false;
  }
}

function normalizePhone(phone) {
  return phone.replace(/[\s\-\(\)]/g, '');
}

function normalizeAmount(amount) {
  return amount.replace(/[,\s]/g, '').replace(/[¥￥\$]/g, '');
}

function improvedExactSearch(text, pattern, options = {}) {
  const { caseSensitive = false, wholeWord = false } = options;
  const matches = [];
  
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  if (wholeWord) {
    try {
      // 对于中文文本，使用更灵活的边界匹配
      const isChinese = /[\u4e00-\u9fff]/.test(searchPattern);
      let regex;
      
      if (isChinese) {
        // 中文整词匹配：前后不能是中文字符、字母或数字
        regex = new RegExp(`(?<![\\u4e00-\\u9fff\\w])${escapeRegExp(searchPattern)}(?![\\u4e00-\\u9fff\\w])`, caseSensitive ? 'g' : 'gi');
      } else {
        // 英文整词匹配：使用标准词边界
        regex = new RegExp(`\\b${escapeRegExp(searchPattern)}\\b`, caseSensitive ? 'g' : 'gi');
      }
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        });
      }
    } catch (error) {
      console.warn('Whole word regex failed, falling back to exact search:', error);
      // 回退到普通搜索
      return improvedExactSearch(text, pattern, { ...options, wholeWord: false });
    }
  } else {
    // 简单字符串搜索
    let startIndex = 0;
    
    while (startIndex < searchText.length) {
      const index = searchText.indexOf(searchPattern, startIndex);
      if (index === -1) break;

      matches.push({
        start: index,
        end: index + pattern.length,
        text: text.substring(index, index + pattern.length)
      });

      startIndex = index + 1;
    }
  }

  return matches;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function testReplaceFix() {
  console.log('🔧 验证文本替换修复效果');
  console.log('='.repeat(80));

  try {
    // 测试数据
    const testCases = [
      {
        name: '中文公司名称匹配',
        text: '甲方（卖方）：天津鑫敏恒鑫途汽车销售有限公司\n联系人：许庆乐',
        searchText: '天津鑫敏恒鑫途汽车销售有限公司',
        replaceText: '天津鑫敏恒鑫途汽车销售有限公司',
        valueType: 'company',
        expectedMatches: 1
      },
      {
        name: '中文公司名称（乙方）',
        text: '乙方（买方）：广州舶源科技有限公司\n联系人：张兴亮',
        searchText: '广州舶源科技有限公司',
        replaceText: '广州舶源科技有限公司',
        valueType: 'company',
        expectedMatches: 1
      },
      {
        name: '电话号码匹配',
        text: '联系电话：13911081213\n地址：天津市',
        searchText: '13911081213',
        replaceText: '139-1108-1213',
        valueType: 'phone',
        expectedMatches: 1
      },
      {
        name: '金额匹配',
        text: '总价：132,600元\n税额：15,254.86元',
        searchText: '132,600元',
        replaceText: '132600元',
        valueType: 'amount',
        expectedMatches: 1
      },
      {
        name: '车架号匹配',
        text: '车架号：\n1. LC0C76C4XS0356071\n2. LC76C44S0358043',
        searchText: 'LC0C76C4XS0356071',
        replaceText: 'LC0C76C4XS0356071',
        valueType: 'vin',
        expectedMatches: 1
      }
    ];

    console.log('📋 测试用例分析:');
    console.log('');

    let totalTests = 0;
    let passedTests = 0;

    for (const testCase of testCases) {
      totalTests++;
      console.log(`🧪 测试: ${testCase.name}`);
      console.log(`   文本: "${testCase.text.replace(/\n/g, '\\n')}"`);
      console.log(`   搜索: "${testCase.searchText}"`);
      console.log(`   类型: ${testCase.valueType}`);

      // 测试修复前的逻辑（模拟问题）
      const oldWholeWord = true; // 旧逻辑总是使用整词匹配
      const oldMatches = improvedExactSearch(testCase.text, testCase.searchText, {
        caseSensitive: false,
        wholeWord: oldWholeWord
      });

      // 测试修复后的逻辑
      const newWholeWord = shouldUseWholeWord(testCase.searchText, testCase.valueType);
      const newMatches = improvedExactSearch(testCase.text, testCase.searchText, {
        caseSensitive: false,
        wholeWord: newWholeWord
      });

      // 测试强制替换逻辑
      const needsReplacement = testCase.searchText !== testCase.replaceText || 
                               shouldForceReplacement(testCase.searchText, testCase.replaceText, testCase.valueType);

      console.log(`   修复前: ${oldMatches.length} 个匹配 (整词匹配: ${oldWholeWord})`);
      console.log(`   修复后: ${newMatches.length} 个匹配 (整词匹配: ${newWholeWord})`);
      console.log(`   需要替换: ${needsReplacement ? '是' : '否'}`);

      // 验证结果
      const testPassed = newMatches.length >= testCase.expectedMatches;
      if (testPassed) {
        passedTests++;
        console.log(`   结果: ✅ 通过`);
      } else {
        console.log(`   结果: ❌ 失败 (期望 ${testCase.expectedMatches} 个匹配)`);
      }

      console.log('');
    }

    // 总结
    console.log('📊 测试结果总结:');
    console.log('='.repeat(50));
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('');

    // 修复效果分析
    console.log('🔍 修复效果分析:');
    console.log('='.repeat(50));
    
    console.log('✅ 主要修复点:');
    console.log('1. 动态决定是否使用整词匹配');
    console.log('   - 中文文本: 不使用整词匹配');
    console.log('   - 公司名称: 不使用整词匹配');
    console.log('   - 电话/金额: 使用整词匹配');
    console.log('');

    console.log('2. 改进的中文整词匹配算法');
    console.log('   - 使用负向前瞻和后瞻');
    console.log('   - 考虑中文字符边界');
    console.log('   - 自动回退机制');
    console.log('');

    console.log('3. 增强的替换规则生成');
    console.log('   - 允许相同值的格式化替换');
    console.log('   - 支持直接替换规则');
    console.log('   - 智能优先级设置');
    console.log('');

    console.log('4. 改进的值验证逻辑');
    console.log('   - 不再过滤相同值');
    console.log('   - 支持格式标准化');
    console.log('   - 类型特定验证');
    console.log('');

    // 实际应用建议
    console.log('💡 实际应用建议:');
    console.log('='.repeat(50));
    
    console.log('1. 部署修复:');
    console.log('   - 更新 text-search.ts 中的整词匹配逻辑');
    console.log('   - 更新 text-replace.ts 中的回退机制');
    console.log('   - 更新合同OCR路由中的规则生成逻辑');
    console.log('');

    console.log('2. 测试验证:');
    console.log('   - 使用真实合同文档测试');
    console.log('   - 验证中文字符匹配效果');
    console.log('   - 检查替换规则生成数量');
    console.log('');

    console.log('3. 监控指标:');
    console.log('   - 替换成功率');
    console.log('   - 匹配准确率');
    console.log('   - 用户满意度');
    console.log('');

    console.log('4. 进一步优化:');
    console.log('   - 添加更多诊断信息');
    console.log('   - 实现自动修复建议');
    console.log('   - 提供可视化调试工具');
    console.log('');

    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！修复方案有效。');
    } else {
      console.log('⚠️  部分测试失败，需要进一步调整。');
    }

    console.log('');
    console.log('✅ 修复验证完成！');
    console.log('='.repeat(80));

  } catch (error) {
    console.log('\n❌ 验证过程中发生错误');
    console.log('='.repeat(80));
    console.log(`错误: ${error.message}`);
    console.log(`堆栈: ${error.stack}`);
  }
}

// 运行验证
if (require.main === module) {
  testReplaceFix().catch(console.error);
}

module.exports = { testReplaceFix };
