#!/usr/bin/env python3
"""
专门诊断生产环境模板占位符识别问题的工具
分析为什么系统显示0个占位符但实际有13个数据字段
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
import tempfile

def analyze_template_placeholders(docx_path):
    """深度分析Word模板中的占位符问题"""
    
    print(f"🔍 深度分析模板: {docx_path}")
    
    if not os.path.exists(docx_path):
        print(f"❌ 模板文件不存在: {docx_path}")
        return
    
    # 创建临时目录
    with tempfile.TemporaryDirectory() as temp_dir:
        # 解压docx文件
        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # 读取document.xml
        document_xml_path = os.path.join(temp_dir, 'word', 'document.xml')
        
        if not os.path.exists(document_xml_path):
            print("❌ 无法找到document.xml文件")
            return
        
        with open(document_xml_path, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        print(f"📄 XML内容长度: {len(xml_content)} 字符")
        
        # 1. 分析标准双花括号占位符
        analyze_standard_placeholders(xml_content)
        
        # 2. 分析可能被分割的占位符
        analyze_fragmented_placeholders(xml_content)
        
        # 3. 分析单花括号格式
        analyze_single_bracket_placeholders(xml_content)
        
        # 4. 分析Word特殊格式
        analyze_word_specific_formats(xml_content)
        
        # 5. 搜索已知的13个字段
        search_known_fields(xml_content)
        
        # 6. 分析XML结构问题
        analyze_xml_structure(xml_content)

def analyze_standard_placeholders(xml_content):
    """分析标准{{}}格式的占位符"""
    print("\n🔖 标准双花括号占位符分析:")
    
    pattern = r'\{\{([^}]+)\}\}'
    matches = re.findall(pattern, xml_content)
    
    if matches:
        print(f"✅ 找到 {len(matches)} 个标准格式占位符:")
        for i, match in enumerate(matches, 1):
            print(f"  {i:2d}. {{{{ {match} }}}}")
    else:
        print("❌ 未找到标准格式占位符")
        
        # 检查是否有不完整的花括号
        incomplete_patterns = [
            r'\{\{[^}]*$',  # 开始但未结束
            r'^[^{]*\}\}',  # 结束但未开始
            r'\{[^{][^}]*\}',  # 单花括号
        ]
        
        for pattern_name, pattern in [
            ("未结束的占位符", r'\{\{[^}]*$'),
            ("未开始的占位符", r'^[^{]*\}\}'),
            ("单花括号格式", r'\{[^{][^}]*\}')
        ]:
            matches = re.findall(pattern, xml_content, re.MULTILINE)
            if matches:
                print(f"⚠️  发现 {pattern_name}: {len(matches)} 个")
                for match in matches[:5]:  # 只显示前5个
                    print(f"    {match}")

def analyze_fragmented_placeholders(xml_content):
    """分析被XML节点分割的占位符"""
    print("\n🧩 分割占位符分析:")
    
    # Word经常会将占位符分割，如: <w:t>{{甲方</w:t><w:t>公司名称}}</w:t>
    # 查找可能的分割模式
    fragmented_patterns = [
        r'<w:t[^>]*>\{\{[^<]*</w:t>.*?<w:t[^>]*>[^}]*\}\}</w:t>',
        r'\{\{[^}]*<[^>]+>[^}]*\}\}',
        r'<w:t[^>]*>[^<]*甲方[^<]*</w:t>',
        r'<w:t[^>]*>[^<]*乙方[^<]*</w:t>',
        r'<w:t[^>]*>[^<]*合同[^<]*</w:t>',
        r'<w:t[^>]*>[^<]*公司[^<]*</w:t>',
        r'<w:t[^>]*>[^<]*名称[^<]*</w:t>',
    ]
    
    found_fragments = []
    for pattern in fragmented_patterns:
        matches = re.findall(pattern, xml_content, re.IGNORECASE)
        found_fragments.extend(matches)
    
    if found_fragments:
        print(f"⚠️  发现 {len(found_fragments)} 个可能的分割片段:")
        for i, fragment in enumerate(found_fragments[:10], 1):  # 只显示前10个
            print(f"  {i:2d}. {fragment[:100]}...")
    else:
        print("❌ 未找到明显的分割片段")

def analyze_single_bracket_placeholders(xml_content):
    """分析单花括号格式的占位符"""
    print("\n🔗 单花括号占位符分析:")
    
    pattern = r'\{([^{}]+)\}'
    matches = re.findall(pattern, xml_content)
    
    # 过滤掉XML标签和其他非占位符内容
    valid_matches = []
    for match in matches:
        if (not '<' in match and not '>' in match and 
            not 'w:' in match and len(match.strip()) > 0 and
            len(match) < 50):  # 合理的长度限制
            valid_matches.append(match.strip())
    
    if valid_matches:
        print(f"✅ 找到 {len(valid_matches)} 个单花括号格式占位符:")
        for i, match in enumerate(valid_matches, 1):
            print(f"  {i:2d}. {{ {match} }}")
    else:
        print("❌ 未找到有效的单花括号占位符")

def analyze_word_specific_formats(xml_content):
    """分析Word特殊格式"""
    print("\n📝 Word特殊格式分析:")
    
    # 检查Word域代码
    field_patterns = [
        r'<w:fldChar[^>]*w:fldCharType="begin"[^>]*/>.*?<w:fldChar[^>]*w:fldCharType="end"[^>]*/>',
        r'MERGEFIELD\s+([^\s]+)',
        r'<w:instrText[^>]*>([^<]+)</w:instrText>',
    ]
    
    for pattern_name, pattern in [
        ("Word域代码", r'<w:fldChar[^>]*w:fldCharType="begin"[^>]*/>.*?<w:fldChar[^>]*w:fldCharType="end"[^>]*/>'),
        ("MERGEFIELD", r'MERGEFIELD\s+([^\s]+)'),
        ("指令文本", r'<w:instrText[^>]*>([^<]+)</w:instrText>')
    ]:
        matches = re.findall(pattern, xml_content, re.IGNORECASE | re.DOTALL)
        if matches:
            print(f"✅ 找到 {pattern_name}: {len(matches)} 个")
            for i, match in enumerate(matches[:5], 1):
                print(f"  {i:2d}. {match[:100]}...")
        else:
            print(f"❌ 未找到 {pattern_name}")

def search_known_fields(xml_content):
    """搜索已知的13个字段"""
    print("\n🎯 搜索已知字段:")
    
    known_fields = [
        "甲方公司名称", "乙方公司名称", "合同类型", "合同金额", "签署日期",
        "甲方联系人", "甲方电话", "乙方联系人", "联系邮箱", "付款方式",
        "产品清单", "是否包含保险", "特别约定"
    ]
    
    found_fields = []
    for field in known_fields:
        # 搜索各种可能的格式
        patterns = [
            f"\\{{\\{{{field}\\}}\\}}",  # {{字段名}}
            f"\\{{{field}\\}}",         # {字段名}
            f"{field}",                 # 直接文本
        ]
        
        field_found = False
        for pattern in patterns:
            if re.search(pattern, xml_content):
                found_fields.append((field, pattern))
                field_found = True
                break
        
        if not field_found:
            # 模糊搜索
            for word in field.split():
                if word in xml_content:
                    print(f"  🔍 在文档中找到关键词: {word}")
    
    if found_fields:
        print(f"✅ 找到 {len(found_fields)} 个已知字段:")
        for field, pattern in found_fields:
            print(f"  ✓ {field} (格式: {pattern})")
    else:
        print("❌ 未找到任何已知字段的标准格式")

def analyze_xml_structure(xml_content):
    """分析XML结构问题"""
    print("\n🏗️  XML结构分析:")
    
    # 统计关键XML元素
    elements = {
        'w:t': len(re.findall(r'<w:t[^>]*>', xml_content)),
        'w:r': len(re.findall(r'<w:r[^>]*>', xml_content)),
        'w:p': len(re.findall(r'<w:p[^>]*>', xml_content)),
        'w:tbl': len(re.findall(r'<w:tbl[^>]*>', xml_content)),
    }
    
    print("📊 XML元素统计:")
    for element, count in elements.items():
        print(f"  {element}: {count} 个")
    
    # 检查文本内容
    text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', xml_content)
    print(f"\n📝 文本元素: {len(text_elements)} 个")
    
    # 查找包含中文的文本元素
    chinese_texts = [text for text in text_elements if re.search(r'[\u4e00-\u9fa5]', text)]
    print(f"🇨🇳 包含中文的文本: {len(chinese_texts)} 个")
    
    if chinese_texts:
        print("前10个中文文本示例:")
        for i, text in enumerate(chinese_texts[:10], 1):
            print(f"  {i:2d}. {text[:50]}...")

def main():
    """主函数"""
    
    print("🔍 生产环境模板占位符诊断工具")
    print("=" * 60)
    
    # 查找模板文件
    template_name = "金港-全时通【金港模板】（外贸）.docx"
    
    # 可能的路径
    possible_paths = [
        template_name,
        f"./{template_name}",
        f"templates/{template_name}",
        f"../templates/{template_name}",
    ]
    
    template_path = None
    for path in possible_paths:
        if os.path.exists(path):
            template_path = path
            break
    
    if not template_path:
        print(f"❌ 未找到模板文件: {template_name}")
        print("请将模板文件放在以下位置之一:")
        for path in possible_paths:
            print(f"  - {path}")
        return
    
    print(f"📁 找到模板文件: {template_path}")
    
    # 分析模板
    analyze_template_placeholders(template_path)
    
    print("\n" + "=" * 60)
    print("✅ 诊断完成")
    
    print("\n💡 修复建议:")
    print("1. 检查模板中占位符的实际格式")
    print("2. 确认是否使用了Word域代码或其他特殊格式")
    print("3. 验证占位符是否被XML节点分割")
    print("4. 考虑使用更强大的占位符识别算法")

if __name__ == '__main__':
    main()
