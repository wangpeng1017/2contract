#!/usr/bin/env python3
"""
分析具体的模板文件，找出占位符识别失败的原因
专门分析"上游车源-广州舶源（采购）.docx"
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
import tempfile

def analyze_specific_template():
    """分析具体的模板文件"""
    template_path = r"E:\trae\0814合同\上游车源-广州舶源（采购）.docx"
    
    print("🔍 分析具体模板文件")
    print("=" * 60)
    print(f"📄 模板路径: {template_path}")
    
    if not os.path.exists(template_path):
        print(f"❌ 模板文件不存在: {template_path}")
        return
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # 解压docx文件
        with zipfile.ZipFile(template_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # 读取document.xml
        document_xml_path = os.path.join(temp_dir, 'word', 'document.xml')
        with open(document_xml_path, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        print(f"📄 XML长度: {len(xml_content):,} 字符")
        
        # 提取所有文本内容
        text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', xml_content)
        all_text = ' '.join(text_elements)
        
        print(f"📄 文本长度: {len(all_text):,} 字符")
        
        # 分析占位符
        analyze_placeholders(xml_content, all_text)
        
        # 分析XML结构问题
        analyze_xml_structure(xml_content)
        
        # 模拟系统的识别过程
        simulate_system_recognition(xml_content)

def analyze_placeholders(xml_content, all_text):
    """分析占位符"""
    print(f"\n🎯 占位符分析:")
    
    # 1. 在纯文本中查找占位符
    print(f"  📝 纯文本中的占位符:")
    
    # 各种可能的占位符格式
    patterns = [
        (r'\{\{([^}]+)\}\}', '双花括号 {{}}'),
        (r'\{([^{}]+)\}', '单花括号 {}'),
        (r'\[([^\]]+)\]', '方括号 []'),
        (r'___+', '下划线 ___'),
        (r'\.{3,}', '点线 ...'),
    ]
    
    total_found = 0
    for pattern, description in patterns:
        matches = re.findall(pattern, all_text)
        if matches:
            print(f"    {description}: {len(matches)} 个")
            for match in matches[:10]:  # 只显示前10个
                if isinstance(match, str):
                    print(f"      - {match}")
                else:
                    print(f"      - {match}")
            total_found += len(matches)
    
    print(f"  📊 纯文本中总计找到: {total_found} 个占位符")
    
    # 2. 在XML中直接查找占位符
    print(f"\n  🔍 XML中的占位符:")
    
    xml_patterns = [
        (r'\{\{([^}]+)\}\}', '双花括号 {{}}'),
        (r'\{([^{}]+)\}', '单花括号 {}'),
    ]
    
    xml_total = 0
    for pattern, description in xml_patterns:
        matches = re.findall(pattern, xml_content)
        if matches:
            print(f"    {description}: {len(matches)} 个")
            for match in matches[:10]:
                print(f"      - {match}")
            xml_total += len(matches)
    
    print(f"  📊 XML中总计找到: {xml_total} 个占位符")
    
    # 3. 查找可能被分割的占位符
    print(f"\n  🧩 分割占位符分析:")
    analyze_fragmented_placeholders(xml_content)

def analyze_fragmented_placeholders(xml_content):
    """分析被分割的占位符"""
    
    # 查找可能的分割模式
    fragmented_patterns = [
        r'<w:t[^>]*>\{[^<]*</w:t>.*?<w:t[^>]*>[^}]*\}</w:t>',  # {开始...}结束
        r'<w:t[^>]*>\{\{[^<]*</w:t>.*?<w:t[^>]*>[^}]*\}\}</w:t>',  # {{开始...}}结束
    ]
    
    found_fragments = []
    for pattern in fragmented_patterns:
        matches = re.findall(pattern, xml_content, re.DOTALL)
        found_fragments.extend(matches)
    
    if found_fragments:
        print(f"    找到 {len(found_fragments)} 个可能的分割片段:")
        for i, fragment in enumerate(found_fragments[:5], 1):
            # 提取文本内容
            text_parts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', fragment)
            combined_text = ''.join(text_parts)
            print(f"      {i}. {combined_text}")
    else:
        print(f"    未找到明显的分割片段")
    
    # 查找单独的花括号
    single_braces = re.findall(r'<w:t[^>]*>([^<]*[{}][^<]*)</w:t>', xml_content)
    if single_braces:
        print(f"    包含花括号的文本节点: {len(single_braces)} 个")
        for brace in single_braces[:10]:
            print(f"      - {brace}")

def analyze_xml_structure(xml_content):
    """分析XML结构"""
    print(f"\n🏗️  XML结构分析:")
    
    # 统计基本元素
    elements = {
        '段落 (w:p)': len(re.findall(r'<w:p[^>]*>', xml_content)),
        '文本运行 (w:r)': len(re.findall(r'<w:r[^>]*>', xml_content)),
        '文本 (w:t)': len(re.findall(r'<w:t[^>]*>', xml_content)),
        '表格 (w:tbl)': len(re.findall(r'<w:tbl[^>]*>', xml_content)),
        '内容控件 (w:sdt)': len(re.findall(r'<w:sdt[^>]*>', xml_content)),
        '书签开始 (w:bookmarkStart)': len(re.findall(r'<w:bookmarkStart[^>]*>', xml_content)),
    }
    
    for element, count in elements.items():
        print(f"  {element}: {count} 个")

def simulate_system_recognition(xml_content):
    """模拟系统的识别过程"""
    print(f"\n🤖 模拟系统识别过程:")
    
    # 模拟当前系统的正则表达式
    system_patterns = [
        r'\{\{([^}]+)\}\}',  # 双花括号
        r'\{([^{}]+)\}',     # 单花括号（但可能有限制）
    ]
    
    print(f"  🔍 使用系统正则表达式:")
    
    for i, pattern in enumerate(system_patterns, 1):
        print(f"    模式 {i}: {pattern}")
        matches = re.findall(pattern, xml_content)
        
        if matches:
            print(f"      找到 {len(matches)} 个匹配:")
            for match in matches[:10]:
                print(f"        - {match}")
        else:
            print(f"      未找到匹配")
    
    # 检查是否有特殊字符干扰
    print(f"\n  🔍 特殊字符检查:")
    
    # 查找包含花括号但可能有其他字符的文本
    complex_patterns = [
        r'<w:t[^>]*>([^<]*\{[^<]*)</w:t>',  # 包含{的文本节点
        r'<w:t[^>]*>([^<]*\}[^<]*)</w:t>',  # 包含}的文本节点
    ]
    
    for pattern in complex_patterns:
        matches = re.findall(pattern, xml_content)
        if matches:
            print(f"    包含花括号的文本节点: {len(matches)} 个")
            for match in matches[:5]:
                print(f"      - {repr(match)}")

def generate_fix_suggestions():
    """生成修复建议"""
    print(f"\n💡 修复建议:")
    print("=" * 30)
    
    print("1. **检查占位符格式**:")
    print("   - 确保使用标准的 {{字段名}} 或 {字段名} 格式")
    print("   - 避免在占位符中包含特殊字符")
    print("   - 检查是否有不可见字符")
    
    print("\n2. **检查XML分割问题**:")
    print("   - Word可能将占位符分割到多个<w:t>节点中")
    print("   - 需要增强系统的分割占位符重组能力")
    
    print("\n3. **增强识别算法**:")
    print("   - 改进正则表达式以处理更复杂的情况")
    print("   - 添加跨节点占位符识别")
    print("   - 增加调试日志以便排查问题")
    
    print("\n4. **模板优化建议**:")
    print("   - 重新输入占位符，确保格式正确")
    print("   - 避免在占位符前后添加额外的格式")
    print("   - 使用简单的文本格式")

def main():
    """主函数"""
    print("🔍 具体模板占位符识别问题分析")
    print("专门分析上游车源-广州舶源（采购）.docx")
    print("=" * 80)
    
    analyze_specific_template()
    generate_fix_suggestions()
    
    print(f"\n" + "=" * 80)
    print("✅ 分析完成")

if __name__ == '__main__':
    main()
