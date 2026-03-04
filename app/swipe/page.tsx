import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SwipePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Swipe Engine</h1>
      <p className="text-gray-500 mt-2">Coming in Phase 2</p>
    </main>
  )
}
