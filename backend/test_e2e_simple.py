"""端到端测试（简化版）"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
from pathlib import Path

BASE_URL = "http://localhost:8000"


def test_complete_workflow():
    """测试完整工作流"""
    print("=" * 60)
    print("端到端测试：文档上传 → 变量提取 → 文档生成 → 下载")
    print("=" * 60)
    print()
    
    # Step 1: 健康检查
    print("Step 1: 健康检查")
    print("-" * 60)
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✓ 服务器运行正常\n")
        else:
            print(f"✗ 服务器异常: {response.status_code}\n")
            return False
    except Exception as e:
        print(f"✗ 无法连接到服务器: {e}\n")
        return False
    
    # Step 2: 生成文档（测试模式）
    print("Step 2: 生成文档")
    print("-" * 60)
    
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
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/generate/document",
            json={
                "template_id": "test",
                "data": test_data,
                "filename": "test_contract.docx"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 文档生成成功")
            print(f"  - 文档 ID: {result['document_id']}")
            print(f"  - 文件名: {result['filename']}")
            print(f"  - 文件大小: {result['file_size']:,} 字节")
            print(f"  - 生成耗时: {result['generation_time_ms']:.2f} 毫秒")
            print(f"  - 下载链接: {result['download_url']}\n")
            
            document_id = result['document_id']
            download_url = result['download_url']
        else:
            print(f"✗ 文档生成失败: {response.text}\n")
            return False
            
    except Exception as e:
        print(f"✗ 生成请求异常: {e}\n")
        return False
    
    # Step 3: 下载文档
    print("Step 3: 下载文档")
    print("-" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}{download_url}", timeout=10)
        
        if response.status_code == 200:
            # 保存到本地
            output_path = Path("../generated_test_contract.docx")
            with open(output_path, "wb") as f:
                f.write(response.content)
            
            print(f"✓ 文档下载成功")
            print(f"  - 保存路径: {output_path.absolute()}")
            print(f"  - 文件大小: {len(response.content):,} 字节\n")
        else:
            print(f"✗ 文档下载失败: {response.text}\n")
            return False
            
    except Exception as e:
        print(f"✗ 下载请求异常: {e}\n")
        return False
    
    # 成功
    print("=" * 60)
    print("✓ 端到端测试完成！")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = test_complete_workflow()
    sys.exit(0 if success else 1)
