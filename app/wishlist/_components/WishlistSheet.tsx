'use client'

import { useEffect } from 'react'
import type { WishlistItem } from './WishlistCard'

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

type Props = {
  item: WishlistItem | null
  onClose: () => void
  onRemove: (wishlistId: string) => void
}

export default function WishlistSheet({ item, onClose, onRemove }: Props) {
  const isOpen = item !== null

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-6 transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={item ? item.productSnapshot.title : undefined}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {item && (
          <>
            <img
              src={item.productSnapshot.imageUrl}
              alt={item.productSnapshot.title}
              className="w-full h-48 object-cover rounded-xl mb-4"
            />

            <h2 className="font-semibold text-lg text-gray-900 mb-1">
              {item.productSnapshot.title}
            </h2>

            <p className="text-gray-500 text-sm mb-1">
              {item.productSnapshot.sourceStore}
            </p>

            <p className="font-bold text-xl text-gray-900 mb-6">
              {formatPrice(item.productSnapshot.priceAmount, item.productSnapshot.priceCurrency)}
            </p>

            <div className="flex gap-3">
              <a
                href={item.productSnapshot.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-black text-white rounded-full py-3 text-center font-medium text-sm"
              >
                Visit Store
              </a>

              <button
                onClick={() => {
                  onRemove(item._id)
                  onClose()
                }}
                className="border border-gray-200 rounded-full px-6 py-3 text-gray-700 font-medium text-sm"
              >
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
