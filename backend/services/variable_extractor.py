"""AI 变量提取服务 - 模块二"""
from typing import List, Dict, Any, Optional
import httpx
import json
import hashlib
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import settings

logger = logging.getLogger(__name__)


class VariableExtractor:
    """AI 变量提取器（使用 Gemini API）"""
    
    def __init__(self):
        """初始化变量提取器"""
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
        if not self.api_key or self.api_key == "test_key":
            logger.warning("Gemini API Key 未配置，将使用测试模式")
            self.test_mode = True
        else:
            self.test_mode = False
            logger.info(f"Gemini API 初始化成功，模型: {self.model}")
    
    async def extract_variables(
        self, 
        text: str, 
        examples: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """
        从合同文本中提取变量
        
        Args:
            text: 合同文本内容
            examples: 可选的示例列表
            
        Returns:
            变量列表，每个变量包含 name, label, type, required 等字段
        """
        if self.test_mode:
            logger.info("使用测试模式提取变量")
            return self._extract_variables_test_mode(text)
        
        try:
            prompt = self._build_prompt(text, examples)
            result = await self._call_gemini_api(prompt)
            
            # 解析结果
            variables = self._parse_response(result)
            
            logger.info(f"成功提取 {len(variables)} 个变量")
            return variables
            
        except Exception as e:
            logger.error(f"变量提取失败: {e}", exc_info=True)
            # 降级到测试模式
            logger.warning("降级到测试模式")
            return self._extract_variables_test_mode(text)
    
    def _extract_variables_test_mode(self, text: str) -> List[Dict[str, Any]]:
        """测试模式：从文本中提取变量（简单规则）"""
        import re
        
        # 提取 {{变量}} 格式的占位符
        placeholders = re.findall(r'\{\{([^}]+)\}\}', text)
        
        variables = []
        seen = set()
        
        for placeholder in placeholders:
            placeholder = placeholder.strip()
            if placeholder in seen:
                continue
            seen.add(placeholder)
            
            # 推断变量类型
            var_type = self._infer_type(placeholder)
            
            variable = {
                "name": self._normalize_name(placeholder),
                "label": placeholder,
                "type": var_type,
                "required": True,
                "description": f"请填写{placeholder}",
                "placeholder": f"请输入{placeholder}"
            }
            
            # 如果是日期类型，添加格式
            if var_type == "date":
                variable["format"] = "YYYY-MM-DD"
            
            # 如果是选择类型，添加选项（示例）
            if var_type == "select":
                variable["options"] = self._get_default_options(placeholder)
            
            variables.append(variable)
        
        logger.info(f"测试模式提取了 {len(variables)} 个变量")
        return variables
    
    def _infer_type(self, label: str) -> str:
        """推断变量类型"""
        label_lower = label.lower()
        
        # 日期类型
        if any(keyword in label_lower for keyword in ['日期', '时间', 'date', 'time']):
            return "date"
        
        # 数字类型
        if any(keyword in label_lower for keyword in ['金额', '数量', '价格', '费用', 'amount', 'price', 'quantity']):
            return "number"
        
        # 邮箱类型
        if any(keyword in label_lower for keyword in ['邮箱', 'email', '电子邮件']):
            return "email"
        
        # 电话类型
        if any(keyword in label_lower for keyword in ['电话', '手机', 'phone', 'mobile', '联系方式']):
            return "phone"
        
        # 选择类型
        if any(keyword in label_lower for keyword in ['性别', '状态', '类型', 'gender', 'status', 'type']):
            return "select"
        
        # 长文本
        if any(keyword in label_lower for keyword in ['地址', '说明', '备注', '描述', 'address', 'description', 'note', 'remark']):
            return "textarea"
        
        # 默认文本类型
        return "text"
    
    def _normalize_name(self, label: str) -> str:
        """将标签转换为合法的变量名"""
        # 移除特殊字符
        import re
        name = re.sub(r'[^\w\u4e00-\u9fff]', '_', label)
        
        # 转换为拼音（简化版：只处理常见字）
        pinyin_map = {
            '甲方': 'party_a',
            '乙方': 'party_b',
            '公司': 'company',
            '名称': 'name',
            '日期': 'date',
            '金额': 'amount',
            '地址': 'address',
            '电话': 'phone',
            '邮箱': 'email',
            '联系人': 'contact',
            '签订': 'sign',
            '合同': 'contract',
            '编号': 'number',
            '付款': 'payment',
            '方式': 'method',
            '时间': 'time',
            '交付': 'delivery'
        }
        
        for zh, en in pinyin_map.items():
            if zh in label:
                name = name.replace(zh, en)
        
        # 转小写并清理
        name = name.lower().strip('_')
        
        # 如果仍有中文，使用原样
        if re.search(r'[\u4e00-\u9fff]', name):
            name = label.replace(' ', '_').replace('-', '_')
        
        return name
    
    def _get_default_options(self, label: str) -> List[str]:
        """获取默认选项"""
        label_lower = label.lower()
        
        if '性别' in label_lower or 'gender' in label_lower:
            return ["男", "女", "其他"]
        
        if '状态' in label_lower or 'status' in label_lower:
            return ["待处理", "进行中", "已完成"]
        
        if '类型' in label_lower or 'type' in label_lower:
            return ["类型A", "类型B", "类型C"]
        
        return ["选项1", "选项2", "选项3"]
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError))
    )
    async def _call_gemini_api(self, prompt: str) -> str:
        """调用 Gemini API"""
        url = f"{self.base_url}/models/{self.model}:generateContent"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
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
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers=headers,
                params={"key": self.api_key},
                json=payload
            )
            
            response.raise_for_status()
            result = response.json()
            
            # 提取生成的文本
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            return text
    
    def _build_prompt(self, text: str, examples: Optional[List[Dict]] = None) -> str:
        """构建提示词"""
        prompt = f"""你是一个专业的合同分析助手。请分析以下合同文本，提取所有需要填写的变量字段。

**输出格式（JSON）**：
{{
  "variables": [
    {{
      "name": "变量英文标识符（小写下划线命名）",
      "label": "显示标签（中文）",
      "type": "数据类型",
      "required": true/false,
      "description": "变量说明",
      "placeholder": "输入提示",
      "default": "默认值（可选）",
      "options": ["选项1", "选项2"]（仅 select 类型）,
      "format": "格式说明（可选）"
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
6. 提供友好的 placeholder 和 description

**合同文本**：
{text[:3000]}  # 限制文本长度

请直接返回 JSON 格式的结果，不要包含其他说明文字。"""

        if examples:
            prompt += "\n\n**参考示例**：\n"
            for example in examples:
                prompt += f"- {example}\n"
        
        return prompt
    
    def _parse_response(self, response_text: str) -> List[Dict[str, Any]]:
        """解析 API 响应"""
        try:
            # 尝试解析 JSON
            data = json.loads(response_text)
            variables = data.get("variables", [])
            
            # 验证和清理数据
            cleaned_variables = []
            for var in variables:
                if "name" in var and "label" in var and "type" in var:
                    cleaned_variables.append(var)
                else:
                    logger.warning(f"跳过无效变量: {var}")
            
            return cleaned_variables
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}")
            logger.debug(f"原始响应: {response_text}")
            raise ValueError(f"无法解析 API 响应: {str(e)}")
    
    @staticmethod
    def compute_text_hash(text: str) -> str:
        """计算文本哈希（用于缓存）"""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()


# 全局实例
_variable_extractor: Optional[VariableExtractor] = None


def get_variable_extractor() -> VariableExtractor:
    """获取变量提取器单例"""
    global _variable_extractor
    if _variable_extractor is None:
        _variable_extractor = VariableExtractor()
    return _variable_extractor
