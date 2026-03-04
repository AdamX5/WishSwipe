'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const isDiscover = pathname.startsWith('/swipe')
  const isWishlist = pathname.startsWith('/wishlist')

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30">
      <Link
        href="/swipe"
        className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
          isDiscover ? 'text-black font-semibold' : 'text-gray-400'
        }`}
      >
        <span className="text-xl">◎</span>
        <span>Discover</span>
      </Link>

      <Link
        href="/wishlist"
        className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
          isWishlist ? 'text-black font-semibold' : 'text-gray-400'
        }`}
      >
        <span className="text-xl">♡</span>
        <span>Wishlist</span>
      </Link>
    </nav>
  )
}
