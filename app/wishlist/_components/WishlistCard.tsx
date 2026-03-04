type ProductSnapshot = {
  title: string
  imageUrl: string
  priceAmount: number
  priceCurrency: string
  affiliateUrl: string
  sourceStore: string
}

export type WishlistItem = {
  _id: string               // Id<'wishlists'> — typed as string to keep component Convex-free
  userId: string
  productId: string
  savedAt: number
  productSnapshot: ProductSnapshot
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

type Props = {
  item: WishlistItem
  onOpen: (item: WishlistItem) => void
}

export default function WishlistCard({ item, onOpen }: Props) {
  const { title, imageUrl, priceAmount, priceCurrency } = item.productSnapshot

  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 rounded-xl"
    >
      <img
        src={imageUrl}
        alt={title}
        className="w-full aspect-square object-cover rounded-xl"
      />
      <div className="mt-2 px-1">
        <p className="text-sm font-medium leading-snug line-clamp-2 text-gray-900">
          {title}
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-800">
          {formatPrice(priceAmount, priceCurrency)}
        </p>
      </div>
    </button>
  )
}
