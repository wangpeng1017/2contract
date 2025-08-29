
// 浏览器控制台缓存清理脚本
// 在浏览器开发者工具的控制台中运行

console.log('🧹 开始清理Word模板相关缓存...');

// 1. 清理localStorage中的模板缓存
const templateKeys = Object.keys(localStorage).filter(key => 
    key.includes('template') || key.includes('placeholder') || key.includes('word')
);

templateKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ 已清理: ${key}`);
});

// 2. 清理sessionStorage
const sessionKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('template') || key.includes('placeholder') || key.includes('word')
);

sessionKeys.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ 已清理: ${key}`);
});

// 3. 清理可能的缓存API
if ('caches' in window) {
    caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
            if (cacheName.includes('template') || cacheName.includes('word')) {
                caches.delete(cacheName);
                console.log(`✅ 已清理缓存: ${cacheName}`);
            }
        });
    });
}

console.log('🎉 缓存清理完成！请刷新页面并重新上传模板。');
