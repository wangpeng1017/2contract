import json
import base64
from io import BytesIO
from docxtpl import DocxTemplate

def handler(request):
    # 处理CORS预检请求
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }
    
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method not allowed'}),
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
        }
    
    try:
        data = request.json
        
        # 接收原始模板文件（base64）和用户填写的数据
        template_b64 = data.get('template')
        user_data = data.get('data')
        
        if not template_b64 or not user_data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': "Missing 'template' or 'data' field"}),
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            }
        
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
        
        return {
            'statusCode': 200,
            'body': json.dumps(response),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
