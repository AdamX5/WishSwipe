'use client'
import { UserButton } from '@clerk/nextjs'
import { useMutation, useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect } from 'react'

export default function SwipeShell() {
  const { isAuthenticated } = useConvexAuth()
  const upsertUser = useMutation(api.users.upsertUser)

  useEffect(() => {
    if (isAuthenticated) {
      upsertUser().catch(console.error)
    }
  }, [isAuthenticated, upsertUser])

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <span className="font-semibold text-lg">WishSwipe</span>
      <UserButton afterSignOutUrl="/sign-in" />
    </header>
  )
}
