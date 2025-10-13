/**
 * 合同模板智能处理系统 - 前端应用逻辑
 */

// API基础URL从配置文件获取
const API_BASE_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:8000/api/v1';

// 全局状态
let currentTemplateInfo = null;
let currentVariables = [];
let currentGeneratedDocument = null;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * 初始化应用
 */
function initializeApp() {
    // 绑定事件监听器
    document.getElementById('uploadBtn').addEventListener('click', handleUpload);
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);
    document.getElementById('downloadBtn').addEventListener('click', handleDownload);
    document.getElementById('backToUpload').addEventListener('click', () => showStep(1));
    document.getElementById('generateAnother').addEventListener('click', resetApp);
    
    console.log('应用初始化完成');
}

/**
 * 显示指定步骤
 */
function showStep(step) {
    // 隐藏所有步骤
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step${i}`).style.display = 'none';
        document.getElementById(`step${i}-tab`).classList.remove('active');
    }
    
    // 显示当前步骤
    document.getElementById(`step${step}`).style.display = 'block';
    document.getElementById(`step${step}-tab`).classList.add('active');
}

/**
 * 显示提示信息
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    alertContainer.innerHTML = alertHtml;
    
    // 3秒后自动关闭
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 3000);
}

/**
 * 处理文件上传
 */
async function handleUpload() {
    const fileInput = document.getElementById('templateFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('请选择要上传的文件', 'warning');
        return;
    }
    
    if (!file.name.endsWith('.docx')) {
        showAlert('只支持 .docx 格式的文件', 'danger');
        return;
    }
    
    // 显示加载中
    showStep(2);
    
    try {
        // 准备FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // 使用一站式接口上传并提取变量
        const response = await fetch(`${API_BASE_URL}/documents/upload-and-extract`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('上传失败');
        }
        
        const data = await response.json();
        
        // 保存模板信息
        currentTemplateInfo = data;
        currentVariables = data.variables;
        
        console.log('模板上传成功:', data);
        
        // 生成表单
        generateVariableForm(data.variables);
        
        // 显示表单步骤
        showStep(3);
        showAlert(`成功识别 ${data.variables_count} 个变量`, 'success');
        
    } catch (error) {
        console.error('上传失败:', error);
        showAlert('上传失败: ' + error.message, 'danger');
        showStep(1);
    }
}

/**
 * 生成变量填写表单
 */
function generateVariableForm(variables) {
    const formContainer = document.getElementById('variableForm');
    
    if (variables.length === 0) {
        formContainer.innerHTML = '<p class="text-muted">未识别到任何变量</p>';
        return;
    }
    
    let formHtml = '<div class="row g-3">';
    
    variables.forEach((variable, index) => {
        const inputId = `var_${index}`;
        const required = variable.required ? 'required' : '';
        const requiredLabel = variable.required ? '<span class="text-danger">*</span>' : '';
        
        formHtml += `
            <div class="col-md-6">
                <label for="${inputId}" class="form-label">
                    ${variable.label || variable.name} ${requiredLabel}
                </label>
        `;
        
        // 根据类型生成不同的输入组件
        switch (variable.type) {
            case 'date':
                formHtml += `
                    <input 
                        type="date" 
                        class="form-control" 
                        id="${inputId}" 
                        name="${variable.name}"
                        ${required}
                    >
                `;
                break;
                
            case 'number':
                formHtml += `
                    <input 
                        type="number" 
                        class="form-control" 
                        id="${inputId}" 
                        name="${variable.name}"
                        placeholder="${variable.placeholder || '请输入' + (variable.label || variable.name)}"
                        ${required}
                    >
                `;
                break;
                
            case 'email':
                formHtml += `
                    <input 
                        type="email" 
                        class="form-control" 
                        id="${inputId}" 
                        name="${variable.name}"
                        placeholder="${variable.placeholder || '请输入邮箱地址'}"
                        ${required}
                    >
                `;
                break;
                
            case 'phone':
                formHtml += `
                    <input 
                        type="tel" 
                        class="form-control" 
                        id="${inputId}" 
                        name="${variable.name}"
                        placeholder="${variable.placeholder || '请输入电话号码'}"
                        ${required}
                    >
                `;
                break;
                
            case 'textarea':
                formHtml += `
                    <textarea 
                        class="form-control" 
                        id="${inputId}" 
                        name="${variable.name}"
                        rows="3"
                        placeholder="${variable.placeholder || '请输入' + (variable.label || variable.name)}"
                        ${required}
                    ></textarea>
                `;
                break;
                
            case 'select':
                formHtml += `<select class="form-select" id="${inputId}" name="${variable.name}" ${required}>`;
                formHtml += `<option value="">请选择</option>`;
                if (variable.options && variable.options.length > 0) {
                    variable.options.forEach(option => {
                        formHtml += `<option value="${option}">${option}</option>`;
                    });
                }
                formHtml += `</select>`;
                break;
                
            default: // text
                formHtml += `
                    <input 
                        type="text" 
                        class="form-control" 
                        id="${inputId}" 
                        name="${variable.name}"
                        placeholder="${variable.placeholder || '请输入' + (variable.label || variable.name)}"
                        ${required}
                    >
                `;
        }
        
        if (variable.description) {
            formHtml += `<div class="form-text">${variable.description}</div>`;
        }
        
        formHtml += '</div>';
    });
    
    formHtml += '</div>';
    formContainer.innerHTML = formHtml;
}

/**
 * 处理合同生成
 */
async function handleGenerate() {
    try {
        // 收集表单数据
        const formData = {};
        const formContainer = document.getElementById('variableForm');
        const inputs = formContainer.querySelectorAll('input, textarea, select');
        
        let hasError = false;
        inputs.forEach(input => {
            if (input.required && !input.value) {
                input.classList.add('is-invalid');
                hasError = true;
            } else {
                input.classList.remove('is-invalid');
                formData[input.name] = input.value;
            }
        });
        
        if (hasError) {
            showAlert('请填写所有必填字段', 'warning');
            return;
        }
        
        console.log('表单数据:', formData);
        
        // 发送生成请求
        const response = await fetch(`${API_BASE_URL}/generate/document`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template_id: currentTemplateInfo.template_id,
                template_storage_key: currentTemplateInfo.storage_key,
                data: formData,
                filename: `合同_${new Date().toISOString().slice(0, 10)}.docx`
            })
        });
        
        if (!response.ok) {
            throw new Error('生成失败');
        }
        
        const data = await response.json();
        
        // 保存合同信息
        currentGeneratedDocument = data;
        
        console.log('合同生成成功:', data);
        
        // 显示文件名
        document.getElementById('generatedFilename').textContent = data.filename;
        
        // 显示下载步骤
        showStep(4);
        showAlert(`合同生成成功！文件大小: ${(data.file_size / 1024).toFixed(1)} KB`, 'success');
        
    } catch (error) {
        console.error('生成失败:', error);
        showAlert('生成失败: ' + error.message, 'danger');
    }
}

/**
 * 处理文件下载
 */
function handleDownload() {
    if (!currentGeneratedDocument || !currentGeneratedDocument.download_url) {
        showAlert('下载链接无效', 'danger');
        return;
    }
    
    // 直接使用预签名 URL 下载
    const downloadUrl = currentGeneratedDocument.download_url;
    
    // 创建隐藏的下载链接
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = currentGeneratedDocument.filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showAlert('下载已开始...', 'success');
}

/**
 * 重置应用
 */
function resetApp() {
    currentTemplateInfo = null;
    currentVariables = [];
    currentGeneratedDocument = null;
    
    document.getElementById('templateFile').value = '';
    document.getElementById('variableForm').innerHTML = '';
    document.getElementById('generatedFilename').textContent = '';
    
    showStep(1);
}
