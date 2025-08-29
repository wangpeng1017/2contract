'use client';

import { usePathname } from 'next/navigation';
import { LoginButton } from './LoginButton';

interface ConditionalLoginButtonProps {
  className?: string;
  showUserInfo?: boolean;
}

export function ConditionalLoginButton({ 
  className = '', 
  showUserInfo = false 
}: ConditionalLoginButtonProps) {
  const pathname = usePathname();
  
  // 只在飞书相关页面显示登录按钮
  const shouldShowLogin = pathname?.startsWith('/workspace') || 
                         pathname?.startsWith('/dashboard');

  if (!shouldShowLogin) {
    return null;
  }

  return <LoginButton className={className} showUserInfo={showUserInfo} />;
}
