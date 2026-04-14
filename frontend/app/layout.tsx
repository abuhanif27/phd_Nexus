import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { env } from '@/env';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: env.NEXT_PUBLIC_APP_NAME,
  description: 'Modern healthcare management platform',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgb(37,99,235);stop-opacity:1" /><stop offset="100%" style="stop-color:rgb(79,70,229);stop-opacity:1" /></linearGradient></defs><rect width="100" height="100" rx="20" fill="url(%23grad)"/><path d="M50 25 L50 45 M50 55 L50 75 M30 50 L45 50 M55 50 L70 50" stroke="white" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="5" fill="white"/></svg>',
        type: 'image/svg+xml',
      },
    ],
    apple: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgb(37,99,235);stop-opacity:1" /><stop offset="100%" style="stop-color:rgb(79,70,229);stop-opacity:1" /></linearGradient></defs><rect width="100" height="100" rx="20" fill="url(%23grad)"/><path d="M50 25 L50 45 M50 55 L50 75 M30 50 L45 50 M55 50 L70 50" stroke="white" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="5" fill="white"/></svg>',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const raw = localStorage.getItem('theme-storage');
                const parsed = raw ? JSON.parse(raw) : null;
                const savedTheme = parsed?.state?.theme || 'system';
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark);

                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
