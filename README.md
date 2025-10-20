# 🤖 智能合同生成系统

基于 AI 的合同模板解析与自动填充系统,支持 Vercel 一键部署。

## 技术架构

- **前端**:纯 HTML/CSS/JavaScript(静态托管)
- **后端**:Vercel Serverless Functions (Python)
- **核心库**:
  - `python-docx`:文档解析
  - `docxtpl`:Jinja2 模板渲染
  - `google-generativeai`:AI 变量提取 (Gemini 1.5 Flash)

## 工作流程

1. **上传模板**:用户上传 `.docx` 格式合同模板
2. **AI 分析**:使用 Google Gemini 1.5 Flash 提取可变字段
3. **表单填写**:动态生成表单供用户填写
4. **文档生成**:使用 `docxtpl` 渲染最终合同
5. **下载交付**:返回填充完整的 `.docx` 文件

## 本地开发

### 环境准备

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 设置环境变量
set GEMINI_API_KEY=your-gemini-api-key  # Windows PowerShell
export GEMINI_API_KEY=your-gemini-api-key  # Linux/Mac
```

### 本地测试

```bash
# 安装 Vercel CLI
npm install -g vercel

# 启动本地开发服务器
vercel dev
```

访问 `http://localhost:3000` 查看应用。

## Vercel 部署

### 方式一:命令行部署

```bash
# 登录 Vercel
vercel login

# 首次部署
vercel

# 生产部署
vercel --prod
```

### 方式二:GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel Dashboard](https://vercel.com/dashboard) 导入项目
3. 在 Settings → Environment Variables 添加 `GEMINI_API_KEY`
4. 自动部署完成

### 环境变量配置

在 Vercel 项目设置中添加:

| 变量名 | 说明 | 获取地址 |
|--------|------|----------|
| `GEMINI_API_KEY` | Google Gemini API 密钥 | [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey) |

**配置步骤**:
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建 API Key
3. 在 Vercel 项目中：Settings → Environment Variables → Add New
4. Name: `GEMINI_API_KEY`, Value: 粘贴你的密钥
5. 选择应用环境（Production, Preview, Development）

## API 端点

### POST /api/upload
上传并解析 docx 模板

**请求体**:
```json
{
  "file": "base64_encoded_docx"
}
```

**响应**:
```json
{
  "text": "提取的纯文本",
  "original_file": "base64_encoded_original"
}
```

### POST /api/extract
AI 提取变量

**请求体**:
```json
{
  "text": "合同文本内容"
}
```

**响应**:
```json
{
  "variables": [
    {
      "key": "jiafang",
      "label": "甲方",
      "type": "text",
      "required": true
    }
  ]
}
```

### POST /api/render
渲染最终文档

**请求体**:
```json
{
  "template": "base64_original_file",
  "data": {
    "jiafang": "某某公司",
    "yifang": "某某个人"
  }
}
```

**响应**:
```json
{
  "file": "base64_encoded_result",
  "filename": "contract_filled.docx"
}
```

## 模板要求

合同模板需使用 Jinja2 语法标记变量(AI 会自动识别并建议):

```
甲方:{{ jiafang }}
乙方:{{ yifang }}
签订日期:{{ sign_date }}
合同金额:{{ amount }} 元
```

**注意**:首次上传时无需手动标记,AI 会识别潜在变量并提示用户确认。

## 常见问题

### 1. API 调用失败
- 检查 `GEMINI_API_KEY` 环境变量是否正确设置
- 确认 API Key 有效且有配额
- Gemini API 免费额度：每分钟15次请求

### 2. 文档格式丢失
- 确保使用原始 `.docx` 文件作为模板
- 避免在纯文本编辑器中打开模板

### 3. 变量提取不准确
- 在模板中使用明确的字段标识(如"甲方:"、"日期:")
- 可调整 `api/extract.py` 中的 system prompt

## 技术细节

### 文本提取逻辑
使用 `python-docx` 的 `element.body` 按 DOM 顺序遍历:
- 段落 (`<w:p>`)
- 表格 (`<w:tbl>`)
- 保留原始阅读顺序

### 变量命名规范
- **key**:ASCII 拼音(`jiafang`, `sign_date`)
- **label**:中文显示标签(`甲方`, `签订日期`)
- 使用 `pinyin` 库自动转换

### 渲染机制
`docxtpl` 基于 Jinja2,支持:
- 变量替换:`{{ variable }}`
- 条件判断:`{% if condition %}`
- 循环:`{% for item in list %}`

## License

MIT
