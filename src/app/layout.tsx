import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Suspense } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'Expense Sharing · Share Expenses with Friends & Family',
    template: '%s · Expense Sharing',
  },
  description:
    'A minimalist web application to share expenses with friends and family.',
  openGraph: {
    title: 'Expense Sharing · Share Expenses with Friends & Family',
    description: 'A minimalist web application to share expenses with friends and family.',
    images: `/banner.png`,
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    images: `/banner.png`,
    title: 'Expense Sharing · Share Expenses with Friends & Family',
    description: 'A minimalist web application to share expenses with friends and family.',
  },
  appleWebApp: {
    capable: true,
    title: 'Expense Sharing',
  },
  applicationName: 'Expense Sharing',
}

export const viewport: Viewport = {
  themeColor: '#b70049',
}

function Content({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <div className="flex flex-1 flex-col px-0 pt-4 pb-20 sm:pb-0">{children}</div>
      <MobileBottomNav />
      <Toaster />
    </TRPCProvider>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} suppressHydrationWarning>
      <ApplePwaSplash icon="/android-chrome-192x192.png" color="#b70049" />
      <body className="min-h-[100dvh] flex flex-col items-stretch bg-background">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense>
              <ProgressBar />
            </Suspense>
            <Content>{children}</Content>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
