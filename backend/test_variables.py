"""变量提取 API 测试脚本"""
import requests
import sys
from pathlib import Path

# 设置 UTF-8 编码
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# API 基础 URL
BASE_URL = "http://localhost:8000"


def test_extract_variables():
    """测试变量提取"""
    print("测试变量提取...")
    
    # 测试文本
    test_text = """
    采购合同
    
    甲方：{{甲方公司名称}}
    联系人：{{甲方联系人}}
    电话：{{甲方电话}}
    
    乙方：{{乙方公司名称}}
    联系人：{{乙方联系人}}
    电话：{{乙方电话}}
    
    合同编号：{{合同编号}}
    签订日期：{{签订日期}}
    交付时间：{{交付时间}}
    
    合同金额：{{合同金额}} 元
    付款方式：{{付款方式}}
    
    交付地址：{{交付地址}}
    """
    
    # 发送请求
    response = requests.post(
        f"{BASE_URL}/api/v1/variables/extract",
        json={
            "text": test_text,
            "use_cache": True
        }
    )
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"原始响应: {result}")  # Debug
        print(f"提取变量数: {result.get('count', 'N/A')}")
        print(f"从缓存获取: {result['from_cache']}")
        print(f"文本哈希: {result['text_hash'][:16]}...")
        print(f"\n变量列表:")
        
        for i, var in enumerate(result['variables'], 1):
            print(f"\n{i}. {var['label']}")
            print(f"   - 变量名: {var['name']}")
            print(f"   - 类型: {var['type']}")
            print(f"   - 必填: {var['required']}")
            if var.get('description'):
                print(f"   - 说明: {var['description']}")
            if var.get('placeholder'):
                print(f"   - 提示: {var['placeholder']}")
            if var.get('options'):
                print(f"   - 选项: {var['options']}")
        
        print("\n✓ 变量提取测试通过\n")
        return result['text_hash']
    else:
        print(f"✗ 变量提取失败: {response.text}\n")
        return None


def test_cache_hit(text_hash):
    """测试缓存命中"""
    print("测试缓存命中...")
    
    test_text = """
    采购合同
    
    甲方：{{甲方公司名称}}
    联系人：{{甲方联系人}}
    电话：{{甲方电话}}
    
    乙方：{{乙方公司名称}}
    联系人：{{乙方联系人}}
    电话：{{乙方电话}}
    
    合同编号：{{合同编号}}
    签订日期：{{签订日期}}
    交付时间：{{交付时间}}
    
    合同金额：{{合同金额}} 元
    付款方式：{{付款方式}}
    
    交付地址：{{交付地址}}
    """
    
    # 再次发送相同文本
    response = requests.post(
        f"{BASE_URL}/api/v1/variables/extract",
        json={
            "text": test_text,
            "use_cache": True
        }
    )
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        if result['from_cache']:
            print(f"✓ 成功从缓存获取变量 ({result['count']} 个)\n")
        else:
            print(f"⚠ 未从缓存获取（可能缓存未生效）\n")
    else:
        print(f"✗ 请求失败: {response.text}\n")


def test_cache_stats():
    """测试缓存统计"""
    print("测试缓存统计...")
    
    response = requests.get(f"{BASE_URL}/api/v1/variables/cache/stats")
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"缓存后端: {result['backend']}")
        print(f"连接状态: {result['status']}")
        print(f"✓ 缓存统计测试通过\n")
    else:
        print(f"✗ 缓存统计失败: {response.text}\n")


def test_real_document():
    """测试真实文档"""
    print("测试真实文档解析 + 变量提取...")
    
    # 先解析文档
    test_doc_path = Path("../test-contract-template.docx")
    if not test_doc_path.exists():
        test_doc_path = Path("../汽车采购合同.docx")
    
    if not test_doc_path.exists():
        print("⚠ 未找到测试文档，跳过真实文档测试\n")
        return
    
    # 1. 解析文档
    with open(test_doc_path, "rb") as f:
        files = {"file": (test_doc_path.name, f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        parse_response = requests.post(f"{BASE_URL}/api/v1/documents/parse", files=files)
    
    if parse_response.status_code != 200:
        print(f"✗ 文档解析失败: {parse_response.text}\n")
        return
    
    parse_result = parse_response.json()
    text = parse_result['text']
    
    print(f"文档解析成功:")
    print(f"  - 文件名: {parse_result['filename']}")
    print(f"  - 文本长度: {len(text)} 字符")
    print(f"  - 占位符数: {len(parse_result['placeholders'])}")
    
    # 2. 提取变量
    extract_response = requests.post(
        f"{BASE_URL}/api/v1/variables/extract",
        json={
            "text": text,
            "use_cache": True
        }
    )
    
    print(f"\n变量提取:")
    if extract_response.status_code == 200:
        extract_result = extract_response.json()
        print(f"  - 提取变量数: {extract_result['count']}")
        print(f"  - 从缓存获取: {extract_result['from_cache']}")
        
        # 显示部分变量
        print(f"\n  前 5 个变量:")
        for var in extract_result['variables'][:5]:
            print(f"    • {var['label']} ({var['type']})")
        
        print(f"\n✓ 真实文档测试通过\n")
    else:
        print(f"  ✗ 变量提取失败: {extract_response.text}\n")


def main():
    """运行所有测试"""
    print("=" * 50)
    print("变量提取 API 测试")
    print("=" * 50)
    print()
    
    try:
        # 1. 基本变量提取
        text_hash = test_extract_variables()
        
        # 2. 缓存命中测试
        if text_hash:
            test_cache_hit(text_hash)
        
        # 3. 缓存统计
        test_cache_stats()
        
        # 4. 真实文档测试
        test_real_document()
        
        print("=" * 50)
        print("✓ 所有测试通过!")
        print("=" * 50)
        
    except requests.exceptions.ConnectionError:
        print("✗ 连接失败！请确保后端服务正在运行 (python main.py)")
        sys.exit(1)
    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
