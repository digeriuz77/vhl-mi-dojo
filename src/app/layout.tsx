import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Virtual Health Labs - MI DOJO',
  description: 'Practice motivational interviewing with AI-powered simulations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}