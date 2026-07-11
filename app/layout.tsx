import type { Metadata, Viewport } from 'next'
import { Rubik } from 'next/font/google'
import './globals.css'

const _rubik = Rubik({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '700', '900'] })

export const metadata: Metadata = {
  title: 'Арсений VS Друзья',
  description:
    'Защити свою будку! Собирай банки, призывай Арсениев и уничтожь вражескую базу друзей.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Арсений VS Друзья',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#4db8e8',
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="bg-background">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
