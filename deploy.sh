#!/bin/bash

# Leaflow 自动部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署智能合同模板系统到 Leaflow..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必需的工具
echo "📋 检查依赖..."
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ 需要安装 Docker${NC}" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}❌ 需要安装 kubectl${NC}" >&2; exit 1; }
echo -e "${GREEN}✅ 依赖检查通过${NC}"

# 读取配置
echo ""
read -p "📝 请输入 Leaflow 用户名: " LEAFLOW_USERNAME
read -p "📝 请输入你的域名前缀 (如 myapp，最终为 myapp.leaflow.dev): " DOMAIN_PREFIX
read -sp "🔑 请输入 Gemini API Key: " GEMINI_KEY
echo ""
read -sp "🔑 请输入 PostgreSQL 密码: " POSTGRES_PASSWORD
echo ""
read -sp "🔑 请输入 MinIO 密码: " MINIO_PASSWORD
echo ""
read -sp "🔑 请输入 JWT Secret (32位): " JWT_SECRET
echo ""

DOMAIN="${DOMAIN_PREFIX}.leaflow.dev"
API_DOMAIN="api.${DOMAIN}"
BACKEND_IMAGE="registry.leaflow.net/${LEAFLOW_USERNAME}/contract-backend:latest"
FRONTEND_IMAGE="registry.leaflow.net/${LEAFLOW_USERNAME}/contract-frontend:latest"

echo ""
echo "📦 配置信息:"
echo "  域名: $DOMAIN"
echo "  API 域名: $API_DOMAIN"
echo "  后端镜像: $BACKEND_IMAGE"
echo "  前端镜像: $FRONTEND_IMAGE"
echo ""

read -p "确认继续部署? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ 部署已取消"
    exit 1
fi

# 步骤 1: 登录 Docker Registry
echo ""
echo "🔐 步骤 1/6: 登录 Docker Registry..."
docker login registry.leaflow.net -u "$LEAFLOW_USERNAME"

# 步骤 2: 构建后端镜像
echo ""
echo "🏗️  步骤 2/6: 构建后端镜像..."
cd backend
docker build -t "$BACKEND_IMAGE" .
echo -e "${GREEN}✅ 后端镜像构建完成${NC}"

# 步骤 3: 构建前端镜像
echo ""
echo "🏗️  步骤 3/6: 构建前端镜像..."
cd ..
docker build -t "$FRONTEND_IMAGE" .
echo -e "${GREEN}✅ 前端镜像构建完成${NC}"

# 步骤 4: 推送镜像
echo ""
echo "📤 步骤 4/6: 推送镜像到 Leaflow..."
docker push "$BACKEND_IMAGE"
docker push "$FRONTEND_IMAGE"
echo -e "${GREEN}✅ 镜像推送完成${NC}"

# 步骤 5: 创建 Secrets
echo ""
echo "🔑 步骤 5/6: 创建 Kubernetes Secrets..."
kubectl create secret generic contract-secrets \
  --from-literal=postgres-password="$POSTGRES_PASSWORD" \
  --from-literal=minio-access-key='minioadmin' \
  --from-literal=minio-secret-key="$MINIO_PASSWORD" \
  --from-literal=gemini-api-key="$GEMINI_KEY" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ Secrets 创建完成${NC}"

# 步骤 6: 更新并部署配置
echo ""
echo "🚀 步骤 6/6: 部署到 Leaflow..."
cat leafflow-deployment.yaml | \
  sed "s|your-registry.leaflow.net/contract-backend:latest|$BACKEND_IMAGE|g" | \
  sed "s|your-registry.leaflow.net/contract-frontend:latest|$FRONTEND_IMAGE|g" | \
  sed "s|your-domain.leaflow.dev|$DOMAIN|g" | \
  sed "s|api.your-domain.leaflow.dev|$API_DOMAIN|g" | \
  kubectl apply -f -

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "📊 查看部署状态:"
echo "  kubectl get pods"
echo "  kubectl get services"
echo ""
echo "📝 查看日志:"
echo "  kubectl logs -f deployment/contract-backend"
echo "  kubectl logs -f deployment/contract-frontend"
echo ""
echo "🌐 访问地址:"
echo "  前端: https://$DOMAIN"
echo "  后端 API: https://$API_DOMAIN/docs"
echo ""
echo "⏳ 等待所有 Pod 启动可能需要 2-5 分钟..."
echo ""

# 等待部署完成
echo "⏳ 等待 Pods 就绪..."
kubectl wait --for=condition=ready pod -l app=contract-backend --timeout=300s
kubectl wait --for=condition=ready pod -l app=contract-frontend --timeout=300s

echo ""
echo -e "${GREEN}🎉 部署成功！所有服务已就绪！${NC}"
echo ""
echo "🌐 现在可以访问："
echo "  https://$DOMAIN"
