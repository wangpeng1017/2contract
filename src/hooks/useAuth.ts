'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FeishuUserInfo } from '@/types';

interface AuthState {
  user: FeishuUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * 检查用户认证状态
   */
  const checkAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        setState({
          user: response.data.data.user,
          isAuthenticated: response.data.data.isAuthenticated,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: response.data.error?.message || '认证检查失败',
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: '认证检查失败',
      });
    }
  }, []);

  /**
   * 登录
   */
  const login = useCallback(async () => {
    try {
      console.log('[Auth] Starting login process...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await axios.get('/api/auth/feishu');
      console.log('[Auth] Login response:', response.data);

      if (response.data.success) {
        console.log('[Auth] Redirecting to Feishu OAuth...');
        // 重定向到飞书授权页面
        window.location.href = response.data.data.authUrl;
      } else {
        console.error('[Auth] Login failed:', response.data.error);
        const errorMessage = response.data.error?.details || response.data.error?.message || '登录失败';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);

      // 提取更详细的错误信息
      let errorMessage = '登录失败';
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error?.details) {
          errorMessage = error.response.data.error.details;
        } else if (error.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        } else if (error.response?.status === 500) {
          errorMessage = '服务器配置错误，请联系管理员';
        } else if (error.response?.status === 401) {
          errorMessage = '认证失败，请重试';
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * 登出
   */
  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await axios.post('/api/auth/logout');
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      // 重定向到首页
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // 即使登出失败，也清除本地状态
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      window.location.href = '/';
    }
  }, []);

  /**
   * 刷新令牌
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await axios.post('/api/auth/refresh');
      
      if (response.data.success) {
        setState(prev => ({
          ...prev,
          user: response.data.data.user,
          isAuthenticated: true,
          error: null,
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          error: response.data.error?.message || '令牌刷新失败',
        }));
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: '令牌刷新失败',
      }));
      return false;
    }
  }, []);

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 处理URL中的错误参数
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (error && message) {
      setState(prev => ({
        ...prev,
        error: decodeURIComponent(message),
        isLoading: false,
      }));
      
      // 清除URL中的错误参数
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  return {
    ...state,
    login,
    logout,
    refreshToken,
    checkAuth,
  };
}
