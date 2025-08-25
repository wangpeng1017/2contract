import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LoginButton } from '@/components/auth/LoginButton';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '飞书合同内容更新助手',
  description: '简化和自动化更新飞书云文档中的合同内容',
  keywords: ['飞书', '合同', '文档更新', '自动化'],
  authors: [{ name: '飞书合同助手团队' }],
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
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-feishu-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">飞</span>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    飞书合同内容更新助手
                  </h1>
                </div>
                <div className="flex items-center space-x-6">
                  <nav className="hidden md:flex items-center space-x-6">
                    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                      使用指南
                    </a>
                    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                      帮助中心
                    </a>
                  </nav>
                  <LoginButton showUserInfo={true} />
                </div>
              </div>
            </div>
          </header>
          
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          
          <footer className="bg-white border-t mt-16">
            <div className="container mx-auto px-4 py-6">
              <div className="text-center text-gray-600 text-sm">
                <p>&copy; 2024 飞书合同内容更新助手. 保留所有权利.</p>
                <p className="mt-1">
                  基于飞书开放平台构建 | 
                  <a href="#" className="text-feishu-600 hover:text-feishu-700 ml-1">
                    隐私政策
                  </a> | 
                  <a href="#" className="text-feishu-600 hover:text-feishu-700 ml-1">
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
