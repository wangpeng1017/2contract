#!/usr/bin/env node

/**
 * Word模板占位符缓存问题分析工具
 * 专门解决模板修改后系统仍显示旧占位符的问题
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const crypto = require('crypto');

async function analyzeWordTemplate() {
    const templatePath = path.join(__dirname, '上游车源-广州舶源（采购）.docx');
    
    console.log('🔍 Word模板占位符缓存问题诊断');
    console.log('=' .repeat(60));
    console.log(`📄 分析文件: ${templatePath}`);
    
    if (!fs.existsSync(templatePath)) {
        console.log(`❌ 文件不存在: ${templatePath}`);
        return;
    }
    
    try {
        // 1. 分析文件基本信息
        await analyzeFileInfo(templatePath);
        
        // 2. 提取并分析当前占位符
        const currentPlaceholders = await extractCurrentPlaceholders(templatePath);
        
        // 3. 检查可能的缓存问题
        checkCacheIssues(templatePath, currentPlaceholders);
        
        // 4. 提供解决方案
        provideSolutions(templatePath, currentPlaceholders);
        
    } catch (error) {
        console.error('❌ 分析失败:', error.message);
    }
}

async function analyzeFileInfo(templatePath) {
    console.log(`\n📊 文件基本信息:`);
    
    // 文件大小和修改时间
    const stats = fs.statSync(templatePath);
    const fileSize = stats.size;
    const modifiedTime = stats.mtime.toLocaleString();
    
    console.log(`  文件大小: ${fileSize.toLocaleString()} 字节`);
    console.log(`  最后修改: ${modifiedTime}`);
    
    // 计算文件哈希
    const fileHash = calculateFileHash(templatePath);
    console.log(`  文件哈希: ${fileHash}`);
    
    // 检查是否是有效的docx文件
    try {
        const buffer = fs.readFileSync(templatePath);
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(buffer);
        
        const fileList = Object.keys(zipContent.files);
        const hasDocumentXml = fileList.includes('word/document.xml');
        
        console.log(`  文档结构: ${hasDocumentXml ? '✅ 有效' : '❌ 无效'}`);
        console.log(`  内部文件数: ${fileList.length}`);
        
        if (hasDocumentXml) {
            console.log(`  关键文件:`);
            console.log(`    - word/document.xml: ✅`);
            console.log(`    - word/styles.xml: ${fileList.includes('word/styles.xml') ? '✅' : '❌'}`);
            console.log(`    - word/settings.xml: ${fileList.includes('word/settings.xml') ? '✅' : '❌'}`);
        }
        
    } catch (error) {
        console.log(`  文档结构: ❌ 损坏 (${error.message})`);
    }
}

function calculateFileHash(filePath) {
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    return hash.substring(0, 16); // 取前16位作为短哈希
}

async function extractCurrentPlaceholders(templatePath) {
    console.log(`\n🎯 当前模板占位符分析:`);
    
    const placeholders = [];
    
    try {
        const buffer = fs.readFileSync(templatePath);
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(buffer);
        
        // 读取document.xml
        const documentXmlFile = zipContent.file('word/document.xml');
        if (!documentXmlFile) {
            throw new Error('无法找到document.xml文件');
        }
        
        const xmlContent = await documentXmlFile.async('text');
        console.log(`  XML长度: ${xmlContent.length.toLocaleString()} 字符`);
        
        // 提取所有文本内容
        const textElements = extractTextElements(xmlContent);
        const allText = textElements.join(' ');
        
        console.log(`  文本元素: ${textElements.length} 个`);
        console.log(`  合并文本长度: ${allText.length.toLocaleString()} 字符`);
        
        // 查找各种格式的占位符
        const placeholderPatterns = [
            { name: '双花括号 {{}}', regex: /\{\{([^}]+)\}\}/g },
            { name: '单花括号 {}', regex: /\{([^{}]+)\}/g },
            { name: '方括号 []', regex: /\[([^\]]+)\]/g },
        ];
        
        const allPlaceholders = [];
        
        for (const pattern of placeholderPatterns) {
            const matches = [...allText.matchAll(pattern.regex)];
            if (matches.length > 0) {
                console.log(`  ${pattern.name}: ${matches.length} 个`);
                for (let i = 0; i < Math.min(matches.length, 10); i++) {
                    const match = matches[i][1].trim();
                    console.log(`    - ${match}`);
                    allPlaceholders.push(match);
                }
                if (matches.length > 10) {
                    console.log(`    ... 还有 ${matches.length - 10} 个`);
                }
            }
        }
        
        // 检查分割占位符
        const fragmentedPlaceholders = findFragmentedPlaceholders(xmlContent);
        if (fragmentedPlaceholders.length > 0) {
            console.log(`  分割占位符: ${fragmentedPlaceholders.length} 个`);
            for (let i = 0; i < Math.min(fragmentedPlaceholders.length, 5); i++) {
                console.log(`    - ${fragmentedPlaceholders[i]}`);
            }
            allPlaceholders.push(...fragmentedPlaceholders);
        }
        
        const uniquePlaceholders = [...new Set(allPlaceholders)];
        console.log(`\n  📊 总计唯一占位符: ${uniquePlaceholders.length} 个`);
        
        // 显示所有唯一占位符
        if (uniquePlaceholders.length > 0) {
            console.log(`\n  📋 完整占位符列表:`);
            uniquePlaceholders.forEach((placeholder, index) => {
                console.log(`    ${index + 1}. ${placeholder}`);
            });
        }
        
        return uniquePlaceholders;
        
    } catch (error) {
        console.log(`  ❌ 占位符提取失败: ${error.message}`);
        return [];
    }
}

function extractTextElements(xmlContent) {
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    return textMatches.map(match => {
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return textMatch ? textMatch[1] : '';
    }).filter(text => text.length > 0);
}

function findFragmentedPlaceholders(xmlContent) {
    const fragmented = [];
    
    // 查找可能被分割的占位符模式
    const runPattern = /<w:r[^>]*>.*?<\/w:r>/g;
    const runs = xmlContent.match(runPattern) || [];
    
    // 检查连续的runs是否形成完整的占位符
    for (let i = 0; i < runs.length - 1; i++) {
        const currentRun = runs[i];
        const nextRuns = runs.slice(i + 1, Math.min(i + 5, runs.length));
        
        const currentText = extractTextFromRun(currentRun);
        
        if (currentText.includes('{') && !currentText.includes('}')) {
            let combinedText = currentText;
            
            for (const nextRun of nextRuns) {
                const nextText = extractTextFromRun(nextRun);
                combinedText += nextText;
                
                if (nextText.includes('}')) {
                    const placeholderMatch = combinedText.match(/\{([^{}]+)\}/);
                    if (placeholderMatch) {
                        fragmented.push(placeholderMatch[1].trim());
                    }
                    break;
                }
            }
        }
    }
    
    return [...new Set(fragmented)];
}

function extractTextFromRun(runXml) {
    const textMatches = runXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    return textMatches.map(match => {
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return textMatch ? textMatch[1] : '';
    }).join('');
}

function checkCacheIssues(templatePath, currentPlaceholders) {
    console.log(`\n🔍 缓存问题检查:`);
    
    // 1. 检查浏览器可能的缓存
    console.log(`  🌐 浏览器缓存检查:`);
    console.log(`    - 文件名相同可能导致浏览器缓存`);
    console.log(`    - 建议: 清除浏览器缓存或重命名文件`);
    
    // 2. 检查系统临时文件
    const tempDir = require('os').tmpdir();
    console.log(`  📁 系统临时文件检查:`);
    console.log(`    - 临时目录: ${tempDir}`);
    
    try {
        const tempFiles = fs.readdirSync(tempDir).filter(file => 
            file.toLowerCase().includes('docx') || file.includes('上游车源')
        );
        
        if (tempFiles.length > 0) {
            console.log(`    - 发现 ${tempFiles.length} 个可能相关的临时文件`);
            tempFiles.slice(0, 5).forEach(file => {
                console.log(`      • ${file}`);
            });
        } else {
            console.log(`    - 未发现相关临时文件`);
        }
    } catch (error) {
        console.log(`    - 无法访问临时目录: ${error.message}`);
    }
    
    // 3. 检查文件锁定状态
    console.log(`  🔒 文件状态检查:`);
    try {
        fs.accessSync(templatePath, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`    - 文件状态: ✅ 可读写`);
    } catch (error) {
        console.log(`    - 文件状态: ⚠️ 权限问题 (${error.message})`);
    }
}

function provideSolutions(templatePath, currentPlaceholders) {
    console.log(`\n💡 解决方案:`);
    
    console.log(`  🔧 立即解决方案:`);
    console.log(`    1. 清除浏览器缓存:`);
    console.log(`       - 按 Ctrl+Shift+Delete 清除浏览器缓存`);
    console.log(`       - 或使用无痕模式重新访问系统`);
    
    console.log(`    2. 重命名文件:`);
    const newFilename = generateNewFilename(templatePath);
    console.log(`       - 将文件重命名为: ${newFilename}`);
    console.log(`       - 然后重新上传到系统`);
    
    console.log(`    3. 强制刷新:`);
    console.log(`       - 在上传页面按 Ctrl+F5 强制刷新`);
    console.log(`       - 确保页面完全重新加载`);
    
    console.log(`  🛠️  高级解决方案:`);
    console.log(`    4. 使用缓存修复工具:`);
    console.log(`       - 访问: http://localhost:3000/template-cache-fix`);
    console.log(`       - 使用强制重新解析功能`);
    
    console.log(`    5. 创建新副本:`);
    const backupPath = createBackupCopy(templatePath);
    if (backupPath) {
        console.log(`       - 已创建备份副本: ${backupPath}`);
        console.log(`       - 使用备份副本重新上传`);
    }
    
    console.log(`    6. 系统调试:`);
    console.log(`       - 访问系统的 /debug-generation 页面`);
    console.log(`       - 使用诊断工具检查占位符识别`);
}

function generateNewFilename(originalPath) {
    const parsed = path.parse(originalPath);
    const timestamp = Date.now();
    return `${parsed.name}_修正版_${timestamp}${parsed.ext}`;
}

function createBackupCopy(originalPath) {
    try {
        const parsed = path.parse(originalPath);
        const newFilename = generateNewFilename(originalPath);
        const backupPath = path.join(parsed.dir, newFilename);
        
        fs.copyFileSync(originalPath, backupPath);
        return backupPath;
    } catch (error) {
        console.log(`    ❌ 创建备份失败: ${error.message}`);
        return null;
    }
}

// 生成浏览器缓存清理脚本
function generateCacheCleanupScript() {
    console.log(`\n📝 生成缓存清理脚本:`);
    
    const cleanupScript = `
// 浏览器控制台缓存清理脚本
// 在浏览器开发者工具的控制台中运行

console.log('🧹 开始清理Word模板相关缓存...');

// 1. 清理localStorage中的模板缓存
const templateKeys = Object.keys(localStorage).filter(key => 
    key.includes('template') || key.includes('placeholder') || key.includes('word')
);

templateKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(\`✅ 已清理: \${key}\`);
});

// 2. 清理sessionStorage
const sessionKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('template') || key.includes('placeholder') || key.includes('word')
);

sessionKeys.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(\`✅ 已清理: \${key}\`);
});

// 3. 清理可能的缓存API
if ('caches' in window) {
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            if (cacheName.includes('template') || cacheName.includes('word')) {
                caches.delete(cacheName);
                console.log(\`✅ 已清理缓存: \${cacheName}\`);
            }
        });
    });
}

console.log('🎉 缓存清理完成！请刷新页面并重新上传模板。');
`;
    
    const scriptPath = path.join(__dirname, 'browser_cache_cleanup.js');
    fs.writeFileSync(scriptPath, cleanupScript, 'utf8');
    
    console.log(`  ✅ 已生成: ${scriptPath}`);
    console.log(`  📋 使用方法:`);
    console.log(`    1. 在浏览器中按 F12 打开开发者工具`);
    console.log(`    2. 切换到 Console 标签`);
    console.log(`    3. 复制并粘贴脚本内容`);
    console.log(`    4. 按 Enter 执行`);
}

async function main() {
    console.log('🔧 Word模板占位符缓存问题解决工具');
    console.log('专门解决模板修改后系统仍显示旧占位符的问题');
    console.log('=' .repeat(80));
    
    // 执行诊断
    await analyzeWordTemplate();
    
    // 生成清理脚本
    generateCacheCleanupScript();
    
    console.log(`\n🎯 总结建议:`);
    console.log(`  1. 首先尝试清除浏览器缓存并重新上传`);
    console.log(`  2. 如果问题持续，重命名文件后再上传`);
    console.log(`  3. 使用生成的清理脚本清除所有相关缓存`);
    console.log(`  4. 访问 /template-cache-fix 页面使用专门的修复工具`);
    console.log(`  5. 如果仍有问题，可能需要检查Word文档的实际内容`);
    
    console.log(`\n✅ 诊断完成`);
}

// 检查是否有jszip依赖
try {
    require('jszip');
    main().catch(console.error);
} catch (error) {
    console.log('❌ 缺少jszip依赖，请先安装:');
    console.log('npm install jszip');
}
