# 合同模板智能处理系统

## 项目概述

这是一个基于AI的合同模板智能处理系统，能够：
1. 自动解析 .docx 合同模板
2. 使用AI识别合同中的变量字段
3. 提供友好的表单供用户填写
4. 生成格式完全保留的最终合同文档

## 技术栈

- **模块一：模板解析** - `python-docx`
- **模块二：AI变量提取** - `LangExtract` + LLM (GPT-4o/Gemini)
- **模块三：后端API** - `FastAPI`
- **模块四：文档生成** - `python-docx-template`
- **前端界面** - HTML/JavaScript/Bootstrap

## 项目结构

```
contract_system/
├── backend/                    # 后端服务
│   ├── main.py                # FastAPI主应用
│   ├── services/              # 业务逻辑
│   │   ├── template_parser.py    # 模块一：模板解析
│   │   ├── variable_extractor.py # 模块二：AI变量提取
│   │   └── document_generator.py # 模块四：文档生成
│   ├── models/                # 数据模型
│   │   └── schemas.py
│   ├── config.py              # 配置文件
│   └── requirements.txt       # Python依赖
├── frontend/                  # 前端界面
│   ├── index.html            # 主页面
│   ├── css/
│   └── js/
├── templates/                 # 合同模板存储
├── generated/                 # 生成的合同存储
└── tests/                     # 测试文件

```

## 工作流程

```
用户上传 .docx
    ↓
[模块一] python-docx 解析文档，提取文本
    ↓
[模块二] LangExtract 调用LLM，识别变量
    ↓
[模块三] FastAPI 生成表单，用户填写数据
    ↓
[模块四] python-docx-template 渲染模板
    ↓
用户下载最终合同
```

## 安装指南

### 1. 安装Python依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件：

```
# LLM API配置
OPENAI_API_KEY=your_api_key_here
# 或使用Gemini
GEMINI_API_KEY=your_api_key_here

# 应用配置
HOST=0.0.0.0
PORT=8000
```

### 3. 启动后端服务

```bash
cd backend
python main.py
```

或使用uvicorn：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问前端

打开浏览器访问：`http://localhost:8000`

## API接口文档

### 1. 上传模板并提取变量

**POST** `/api/upload-template`

- **请求**: multipart/form-data，包含 .docx 文件
- **响应**: JSON，包含识别出的变量列表

```json
{
  "template_id": "uuid",
  "variables": [
    {"name": "甲方", "type": "text", "description": "合同甲方名称"},
    {"name": "签订日期", "type": "date", "description": "合同签订日期"}
  ]
}
```

### 2. 提交用户数据并生成合同

**POST** `/api/generate-contract`

- **请求**: JSON
```json
{
  "template_id": "uuid",
  "data": {
    "甲方": "XX科技有限公司",
    "签订日期": "2025年10月13日"
  }
}
```

- **响应**: 下载 .docx 文件

## 核心特性

### 🎯 高保真文档生成

使用 `python-docx-template` 确保最终文档：
- 格式完全保留（字体、颜色、表格）
- 样式一致
- 布局精确

### 🤖 智能变量识别

通过 LangExtract + LLM：
- 自动识别合同关键字段
- 理解变量语义
- 支持自定义提示词

### ⚡ 快速部署

- 单一后端服务
- 简单的依赖管理
- 即开即用

## 使用示例

1. **准备模板**：创建包含 Jinja2 标签的 .docx 模板
   ```
   甲方：{{ 甲方 }}
   乙方：{{ 乙方 }}
   签订日期：{{ 签订日期 }}
   合同金额：{{ 合同金额 }} 元
   ```

2. **上传模板**：通过前端界面上传

3. **AI识别变量**：系统自动识别 `甲方`、`乙方`、`签订日期`、`合同金额`

4. **填写表单**：在动态生成的表单中填写具体值

5. **下载合同**：获取格式完整的最终合同

## 开发指南

### 添加自定义变量提取规则

编辑 `backend/services/variable_extractor.py`：

```python
EXTRACTION_PROMPT = """
从合同文本中提取以下类型的变量：
- 当事人信息（甲方、乙方）
- 时间信息（签订日期、生效日期）
- 金额信息（合同金额、付款金额）
- 自定义字段...
"""
```

### 扩展LLM支持

系统支持多种LLM：
- OpenAI GPT-4o
- Google Gemini
- 本地模型（通过兼容接口）

## 故障排除

### 问题1：文档格式丢失

- **原因**：使用了纯文本渲染
- **解决**：确保使用 `python-docx-template`，而非手动替换

### 问题2：变量识别不准确

- **原因**：LLM提示词不够明确
- **解决**：在 `variable_extractor.py` 中优化提示词，添加更多示例

### 问题3：中文乱码

- **原因**：编码问题
- **解决**：确保所有文件使用 UTF-8 编码

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请联系项目维护者。
