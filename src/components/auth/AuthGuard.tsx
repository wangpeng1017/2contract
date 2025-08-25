'use client';

import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from './LoginButton';
import { Loader2, Shield } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-feishu-500 mx-auto mb-4" />
          <p className="text-gray-600">正在验证身份...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-feishu-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={32} className="text-feishu-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              需要登录
            </h2>
            
            <p className="text-gray-600 mb-6">
              请使用飞书账号登录以访问合同内容更新助手
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <LoginButton className="w-full" />
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                登录即表示您同意我们的
                <a href="#" className="text-feishu-600 hover:text-feishu-700 ml-1">
                  服务条款
                </a>
                和
                <a href="#" className="text-feishu-600 hover:text-feishu-700 ml-1">
                  隐私政策
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
