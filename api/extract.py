from http.server import BaseHTTPRequestHandler
import json
import os
from openai import OpenAI
from pinyin import get as pinyin_get

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            contract_text = data.get('text')
            if not contract_text:
                self.send_error(400, "Missing 'text' field")
                return
            
            # 调用OpenAI提取变量
            client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
            
            system_prompt = """你是一个合同变量提取专家。分析用户提供的合同文本，识别所有需要填充的变量字段。
输出格式为JSON数组，每个变量包含：
- key: 变量的ASCII键名（使用拼音，如 jiafang, yifang, sign_date）
- label: 变量的中文标签（如 甲方, 乙方, 签订日期）
- type: 数据类型（text, date, number）
- required: 是否必填（true/false）

示例输出：
[
  {"key": "jiafang", "label": "甲方", "type": "text", "required": true},
  {"key": "yifang", "label": "乙方", "type": "text", "required": true},
  {"key": "sign_date", "label": "签订日期", "type": "date", "required": true},
  {"key": "amount", "label": "合同金额", "type": "number", "required": true}
]"""
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"合同文本：\n{contract_text}"}
                ],
                response_format={"type": "json_object"}
            )
            
            # 解析AI返回的JSON
            ai_result = json.loads(response.choices[0].message.content)
            
            # 确保返回数组格式
            if isinstance(ai_result, dict) and 'variables' in ai_result:
                variables = ai_result['variables']
            elif isinstance(ai_result, list):
                variables = ai_result
            else:
                variables = []
            
            # 为没有key的变量生成拼音key
            for var in variables:
                if 'key' not in var and 'label' in var:
                    var['key'] = pinyin_get(var['label'], format='strip').replace(' ', '_').lower()
            
            result = {'variables': variables}
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {'error': str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
