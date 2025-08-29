#!/usr/bin/env python3
"""
Word模板占位符缓存问题诊断和清理工具
专门解决模板修改后系统仍显示旧占位符的问题
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re
import tempfile
import hashlib
import json
from pathlib import Path
from typing import List, Dict, Any
import time

def analyze_word_template_cache_issue():
    """分析Word模板缓存问题"""
    
    template_path = r"E:\trae\0823合同3\上游车源-广州舶源（采购）.docx"
    
    print("🔍 Word模板占位符缓存问题诊断")
    print("=" * 60)
    print(f"📄 分析文件: {template_path}")
    
    if not os.path.exists(template_path):
        print(f"❌ 文件不存在: {template_path}")
        return
    
    # 1. 分析文件基本信息
    analyze_file_info(template_path)
    
    # 2. 提取并分析当前占位符
    current_placeholders = extract_current_placeholders(template_path)
    
    # 3. 检查可能的缓存问题
    check_cache_issues(template_path, current_placeholders)
    
    # 4. 提供解决方案
    provide_solutions(template_path, current_placeholders)

def analyze_file_info(template_path: str):
    """分析文件基本信息"""
    
    print(f"\n📊 文件基本信息:")
    
    # 文件大小和修改时间
    stat = os.stat(template_path)
    file_size = stat.st_size
    modified_time = time.ctime(stat.st_mtime)
    
    print(f"  文件大小: {file_size:,} 字节")
    print(f"  最后修改: {modified_time}")
    
    # 计算文件哈希
    file_hash = calculate_file_hash(template_path)
    print(f"  文件哈希: {file_hash}")
    
    # 检查是否是有效的docx文件
    try:
        with zipfile.ZipFile(template_path, 'r') as zip_ref:
            file_list = zip_ref.namelist()
            has_document_xml = 'word/document.xml' in file_list
            print(f"  文档结构: {'✅ 有效' if has_document_xml else '❌ 无效'}")
            print(f"  内部文件数: {len(file_list)}")
    except Exception as e:
        print(f"  文档结构: ❌ 损坏 ({e})")

def calculate_file_hash(file_path: str) -> str:
    """计算文件MD5哈希"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def extract_current_placeholders(template_path: str) -> List[str]:
    """提取当前模板中的占位符"""
    
    print(f"\n🎯 当前模板占位符分析:")
    
    placeholders = []
    
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # 解压docx文件
            with zipfile.ZipFile(template_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # 读取document.xml
            document_xml_path = os.path.join(temp_dir, 'word', 'document.xml')
            with open(document_xml_path, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            
            print(f"  XML长度: {len(xml_content):,} 字符")
            
            # 提取所有文本内容
            text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', xml_content)
            all_text = ' '.join(text_elements)
            
            print(f"  文本长度: {len(all_text):,} 字符")
            
            # 查找各种格式的占位符
            placeholder_patterns = [
                (r'\{\{([^}]+)\}\}', '双花括号 {{}}'),
                (r'\{([^{}]+)\}', '单花括号 {}'),
                (r'\[([^\]]+)\]', '方括号 []'),
            ]
            
            all_placeholders = []
            
            for pattern, description in placeholder_patterns:
                matches = re.findall(pattern, all_text)
                if matches:
                    print(f"  {description}: {len(matches)} 个")
                    for match in matches[:10]:  # 只显示前10个
                        print(f"    - {match}")
                        all_placeholders.append(match)
                    if len(matches) > 10:
                        print(f"    ... 还有 {len(matches) - 10} 个")
            
            # 检查分割占位符
            fragmented_placeholders = find_fragmented_placeholders(xml_content)
            if fragmented_placeholders:
                print(f"  分割占位符: {len(fragmented_placeholders)} 个")
                for placeholder in fragmented_placeholders[:5]:
                    print(f"    - {placeholder}")
                all_placeholders.extend(fragmented_placeholders)
            
            placeholders = list(set(all_placeholders))
            print(f"\n  📊 总计唯一占位符: {len(placeholders)} 个")
            
    except Exception as e:
        print(f"  ❌ 占位符提取失败: {e}")
    
    return placeholders

def find_fragmented_placeholders(xml_content: str) -> List[str]:
    """查找被分割的占位符"""
    
    fragmented = []
    
    # 查找可能的分割模式
    # 模式1: <w:t>{</w:t>...其他内容...<w:t>}</w:t>
    pattern1 = r'<w:t[^>]*>\{[^<]*</w:t>.*?<w:t[^>]*>[^}]*\}</w:t>'
    matches1 = re.findall(pattern1, xml_content, re.DOTALL)
    
    for match in matches1:
        # 提取文本内容
        text_parts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', match)
        combined_text = ''.join(text_parts)
        
        # 检查是否形成完整的占位符
        placeholder_match = re.search(r'\{([^{}]+)\}', combined_text)
        if placeholder_match:
            fragmented.append(placeholder_match.group(1))
    
    return list(set(fragmented))

def check_cache_issues(template_path: str, current_placeholders: List[str]):
    """检查可能的缓存问题"""
    
    print(f"\n🔍 缓存问题检查:")
    
    # 1. 检查浏览器可能的缓存
    print(f"  🌐 浏览器缓存检查:")
    print(f"    - 文件名相同可能导致浏览器缓存")
    print(f"    - 建议: 清除浏览器缓存或重命名文件")
    
    # 2. 检查系统临时文件
    temp_dir = tempfile.gettempdir()
    print(f"  📁 系统临时文件检查:")
    print(f"    - 临时目录: {temp_dir}")
    
    # 查找可能的临时文件
    temp_files = []
    try:
        for file in os.listdir(temp_dir):
            if 'docx' in file.lower() or '上游车源' in file:
                temp_files.append(file)
    except:
        pass
    
    if temp_files:
        print(f"    - 发现 {len(temp_files)} 个可能相关的临时文件")
        for temp_file in temp_files[:5]:
            print(f"      • {temp_file}")
    else:
        print(f"    - 未发现相关临时文件")
    
    # 3. 检查文件锁定状态
    print(f"  🔒 文件状态检查:")
    try:
        # 尝试以写模式打开文件
        with open(template_path, 'r+b') as f:
            print(f"    - 文件状态: ✅ 可读写")
    except PermissionError:
        print(f"    - 文件状态: ⚠️ 被锁定或只读")
    except Exception as e:
        print(f"    - 文件状态: ❌ 异常 ({e})")

def provide_solutions(template_path: str, current_placeholders: List[str]):
    """提供解决方案"""
    
    print(f"\n💡 解决方案:")
    
    print(f"  🔧 立即解决方案:")
    print(f"    1. 清除浏览器缓存:")
    print(f"       - 按 Ctrl+Shift+Delete 清除浏览器缓存")
    print(f"       - 或使用无痕模式重新访问系统")
    
    print(f"    2. 重命名文件:")
    new_filename = generate_new_filename(template_path)
    print(f"       - 将文件重命名为: {new_filename}")
    print(f"       - 然后重新上传到系统")
    
    print(f"    3. 强制刷新:")
    print(f"       - 在上传页面按 Ctrl+F5 强制刷新")
    print(f"       - 确保页面完全重新加载")
    
    print(f"  🛠️  高级解决方案:")
    print(f"    4. 验证文档修改:")
    print(f"       - 重新打开Word文档确认修改已保存")
    print(f"       - 检查占位符格式是否正确")
    
    print(f"    5. 创建新副本:")
    backup_path = create_backup_copy(template_path)
    if backup_path:
        print(f"       - 已创建备份副本: {backup_path}")
        print(f"       - 使用备份副本重新上传")
    
    print(f"    6. 系统调试:")
    print(f"       - 访问系统的 /debug-generation 页面")
    print(f"       - 使用诊断工具检查占位符识别")

def generate_new_filename(original_path: str) -> str:
    """生成新的文件名"""
    
    path_obj = Path(original_path)
    timestamp = int(time.time())
    new_name = f"{path_obj.stem}_修正版_{timestamp}{path_obj.suffix}"
    return new_name

def create_backup_copy(original_path: str) -> str:
    """创建备份副本"""
    
    try:
        path_obj = Path(original_path)
        backup_name = generate_new_filename(original_path)
        backup_path = path_obj.parent / backup_name
        
        # 复制文件
        import shutil
        shutil.copy2(original_path, backup_path)
        
        return str(backup_path)
    except Exception as e:
        print(f"    ❌ 创建备份失败: {e}")
        return ""

def generate_cache_cleanup_script():
    """生成缓存清理脚本"""
    
    print(f"\n📝 生成缓存清理脚本:")
    
    cleanup_script = """
// 浏览器控制台缓存清理脚本
// 在浏览器开发者工具的控制台中运行

console.log('🧹 开始清理Word模板相关缓存...');

// 1. 清理localStorage中的模板缓存
const templateKeys = Object.keys(localStorage).filter(key => 
    key.includes('template') || key.includes('placeholder') || key.includes('word')
);

templateKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ 已清理: ${key}`);
});

// 2. 清理sessionStorage
const sessionKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('template') || key.includes('placeholder') || key.includes('word')
);

sessionKeys.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ 已清理: ${key}`);
});

// 3. 清理可能的缓存API
if ('caches' in window) {
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            if (cacheName.includes('template') || cacheName.includes('word')) {
                caches.delete(cacheName);
                console.log(`✅ 已清理缓存: ${cacheName}`);
            }
        });
    });
}

console.log('🎉 缓存清理完成！请刷新页面并重新上传模板。');
"""
    
    script_path = "browser_cache_cleanup.js"
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(cleanup_script)
    
    print(f"  ✅ 已生成: {script_path}")
    print(f"  📋 使用方法:")
    print(f"    1. 在浏览器中按 F12 打开开发者工具")
    print(f"    2. 切换到 Console 标签")
    print(f"    3. 复制并粘贴脚本内容")
    print(f"    4. 按 Enter 执行")

def main():
    """主函数"""
    
    print("🔧 Word模板占位符缓存问题解决工具")
    print("专门解决模板修改后系统仍显示旧占位符的问题")
    print("=" * 80)
    
    # 执行诊断
    analyze_word_template_cache_issue()
    
    # 生成清理脚本
    generate_cache_cleanup_script()
    
    print(f"\n🎯 总结建议:")
    print(f"  1. 首先尝试清除浏览器缓存并重新上传")
    print(f"  2. 如果问题持续，重命名文件后再上传")
    print(f"  3. 使用生成的清理脚本清除所有相关缓存")
    print(f"  4. 如果仍有问题，可能需要检查Word文档的实际内容")
    
    print(f"\n✅ 诊断完成")

if __name__ == '__main__':
    main()
