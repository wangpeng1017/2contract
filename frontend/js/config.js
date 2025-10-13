/**
 * 前端配置文件 - 动态API地址配置
 */

// 环境检测
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isProduction = window.location.hostname.includes('.vercel.app') || window.location.hostname.includes('.com');

// API基础URL配置
let API_BASE_URL;

if (isDevelopment) {
    // 本地开发环境
    API_BASE_URL = 'http://localhost:8000/api/v1';
} else if (isProduction) {
    // 生产环境 - Leaflow后端
    API_BASE_URL = 'https://your-backend-domain.leaflow.dev/api/v1';
} else {
    // 默认配置
    API_BASE_URL = 'http://localhost:8000/api/v1';
}

// 应用配置
const CONFIG = {
    // API配置
    API_BASE_URL: API_BASE_URL,
    
    // 文件上传配置
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_FILE_TYPES: ['.docx'],
    
    // 超时配置
    REQUEST_TIMEOUT: 60000, // 60秒
    
    // 重试配置
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1秒
    
    // 缓存配置
    CACHE_DURATION: 3600000, // 1小时
    
    // 调试模式
    DEBUG: isDevelopment,
    
    // 应用信息
    APP_NAME: '智能合同模板处理系统',
    VERSION: '1.0.0',
    
    // 环境信息
    ENVIRONMENT: isDevelopment ? 'development' : 'production'
};

// 控制台输出配置信息（仅在开发环境）
if (CONFIG.DEBUG) {
    console.log('🔧 应用配置:', CONFIG);
    console.log('🌍 当前环境:', CONFIG.ENVIRONMENT);
    console.log('🔗 API地址:', CONFIG.API_BASE_URL);
}

// 导出配置
window.CONFIG = CONFIG;