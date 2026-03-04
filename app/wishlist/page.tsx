import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import WishlistShell from './_components/WishlistShell'
import BottomNav from '@/components/BottomNav'

export default async function WishlistPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <main className="flex min-h-screen flex-col pb-16">
      <header className="flex items-center p-4 border-b">
        <span className="font-semibold text-lg">Wishlist</span>
      </header>
      <WishlistShell />
      <BottomNav />
    </main>
  )
}
