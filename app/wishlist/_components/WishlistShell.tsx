'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import WishlistCard from './WishlistCard'
import WishlistSheet from './WishlistSheet'
import type { WishlistItem } from './WishlistCard'

export default function WishlistShell() {
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)

  const items = useQuery(api.wishlists.getWishlist)
  const removeFromWishlist = useMutation(api.wishlists.removeFromWishlist)

  let content: React.ReactNode

  if (items === undefined) {
    content = (
      <p className="text-center text-gray-400 mt-8">Loading...</p>
    )
  } else if (items.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 mt-16">
        <p className="text-gray-500 text-lg">Nothing saved yet</p>
        <a
          href="/swipe"
          className="px-6 py-2 rounded-full bg-black text-white font-medium"
        >
          Start swiping
        </a>
      </div>
    )
  } else {
    content = (
      <div className="grid grid-cols-2 gap-3 p-4">
        {items.map((item) => (
          <WishlistCard key={item._id} item={item} onOpen={setSelectedItem} />
        ))}
      </div>
    )
  }

  return (
    <>
      {content}
      <WishlistSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onRemove={(wishlistId) =>
          removeFromWishlist({ wishlistId }).catch(console.error)
        }
      />
    </>
  )
}
