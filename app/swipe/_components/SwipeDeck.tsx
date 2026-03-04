'use client'
import { useRef } from 'react'
import { useSprings, animated, to as interpolate } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import SwipeCard from './SwipeCard'

const SPRING_COUNT = 20
const SWIPE_VELOCITY_THRESHOLD = 0.2
const SWIPE_DISTANCE_THRESHOLD = 100

const to = (i: number) => ({ x: 0, y: i * -4, scale: 1, rot: 0 })
const from = () => ({ x: 0, rot: 0, scale: 1.5, y: -1000 })
const trans = (r: number, s: number) => `rotateZ(${r}deg) scale(${s})`

export default function SwipeDeck() {
  const queue = useQuery(api.cardQueue.getCardQueue) ?? []
  const recordSwipeMutation = useMutation(api.swipes.recordSwipe)

  // topIndex: absolute index of the current top card in queue[]
  // gone: set of absolute queue indices that have been swiped off
  const topIndex = useRef(0)
  const gone = useRef(new Set<number>())

  const [springs, api_] = useSprings(SPRING_COUNT, i => ({
    ...to(i),
    from: from(),
  }))

  const bind = useDrag(
    ({
      args: [index],
      active,
      movement: [mx],
      direction: [xDir],
      velocity: [vx],
      last,
    }) => {
      // index is the absolute queue index passed at bind time (topIndex.current + display_i)
      const trigger =
        vx > SWIPE_VELOCITY_THRESHOLD || Math.abs(mx) > SWIPE_DISTANCE_THRESHOLD
      const dir = xDir < 0 ? -1 : 1

      if (last && trigger) {
        gone.current.add(index) // store absolute index — never a display position
        topIndex.current += 1  // advance deck pointer after card leaves
        const swipeDir = dir === 1 ? 'right' : 'left'
        const product = queue[index]
        if (product) {
          recordSwipeMutation({
            productId: product._id,
            direction: swipeDir,
            productSnapshot: {
              title: product.title,
              imageUrl: product.imageUrl,
              priceAmount: product.priceAmount,
              priceCurrency: product.priceCurrency,
              affiliateUrl: product.affiliateUrl,
              sourceStore: product.sourceStore,
            },
          }).catch(console.error)
        }
      }

      // Update only the spring slot for this card (spring slot = absolute index)
      api_.start(i => {
        if (index !== i) return // i here is the spring slot index (0..SPRING_COUNT-1)
        const isGone = gone.current.has(index)
        return {
          x: isGone ? (200 + window.innerWidth) * dir : active ? mx : 0,
          rot: mx / 100 + (isGone ? dir * 10 * vx : 0),
          scale: active ? 1.1 : 1,
          config: { friction: 50, tension: active ? 800 : isGone ? 200 : 500 },
        }
      })
    },
  )

  // 3-card display window using absolute indices
  const displayQueue = queue.slice(topIndex.current, topIndex.current + 3)
  const exhausted = queue.length > 0 && topIndex.current >= queue.length

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: '24rem' }}
    >
      {queue.length === 0 || exhausted ? (
        <p className="text-gray-400">No more products — check back later</p>
      ) : (
        displayQueue.map((product, i) => {
          const absIndex = topIndex.current + i // stable identity for this card
          const { x, y, rot, scale } = springs[absIndex]
          return (
            <animated.div
              key={product._id}
              style={{ x, y, position: 'absolute', zIndex: displayQueue.length - i }}
            >
              <animated.div
                {...bind(absIndex)} // MUST pass absIndex, not display position i
                style={{ transform: interpolate([rot, scale], trans), touchAction: 'none' }}
              >
                <SwipeCard product={product} xSpring={x} />
              </animated.div>
            </animated.div>
          )
        })
      )}
      {!exhausted && displayQueue.length < 3 && (
        <div
          className="absolute rounded-2xl bg-gray-100"
          style={{ width: '18rem', height: '24rem', zIndex: 0 }}
        />
      )}
    </div>
  )
}
