"""API 测试脚本"""
import requests
import sys
from pathlib import Path

# 设置 UTF-8 编码
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# API 基础 URL
BASE_URL = "http://localhost:8000"


def test_health():
    """测试健康检查"""
    print("测试健康检查...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    assert response.status_code == 200
    print("✓ 健康检查通过\n")


def test_root():
    """测试根路径"""
    print("测试根路径...")
    response = requests.get(f"{BASE_URL}/")
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    assert response.status_code == 200
    print("✓ 根路径测试通过\n")


def test_parse_document():
    """测试文档解析"""
    print("测试文档解析...")
    
    # 查找测试文档
    test_doc_path = Path("../test-contract-template.docx")
    if not test_doc_path.exists():
        test_doc_path = Path("../汽车采购合同.docx")
    
    if not test_doc_path.exists():
        print("⚠ 未找到测试文档，跳过文档解析测试")
        return
    
    # 上传文档
    with open(test_doc_path, "rb") as f:
        files = {"file": (test_doc_path.name, f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        response = requests.post(f"{BASE_URL}/api/v1/documents/parse", files=files)
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"文件名: {result['filename']}")
        print(f"文件大小: {result['size']} 字节")
        print(f"文本长度: {len(result['text'])} 字符")
        print(f"段落数: {result['structure']['paragraphs_count']}")
        print(f"表格数: {result['structure']['tables_count']}")
        print(f"占位符数: {len(result['placeholders'])}")
        if result['placeholders']:
            print(f"占位符: {result['placeholders'][:5]}...")
        if result['warnings']:
            print(f"警告: {result['warnings']}")
        print("✓ 文档解析测试通过\n")
    else:
        print(f"✗ 文档解析失败: {response.text}\n")


def test_invalid_document():
    """测试无效文档"""
    print("测试无效文档...")
    
    # 尝试上传非 docx 文件
    files = {"file": ("test.txt", b"This is not a docx file", "text/plain")}
    response = requests.post(f"{BASE_URL}/api/v1/documents/parse", files=files)
    
    print(f"状态码: {response.status_code}")
    assert response.status_code == 400
    print(f"错误信息: {response.json()}")
    print("✓ 无效文档测试通过\n")


def main():
    """运行所有测试"""
    print("=" * 50)
    print("FastAPI 后端 API 测试")
    print("=" * 50)
    print()
    
    try:
        test_health()
        test_root()
        test_parse_document()
        test_invalid_document()
        
        print("=" * 50)
        print("✓ 所有测试通过!")
        print("=" * 50)
        
    except requests.exceptions.ConnectionError:
        print("✗ 连接失败！请确保后端服务正在运行 (python main.py)")
        sys.exit(1)
    except AssertionError as e:
        print(f"✗ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ 未知错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
