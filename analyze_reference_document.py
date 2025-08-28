#!/usr/bin/env python3
"""
分析参考文档内容和结构
为生成系统兼容的Word模板做准备
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re
from pathlib import Path
import tempfile

def analyze_reference_document():
    """分析参考文档"""
    reference_path = r"E:\trae\0814合同\上游车源-广州舶源（采购）.docx"
    
    print("🔍 分析参考文档内容和结构")
    print("=" * 60)
    
    if not os.path.exists(reference_path):
        print(f"❌ 参考文档不存在: {reference_path}")
        return None
    
    document_data = {
        'content': '',
        'structure': {},
        'field_mappings': {},
        'contract_clauses': []
    }
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # 解压docx文件
        with zipfile.ZipFile(reference_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # 读取document.xml
        document_xml_path = os.path.join(temp_dir, 'word', 'document.xml')
        with open(document_xml_path, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        
        # 提取所有文本内容
        text_elements = re.findall(r'<w:t[^>]*>([^<]+)</w:t>', xml_content)
        all_text = ' '.join(text_elements)
        document_data['content'] = all_text
        
        print(f"📄 文档总文本长度: {len(all_text)} 字符")
        print(f"📄 XML总长度: {len(xml_content)} 字符")
        
        # 分析文档结构
        analyze_document_structure(xml_content, document_data)
        
        # 提取合同条款
        extract_contract_clauses(all_text, document_data)
        
        # 识别需要替换的字段
        identify_field_mappings(all_text, document_data)
        
        # 生成模板内容
        generate_template_content(document_data)
    
    return document_data

def analyze_document_structure(xml_content, document_data):
    """分析文档结构"""
    print(f"\n📊 文档结构分析:")
    
    structure = {
        'paragraphs': len(re.findall(r'<w:p[^>]*>', xml_content)),
        'text_runs': len(re.findall(r'<w:r[^>]*>', xml_content)),
        'text_elements': len(re.findall(r'<w:t[^>]*>', xml_content)),
        'tables': len(re.findall(r'<w:tbl[^>]*>', xml_content)),
        'table_rows': len(re.findall(r'<w:tr[^>]*>', xml_content)),
        'table_cells': len(re.findall(r'<w:tc[^>]*>', xml_content)),
    }
    
    document_data['structure'] = structure
    
    for element, count in structure.items():
        print(f"  {element}: {count} 个")

def extract_contract_clauses(all_text, document_data):
    """提取合同条款"""
    print(f"\n📋 合同条款提取:")
    
    # 按段落分割文本
    paragraphs = [p.strip() for p in all_text.split('\n') if p.strip()]
    
    # 识别合同条款模式
    clause_patterns = [
        r'第[一二三四五六七八九十\d]+条',  # 条款编号
        r'\d+\.\s*',  # 数字编号
        r'[（(]\d+[）)]',  # 括号编号
        r'甲方[:：]',  # 甲方条款
        r'乙方[:：]',  # 乙方条款
        r'双方[:：]',  # 双方条款
    ]
    
    clauses = []
    for paragraph in paragraphs:
        if len(paragraph) > 20:  # 过滤太短的段落
            for pattern in clause_patterns:
                if re.search(pattern, paragraph):
                    clauses.append(paragraph)
                    break
            else:
                # 如果包含关键词也认为是条款
                keywords = ['合同', '协议', '约定', '责任', '义务', '权利', '违约', '争议']
                if any(keyword in paragraph for keyword in keywords):
                    clauses.append(paragraph)
    
    document_data['contract_clauses'] = clauses[:20]  # 只保留前20个主要条款
    
    print(f"  提取到 {len(clauses)} 个合同条款")
    for i, clause in enumerate(clauses[:5], 1):  # 显示前5个
        print(f"    {i}. {clause[:50]}...")

def identify_field_mappings(all_text, document_data):
    """识别需要替换的字段"""
    print(f"\n🎯 字段映射识别:")
    
    # 定义字段识别模式
    field_patterns = {
        '甲方公司名称': [
            r'甲方[：:]([^乙方]{5,50})',
            r'买方[：:]([^卖方]{5,50})',
            r'采购方[：:]([^供应方]{5,50})',
        ],
        '乙方公司名称': [
            r'乙方[：:]([^甲方]{5,50})',
            r'卖方[：:]([^买方]{5,50})',
            r'供应方[：:]([^采购方]{5,50})',
        ],
        '合同金额': [
            r'合同金额[：:]?\s*([0-9,，.．万千百十亿元]+)',
            r'总金额[：:]?\s*([0-9,，.．万千百十亿元]+)',
            r'价款[：:]?\s*([0-9,，.．万千百十亿元]+)',
        ],
        '签署日期': [
            r'(\d{4}年\d{1,2}月\d{1,2}日)',
            r'(\d{4}-\d{1,2}-\d{1,2})',
            r'(\d{4}\.\d{1,2}\.\d{1,2})',
        ],
        '甲方联系人': [
            r'甲方联系人[：:]([^乙方]{2,20})',
            r'联系人[：:]([^电话]{2,20})',
        ],
        '甲方电话': [
            r'电话[：:](\d{3,4}-?\d{7,8})',
            r'联系电话[：:](\d{3,4}-?\d{7,8})',
            r'手机[：:](\d{11})',
        ],
        '合同类型': [
            r'(采购合同|购销合同|买卖合同|供货合同)',
        ],
        '付款方式': [
            r'付款方式[：:]([^第]{10,100})',
            r'支付方式[：:]([^第]{10,100})',
        ],
    }
    
    field_mappings = {}
    
    for field_name, patterns in field_patterns.items():
        for pattern in patterns:
            matches = re.findall(pattern, all_text, re.IGNORECASE)
            if matches:
                # 取第一个匹配，清理格式
                value = matches[0].strip()
                if value and len(value) > 1:
                    field_mappings[field_name] = value
                    print(f"  {field_name}: {value[:30]}...")
                    break
    
    document_data['field_mappings'] = field_mappings

def generate_template_content(document_data):
    """生成模板内容"""
    print(f"\n📝 生成模板内容:")
    
    # 基于提取的内容生成模板
    template_content = generate_contract_template(document_data)
    
    # 保存为文本文件，供后续转换为Word文档
    with open('template_content.txt', 'w', encoding='utf-8') as f:
        f.write(template_content)
    
    print(f"  模板内容已保存到 template_content.txt")
    print(f"  模板长度: {len(template_content)} 字符")

def generate_contract_template(document_data):
    """生成合同模板内容"""
    
    template = f"""
采购合同

合同编号：{{{{合同编号}}}}
签署日期：{{{{签署日期}}}}

甲方（采购方）：{{{{甲方公司名称}}}}
地址：{{{{甲方地址}}}}
联系人：{{{{甲方联系人}}}}
电话：{{{{甲方电话}}}}
邮箱：{{{{甲方邮箱}}}}

乙方（供应方）：{{{{乙方公司名称}}}}
地址：{{{{乙方地址}}}}
联系人：{{{{乙方联系人}}}}
电话：{{{{乙方电话}}}}
邮箱：{{{{乙方邮箱}}}}

根据《中华人民共和国合同法》及相关法律法规，甲乙双方在平等、自愿、公平、诚信的基础上，就甲方向乙方采购货物事宜，经友好协商，达成如下协议：

第一条 货物信息
1.1 货物名称：{{{{产品名称}}}}
1.2 规格型号：{{{{产品规格}}}}
1.3 数量：{{{{产品数量}}}}
1.4 质量标准：{{{{质量标准}}}}
1.5 技术要求：{{{{技术要求}}}}

第二条 价格条款
2.1 货物单价：{{{{单价}}}}
2.2 合同总金额：{{{{合同金额}}}}
2.3 价格包含：货物价格、包装费、运输费等所有费用

第三条 交付条款
3.1 交付时间：{{{{交付时间}}}}
3.2 交付地点：{{{{交付地点}}}}
3.3 交付方式：{{{{交付方式}}}}
3.4 验收标准：{{{{验收标准}}}}

第四条 付款方式
4.1 付款方式：{{{{付款方式}}}}
4.2 付款期限：{{{{付款期限}}}}
4.3 开票要求：{{{{开票要求}}}}

第五条 质量保证
5.1 质量保证期：{{{{质量保证期}}}}
5.2 质量问题处理：乙方应对货物质量负责，如发现质量问题，乙方应及时处理
5.3 售后服务：{{{{售后服务}}}}

第六条 违约责任
6.1 甲方违约责任：甲方未按约定时间付款的，应承担违约责任
6.2 乙方违约责任：乙方未按约定时间交付货物或货物质量不符合要求的，应承担违约责任
6.3 违约金：违约方应向守约方支付合同总金额的5%作为违约金

第七条 争议解决
7.1 本合同履行过程中发生的争议，双方应友好协商解决
7.2 协商不成的，可向合同签署地人民法院起诉

第八条 其他约定
8.1 特殊约定：{{{{特殊约定}}}}
8.2 本合同一式两份，甲乙双方各执一份，具有同等法律效力
8.3 本合同自双方签字盖章之日起生效

甲方（盖章）：                    乙方（盖章）：

法定代表人：                      法定代表人：

签署日期：{{{{签署日期}}}}          签署日期：{{{{签署日期}}}}
"""
    
    return template.strip()

def main():
    """主函数"""
    print("🔍 参考文档分析工具")
    print("为生成系统兼容的Word模板做准备")
    print("=" * 60)
    
    document_data = analyze_reference_document()
    
    if document_data:
        print(f"\n✅ 分析完成")
        print(f"📊 统计信息:")
        print(f"  - 文档内容长度: {len(document_data['content'])} 字符")
        print(f"  - 识别字段数量: {len(document_data['field_mappings'])} 个")
        print(f"  - 合同条款数量: {len(document_data['contract_clauses'])} 个")
        print(f"  - 模板内容已生成")

if __name__ == '__main__':
    main()
