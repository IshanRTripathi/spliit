import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

// FIX for https://github.com/vercel/next.js/issues/58615
// export const dynamic = 'force-dynamic'

export default function HomePage() {
  const t = useTranslations()
  return (
    <main className="px-4 pb-6 sm:px-6">
      <section className="page-section mx-auto mt-2 max-w-5xl overflow-hidden">
        <div className="relative px-5 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <div className="pointer-events-none absolute -top-24 right-[-70px] h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-[-50px] h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-screen-md flex-col items-center gap-5 text-center">
          <h1 className="!leading-none font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl landing-header py-2">
            {t.rich('Homepage.title', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </h1>
          <p className="max-w-[42rem] leading-relaxed text-muted-foreground sm:text-xl sm:leading-8">
            {t.rich('Homepage.description', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/groups">{t('Homepage.button.groups')}</Link>
            </Button>
          </div>
        </div>
        </div>
      </section>
    </main>
  )
}
