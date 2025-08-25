'use client';

import { useAuth } from '@/hooks/useAuth';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';

interface LoginButtonProps {
  className?: string;
  showUserInfo?: boolean;
}

export function LoginButton({ className = '', showUserInfo = false }: LoginButtonProps) {
  const { user, isAuthenticated, isLoading, login, logout, error } = useAuth();

  if (isLoading) {
    return (
      <button
        disabled
        className={`flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed ${className}`}
      >
        <Loader2 size={16} className="animate-spin" />
        <span>加载中...</span>
      </button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {showUserInfo && (
          <div className="flex items-center space-x-2">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-feishu-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">
              {user.name}
            </span>
          </div>
        )}
        
        <button
          onClick={logout}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          <LogOut size={16} />
          <span>登出</span>
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <button
        onClick={login}
        disabled={isLoading}
        className="flex items-center space-x-2 px-6 py-3 bg-feishu-500 hover:bg-feishu-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogIn size={16} />
        <span>使用飞书登录</span>
      </button>
    </div>
  );
}
