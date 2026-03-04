import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SwipeShell from './_components/SwipeShell'
import SwipeDeck from './_components/SwipeDeck'

export default async function SwipePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <main className="flex min-h-screen flex-col">
      <SwipeShell />
      <div className="flex flex-1 items-center justify-center p-4">
        <SwipeDeck />
      </div>
    </main>
  )
}
