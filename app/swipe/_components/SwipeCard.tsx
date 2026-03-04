import type { Doc } from '@/convex/_generated/dataModel'
import type { SpringValue } from '@react-spring/web'

interface SwipeCardProps {
  product: Doc<'products'>
  xSpring: SpringValue<number>
}

export default function SwipeCard({ product }: SwipeCardProps) {
  const price = (product.priceAmount / 100).toFixed(2)

  return (
    <div className="relative w-72 h-96 rounded-2xl shadow-xl overflow-hidden bg-white select-none">
      <img
        src={product.imageUrl}
        alt={product.title}
        className="w-full h-56 object-cover"
      />
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {product.title}
        </h2>
        <p className="text-green-600 font-bold mt-1">
          {price} {product.priceCurrency}
        </p>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
          {product.sourceStore}
        </p>
        {product.starRating != null && (
          <p className="text-yellow-500 text-sm mt-1">
            &#9733; {product.starRating.toFixed(1)}
          </p>
        )}
      </div>
    </div>
  )
}
