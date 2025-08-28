#!/usr/bin/env python3
"""
深度模板内容分析工具
专门分析问题模板中字段的实际存储方式
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
import tempfile

def analyze_problem_template():
    """深度分析问题模板"""
    template_path = r"E:\trae\0814合同\金港-全时通【金港模板】（外贸）.docx"
    
    print("🔍 深度分析问题模板内容")
    print("=" * 60)
    
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
        
        # 提取所有文本内容
        text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', xml_content)
        all_text = ' '.join(text_elements)
        
        print(f"📄 文档总文本长度: {len(all_text)} 字符")
        print(f"📄 XML总长度: {len(xml_content)} 字符")
        
        # 分析表格内容
        analyze_tables(xml_content)
        
        # 搜索可能的字段标识
        search_field_patterns(all_text)
        
        # 分析书签内容
        analyze_bookmarks(xml_content)
        
        # 查找可能的占位符模式
        find_placeholder_patterns(all_text)

def analyze_tables(xml_content):
    """分析表格内容"""
    print(f"\n📊 表格内容分析:")
    
    # 查找所有表格
    table_pattern = r'<w:tbl[^>]*>.*?</w:tbl>'
    tables = re.findall(table_pattern, xml_content, re.DOTALL)
    
    print(f"  找到 {len(tables)} 个表格")
    
    for i, table in enumerate(tables, 1):
        print(f"\n  表格 {i}:")
        
        # 提取表格中的所有文本
        text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', table)
        table_text = ' '.join(text_elements)
        
        print(f"    文本长度: {len(table_text)} 字符")
        
        # 查找可能的字段相关文本
        field_keywords = [
            "甲方", "乙方", "买方", "卖方", "公司", "名称", "合同", "金额", 
            "日期", "联系人", "电话", "邮箱", "付款", "方式", "产品", "清单",
            "保险", "约定", "BUYER", "SELLER", "CONTRACT", "AMOUNT"
        ]
        
        found_keywords = []
        for keyword in field_keywords:
            if keyword in table_text:
                found_keywords.append(keyword)
        
        if found_keywords:
            print(f"    包含关键词: {', '.join(found_keywords)}")
            
            # 显示包含关键词的文本片段
            lines = table_text.split()
            for j, line in enumerate(lines):
                if any(keyword in line for keyword in found_keywords):
                    start = max(0, j-2)
                    end = min(len(lines), j+3)
                    context = ' '.join(lines[start:end])
                    print(f"      上下文: ...{context}...")
                    break

def search_field_patterns(all_text):
    """搜索字段模式"""
    print(f"\n🔍 字段模式搜索:")
    
    # 各种可能的占位符模式
    patterns = [
        (r'___+', "下划线占位符"),
        (r'\.{3,}', "点线占位符"),
        (r'\s{5,}', "空格占位符"),
        (r'\[.*?\]', "方括号内容"),
        (r'（.*?）', "中文括号内容"),
        (r'\(.*?\)', "英文括号内容"),
        (r'：\s*$', "冒号结尾（可能是标签）"),
        (r':\s*$', "英文冒号结尾"),
    ]
    
    for pattern, description in patterns:
        matches = re.findall(pattern, all_text, re.MULTILINE)
        if matches:
            print(f"  {description}: {len(matches)} 个")
            # 显示前几个匹配
            for match in matches[:5]:
                print(f"    - {repr(match)}")
    
    # 搜索特定的字段名模式
    print(f"\n🎯 特定字段搜索:")
    
    # 已知的13个字段
    known_fields = [
        "甲方公司名称", "乙方公司名称", "合同类型", "合同金额", "签署日期",
        "甲方联系人", "甲方电话", "乙方联系人", "联系邮箱", "付款方式",
        "产品清单", "是否包含保险", "特别约定"
    ]
    
    # 扩展搜索模式
    extended_patterns = [
        "甲方", "乙方", "买方", "卖方", "BUYER", "SELLER",
        "公司名称", "企业名称", "单位名称",
        "合同编号", "合同号", "CONTRACT NO",
        "合同金额", "总金额", "AMOUNT", "TOTAL",
        "签署日期", "签订日期", "DATE",
        "联系人", "CONTACT",
        "电话", "TEL", "PHONE",
        "邮箱", "EMAIL", "E-MAIL",
        "付款方式", "支付方式", "PAYMENT",
        "产品", "PRODUCT", "GOODS",
        "保险", "INSURANCE",
        "约定", "条款", "TERMS"
    ]
    
    found_patterns = {}
    for pattern in extended_patterns:
        # 查找模式及其上下文
        pattern_regex = re.compile(f'.{{0,20}}{re.escape(pattern)}.{{0,20}}', re.IGNORECASE)
        matches = pattern_regex.findall(all_text)
        if matches:
            found_patterns[pattern] = matches[:3]  # 只保留前3个匹配
    
    for pattern, matches in found_patterns.items():
        print(f"  '{pattern}' 找到 {len(matches)} 处:")
        for match in matches:
            print(f"    - {match.strip()}")

def analyze_bookmarks(xml_content):
    """分析书签内容"""
    print(f"\n🔖 书签详细分析:")
    
    # 查找所有书签
    bookmark_pattern = r'<w:bookmarkStart[^>]*w:name="([^"]*)"[^>]*w:id="([^"]*)"[^>]*>'
    bookmarks = re.findall(bookmark_pattern, xml_content)
    
    for name, id in bookmarks:
        print(f"  书签: {name} (ID: {id})")
        
        # 查找书签内容
        bookmark_content_pattern = f'<w:bookmarkStart[^>]*w:name="{re.escape(name)}"[^>]*>.*?<w:bookmarkEnd[^>]*w:id="{re.escape(id)}"[^>]*>'
        content_match = re.search(bookmark_content_pattern, xml_content, re.DOTALL)
        
        if content_match:
            bookmark_content = content_match.group(0)
            # 提取书签内的文本
            text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', bookmark_content)
            if text_elements:
                bookmark_text = ' '.join(text_elements)
                print(f"    内容: {bookmark_text[:100]}...")
            else:
                print(f"    内容: (无文本)")

def find_placeholder_patterns(all_text):
    """查找可能的占位符模式"""
    print(f"\n🎯 占位符模式推断:")
    
    # 分析文本中的重复模式
    lines = all_text.split('\n')
    
    # 查找包含冒号的行（可能是字段标签）
    colon_lines = [line.strip() for line in lines if '：' in line or ':' in line]
    
    print(f"  包含冒号的行 ({len(colon_lines)} 个):")
    for line in colon_lines[:10]:  # 只显示前10个
        if line:
            print(f"    - {line}")
    
    # 查找可能的表单字段模式
    form_patterns = []
    
    # 模式1: "字段名：_____" 或 "字段名:_____"
    pattern1 = re.findall(r'([^：:]+)[：:]\s*[_\s\.]{3,}', all_text)
    if pattern1:
        form_patterns.extend(pattern1)
    
    # 模式2: "字段名（）" 或 "字段名()"
    pattern2 = re.findall(r'([^（(]+)[（(]\s*[）)]\s*', all_text)
    if pattern2:
        form_patterns.extend(pattern2)
    
    if form_patterns:
        print(f"\n  可能的表单字段 ({len(form_patterns)} 个):")
        unique_patterns = list(set([p.strip() for p in form_patterns if p.strip()]))
        for pattern in unique_patterns[:15]:  # 只显示前15个
            print(f"    - {pattern}")

def main():
    """主函数"""
    analyze_problem_template()
    
    print(f"\n💡 分析结论:")
    print("1. 问题模板使用了复杂的表格结构")
    print("2. 没有使用标准的{{}}或{}占位符格式")
    print("3. 可能使用了表单填写的方式（下划线、空格等）")
    print("4. 需要开发专门的表格字段识别算法")
    print("5. 需要支持非标准占位符格式的识别")

if __name__ == '__main__':
    main()
