#!/usr/bin/env node

/**
 * Word文档深度分析工具
 * 专门检查Word文档的实际内容，找出为什么系统识别到旧的占位符
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function deepAnalyzeWordDocument() {
    const templatePath = path.join(__dirname, '上游车源-广州舶源（采购）.docx');
    
    console.log('🔬 Word文档深度分析工具');
    console.log('=' .repeat(80));
    console.log(`📄 分析文件: ${templatePath}`);
    
    if (!fs.existsSync(templatePath)) {
        console.log(`❌ 文件不存在: ${templatePath}`);
        return;
    }
    
    try {
        const buffer = fs.readFileSync(templatePath);
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(buffer);
        
        // 获取document.xml内容
        const documentXmlFile = zipContent.file('word/document.xml');
        if (!documentXmlFile) {
            throw new Error('无法找到document.xml文件');
        }
        
        const xmlContent = await documentXmlFile.async('text');
        
        console.log(`\n📊 文档基本信息:`);
        console.log(`  XML长度: ${xmlContent.length.toLocaleString()} 字符`);
        
        // 1. 提取所有文本内容（原始方法）
        await analyzeRawTextContent(xmlContent);
        
        // 2. 分析文档结构
        await analyzeDocumentStructure(xmlContent);
        
        // 3. 查找所有可能的占位符位置
        await findAllPlaceholderLocations(xmlContent);
        
        // 4. 检查是否有隐藏或删除的内容
        await checkForHiddenContent(xmlContent);
        
        // 5. 分析修订历史
        await analyzeRevisionHistory(zipContent);
        
        // 6. 检查其他XML文件
        await checkOtherXmlFiles(zipContent);
        
        // 7. 生成详细报告
        await generateDetailedReport(xmlContent);
        
    } catch (error) {
        console.error('❌ 深度分析失败:', error.message);
    }
}

async function analyzeRawTextContent(xmlContent) {
    console.log(`\n🔤 原始文本内容分析:`);
    
    // 提取所有w:t标签中的文本
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const textElements = textMatches.map(match => {
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return textMatch ? textMatch[1] : '';
    });
    
    console.log(`  文本元素数量: ${textElements.length}`);
    
    // 合并所有文本
    const allText = textElements.join('');
    console.log(`  合并文本长度: ${allText.length} 字符`);
    
    // 查找可疑的公司名称和个人信息
    const suspiciousPatterns = [
        '天津鑫敏恒鑫途汽车销售有限公司',
        '广州舶源科技有限公司',
        '许庆乐',
        '张兴亮',
        '13911081213',
        '18380250208'
    ];
    
    console.log(`\n  🔍 检查可疑内容:`);
    suspiciousPatterns.forEach(pattern => {
        if (allText.includes(pattern)) {
            console.log(`    ❌ 发现旧内容: "${pattern}"`);
            
            // 找到这个内容在XML中的位置
            const xmlIndex = xmlContent.indexOf(pattern);
            if (xmlIndex !== -1) {
                const contextStart = Math.max(0, xmlIndex - 200);
                const contextEnd = Math.min(xmlContent.length, xmlIndex + pattern.length + 200);
                const context = xmlContent.substring(contextStart, contextEnd);
                console.log(`      XML上下文: ...${context}...`);
            }
        } else {
            console.log(`    ✅ 未发现: "${pattern}"`);
        }
    });
    
    // 查找期望的新占位符
    const expectedPlaceholders = [
        '甲方',
        '乙方', 
        '甲方联系人',
        '甲方联系电话',
        '乙方联系人',
        '乙方联系电话'
    ];
    
    console.log(`\n  🎯 检查期望的占位符:`);
    expectedPlaceholders.forEach(placeholder => {
        const bracketedForm = `{${placeholder}}`;
        if (allText.includes(bracketedForm)) {
            console.log(`    ✅ 发现期望占位符: "${bracketedForm}"`);
        } else if (allText.includes(placeholder)) {
            console.log(`    ⚠️ 发现文本但无括号: "${placeholder}"`);
        } else {
            console.log(`    ❌ 未发现: "${bracketedForm}"`);
        }
    });
}

async function analyzeDocumentStructure(xmlContent) {
    console.log(`\n🏗️ 文档结构分析:`);
    
    // 统计各种元素
    const stats = {
        paragraphs: (xmlContent.match(/<w:p[^>]*>/g) || []).length,
        runs: (xmlContent.match(/<w:r[^>]*>/g) || []).length,
        textElements: (xmlContent.match(/<w:t[^>]*>/g) || []).length,
        tables: (xmlContent.match(/<w:tbl[^>]*>/g) || []).length,
        rows: (xmlContent.match(/<w:tr[^>]*>/g) || []).length,
        cells: (xmlContent.match(/<w:tc[^>]*>/g) || []).length,
    };
    
    Object.entries(stats).forEach(([key, value]) => {
        console.log(`  ${key}: ${value} 个`);
    });
    
    // 检查是否有内容控件
    const contentControls = xmlContent.match(/<w:sdt[^>]*>.*?<\/w:sdt>/g) || [];
    console.log(`  内容控件: ${contentControls.length} 个`);
    
    if (contentControls.length > 0) {
        console.log(`  内容控件详情:`);
        contentControls.forEach((control, index) => {
            const tagMatch = control.match(/<w:tag w:val="([^"]*)"/);
            const aliasMatch = control.match(/<w:alias w:val="([^"]*)"/);
            
            console.log(`    控件 ${index + 1}:`);
            if (tagMatch) console.log(`      标签: ${tagMatch[1]}`);
            if (aliasMatch) console.log(`      别名: ${aliasMatch[1]}`);
        });
    }
}

async function findAllPlaceholderLocations(xmlContent) {
    console.log(`\n📍 占位符位置分析:`);
    
    // 查找所有可能的占位符格式
    const patterns = [
        { name: '双花括号', regex: /\{\{([^}]+)\}\}/g },
        { name: '单花括号', regex: /\{([^{}]+)\}/g },
        { name: '方括号', regex: /\[([^\]]+)\]/g },
    ];
    
    patterns.forEach(pattern => {
        console.log(`\n  ${pattern.name} 占位符:`);
        
        let match;
        let count = 0;
        const found = [];
        
        // 重置正则表达式
        pattern.regex.lastIndex = 0;
        
        while ((match = pattern.regex.exec(xmlContent)) !== null) {
            count++;
            const content = match[1].trim();
            found.push(content);
            
            if (count <= 10) { // 只显示前10个
                console.log(`    ${count}. "${content}"`);
                
                // 显示在XML中的位置上下文
                const position = match.index;
                const contextStart = Math.max(0, position - 100);
                const contextEnd = Math.min(xmlContent.length, position + match[0].length + 100);
                const context = xmlContent.substring(contextStart, contextEnd);
                console.log(`       上下文: ...${context.replace(/\n/g, ' ')}...`);
            }
        }
        
        if (count > 10) {
            console.log(`    ... 还有 ${count - 10} 个`);
        }
        
        console.log(`  总计: ${count} 个`);
        
        // 显示唯一值
        const unique = [...new Set(found)];
        if (unique.length !== count) {
            console.log(`  唯一值: ${unique.length} 个`);
            console.log(`  重复的占位符:`);
            unique.forEach(item => {
                const occurrences = found.filter(f => f === item).length;
                if (occurrences > 1) {
                    console.log(`    "${item}": ${occurrences} 次`);
                }
            });
        }
    });
}

async function checkForHiddenContent(xmlContent) {
    console.log(`\n🕵️ 隐藏内容检查:`);
    
    // 检查删除的文本
    const deletedText = xmlContent.match(/<w:delText[^>]*>([^<]*)<\/w:delText>/g) || [];
    if (deletedText.length > 0) {
        console.log(`  发现删除的文本: ${deletedText.length} 处`);
        deletedText.forEach((del, index) => {
            const text = del.replace(/<w:delText[^>]*>([^<]*)<\/w:delText>/, '$1');
            console.log(`    ${index + 1}. "${text}"`);
        });
    } else {
        console.log(`  ✅ 未发现删除的文本`);
    }
    
    // 检查隐藏的文本
    const hiddenText = xmlContent.match(/<w:vanish\/>/g) || [];
    if (hiddenText.length > 0) {
        console.log(`  发现隐藏文本标记: ${hiddenText.length} 处`);
    } else {
        console.log(`  ✅ 未发现隐藏文本`);
    }
    
    // 检查注释
    const comments = xmlContent.match(/<w:commentRangeStart[^>]*>.*?<w:commentRangeEnd[^>]*>/g) || [];
    if (comments.length > 0) {
        console.log(`  发现注释: ${comments.length} 处`);
    } else {
        console.log(`  ✅ 未发现注释`);
    }
}

async function analyzeRevisionHistory(zipContent) {
    console.log(`\n📝 修订历史分析:`);
    
    // 检查是否有修订历史文件
    const revisionFiles = Object.keys(zipContent.files).filter(name => 
        name.includes('revision') || name.includes('changes')
    );
    
    if (revisionFiles.length > 0) {
        console.log(`  发现修订文件: ${revisionFiles.length} 个`);
        revisionFiles.forEach(file => {
            console.log(`    - ${file}`);
        });
    } else {
        console.log(`  ✅ 未发现修订历史文件`);
    }
    
    // 检查document.xml中的修订标记
    const documentXml = await zipContent.file('word/document.xml')?.async('text');
    if (documentXml) {
        const revisionMarks = [
            /<w:ins[^>]*>/g,     // 插入
            /<w:del[^>]*>/g,     // 删除
            /<w:moveFrom[^>]*>/g, // 移动来源
            /<w:moveTo[^>]*>/g,   // 移动目标
        ];
        
        revisionMarks.forEach((pattern, index) => {
            const matches = documentXml.match(pattern) || [];
            const types = ['插入', '删除', '移动来源', '移动目标'];
            if (matches.length > 0) {
                console.log(`  发现${types[index]}标记: ${matches.length} 处`);
            }
        });
    }
}

async function checkOtherXmlFiles(zipContent) {
    console.log(`\n📁 其他XML文件检查:`);
    
    const xmlFiles = Object.keys(zipContent.files).filter(name => 
        name.endsWith('.xml') && name !== 'word/document.xml'
    );
    
    console.log(`  发现XML文件: ${xmlFiles.length} 个`);
    
    for (const fileName of xmlFiles) {
        if (fileName.includes('header') || fileName.includes('footer')) {
            console.log(`\n  检查 ${fileName}:`);
            
            try {
                const content = await zipContent.file(fileName)?.async('text');
                if (content) {
                    // 检查页眉页脚中是否有占位符
                    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
                    const allText = textMatches.map(match => {
                        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
                        return textMatch ? textMatch[1] : '';
                    }).join('');
                    
                    if (allText.trim()) {
                        console.log(`    文本内容: "${allText}"`);
                        
                        // 检查是否包含可疑内容
                        const suspiciousPatterns = [
                            '天津鑫敏恒鑫途', '广州舶源', '许庆乐', '张兴亮'
                        ];
                        
                        suspiciousPatterns.forEach(pattern => {
                            if (allText.includes(pattern)) {
                                console.log(`    ❌ 发现可疑内容: "${pattern}"`);
                            }
                        });
                    }
                }
            } catch (error) {
                console.log(`    ❌ 读取失败: ${error.message}`);
            }
        }
    }
}

async function generateDetailedReport(xmlContent) {
    console.log(`\n📋 详细分析报告:`);
    
    // 提取所有文本并分析
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const allText = textMatches.map(match => {
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return textMatch ? textMatch[1] : '';
    }).join(' ');
    
    // 生成完整的文本内容文件
    const reportPath = path.join(__dirname, 'word_document_full_text.txt');
    fs.writeFileSync(reportPath, allText, 'utf8');
    console.log(`  ✅ 完整文本已保存到: ${reportPath}`);
    
    // 生成XML结构文件
    const xmlPath = path.join(__dirname, 'word_document_structure.xml');
    fs.writeFileSync(xmlPath, xmlContent, 'utf8');
    console.log(`  ✅ XML结构已保存到: ${xmlPath}`);
    
    // 分析总结
    console.log(`\n🎯 分析总结:`);
    
    const issues = [];
    
    // 检查是否包含旧的公司信息
    const oldCompanyPatterns = [
        '天津鑫敏恒鑫途汽车销售有限公司',
        '广州舶源科技有限公司'
    ];
    
    oldCompanyPatterns.forEach(pattern => {
        if (allText.includes(pattern)) {
            issues.push(`文档中仍包含旧的公司名称: "${pattern}"`);
        }
    });
    
    // 检查是否包含旧的个人信息
    const oldPersonalInfo = ['许庆乐', '张兴亮', '13911081213', '18380250208'];
    oldPersonalInfo.forEach(info => {
        if (allText.includes(info)) {
            issues.push(`文档中仍包含旧的个人信息: "${info}"`);
        }
    });
    
    // 检查是否包含期望的占位符
    const expectedPlaceholders = ['甲方', '乙方', '甲方联系人', '甲方联系电话'];
    const missingPlaceholders = [];
    
    expectedPlaceholders.forEach(placeholder => {
        if (!allText.includes(`{${placeholder}}`)) {
            missingPlaceholders.push(placeholder);
        }
    });
    
    if (issues.length > 0) {
        console.log(`  ❌ 发现问题:`);
        issues.forEach((issue, index) => {
            console.log(`    ${index + 1}. ${issue}`);
        });
    } else {
        console.log(`  ✅ 未发现明显问题`);
    }
    
    if (missingPlaceholders.length > 0) {
        console.log(`  ⚠️ 缺失的占位符:`);
        missingPlaceholders.forEach(placeholder => {
            console.log(`    - {${placeholder}}`);
        });
    }
    
    console.log(`\n💡 建议:`);
    if (issues.length > 0) {
        console.log(`  1. Word文档确实包含旧内容，需要重新编辑`);
        console.log(`  2. 打开Word文档，使用查找替换功能清除所有旧内容`);
        console.log(`  3. 确保所有占位符都使用 {占位符名称} 格式`);
        console.log(`  4. 保存文档后重新上传到系统`);
    } else {
        console.log(`  1. 文档内容看起来正确，问题可能在系统解析逻辑`);
        console.log(`  2. 尝试使用强制重新解析功能`);
        console.log(`  3. 检查系统日志中的具体解析过程`);
    }
}

// 运行分析
deepAnalyzeWordDocument().catch(console.error);
