from flask import Flask, request, jsonify
import base64
from io import BytesIO
from docx import Document

app = Flask(__name__)

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload():
    # 处理CORS预检请求
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    try:
        data = request.get_json()
        
        # 接收base64编码的docx文件
        file_b64 = data.get('file')
        if not file_b64:
            return jsonify({'error': "Missing 'file' field"}), 400
        
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
        response_data = {
            'text': extracted_text,
            'original_file': file_b64
        }
        
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500
