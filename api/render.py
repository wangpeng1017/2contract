from flask import Flask, request, jsonify
import base64
from io import BytesIO
from docxtpl import DocxTemplate

app = Flask(__name__)

@app.route('/api/render', methods=['POST', 'OPTIONS'])
def render():
    # 处理CORS预检请求
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    try:
        data = request.get_json()
        
        # 接收原始模板文件（base64）和用户填写的数据
        template_b64 = data.get('template')
        user_data = data.get('data')
        
        if not template_b64 or not user_data:
            return jsonify({'error': "Missing 'template' or 'data' field"}), 400
        
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
        
        response_data = {
            'file': result_b64,
            'filename': 'contract_filled.docx'
        }
        
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500
