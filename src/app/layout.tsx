import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Logo } from '@/components/ui/Logo';
import { ConditionalLoginButton } from '@/components/auth/ConditionalLoginButton';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '智能文档处理助手',
  description: '提供本地文档处理和飞书云文档处理两种解决方案',
  keywords: ['文档处理', '合同模板', '飞书', '文档更新', '自动化'],
  authors: [{ name: '智能文档处理团队' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <header className="bg-white shadow-sm border-b">
            <div className="container mx-auto px-4 py-2">
              <div className="flex items-center justify-between">
                <Logo />
                <ConditionalLoginButton showUserInfo={true} />
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-4">
            {children}
          </main>

          <footer className="bg-white border-t mt-8">
            <div className="container mx-auto px-4 py-4">
              <div className="text-center text-gray-600 text-xs">
                <p>&copy; 2024 智能文档处理助手. 保留所有权利.</p>
                <p className="mt-1">
                  支持本地处理和云端协作 |
                  <a href="#" className="text-blue-600 hover:text-blue-700 ml-1">
                    隐私政策
                  </a> |
                  <a href="#" className="text-blue-600 hover:text-blue-700 ml-1">
                    服务条款
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
