import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SwipeShell from './_components/SwipeShell'

export default async function SwipePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <main className="flex min-h-screen flex-col">
      <SwipeShell />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Swipe Engine — coming in Phase 2</p>
      </div>
    </main>
  )
}
