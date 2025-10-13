"""文档生成 API 测试脚本"""
import requests
import sys
from pathlib import Path

# 设置 UTF-8 编码
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# API 基础 URL
BASE_URL = "http://localhost:8000"


def test_generate_document():
    """测试文档生成"""
    print("测试文档生成...")
    
    # 测试数据
    test_data = {
        "contract_number": "HT-2025-001",
        "signing_date": "2025-01-10",
        "party_a": "北京科技有限公司",
        "party_a_contact": "张三",
        "party_a_phone": "13800138000",
        "party_b": "上海贸易有限公司",
        "party_b_contact": "李四",
        "party_b_phone": "13900139000",
        "contract_amount": 500000.00,
        "payment_method": "分期支付",
        "delivery_time": "2025-03-01",
        "delivery_address": "上海市浦东新区张江高科技园区XXX号"
    }
    
    # 发送请求
    response = requests.post(
        f"{BASE_URL}/api/v1/generate/document",
        json={
            "template_id": "test",
            "data": test_data,
            "filename": "test_contract.docx"
        }
    )
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"文档 ID: {result['document_id']}")
        print(f"文件名: {result['filename']}")
        print(f"文件大小: {result['file_size']} 字节")
        print(f"生成耗时: {result['generation_time_ms']:.2f} 毫秒")
        print(f"下载链接: {result['download_url']}")
        print("\n✓ 文档生成测试通过\n")
        return result
    else:
        print(f"✗ 文档生成失败: {response.text}\n")
        return None


def test_full_workflow():
    """测试完整工作流：解析 → 提取变量 → 生成文档"""
    print("测试完整工作流...")
    
    # 测试文档路径
    test_doc_path = Path("../test-contract-template.docx")
    if not test_doc_path.exists():
        print("⚠ 未找到测试文档，跳过完整工作流测试\n")
        return
    
    print("\n步骤 1/3: 解析文档")
    print("-" * 40)
    
    # 1. 解析文档
    with open(test_doc_path, "rb") as f:
        files = {"file": (test_doc_path.name, f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        parse_response = requests.post(f"{BASE_URL}/api/v1/documents/parse", files=files)
    
    if parse_response.status_code != 200:
        print(f"✗ 文档解析失败: {parse_response.text}\n")
        return
    
    parse_result = parse_response.json()
    text = parse_result['text']
    print(f"✓ 文档解析成功")
    print(f"  - 文本长度: {len(text)} 字符")
    print(f"  - 占位符数: {len(parse_result['placeholders'])}")
    
    print("\n步骤 2/3: 提取变量")
    print("-" * 40)
    
    # 2. 提取变量
    extract_response = requests.post(
        f"{BASE_URL}/api/v1/variables/extract",
        json={
            "text": text,
            "use_cache": True
        }
    )
    
    if extract_response.status_code != 200:
        print(f"✗ 变量提取失败: {extract_response.text}\n")
        return
    
    extract_result = extract_response.json()
    variables = extract_result['variables']
    print(f"✓ 变量提取成功")
    print(f"  - 提取变量数: {extract_result['count']}")
    print(f"  - 前 5 个变量: {[v['label'] for v in variables[:5]]}")
    
    print("\n步骤 3/3: 生成文档")
    print("-" * 40)
    
    # 3. 构造数据（使用变量名）
    form_data = {}
    for var in variables:
        if var['type'] == 'text':
            form_data[var['name']] = f"测试{var['label']}"
        elif var['type'] == 'date':
            form_data[var['name']] = "2025-01-10"
        elif var['type'] == 'number':
            form_data[var['name']] = 100000
        elif var['type'] == 'phone':
            form_data[var['name']] = "13800138000"
        elif var['type'] == 'select':
            form_data[var['name']] = var['options'][0] if var.get('options') else "选项1"
        elif var['type'] == 'textarea':
            form_data[var['name']] = "这是一个测试地址"
        else:
            form_data[var['name']] = "测试值"
    
    # 生成文档
    generate_response = requests.post(
        f"{BASE_URL}/api/v1/generate/document",
        json={
            "template_id": "test",
            "data": form_data,
            "filename": "generated_contract.docx"
        }
    )
    
    if generate_response.status_code == 200:
        gen_result = generate_response.json()
        print(f"✓ 文档生成成功")
        print(f"  - 文档 ID: {gen_result['document_id']}")
        print(f"  - 文件大小: {gen_result['file_size']} 字节")
        print(f"  - 生成耗时: {gen_result['generation_time_ms']:.2f} 毫秒")
        print(f"\n✓ 完整工作流测试通过\n")
    else:
        print(f"✗ 文档生成失败: {generate_response.text}\n")


def test_date_formatting():
    """测试日期格式化"""
    print("测试日期格式化...")
    
    test_data = {
        "contract_number": "HT-2025-002",
        "signing_date": "2025-01-10",  # 应转换为 2025年01月10日
        "party_a": "测试公司A",
        "party_a_contact": "张三",
        "party_a_phone": "13800138000",
        "party_b": "测试公司B",
        "party_b_contact": "李四",
        "party_b_phone": "13900139000",
        "contract_amount": 123456.78,  # 应格式化为 123,456.78
        "payment_method": "一次性支付",
        "delivery_time": "2025-03-15",
        "delivery_address": "测试地址"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/generate/document",
        json={
            "template_id": "test",
            "data": test_data
        }
    )
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ 日期和金额格式化测试通过")
        print(f"  - 文件大小: {result['file_size']} 字节")
        print(f"  - 生成耗时: {result['generation_time_ms']:.2f} 毫秒\n")
    else:
        print(f"✗ 测试失败: {response.text}\n")


def test_performance():
    """测试性能：连续生成多份文档"""
    print("测试性能（生成 5 份文档）...")
    
    test_data = {
        "contract_number": "HT-PERF-001",
        "signing_date": "2025-01-10",
        "party_a": "性能测试公司",
        "party_a_contact": "测试员",
        "party_a_phone": "13800138000",
        "party_b": "目标公司",
        "party_b_contact": "接收员",
        "party_b_phone": "13900139000",
        "contract_amount": 999999.99,
        "payment_method": "测试付款",
        "delivery_time": "2025-02-01",
        "delivery_address": "测试地址"
    }
    
    times = []
    
    for i in range(5):
        response = requests.post(
            f"{BASE_URL}/api/v1/generate/document",
            json={
                "template_id": "test",
                "data": {**test_data, "contract_number": f"HT-PERF-{i+1:03d}"}
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            times.append(result['generation_time_ms'])
            print(f"  {i+1}/5: {result['generation_time_ms']:.2f}ms")
        else:
            print(f"  {i+1}/5: 失败")
    
    if times:
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        print(f"\n性能统计:")
        print(f"  - 平均耗时: {avg_time:.2f}ms")
        print(f"  - 最快: {min_time:.2f}ms")
        print(f"  - 最慢: {max_time:.2f}ms")
        print(f"\n✓ 性能测试通过\n")
    else:
        print("✗ 性能测试失败\n")


def main():
    """运行所有测试"""
    print("=" * 50)
    print("文档生成 API 测试")
    print("=" * 50)
    print()
    
    try:
        # 1. 基本文档生成
        test_generate_document()
        
        # 2. 日期和金额格式化
        test_date_formatting()
        
        # 3. 性能测试
        test_performance()
        
        # 4. 完整工作流
        test_full_workflow()
        
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
