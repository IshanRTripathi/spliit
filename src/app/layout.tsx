import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { AuthControls } from '@/components/auth-controls'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import Link from 'next/link'
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
  themeColor: '#047857',
}

function Content({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  return (
    <TRPCProvider>
      <header className="fixed top-0 left-0 right-0 z-50 px-2 pt-2">
        <div className="glass-surface mx-auto flex h-12 max-w-screen-xl items-center justify-between rounded-2xl px-2">
        <Link
          className="flex items-center rounded-lg px-2 py-1 text-sm font-semibold tracking-tight text-primary transition-transform hover:scale-[1.02]"
          href="/"
        >
          <h1>Expense Sharing</h1>
        </Link>
        <div role="navigation" aria-label="Menu" className="flex">
          <ul className="flex items-center gap-1 text-sm">
            <li>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-9 px-3 text-primary"
              >
                <Link href="/groups">{t('Header.groups')}</Link>
              </Button>
            </li>
            <li>
              <LocaleSwitcher />
            </li>
            <li>
              <ThemeToggle />
            </li>
            <li>
              <AuthControls />
            </li>
          </ul>
        </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-0 pt-16 pb-20 sm:pb-0">{children}</div>
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
      <ApplePwaSplash icon="/android-chrome-192x192.png" color="#027756" />
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
