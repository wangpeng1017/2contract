#!/usr/bin/env python3
"""
分析生产环境生成的文档，验证字段替换是否正确
"""

import os
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import tempfile

def analyze_word_document(docx_path):
    """分析Word文档内容，检查占位符替换情况"""
    
    print(f"🔍 分析文档: {docx_path}")
    
    if not os.path.exists(docx_path):
        print(f"❌ 文档不存在: {docx_path}")
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
        
        # 分析占位符替换情况
        analyze_placeholders(xml_content)
        
        # 提取可读内容
        extract_readable_content(xml_content)

def analyze_placeholders(xml_content):
    """分析占位符替换情况"""
    
    print("\n🔖 占位符分析:")
    
    # 查找剩余的占位符
    import re
    remaining_placeholders = re.findall(r'\{\{([^}]+)\}\}', xml_content)
    
    if remaining_placeholders:
        print(f"❌ 发现 {len(remaining_placeholders)} 个未替换的占位符:")
        for i, placeholder in enumerate(remaining_placeholders, 1):
            print(f"  {i:2d}. {{{{ {placeholder} }}}}")
    else:
        print("✅ 没有发现未替换的占位符")
    
    # 检查是否包含我们填写的测试数据
    test_data = {
        "北京科技有限公司": "甲方公司名称",
        "上海贸易有限公司": "乙方公司名称", 
        "HT-2024-PROD-001": "合同编号",
        "150000": "合同金额",
        "服务合同": "合同类型",
        "软件开发与技术咨询服务": "服务内容",
        "分期付款，首付50%": "付款方式",
        "张经理": "甲方联系人",
        "138-1234-5678": "甲方电话",
        "zhang@beijing-tech.com": "甲方邮箱",
        "李总监": "乙方联系人",
        "139-8765-4321": "乙方电话",
        "2024-01-15": "签署日期",
        "2024-03-15": "交付时间",
        "本合同为技术服务合同，需要双方严格按照约定执行": "特殊说明",
        "如有争议，双方协商解决，协商不成可向合同签署地法院起诉": "其他条款"
    }
    
    print(f"\n📝 测试数据替换验证:")
    replaced_count = 0
    total_count = len(test_data)
    
    for data_value, field_name in test_data.items():
        if data_value in xml_content:
            print(f"  ✅ {field_name}: {data_value}")
            replaced_count += 1
        else:
            print(f"  ❌ {field_name}: {data_value} (未找到)")
    
    replacement_rate = (replaced_count / total_count) * 100
    print(f"\n📊 替换统计:")
    print(f"  总字段数: {total_count}")
    print(f"  成功替换: {replaced_count}")
    print(f"  替换成功率: {replacement_rate:.1f}%")
    
    if replacement_rate >= 100:
        print("🎉 所有字段替换成功！")
    elif replacement_rate >= 80:
        print("⚠️  大部分字段替换成功，但仍有少量问题")
    else:
        print("❌ 字段替换存在严重问题")
    
    return replacement_rate

def extract_readable_content(xml_content):
    """提取可读内容预览"""
    
    print(f"\n📖 文档内容预览:")
    
    try:
        # 移除XML标签，提取纯文本
        import re
        content = re.sub(r'<[^>]*>', ' ', xml_content)
        content = re.sub(r'\s+', ' ', content).strip()
        
        # 清理特殊字符
        content = content.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
        
        # 显示前500个字符
        preview = content[:500]
        if len(content) > 500:
            preview += "..."
        
        print(f"  {preview}")
        
    except Exception as e:
        print(f"  ❌ 内容提取失败: {e}")

def main():
    """主函数"""
    
    print("🔍 生产环境文档分析工具")
    print("=" * 50)
    
    # 查找下载的文档
    base_temp_dir = Path("C:/Users").glob("*/AppData/Local/Temp/playwright-mcp-output")

    docx_files = []
    for temp_dir in base_temp_dir:
        if temp_dir.exists():
            docx_files.extend(temp_dir.glob("*/generated*test-contract-template.docx"))

    # 如果没找到，尝试其他可能的路径
    if not docx_files:
        alt_paths = [
            Path(tempfile.gettempdir()) / "playwright-mcp-output",
            Path.home() / "Downloads"
        ]
        for alt_path in alt_paths:
            if alt_path.exists():
                docx_files.extend(alt_path.glob("**/generated*test-contract-template.docx"))
    
    if not docx_files:
        print(f"❌ 在 {download_dir} 中未找到生成的文档")
        return
    
    # 分析最新的文档
    latest_docx = max(docx_files, key=lambda x: x.stat().st_mtime)
    
    print(f"📁 找到文档: {latest_docx}")
    print(f"📅 修改时间: {latest_docx.stat().st_mtime}")
    
    # 分析文档
    analyze_word_document(str(latest_docx))
    
    print("\n" + "=" * 50)
    print("✅ 分析完成")

if __name__ == '__main__':
    main()
