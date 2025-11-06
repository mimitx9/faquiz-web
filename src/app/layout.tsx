import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../app/globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FA Quiz - Trắc nghiệm Y khoa cục súc',
  description: 'Tổng hợp +1.000.000 đề thi mới nhất đến từ các trường Y Việt Nam',
  icons: {
    icon: '/logos/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

