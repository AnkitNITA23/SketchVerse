import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Poppins } from 'next/font/google';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'SketchVerse',
  description: 'A real-time multiplayer drawing and guessing game.',
};

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn('font-body antialiased', poppins.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
