import type { Metadata } from 'next';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

const syne = Syne({ 
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TalentFlow | High-End Tech Recruitment',
  description: 'The premium job application portal for elite tech talent and recruiters.',
  keywords: ['tech jobs', 'recruitment', 'luxury job portal', 'elite hiring'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-background text-text-primary selection:bg-accent-primary selection:text-background">
        <div className="relative min-h-screen">
          {/* Subtle Background Mesh */}
          <div className="fixed inset-0 pointer-events-none mesh-gradient z-[-1]" aria-hidden="true" />
          
          <Providers>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#16161E',
                  color: '#F1F5F9',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '0.75rem',
                },
                success: {
                  iconTheme: {
                    primary: '#6EE7B7',
                    secondary: '#0A0A0F',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#F87171',
                    secondary: '#0A0A0F',
                  },
                },
              }}
            />
          </Providers>
        </div>
      </body>
    </html>
  );
}
