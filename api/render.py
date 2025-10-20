from http.server import BaseHTTPRequestHandler
import json
import base64
from io import BytesIO
from docxtpl import DocxTemplate

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            # 接收原始模板文件（base64）和用户填写的数据
            template_b64 = data.get('template')
            user_data = data.get('data')
            
            if not template_b64 or not user_data:
                self.send_error(400, "Missing 'template' or 'data' field")
                return
            
            # 解码模板文件
            template_bytes = base64.b64decode(template_b64)
            
            # 使用docxtpl渲染
            doc = DocxTemplate(BytesIO(template_bytes))
            doc.render(user_data)
            
            # 将渲染后的文档保存到内存
            output = BytesIO()
            doc.save(output)
            output.seek(0)
            
            # 返回base64编码的最终文档
            result_b64 = base64.b64encode(output.read()).decode('utf-8')
            
            response = {
                'file': result_b64,
                'filename': 'contract_filled.docx'
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
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
