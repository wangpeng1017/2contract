'use client';

import { FileText, Cloud } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 24
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* 新Logo设计：双功能图标 */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center relative overflow-hidden`}>
        {/* 本地文档处理图标 */}
        <FileText 
          size={iconSizes[size]} 
          className="text-white absolute -translate-x-1" 
        />
        {/* 云文档处理图标 */}
        <Cloud 
          size={iconSizes[size] * 0.7} 
          className="text-white/80 absolute translate-x-1 translate-y-0.5" 
        />
      </div>
      
      {showText && (
        <h1 className={`${textSizes[size]} font-semibold text-gray-900`}>
          智能合同
        </h1>
      )}
    </div>
  );
}

export function LogoIcon({ className = '', size = 'md' }: Omit<LogoProps, 'showText'>) {
  return <Logo className={className} size={size} showText={false} />;
}
