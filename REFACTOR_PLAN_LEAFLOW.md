# 智能合同模板系统重构方案（全栈 Leaflow 部署版）

## 📋 项目概述

### 当前状态
- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes (Vercel Serverless Functions)
- **数据库**: PostgreSQL + Prisma ORM
- **核心功能**: 飞书文档集成、OCR识别、文本替换

### 重构目标
将系统重构为**专注于合同模板处理**的应用，**全栈部署在 Leaflow 平台**：
- **Python FastAPI** 后端（容器化部署）
- **Next.js** 前端（容器化部署或静态站点）
- **PostgreSQL** 数据库（Leaflow 应用商店一键安装）
- **MinIO** 对象存储（S3 兼容，用于文件存储）
- **核心流程**: 模板上传 → AI变量提取 → 动态表单 → 高保真文档生成

---

## 🏗️ 全新架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Leaflow 云平台                             │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              用户访问层（域名 + SSL）                    │  │
│  │         your-app.leaflow.dev / custom-domain.com      │  │
│  └─────────────────────┬─────────────────────────────────┘  │
│                        │                                     │
│       ┌────────────────┴────────────────┐                   │
│       │                                  │                   │
│  ┌────▼─────────┐              ┌────────▼────────┐          │
│  │  前端容器     │              │   后端容器       │          │
│  │  Next.js     │◄────────────►│   FastAPI       │          │
│  │  (Node.js)   │   API 调用   │   (Python)      │          │
│  └──────────────┘              └────────┬────────┘          │
│                                         │                    │
│                    ┌────────────────────┼────────────────┐  │
│                    │                    │                │  │
│            ┌───────▼─────┐      ┌──────▼──────┐  ┌──────▼──────┐
│            │ PostgreSQL  │      │   MinIO     │  │   Redis     │
│            │   数据库    │      │  对象存储   │  │   缓存      │
│            │ (应用商店)  │      │ (应用商店)  │  │ (应用商店)  │
│            └─────────────┘      └─────────────┘  └─────────────┘
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 容器化部署拓扑

```yaml
# Leaflow 工作负载配置

1. 前端容器 (next-frontend)
   - 镜像: node:20-alpine
   - 端口: 3000
   - 资源: 1GB RAM, 1 CPU
   - 副本数: 2 (高可用)

2. 后端容器 (fastapi-backend)
   - 镜像: python:3.11-slim
   - 端口: 8000
   - 资源: 2GB RAM, 2 CPU
   - 副本数: 3 (高并发)

3. PostgreSQL (从应用商店安装)
   - 版本: PostgreSQL 15
   - 存储: 10GB SSD
   - 自动备份: 每日

4. MinIO (从应用商店安装)
   - 存储: 20GB SSD
   - S3 兼容 API
   - 用于存储 .docx 文件

5. Redis (从应用商店安装)
   - 内存: 512MB
   - 用于缓存变量提取结果
```

---

## 🔧 四大核心模块详解

### 模块一：模板解析服务 (Document Parser)

**技术栈**: `python-docx`

**功能职责**:
1. 接收用户上传的 `.docx` 模板文件
2. 提取纯文本内容（按阅读顺序）
3. 保留文档结构信息（段落、表格、样式）
4. 识别文档元数据

**核心代码示例**:
```python
# backend/services/document_parser.py
from docx import Document
from typing import Dict, List, Any
import io

class DocumentParser:
    def __init__(self, file_bytes: bytes):
        self.doc = Document(io.BytesIO(file_bytes))
    
    def extract_text(self) -> str:
        """提取文档全文"""
        full_text = []
        
        # 提取段落文本
        for para in self.doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text)
        
        # 提取表格文本
        for table in self.doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        full_text.append(cell.text)
        
        return "\n".join(full_text)
    
    def get_structure(self) -> Dict[str, Any]:
        """获取文档结构"""
        return {
            "paragraphs_count": len(self.doc.paragraphs),
            "tables_count": len(self.doc.tables),
            "sections_count": len(self.doc.sections),
            "styles_used": list(set([p.style.name for p in self.doc.paragraphs if p.style]))
        }
    
    def validate(self) -> Dict[str, Any]:
        """验证文档有效性"""
        try:
            text = self.extract_text()
            return {
                "valid": True,
                "text_length": len(text),
                "has_content": len(text) > 0
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e)
            }
```

**API 端点**:
```python
# backend/routers/documents.py
from fastapi import APIRouter, UploadFile, HTTPException
from services.document_parser import DocumentParser

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

@router.post("/parse")
async def parse_document(file: UploadFile):
    """解析上传的文档"""
    if not file.filename.endswith('.docx'):
        raise HTTPException(400, "只支持 .docx 格式")
    
    content = await file.read()
    parser = DocumentParser(content)
    
    validation = parser.validate()
    if not validation["valid"]:
        raise HTTPException(400, f"文档无效: {validation['error']}")
    
    return {
        "text": parser.extract_text(),
        "structure": parser.get_structure(),
        "filename": file.filename,
        "size": len(content)
    }
```

---

### 模块二：AI 变量提取服务 (Variable Extractor)

**技术栈**: `LangExtract` + `Gemini API`

**功能职责**:
1. 接收纯文本内容
2. 使用 LangExtract 调用大语言模型
3. 识别合同中的关键变量字段
4. 返回结构化的变量列表（JSON Schema）

**核心实现**:
```python
# backend/services/variable_extractor.py
from typing import List, Dict, Any
import httpx
import os
from tenacity import retry, stop_after_attempt, wait_exponential

class VariableExtractor:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def extract_variables(self, text: str, examples: List[Dict] = None) -> List[Dict]:
        """提取合同变量"""
        
        prompt = self._build_prompt(text, examples)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/models/{self.model}:generateContent",
                headers={"Content-Type": "application/json"},
                params={"key": self.api_key},
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.2,
                        "topK": 40,
                        "topP": 0.95,
                        "maxOutputTokens": 8192,
                        "responseMimeType": "application/json"
                    }
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Gemini API 错误: {response.text}")
            
            result = response.json()
            variables_text = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # 解析 JSON
            import json
            variables = json.loads(variables_text)
            
            return variables.get("variables", [])
    
    def _build_prompt(self, text: str, examples: List[Dict] = None) -> str:
        """构建提示词"""
        prompt = f"""
你是一个专业的合同分析助手。请分析以下合同文本，提取所有需要填写的变量字段。

**输出格式（JSON）**：
{{
  "variables": [
    {{
      "name": "变量英文标识符（小写下划线命名）",
      "label": "显示标签（中文）",
      "type": "数据类型",
      "required": true/false,
      "description": "变量说明",
      "default": "默认值（可选）",
      "options": ["选项1", "选项2"]（仅 select 类型）
    }}
  ]
}}

**支持的数据类型**：
- text: 文本输入
- number: 数字输入
- date: 日期选择
- select: 下拉选择
- textarea: 多行文本
- email: 邮箱
- phone: 电话号码

**提取规则**：
1. 识别所有需要用户填写的信息（公司名称、日期、金额等）
2. 为每个变量生成合适的 name（如 party_a, contract_date）
3. 判断变量是否必填
4. 选择最合适的数据类型
5. 对于常见字段（如性别、省份等），提供 options 列表

**合同文本**：
{text}

请直接返回 JSON 格式的结果，不要包含其他说明文字。
"""
        
        if examples:
            prompt += "\n\n**参考示例**：\n"
            for example in examples:
                prompt += f"- {example}\n"
        
        return prompt
```

**API 端点**:
```python
# backend/routers/variables.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.variable_extractor import VariableExtractor
from services.cache_service import CacheService
import hashlib

router = APIRouter(prefix="/api/v1/variables", tags=["variables"])

class ExtractRequest(BaseModel):
    text: str
    examples: List[Dict] = None
    use_cache: bool = True

@router.post("/extract")
async def extract_variables(request: ExtractRequest):
    """提取变量（带缓存）"""
    
    # 计算文本哈希用于缓存
    text_hash = hashlib.sha256(request.text.encode()).hexdigest()
    
    # 检查缓存
    if request.use_cache:
        cache = CacheService()
        cached = await cache.get(f"variables:{text_hash}")
        if cached:
            return {"variables": cached, "from_cache": True}
    
    # 调用 AI 提取
    extractor = VariableExtractor()
    try:
        variables = await extractor.extract_variables(
            text=request.text,
            examples=request.examples
        )
        
        # 保存到缓存
        if request.use_cache:
            await cache.set(f"variables:{text_hash}", variables, ttl=86400)  # 24小时
        
        return {
            "variables": variables,
            "from_cache": False,
            "count": len(variables)
        }
    except Exception as e:
        raise HTTPException(500, f"变量提取失败: {str(e)}")
```

---

### 模块三：动态表单生成 (Form Generator)

**前端实现**:
```typescript
// frontend/src/components/DynamicForm.tsx
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';

interface Variable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'phone';
  required: boolean;
  description?: string;
  default?: string;
  options?: string[];
}

interface DynamicFormProps {
  variables: Variable[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading?: boolean;
}

export function DynamicForm({ variables, onSubmit, loading = false }: DynamicFormProps) {
  // 动态生成 Zod Schema
  const generateSchema = () => {
    const schemaShape: Record<string, any> = {};
    
    variables.forEach(v => {
      let field: any;
      
      switch (v.type) {
        case 'number':
          field = z.coerce.number({ message: `${v.label}必须是数字` });
          break;
        case 'email':
          field = z.string().email(`${v.label}格式不正确`);
          break;
        case 'phone':
          field = z.string().regex(/^1[3-9]\d{9}$/, `${v.label}格式不正确`);
          break;
        case 'date':
          field = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确');
          break;
        default:
          field = z.string();
      }
      
      if (v.required) {
        field = field.min(1, `${v.label}不能为空`);
      } else {
        field = field.optional();
      }
      
      schemaShape[v.name] = field;
    });
    
    return z.object(schemaShape);
  };
  
  const schema = generateSchema();
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: variables.reduce((acc, v) => ({
      ...acc,
      [v.name]: v.default || ''
    }), {})
  });
  
  const renderField = (variable: Variable) => {
    const commonProps = {
      className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    };
    
    return (
      <Controller
        name={variable.name}
        control={control}
        render={({ field }) => {
          switch (variable.type) {
            case 'textarea':
              return <textarea {...field} {...commonProps} rows={4} />;
            
            case 'select':
              return (
                <select {...field} {...commonProps}>
                  <option value="">请选择</option>
                  {variable.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              );
            
            case 'date':
              return <input type="date" {...field} {...commonProps} />;
            
            case 'number':
              return <input type="number" {...field} {...commonProps} />;
            
            case 'email':
              return <input type="email" {...field} {...commonProps} />;
            
            case 'phone':
              return <input type="tel" {...field} {...commonProps} placeholder="13800138000" />;
            
            default:
              return <input type="text" {...field} {...commonProps} />;
          }
        }}
      />
    );
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {variables.map(variable => (
        <div key={variable.name} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {variable.label}
            {variable.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {variable.description && (
            <p className="text-sm text-gray-500">{variable.description}</p>
          )}
          
          {renderField(variable)}
          
          {errors[variable.name] && (
            <p className="text-sm text-red-600">
              {errors[variable.name]?.message as string}
            </p>
          )}
        </div>
      ))}
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '生成中...' : '生成合同'}
      </button>
    </form>
  );
}
```

---

### 模块四：高保真文档生成 (Document Generator)

**技术栈**: `python-docx-template` (Jinja2)

**核心实现**:
```python
# backend/services/document_generator.py
from docxtpl import DocxTemplate
from typing import Dict, Any
import io
from datetime import datetime

class DocumentGenerator:
    def __init__(self, template_bytes: bytes):
        """从字节流初始化模板"""
        self.template = DocxTemplate(io.BytesIO(template_bytes))
    
    def render(self, context: Dict[str, Any]) -> bytes:
        """渲染文档"""
        # 预处理上下文数据
        processed_context = self._preprocess_context(context)
        
        # 填充数据
        self.template.render(processed_context)
        
        # 保存到内存
        file_stream = io.BytesIO()
        self.template.save(file_stream)
        file_stream.seek(0)
        
        return file_stream.getvalue()
    
    def _preprocess_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """预处理上下文数据"""
        processed = context.copy()
        
        # 处理日期格式
        for key, value in processed.items():
            if isinstance(value, str):
                # 尝试解析日期
                try:
                    date_obj = datetime.fromisoformat(value)
                    processed[key] = date_obj.strftime('%Y年%m月%d日')
                except:
                    pass
            
            # 处理数字格式（添加千位分隔符）
            if isinstance(value, (int, float)) and 'amount' in key.lower():
                processed[key] = f"{value:,.2f}"
        
        return processed
    
    def render_with_tables(self, 
                          context: Dict[str, Any], 
                          table_data: Dict[str, List[Dict]]) -> bytes:
        """渲染包含表格数据的文档"""
        # 合并上下文和表格数据
        full_context = {
            **context,
            **table_data
        }
        
        return self.render(full_context)
```

**API 端点**:
```python
# backend/routers/generate.py
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Dict, Any
from services.document_generator import DocumentGenerator
from services.storage_service import StorageService
from services.database import get_db
from models import GeneratedDocument
import uuid

router = APIRouter(prefix="/api/v1/generate", tags=["generate"])

class GenerateRequest(BaseModel):
    template_id: str
    data: Dict[str, Any]
    filename: str = None

@router.post("/document")
async def generate_document(request: GenerateRequest):
    """生成合同文档"""
    
    start_time = datetime.now()
    
    try:
        # 1. 从存储获取模板文件
        storage = StorageService()
        template_bytes = await storage.download(f"templates/{request.template_id}.docx")
        
        # 2. 渲染文档
        generator = DocumentGenerator(template_bytes)
        output_bytes = generator.render(request.data)
        
        # 3. 上传到存储
        output_filename = request.filename or f"contract_{uuid.uuid4().hex[:8]}.docx"
        output_key = f"generated/{output_filename}"
        output_url = await storage.upload(output_key, output_bytes)
        
        # 4. 保存记录到数据库
        db = get_db()
        record = GeneratedDocument(
            id=str(uuid.uuid4()),
            template_id=request.template_id,
            input_data=request.data,
            output_url=output_url,
            output_filename=output_filename,
            file_size=len(output_bytes),
            generation_time=(datetime.now() - start_time).total_seconds() * 1000
        )
        db.add(record)
        db.commit()
        
        return {
            "success": True,
            "document_id": record.id,
            "download_url": output_url,
            "filename": output_filename,
            "generation_time_ms": record.generation_time
        }
        
    except Exception as e:
        raise HTTPException(500, f"生成失败: {str(e)}")

@router.get("/document/{document_id}/download")
async def download_document(document_id: str):
    """下载生成的文档"""
    db = get_db()
    doc = db.query(GeneratedDocument).filter_by(id=document_id).first()
    
    if not doc:
        raise HTTPException(404, "文档不存在")
    
    # 从存储下载文件
    storage = StorageService()
    file_bytes = await storage.download_from_url(doc.output_url)
    
    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{doc.output_filename}"'
        }
    )
```

---

## 🗄️ 数据库设计（PostgreSQL on Leaflow）

### 安装 PostgreSQL

```bash
# 在 Leaflow 应用商店搜索 PostgreSQL
# 一键安装 PostgreSQL 15
# 获取连接信息：
# Host: postgres-service.default.svc.cluster.local
# Port: 5432
# Database: contract_db
# Username: admin
# Password: [自动生成]
```

### 表结构设计

```sql
-- 用户表（简化版，或复用现有）
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 模板表
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 文件信息
    file_url TEXT NOT NULL,  -- MinIO URL
    storage_key TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    -- 模板元数据
    variables JSONB,  -- 变量定义
    structure JSONB,  -- 文档结构
    text_hash VARCHAR(64),  -- 用于缓存查询
    
    -- 状态
    status VARCHAR(50) DEFAULT 'active',  -- active, archived, deleted
    is_public BOOLEAN DEFAULT false,
    
    -- 统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_text_hash (text_hash)
);

-- 生成记录表
CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    
    -- 输入数据
    input_data JSONB NOT NULL,
    
    -- 输出文件
    output_url TEXT NOT NULL,  -- MinIO URL
    output_filename VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL,
    file_size INTEGER,
    
    -- 元数据
    generation_time FLOAT,  -- 毫秒
    status VARCHAR(50) DEFAULT 'completed',  -- pending, completed, failed
    error_message TEXT,
    
    -- IP 和 User Agent
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_template_id (template_id),
    INDEX idx_created_at (created_at)
);

-- 变量提取缓存表
CREATE TABLE variable_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text_hash VARCHAR(64) NOT NULL UNIQUE,
    variables JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    
    INDEX idx_text_hash (text_hash),
    INDEX idx_expires_at (expires_at)
);

-- 系统配置表
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'string',  -- string, number, boolean, json
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 审计日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,  -- upload_template, generate_document, delete_template
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);
```

---

## 📦 MinIO 对象存储配置

### 安装 MinIO

```bash
# 在 Leaflow 应用商店搜索 MinIO
# 一键安装 MinIO
# 获取连接信息：
# Endpoint: minio-service.default.svc.cluster.local:9000
# Access Key: [自动生成]
# Secret Key: [自动生成]
# Console: http://minio-console.your-app.leaflow.dev
```

### 存储桶结构

```
contract-storage/
├── templates/          # 用户上传的模板
│   ├── {user_id}/
│   │   └── {template_id}.docx
├── generated/          # 生成的合同
│   ├── {user_id}/
│   │   └── {document_id}.docx
└── temp/              # 临时文件（24小时自动清理）
    └── {upload_id}.docx
```

### MinIO 客户端服务

```python
# backend/services/storage_service.py
from minio import Minio
from minio.error import S3Error
import os
from typing import Optional
import io

class StorageService:
    def __init__(self):
        self.client = Minio(
            endpoint=os.getenv("MINIO_ENDPOINT"),
            access_key=os.getenv("MINIO_ACCESS_KEY"),
            secret_key=os.getenv("MINIO_SECRET_KEY"),
            secure=os.getenv("MINIO_SECURE", "false").lower() == "true"
        )
        self.bucket = os.getenv("MINIO_BUCKET", "contract-storage")
        self._ensure_bucket()
    
    def _ensure_bucket(self):
        """确保存储桶存在"""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except S3Error as e:
            print(f"Bucket 创建失败: {e}")
    
    async def upload(self, object_name: str, data: bytes, 
                    content_type: str = None) -> str:
        """上传文件"""
        try:
            self.client.put_object(
                bucket_name=self.bucket,
                object_name=object_name,
                data=io.BytesIO(data),
                length=len(data),
                content_type=content_type or "application/octet-stream"
            )
            
            # 返回访问 URL
            url = f"http://{os.getenv('MINIO_ENDPOINT')}/{self.bucket}/{object_name}"
            return url
        except S3Error as e:
            raise Exception(f"上传失败: {e}")
    
    async def download(self, object_name: str) -> bytes:
        """下载文件"""
        try:
            response = self.client.get_object(self.bucket, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            raise Exception(f"下载失败: {e}")
    
    async def delete(self, object_name: str) -> bool:
        """删除文件"""
        try:
            self.client.remove_object(self.bucket, object_name)
            return True
        except S3Error as e:
            print(f"删除失败: {e}")
            return False
    
    def get_presigned_url(self, object_name: str, expires: int = 3600) -> str:
        """获取预签名 URL（用于直接下载）"""
        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=object_name,
                expires=expires
            )
            return url
        except S3Error as e:
            raise Exception(f"生成 URL 失败: {e}")
```

---

## 🐳 Leaflow 部署配置

### 后端部署（FastAPI）

#### Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### requirements.txt
```txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.12
python-docx==1.1.2
python-docxtpl==0.16.7
pydantic==2.9.2
pydantic-settings==2.5.2
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
alembic==1.13.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1
httpx==0.27.2
tenacity==9.0.0
minio==7.2.9
redis==5.2.0
```

#### 清单部署文件
```yaml
# backend/leaflow.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-backend
  labels:
    app: fastapi-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastapi-backend
  template:
    metadata:
      labels:
        app: fastapi-backend
    spec:
      containers:
      - name: fastapi
        image: your-registry/contract-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: "postgresql://admin:password@postgres-service:5432/contract_db"
        - name: MINIO_ENDPOINT
          value: "minio-service:9000"
        - name: MINIO_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: minio-secret
              key: access-key
        - name: MINIO_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: minio-secret
              key: secret-key
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: gemini-key
        - name: REDIS_URL
          value: "redis://redis-service:6379/0"
        resources:
          requests:
            memory: "2Gi"
            cpu: "2000m"
          limits:
            memory: "4Gi"
            cpu: "4000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: fastapi-backend-service
spec:
  selector:
    app: fastapi-backend
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: ClusterIP
```

---

### 前端部署（Next.js）

#### Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产镜像
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 复制必要文件
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

#### next.config.js（修改）
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // 启用独立输出模式
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://fastapi-backend-service:8000'
  }
}

module.exports = nextConfig
```

#### 清单部署文件
```yaml
# frontend/leaflow.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-frontend
  labels:
    app: nextjs-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nextjs-frontend
  template:
    metadata:
      labels:
        app: nextjs-frontend
    spec:
      containers:
      - name: nextjs
        image: your-registry/contract-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.your-domain.com"
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: nextjs-frontend-service
spec:
  selector:
    app: nextjs-frontend
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
  type: LoadBalancer  # 或 NodePort
```

---

## 🚀 部署步骤

### 第一步：准备 Leaflow 环境

1. **注册 Leaflow 账号**
   ```
   访问: https://leaflow.net/register
   完成注册并登录
   ```

2. **安装依赖服务（应用商店）**
   - PostgreSQL 15
   - MinIO
   - Redis

3. **配置数据库**
   ```sql
   -- 连接到 PostgreSQL
   CREATE DATABASE contract_db;
   
   -- 运行迁移脚本
   psql -h postgres-service -U admin -d contract_db -f schema.sql
   ```

4. **配置 MinIO**
   - 创建存储桶：`contract-storage`
   - 设置访问策略：允许读取 `generated/*`
   - 生成 Access Key 和 Secret Key

---

### 第二步：部署后端

1. **构建 Docker 镜像**
   ```bash
   cd backend
   docker build -t your-registry/contract-backend:latest .
   docker push your-registry/contract-backend:latest
   ```

2. **在 Leaflow 创建 Secret**
   ```bash
   # 通过 Leaflow 控制台创建 Secret
   名称: api-secrets
   数据:
     gemini-key: YOUR_GEMINI_API_KEY
   
   名称: minio-secret
   数据:
     access-key: YOUR_MINIO_ACCESS_KEY
     secret-key: YOUR_MINIO_SECRET_KEY
   ```

3. **部署清单**
   - 在 Leaflow 控制台选择"清单部署"
   - 上传 `backend/leaflow.yaml`
   - 等待部署完成

4. **验证部署**
   ```bash
   curl https://api.your-app.leaflow.dev/health
   ```

---

### 第三步：部署前端

1. **修改 API 配置**
   ```typescript
   // frontend/src/lib/api-client.ts
   const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.your-app.leaflow.dev';
   ```

2. **构建 Docker 镜像**
   ```bash
   cd frontend
   docker build -t your-registry/contract-frontend:latest .
   docker push your-registry/contract-frontend:latest
   ```

3. **部署清单**
   - 在 Leaflow 控制台选择"清单部署"
   - 上传 `frontend/leaflow.yaml`
   - 等待部署完成

4. **配置域名**
   - 在 Leaflow 控制台绑定自定义域名
   - 启用 SSL 证书（自动申请）

---

### 第四步：测试验证

1. **健康检查**
   ```bash
   # 后端
   curl https://api.your-app.leaflow.dev/health
   
   # 前端
   curl https://your-app.leaflow.dev
   ```

2. **功能测试**
   - 用户注册/登录
   - 上传模板
   - 提取变量
   - 填写表单
   - 生成合同
   - 下载文件

---

## 📊 资源配置建议

### 小型团队（< 100 用户）

```yaml
后端:
  replicas: 2
  resources:
    memory: 1GB
    cpu: 1000m (1核)

前端:
  replicas: 1
  resources:
    memory: 512MB
    cpu: 500m (0.5核)

数据库:
  storage: 10GB SSD

MinIO:
  storage: 20GB SSD

总成本: 约 ¥150-200/月
```

### 中型企业（100-1000 用户）

```yaml
后端:
  replicas: 3
  resources:
    memory: 2GB
    cpu: 2000m (2核)

前端:
  replicas: 2
  resources:
    memory: 1GB
    cpu: 1000m (1核)

数据库:
  storage: 50GB SSD

MinIO:
  storage: 100GB SSD

总成本: 约 ¥500-800/月
```

---

## 🔐 安全配置

### 环境变量管理

```bash
# 在 Leaflow Secret 中配置
DATABASE_URL=postgresql://admin:***@postgres-service:5432/contract_db
MINIO_ENDPOINT=minio-service:9000
MINIO_ACCESS_KEY=***
MINIO_SECRET_KEY=***
GEMINI_API_KEY=***
JWT_SECRET=***
REDIS_URL=redis://redis-service:6379/0
```

### 网络策略

```yaml
# 只允许前端访问后端
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: fastapi-backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nextjs-frontend
```

---

## 📈 监控和日志

### 日志收集

```python
# backend/main.py
import logging
from logging.handlers import RotatingFileHandler

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler('app.log', maxBytes=10485760, backupCount=10),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
```

### 性能监控

```python
# backend/middleware/monitoring.py
from fastapi import Request
import time

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"{request.method} {request.url.path} - {process_time:.2f}s")
    return response
```

---

## 🔄 CI/CD 流程

### GitHub Actions 示例

```yaml
# .github/workflows/deploy.yml
name: Deploy to Leaflow

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Backend Image
        run: |
          cd backend
          docker build -t ${{ secrets.REGISTRY }}/contract-backend:${{ github.sha }} .
          docker push ${{ secrets.REGISTRY }}/contract-backend:${{ github.sha }}
      
      - name: Deploy to Leaflow
        run: |
          # 使用 Leaflow CLI 或 API 部署
          leaflow deploy --image ${{ secrets.REGISTRY }}/contract-backend:${{ github.sha }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Frontend Image
        run: |
          cd frontend
          docker build -t ${{ secrets.REGISTRY }}/contract-frontend:${{ github.sha }} .
          docker push ${{ secrets.REGISTRY }}/contract-frontend:${{ github.sha }}
      
      - name: Deploy to Leaflow
        run: |
          leaflow deploy --image ${{ secrets.REGISTRY }}/contract-frontend:${{ github.sha }}
```

---

## 📝 迁移检查清单

### 准备阶段
- [ ] 注册 Leaflow 账号
- [ ] 了解 Leaflow 计费规则
- [ ] 规划资源配置

### 环境搭建
- [ ] 安装 PostgreSQL
- [ ] 安装 MinIO
- [ ] 安装 Redis
- [ ] 创建数据库表
- [ ] 创建 MinIO 存储桶
- [ ] 配置 Secrets

### 后端开发
- [ ] 创建 FastAPI 项目结构
- [ ] 实现四大核心模块
- [ ] 编写 Dockerfile
- [ ] 编写清单部署文件
- [ ] 本地测试
- [ ] 构建镜像

### 前端开发
- [ ] 重构 Next.js 代码
- [ ] 实现动态表单组件
- [ ] 对接后端 API
- [ ] 编写 Dockerfile
- [ ] 编写清单部署文件
- [ ] 本地测试
- [ ] 构建镜像

### 部署上线
- [ ] 推送镜像到 Registry
- [ ] 部署后端服务
- [ ] 部署前端服务
- [ ] 配置域名和 SSL
- [ ] 配置负载均衡
- [ ] 验证健康检查

### 测试验证
- [ ] 端到端测试
- [ ] 性能压测
- [ ] 安全扫描
- [ ] 用户验收测试

---

## 💰 成本估算（Leaflow）

### 基础配置（每月）

```
后端服务（2GB RAM, 2 CPU）:
- 内存: 2048MB × ¥0.005/MB/小时 × 730小时 = ¥7.5
- CPU: 2000m × ¥0.01/核/小时 × 730小时 = ¥14.6
- 小计: ¥22.1

前端服务（1GB RAM, 1 CPU）:
- 内存: 1024MB × ¥0.005/MB/小时 × 730小时 = ¥3.7
- CPU: 1000m × ¥0.01/核/小时 × 730小时 = ¥7.3
- 小计: ¥11

PostgreSQL（10GB 存储）:
- 存储: 10GB × ¥0.5/GB/月 = ¥5
- 实例费用: ¥20/月
- 小计: ¥25

MinIO（20GB 存储）:
- 存储: 20GB × ¥0.3/GB/月 = ¥6
- 实例费用: ¥10/月
- 小计: ¥16

Redis（512MB）:
- 内存: 512MB × ¥0.01/MB/月 = ¥5.1

总计: 约 ¥79.2/月
```

### 流量费用（估算）

```
- 上传流量: 免费
- 下载流量: ¥0.8/GB

假设每月生成 1000 份合同，平均 50KB/份:
1000 × 50KB = 50MB ≈ ¥0.04

总计: 约 ¥80/月（轻量使用）
```

---

## 🎯 总结

**全栈 Leaflow 部署方案优势**：

1. **统一管理**: 所有服务在同一平台，运维简单
2. **成本优化**: 按需付费，比传统 VPS 节省 40-60%
3. **自动扩缩容**: 根据负载自动调整资源
4. **高可用**: 多副本部署，故障自动恢复
5. **简化运维**: 无需专业 DevOps，开发者即可管理
6. **国内优化**: 服务器在国内，访问速度快

**推荐迁移路径**：
1. Week 1-2: 搭建后端基础设施
2. Week 3: 集成 AI 变量提取
3. Week 4: 实现文档生成
4. Week 5-6: 前端重构
5. Week 7: 部署上线

**技术支持**：
- Leaflow QQ 群: 582959600
- 项目仓库: [待补充]
- 文档更新: [待补充]

---

**文档版本**: v1.0 (Leaflow Edition)  
**最后更新**: 2025年1月10日  
**作者**: AI Assistant + 您的团队
