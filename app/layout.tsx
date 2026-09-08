import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://loadlight-student-capacity.limzhixuan0818.chatgpt.site'),
  title: 'LoadLight — make room to breathe',
  description: 'A gentle capacity planner that helps students see, simulate, and rebalance their load before burnout hits.',
  openGraph: {
    title: 'LoadLight',
    description: 'Make room to breathe.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LoadLight',
    description: 'Make room to breathe.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}