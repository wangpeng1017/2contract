#!/usr/bin/env python3
"""
Word模板对比分析工具
对比正常工作的模板和问题模板的结构差异
找出占位符识别失败的根本原因
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
import tempfile
import json
from collections import defaultdict

class TemplateComparisonAnalyzer:
    def __init__(self, template1_path, template2_path):
        self.template1_path = template1_path  # 正常工作的模板
        self.template2_path = template2_path  # 问题模板
        self.template1_name = os.path.basename(template1_path)
        self.template2_name = os.path.basename(template2_path)
        
    def analyze(self):
        """执行完整的模板对比分析"""
        print("🔍 Word模板结构对比分析")
        print("=" * 80)
        print(f"📄 模板1 (正常): {self.template1_name}")
        print(f"📄 模板2 (问题): {self.template2_name}")
        print("=" * 80)
        
        # 检查文件存在性
        if not os.path.exists(self.template1_path):
            print(f"❌ 模板1不存在: {self.template1_path}")
            return
        if not os.path.exists(self.template2_path):
            print(f"❌ 模板2不存在: {self.template2_path}")
            return
        
        # 分析两个模板
        template1_data = self._analyze_template(self.template1_path, "模板1 (正常)")
        template2_data = self._analyze_template(self.template2_path, "模板2 (问题)")
        
        # 对比分析
        self._compare_templates(template1_data, template2_data)
        
        # 生成修复建议
        self._generate_recommendations(template1_data, template2_data)
    
    def _analyze_template(self, template_path, template_label):
        """分析单个模板"""
        print(f"\n📋 分析 {template_label}")
        print("-" * 50)
        
        template_data = {
            'path': template_path,
            'label': template_label,
            'document_xml': None,
            'xml_length': 0,
            'basic_stats': {},
            'placeholders': {
                'double_brackets': [],
                'single_brackets': [],
                'content_controls': [],
                'bookmarks': [],
                'merge_fields': [],
                'table_placeholders': [],
                'all_text': ''
            },
            'word_features': {
                'has_content_controls': False,
                'has_bookmarks': False,
                'has_tables': False,
                'has_merge_fields': False,
                'has_form_fields': False
            }
        }
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # 解压docx文件
            with zipfile.ZipFile(template_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # 读取document.xml
            document_xml_path = os.path.join(temp_dir, 'word', 'document.xml')
            if os.path.exists(document_xml_path):
                with open(document_xml_path, 'r', encoding='utf-8') as f:
                    template_data['document_xml'] = f.read()
                    template_data['xml_length'] = len(template_data['document_xml'])
            
            # 分析基本统计
            self._analyze_basic_stats(template_data)
            
            # 分析占位符
            self._analyze_placeholders(template_data)
            
            # 分析Word功能
            self._analyze_word_features(template_data)
        
        return template_data
    
    def _analyze_basic_stats(self, template_data):
        """分析基本统计信息"""
        xml_content = template_data['document_xml']
        if not xml_content:
            return
        
        stats = {
            'xml_length': len(xml_content),
            'paragraphs': len(re.findall(r'<w:p[^>]*>', xml_content)),
            'text_runs': len(re.findall(r'<w:r[^>]*>', xml_content)),
            'text_elements': len(re.findall(r'<w:t[^>]*>', xml_content)),
            'tables': len(re.findall(r'<w:tbl[^>]*>', xml_content)),
            'table_rows': len(re.findall(r'<w:tr[^>]*>', xml_content)),
            'table_cells': len(re.findall(r'<w:tc[^>]*>', xml_content)),
        }
        
        template_data['basic_stats'] = stats
        
        print(f"  XML长度: {stats['xml_length']:,} 字符")
        print(f"  段落数: {stats['paragraphs']}")
        print(f"  文本运行: {stats['text_runs']}")
        print(f"  文本元素: {stats['text_elements']}")
        print(f"  表格数: {stats['tables']}")
        print(f"  表格行: {stats['table_rows']}")
        print(f"  表格单元格: {stats['table_cells']}")
    
    def _analyze_placeholders(self, template_data):
        """分析占位符"""
        xml_content = template_data['document_xml']
        if not xml_content:
            return
        
        placeholders = template_data['placeholders']
        
        # 提取所有文本内容
        text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', xml_content)
        all_text = ' '.join(text_elements)
        placeholders['all_text'] = all_text
        
        print(f"  总文本长度: {len(all_text)} 字符")
        
        # 1. 双花括号占位符
        double_pattern = r'\{\{([^}]+)\}\}'
        double_matches = re.findall(double_pattern, all_text)
        placeholders['double_brackets'] = list(set(double_matches))
        print(f"  双花括号占位符: {len(placeholders['double_brackets'])} 个")
        for placeholder in placeholders['double_brackets']:
            print(f"    - {{{{ {placeholder} }}}}")
        
        # 2. 单花括号占位符
        single_pattern = r'\{([^{}]+)\}'
        single_matches = re.findall(single_pattern, all_text)
        # 过滤掉可能的误匹配
        valid_single = [m for m in single_matches if len(m.strip()) > 0 and len(m) < 50 and not any(c in m for c in '<>')]
        placeholders['single_brackets'] = list(set(valid_single))
        print(f"  单花括号占位符: {len(placeholders['single_brackets'])} 个")
        for placeholder in placeholders['single_brackets']:
            print(f"    - {{ {placeholder} }}")
        
        # 3. 内容控件
        sdt_pattern = r'<w:sdt[^>]*>.*?</w:sdt>'
        sdt_matches = re.findall(sdt_pattern, xml_content, re.DOTALL)
        for sdt in sdt_matches:
            # 提取标签
            tag_match = re.search(r'<w:tag w:val="([^"]*)"', sdt)
            if tag_match:
                placeholders['content_controls'].append(tag_match.group(1))
            
            # 提取别名
            alias_match = re.search(r'<w:alias w:val="([^"]*)"', sdt)
            if alias_match:
                placeholders['content_controls'].append(alias_match.group(1))
        
        placeholders['content_controls'] = list(set(placeholders['content_controls']))
        print(f"  内容控件: {len(placeholders['content_controls'])} 个")
        for cc in placeholders['content_controls']:
            print(f"    - {cc}")
        
        # 4. 书签
        bookmark_pattern = r'<w:bookmarkStart[^>]*w:name="([^"]*)"'
        bookmark_matches = re.findall(bookmark_pattern, xml_content)
        placeholders['bookmarks'] = list(set(bookmark_matches))
        print(f"  书签: {len(placeholders['bookmarks'])} 个")
        for bookmark in placeholders['bookmarks']:
            print(f"    - {bookmark}")
        
        # 5. 合并字段
        merge_pattern = r'MERGEFIELD\s+([^\s\\]+)'
        merge_matches = re.findall(merge_pattern, xml_content, re.IGNORECASE)
        placeholders['merge_fields'] = list(set(merge_matches))
        print(f"  合并字段: {len(placeholders['merge_fields'])} 个")
        for field in placeholders['merge_fields']:
            print(f"    - {field}")
        
        # 6. 表格中的占位符
        table_pattern = r'<w:tbl[^>]*>.*?</w:tbl>'
        table_matches = re.findall(table_pattern, xml_content, re.DOTALL)
        table_placeholders = []
        
        for table in table_matches:
            # 在表格中查找各种占位符
            table_text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', table)
            table_text = ' '.join(table_text_elements)
            
            # 查找表格中的占位符
            table_double = re.findall(double_pattern, table_text)
            table_single = re.findall(single_pattern, table_text)
            table_placeholders.extend(table_double)
            table_placeholders.extend([s for s in table_single if len(s.strip()) > 0 and len(s) < 50])
        
        placeholders['table_placeholders'] = list(set(table_placeholders))
        print(f"  表格占位符: {len(placeholders['table_placeholders'])} 个")
        for placeholder in placeholders['table_placeholders']:
            print(f"    - {placeholder}")
        
        # 7. 查找已知字段
        known_fields = [
            "甲方公司名称", "乙方公司名称", "合同类型", "合同金额", "签署日期",
            "甲方联系人", "甲方电话", "乙方联系人", "联系邮箱", "付款方式",
            "产品清单", "是否包含保险", "特别约定"
        ]
        
        found_known_fields = []
        for field in known_fields:
            if field in all_text:
                found_known_fields.append(field)
        
        print(f"  找到已知字段: {len(found_known_fields)}/13 个")
        for field in found_known_fields:
            print(f"    ✓ {field}")
        
        missing_fields = [f for f in known_fields if f not in found_known_fields]
        if missing_fields:
            print(f"  未找到字段: {len(missing_fields)} 个")
            for field in missing_fields:
                print(f"    ✗ {field}")
    
    def _analyze_word_features(self, template_data):
        """分析Word功能使用情况"""
        xml_content = template_data['document_xml']
        if not xml_content:
            return
        
        features = template_data['word_features']
        
        # 检查各种Word功能
        features['has_content_controls'] = '<w:sdt' in xml_content
        features['has_bookmarks'] = '<w:bookmarkStart' in xml_content
        features['has_tables'] = '<w:tbl' in xml_content
        features['has_merge_fields'] = 'MERGEFIELD' in xml_content.upper()
        features['has_form_fields'] = '<w:fldChar' in xml_content
        
        print(f"  Word功能使用:")
        print(f"    内容控件: {'✓' if features['has_content_controls'] else '✗'}")
        print(f"    书签: {'✓' if features['has_bookmarks'] else '✗'}")
        print(f"    表格: {'✓' if features['has_tables'] else '✗'}")
        print(f"    合并字段: {'✓' if features['has_merge_fields'] else '✗'}")
        print(f"    表单字段: {'✓' if features['has_form_fields'] else '✗'}")
    
    def _compare_templates(self, template1_data, template2_data):
        """对比两个模板"""
        print(f"\n🔄 模板对比分析")
        print("=" * 50)
        
        # 基本统计对比
        print("📊 基本统计对比:")
        stats1 = template1_data['basic_stats']
        stats2 = template2_data['basic_stats']
        
        comparison_table = [
            ("XML长度", stats1.get('xml_length', 0), stats2.get('xml_length', 0)),
            ("段落数", stats1.get('paragraphs', 0), stats2.get('paragraphs', 0)),
            ("文本运行", stats1.get('text_runs', 0), stats2.get('text_runs', 0)),
            ("文本元素", stats1.get('text_elements', 0), stats2.get('text_elements', 0)),
            ("表格数", stats1.get('tables', 0), stats2.get('tables', 0)),
            ("表格行", stats1.get('table_rows', 0), stats2.get('table_rows', 0)),
            ("表格单元格", stats1.get('table_cells', 0), stats2.get('table_cells', 0)),
        ]
        
        print(f"{'指标':<12} {'正常模板':<15} {'问题模板':<15} {'差异':<10}")
        print("-" * 60)
        for metric, val1, val2 in comparison_table:
            diff = val2 - val1
            diff_str = f"+{diff}" if diff > 0 else str(diff)
            print(f"{metric:<12} {val1:<15} {val2:<15} {diff_str:<10}")
        
        # 占位符对比
        print(f"\n🎯 占位符对比:")
        p1 = template1_data['placeholders']
        p2 = template2_data['placeholders']
        
        placeholder_comparison = [
            ("双花括号", len(p1['double_brackets']), len(p2['double_brackets'])),
            ("单花括号", len(p1['single_brackets']), len(p2['single_brackets'])),
            ("内容控件", len(p1['content_controls']), len(p2['content_controls'])),
            ("书签", len(p1['bookmarks']), len(p2['bookmarks'])),
            ("合并字段", len(p1['merge_fields']), len(p2['merge_fields'])),
            ("表格占位符", len(p1['table_placeholders']), len(p2['table_placeholders'])),
        ]
        
        print(f"{'占位符类型':<12} {'正常模板':<15} {'问题模板':<15} {'差异':<10}")
        print("-" * 60)
        for ptype, count1, count2 in placeholder_comparison:
            diff = count2 - count1
            diff_str = f"+{diff}" if diff > 0 else str(diff)
            print(f"{ptype:<12} {count1:<15} {count2:<15} {diff_str:<10}")
        
        # Word功能对比
        print(f"\n🔧 Word功能对比:")
        f1 = template1_data['word_features']
        f2 = template2_data['word_features']
        
        feature_comparison = [
            ("内容控件", f1['has_content_controls'], f2['has_content_controls']),
            ("书签", f1['has_bookmarks'], f2['has_bookmarks']),
            ("表格", f1['has_tables'], f2['has_tables']),
            ("合并字段", f1['has_merge_fields'], f2['has_merge_fields']),
            ("表单字段", f1['has_form_fields'], f2['has_form_fields']),
        ]
        
        print(f"{'功能':<12} {'正常模板':<15} {'问题模板':<15} {'状态':<10}")
        print("-" * 60)
        for feature, has1, has2 in feature_comparison:
            status1 = "✓" if has1 else "✗"
            status2 = "✓" if has2 else "✗"
            status = "相同" if has1 == has2 else "不同"
            print(f"{feature:<12} {status1:<15} {status2:<15} {status:<10}")
    
    def _generate_recommendations(self, template1_data, template2_data):
        """生成修复建议"""
        print(f"\n💡 分析结论和修复建议")
        print("=" * 50)
        
        p1 = template1_data['placeholders']
        p2 = template2_data['placeholders']
        f1 = template1_data['word_features']
        f2 = template2_data['word_features']
        
        # 分析关键差异
        print("🔍 关键差异分析:")
        
        # 占位符格式差异
        if len(p1['double_brackets']) > 0 and len(p2['double_brackets']) == 0:
            print("  ❌ 问题模板没有使用双花括号格式占位符")
        
        if len(p2['content_controls']) > len(p1['content_controls']):
            print("  ⚠️  问题模板大量使用内容控件，需要增强支持")
        
        if len(p2['bookmarks']) > len(p1['bookmarks']):
            print("  ⚠️  问题模板大量使用书签，需要增强支持")
        
        if f2['has_tables'] and not f1['has_tables']:
            print("  ⚠️  问题模板使用表格结构，需要增强表格处理")
        
        # 生成具体建议
        print("\n📋 具体修复建议:")
        
        print("1. **算法增强建议**:")
        if len(p2['content_controls']) > 0:
            print("   - 增强内容控件识别和替换算法")
            print("   - 支持w:tag和w:alias属性匹配")
        
        if len(p2['bookmarks']) > 0:
            print("   - 增强书签识别和替换算法")
            print("   - 支持书签名称与字段名匹配")
        
        if f2['has_tables']:
            print("   - 增强表格内占位符识别")
            print("   - 深度扫描表格单元格内容")
        
        print("\n2. **模板规范建议**:")
        print("   - 推荐使用双花括号格式: {{字段名}}")
        print("   - 避免过度使用Word高级功能")
        print("   - 保持占位符格式的一致性")
        
        print("\n3. **兼容性改进**:")
        print("   - 实现多格式占位符支持")
        print("   - 增加智能格式检测")
        print("   - 提供模板验证工具")

def main():
    """主函数"""
    print("🔍 Word模板结构对比分析工具")
    print("找出占位符识别失败的根本原因")
    print("=" * 80)
    
    # 模板文件路径
    template1_path = r"E:\trae\0823合同3\test-contract-template.docx"  # 正常工作的模板
    template2_path = r"E:\trae\0814合同\金港-全时通【金港模板】（外贸）.docx"  # 问题模板
    
    # 执行对比分析
    analyzer = TemplateComparisonAnalyzer(template1_path, template2_path)
    analyzer.analyze()
    
    print("\n" + "=" * 80)
    print("✅ 对比分析完成")

if __name__ == '__main__':
    main()
