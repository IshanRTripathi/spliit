import { PropsWithChildren, Suspense } from 'react'

export default function GroupsLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Suspense>
      <main className="flex-1 w-full max-w-screen-lg mx-auto px-3 py-4 sm:px-5 sm:py-6 flex flex-col gap-5 sm:gap-6">
        {children}
      </main>
    </Suspense>
  )
}
