# PowerShell 版本的 Leaflow 部署脚本
# 适用于 Windows 环境

param(
    [Parameter(Mandatory=$true)]
    [string]$LeaflowUsername,
    
    [Parameter(Mandatory=$true)]
    [string]$DomainPrefix,
    
    [Parameter(Mandatory=$true)]
    [string]$GeminiApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$PostgresPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$MinioPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$JwtSecret
)

Write-Host "🚀 开始部署智能合同模板系统到 Leaflow..." -ForegroundColor Green

$Domain = "$DomainPrefix.leaflow.dev"
$ApiDomain = "api.$Domain"
$BackendImage = "registry.leaflow.net/$LeaflowUsername/contract-backend:latest"
$FrontendImage = "registry.leaflow.net/$LeaflowUsername/contract-frontend:latest"

Write-Host ""
Write-Host "📦 配置信息:" -ForegroundColor Cyan
Write-Host "  域名: $Domain"
Write-Host "  API 域名: $ApiDomain"
Write-Host "  后端镜像: $BackendImage"
Write-Host "  前端镜像: $FrontendImage"
Write-Host ""

# 检查 Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 需要安装 Docker Desktop" -ForegroundColor Red
    Write-Host "下载地址: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# 检查 kubectl
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 需要安装 kubectl" -ForegroundColor Red
    Write-Host "安装命令: choco install kubernetes-cli" -ForegroundColor Yellow
    Write-Host "或访问: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 依赖检查通过" -ForegroundColor Green

# 步骤 1: 登录 Docker Registry
Write-Host ""
Write-Host "🔐 步骤 1/6: 登录 Docker Registry..." -ForegroundColor Cyan
docker login registry.leaflow.net -u $LeaflowUsername

# 步骤 2: 构建后端镜像
Write-Host ""
Write-Host "🏗️  步骤 2/6: 构建后端镜像..." -ForegroundColor Cyan
Set-Location backend
docker build -t $BackendImage .
Write-Host "✅ 后端镜像构建完成" -ForegroundColor Green

# 步骤 3: 构建前端镜像
Write-Host ""
Write-Host "🏗️  步骤 3/6: 构建前端镜像..." -ForegroundColor Cyan
Set-Location ..
docker build -t $FrontendImage .
Write-Host "✅ 前端镜像构建完成" -ForegroundColor Green

# 步骤 4: 推送镜像
Write-Host ""
Write-Host "📤 步骤 4/6: 推送镜像到 Leaflow..." -ForegroundColor Cyan
docker push $BackendImage
docker push $FrontendImage
Write-Host "✅ 镜像推送完成" -ForegroundColor Green

# 步骤 5: 创建 Secrets
Write-Host ""
Write-Host "🔑 步骤 5/6: 创建 Kubernetes Secrets..." -ForegroundColor Cyan
kubectl delete secret contract-secrets --ignore-not-found=true

kubectl create secret generic contract-secrets `
  --from-literal=postgres-password="$PostgresPassword" `
  --from-literal=minio-access-key='minioadmin' `
  --from-literal=minio-secret-key="$MinioPassword" `
  --from-literal=gemini-api-key="$GeminiApiKey" `
  --from-literal=jwt-secret="$JwtSecret"

Write-Host "✅ Secrets 创建完成" -ForegroundColor Green

# 步骤 6: 部署
Write-Host ""
Write-Host "🚀 步骤 6/6: 部署到 Leaflow..." -ForegroundColor Cyan

# 读取并替换配置文件
$yaml = Get-Content leaflow-deployment.yaml -Raw
$yaml = $yaml -replace 'your-registry.leaflow.net/contract-backend:latest', $BackendImage
$yaml = $yaml -replace 'your-registry.leaflow.net/contract-frontend:latest', $FrontendImage
$yaml = $yaml -replace 'your-domain.leaflow.dev', $Domain
$yaml = $yaml -replace 'api.your-domain.leaflow.dev', $ApiDomain

$yaml | kubectl apply -f -

Write-Host ""
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📊 查看部署状态:" -ForegroundColor Cyan
Write-Host "  kubectl get pods"
Write-Host "  kubectl get services"
Write-Host ""
Write-Host "📝 查看日志:" -ForegroundColor Cyan
Write-Host "  kubectl logs -f deployment/contract-backend"
Write-Host "  kubectl logs -f deployment/contract-frontend"
Write-Host ""
Write-Host "🌐 访问地址:" -ForegroundColor Cyan
Write-Host "  前端: https://$Domain"
Write-Host "  后端 API: https://$ApiDomain/docs"
Write-Host ""
Write-Host "⏳ 等待所有 Pod 启动可能需要 2-5 分钟..." -ForegroundColor Yellow
Write-Host ""

# 等待部署完成
Write-Host "⏳ 等待 Pods 就绪..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=contract-backend --timeout=300s
kubectl wait --for=condition=ready pod -l app=contract-frontend --timeout=300s

Write-Host ""
Write-Host "🎉 部署成功！所有服务已就绪！" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 现在可以访问：" -ForegroundColor Cyan
Write-Host "  https://$Domain" -ForegroundColor Green

Start-Process "https://$Domain"
