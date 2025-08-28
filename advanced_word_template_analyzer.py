#!/usr/bin/env python3
"""
高级Word模板分析工具 - 专门分析专业Word模板的复杂结构
检测内容控件、书签、表格、表单字段等高级功能
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
import tempfile
import json

class AdvancedWordTemplateAnalyzer:
    def __init__(self, docx_path):
        self.docx_path = docx_path
        self.temp_dir = None
        self.document_xml = None
        self.content_types = None
        self.relationships = None
        
    def analyze(self):
        """执行完整的Word模板分析"""
        print(f"🔍 高级Word模板分析: {self.docx_path}")
        print("=" * 80)
        
        if not os.path.exists(self.docx_path):
            print(f"❌ 模板文件不存在: {self.docx_path}")
            return
        
        # 解压并读取文件
        with tempfile.TemporaryDirectory() as temp_dir:
            self.temp_dir = temp_dir
            self._extract_docx()
            self._load_xml_files()
            
            # 执行各种分析
            self._analyze_document_structure()
            self._analyze_content_controls()
            self._analyze_bookmarks()
            self._analyze_form_fields()
            self._analyze_tables()
            self._analyze_text_patterns()
            self._analyze_custom_xml()
            self._generate_recommendations()
    
    def _extract_docx(self):
        """解压docx文件"""
        with zipfile.ZipFile(self.docx_path, 'r') as zip_ref:
            zip_ref.extractall(self.temp_dir)
    
    def _load_xml_files(self):
        """加载关键XML文件"""
        # 主文档
        document_path = os.path.join(self.temp_dir, 'word', 'document.xml')
        if os.path.exists(document_path):
            with open(document_path, 'r', encoding='utf-8') as f:
                self.document_xml = f.read()
        
        # 内容类型
        content_types_path = os.path.join(self.temp_dir, '[Content_Types].xml')
        if os.path.exists(content_types_path):
            with open(content_types_path, 'r', encoding='utf-8') as f:
                self.content_types = f.read()
        
        # 关系文件
        rels_path = os.path.join(self.temp_dir, 'word', '_rels', 'document.xml.rels')
        if os.path.exists(rels_path):
            with open(rels_path, 'r', encoding='utf-8') as f:
                self.relationships = f.read()
    
    def _analyze_document_structure(self):
        """分析文档基本结构"""
        print("\n📄 文档结构分析:")
        
        if not self.document_xml:
            print("❌ 无法读取document.xml")
            return
        
        # 统计基本元素
        elements = {
            '段落 (w:p)': len(re.findall(r'<w:p[^>]*>', self.document_xml)),
            '文本运行 (w:r)': len(re.findall(r'<w:r[^>]*>', self.document_xml)),
            '文本 (w:t)': len(re.findall(r'<w:t[^>]*>', self.document_xml)),
            '表格 (w:tbl)': len(re.findall(r'<w:tbl[^>]*>', self.document_xml)),
            '表格行 (w:tr)': len(re.findall(r'<w:tr[^>]*>', self.document_xml)),
            '表格单元格 (w:tc)': len(re.findall(r'<w:tc[^>]*>', self.document_xml)),
        }
        
        for element, count in elements.items():
            print(f"  {element}: {count} 个")
        
        print(f"  XML总长度: {len(self.document_xml):,} 字符")
    
    def _analyze_content_controls(self):
        """分析Word内容控件"""
        print("\n🎛️  内容控件分析:")
        
        if not self.document_xml:
            return
        
        # 查找所有内容控件
        sdt_pattern = r'<w:sdt[^>]*>.*?</w:sdt>'
        sdt_matches = re.findall(sdt_pattern, self.document_xml, re.DOTALL)
        
        print(f"  找到 {len(sdt_matches)} 个内容控件")
        
        for i, sdt in enumerate(sdt_matches, 1):
            print(f"\n  内容控件 {i}:")
            
            # 提取标题
            title_match = re.search(r'<w:tag w:val="([^"]*)"', sdt)
            if title_match:
                print(f"    标签: {title_match.group(1)}")
            
            # 提取别名
            alias_match = re.search(r'<w:alias w:val="([^"]*)"', sdt)
            if alias_match:
                print(f"    别名: {alias_match.group(1)}")
            
            # 提取占位符文本
            placeholder_match = re.search(r'<w:placeholder>.*?<w:docPart w:val="([^"]*)"', sdt, re.DOTALL)
            if placeholder_match:
                print(f"    占位符: {placeholder_match.group(1)}")
            
            # 提取文本内容
            text_matches = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', sdt)
            if text_matches:
                content = ''.join(text_matches)
                print(f"    内容: {content[:100]}...")
    
    def _analyze_bookmarks(self):
        """分析书签"""
        print("\n🔖 书签分析:")
        
        if not self.document_xml:
            return
        
        # 查找书签开始标记
        bookmark_starts = re.findall(r'<w:bookmarkStart[^>]*w:name="([^"]*)"[^>]*>', self.document_xml)
        
        print(f"  找到 {len(bookmark_starts)} 个书签:")
        for i, bookmark in enumerate(bookmark_starts, 1):
            print(f"    {i:2d}. {bookmark}")
            
            # 查找书签内容
            bookmark_pattern = f'<w:bookmarkStart[^>]*w:name="{re.escape(bookmark)}"[^>]*>.*?<w:bookmarkEnd[^>]*>'
            bookmark_content = re.search(bookmark_pattern, self.document_xml, re.DOTALL)
            if bookmark_content:
                text_matches = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', bookmark_content.group(0))
                if text_matches:
                    content = ''.join(text_matches)
                    print(f"        内容: {content[:50]}...")
    
    def _analyze_form_fields(self):
        """分析表单字段"""
        print("\n📝 表单字段分析:")
        
        if not self.document_xml:
            return
        
        # 查找表单字段
        form_fields = re.findall(r'<w:fldChar[^>]*w:fldCharType="begin"[^>]*>.*?<w:fldChar[^>]*w:fldCharType="end"[^>]*>', self.document_xml, re.DOTALL)
        
        print(f"  找到 {len(form_fields)} 个表单字段")
        
        # 查找FORMTEXT字段
        formtext_pattern = r'FORMTEXT'
        formtext_matches = re.findall(formtext_pattern, self.document_xml)
        print(f"  FORMTEXT字段: {len(formtext_matches)} 个")
        
        # 查找MERGEFIELD字段
        mergefield_pattern = r'MERGEFIELD\s+([^\s\\]+)'
        mergefield_matches = re.findall(mergefield_pattern, self.document_xml)
        print(f"  MERGEFIELD字段: {len(mergefield_matches)} 个")
        for field in mergefield_matches:
            print(f"    - {field}")
    
    def _analyze_tables(self):
        """分析表格中的占位符"""
        print("\n📊 表格分析:")
        
        if not self.document_xml:
            return
        
        # 查找所有表格
        table_pattern = r'<w:tbl[^>]*>.*?</w:tbl>'
        tables = re.findall(table_pattern, self.document_xml, re.DOTALL)
        
        print(f"  找到 {len(tables)} 个表格")
        
        for i, table in enumerate(tables, 1):
            print(f"\n  表格 {i}:")
            
            # 统计行和列
            rows = re.findall(r'<w:tr[^>]*>', table)
            cells = re.findall(r'<w:tc[^>]*>', table)
            print(f"    行数: {len(rows)}, 单元格数: {len(cells)}")
            
            # 查找表格中的占位符
            placeholders = []
            
            # 双花括号
            double_brackets = re.findall(r'\{\{([^}]+)\}\}', table)
            placeholders.extend(double_brackets)
            
            # 单花括号
            single_brackets = re.findall(r'\{([^{}]+)\}', table)
            placeholders.extend([p for p in single_brackets if not any(c in p for c in '<>')])
            
            # 查找包含已知字段名的单元格
            known_fields = [
                "甲方公司名称", "乙方公司名称", "合同类型", "合同金额", "签署日期",
                "甲方联系人", "甲方电话", "乙方联系人", "联系邮箱", "付款方式",
                "产品清单", "是否包含保险", "特别约定"
            ]
            
            for field in known_fields:
                if field in table:
                    print(f"    包含字段: {field}")
            
            if placeholders:
                print(f"    占位符: {list(set(placeholders))}")
    
    def _analyze_text_patterns(self):
        """分析文本模式"""
        print("\n🔤 文本模式分析:")
        
        if not self.document_xml:
            return
        
        # 提取所有文本内容
        text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', self.document_xml)
        all_text = ' '.join(text_elements)
        
        print(f"  总文本长度: {len(all_text)} 字符")
        
        # 查找各种可能的占位符模式
        patterns = {
            '双花括号 {{}}': r'\{\{([^}]+)\}\}',
            '单花括号 {}': r'\{([^{}]+)\}',
            '方括号 []': r'\[([^\]]+)\]',
            '下划线 ___': r'_{3,}',
            '点线 ...': r'\.{3,}',
            '空格占位': r'\s{5,}',
        }
        
        for pattern_name, pattern in patterns.items():
            matches = re.findall(pattern, all_text)
            if matches:
                print(f"  {pattern_name}: {len(matches)} 个")
                for match in matches[:5]:  # 只显示前5个
                    print(f"    - {match}")
        
        # 查找已知字段名
        known_fields = [
            "甲方公司名称", "乙方公司名称", "合同类型", "合同金额", "签署日期",
            "甲方联系人", "甲方电话", "乙方联系人", "联系邮箱", "付款方式",
            "产品清单", "是否包含保险", "特别约定"
        ]
        
        found_fields = []
        for field in known_fields:
            if field in all_text:
                found_fields.append(field)
        
        print(f"\n  找到的已知字段 ({len(found_fields)}/13):")
        for field in found_fields:
            print(f"    ✓ {field}")
        
        missing_fields = [f for f in known_fields if f not in found_fields]
        if missing_fields:
            print(f"\n  未找到的字段 ({len(missing_fields)}/13):")
            for field in missing_fields:
                print(f"    ✗ {field}")
    
    def _analyze_custom_xml(self):
        """分析自定义XML部分"""
        print("\n🔧 自定义XML分析:")
        
        # 检查customXml文件夹
        custom_xml_dir = os.path.join(self.temp_dir, 'customXml')
        if os.path.exists(custom_xml_dir):
            xml_files = [f for f in os.listdir(custom_xml_dir) if f.endswith('.xml')]
            print(f"  找到 {len(xml_files)} 个自定义XML文件:")
            for xml_file in xml_files:
                print(f"    - {xml_file}")
        else:
            print("  未找到自定义XML文件")
    
    def _generate_recommendations(self):
        """生成修复建议"""
        print("\n💡 修复建议:")
        print("=" * 50)
        
        print("1. **增强内容控件支持**:")
        print("   - 在WordProcessor中添加<w:sdt>标签识别")
        print("   - 支持通过w:tag和w:alias属性匹配字段")
        print("   - 实现内容控件内容替换")
        
        print("\n2. **增强书签支持**:")
        print("   - 识别<w:bookmarkStart>和<w:bookmarkEnd>")
        print("   - 支持书签名称与字段名匹配")
        print("   - 实现书签内容替换")
        
        print("\n3. **增强表格处理**:")
        print("   - 深度扫描表格单元格内容")
        print("   - 支持表格中的各种占位符格式")
        print("   - 处理跨单元格的复杂结构")
        
        print("\n4. **增强文本模式识别**:")
        print("   - 支持更多占位符格式（方括号、下划线等）")
        print("   - 改进跨文本运行的占位符重组")
        print("   - 增强中文字段名识别")
        
        print("\n5. **测试验证**:")
        print("   - 创建专门的测试用例")
        print("   - 验证所有13个字段的识别和替换")
        print("   - 确保文档结构完整性")

def main():
    """主函数"""
    print("🔍 高级Word模板分析工具")
    print("专门分析专业Word模板的复杂结构")
    print("=" * 80)
    
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
    
    # 执行分析
    analyzer = AdvancedWordTemplateAnalyzer(template_path)
    analyzer.analyze()
    
    print("\n" + "=" * 80)
    print("✅ 高级分析完成")

if __name__ == '__main__':
    main()
