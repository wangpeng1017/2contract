from http.server import BaseHTTPRequestHandler
import json
import base64
from io import BytesIO
from docx import Document

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            # 接收base64编码的docx文件
            file_b64 = data.get('file')
            if not file_b64:
                self.send_error(400, "Missing 'file' field")
                return
            
            # 解码并解析docx
            file_bytes = base64.b64decode(file_b64)
            doc = Document(BytesIO(file_bytes))
            
            # 按阅读顺序提取文本
            text_parts = []
            for element in doc.element.body:
                if element.tag.endswith('p'):  # 段落
                    para_text = ''.join(node.text for node in element.iter() if hasattr(node, 'text'))
                    if para_text.strip():
                        text_parts.append(para_text.strip())
                elif element.tag.endswith('tbl'):  # 表格
                    for row in element.iter():
                        if row.tag.endswith('tr'):
                            row_texts = []
                            for cell in row.iter():
                                if cell.tag.endswith('tc'):
                                    cell_text = ''.join(node.text for node in cell.iter() if hasattr(node, 'text'))
                                    if cell_text.strip():
                                        row_texts.append(cell_text.strip())
                            if row_texts:
                                text_parts.append(' | '.join(row_texts))
            
            extracted_text = '\n'.join(text_parts)
            
            # 同时返回原始文件的base64（供后续渲染使用）
            response = {
                'text': extracted_text,
                'original_file': file_b64
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
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
