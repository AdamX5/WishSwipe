# Phase 2: Swipe Engine — Research

**Researched:** 2026-03-04
**Domain:** Gesture physics (use-gesture + react-spring), Convex swipe/wishlist writes, micro-UX
**Confidence:** HIGH

---

## Summary

Phase 2 builds the core product loop: a 3-card gesture deck with spring physics, Convex write-on-swipe, undo, and micro-UX feedback. The technology choices were locked in Phase 1 (`@use-gesture/react` + `@react-spring/web`). Neither library is in `package.json` yet — they must be installed. Both support React 19 natively: `@react-spring/web@10.0.3` declares `react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"` as a peer dependency; `@use-gesture/react@10.3.1` requires `react >= 16.8.0`. No `--legacy-peer-deps` flag is needed.

The canonical pattern for this exact use-case — a swipeable card deck with spring physics — is the official react-spring "Cards Stack" sandbox (`pmndrs/react-spring/demo/src/sandboxes/cards-stack`). It uses `useSprings` (one spring per card), `useDrag` (gesture state drives spring values), and an `api.start(i => ...)` callback that fires per-card updates imperatively, bypassing React re-renders entirely during drag. This is the pattern to follow.

The Convex side is straightforward: the `swipes` and `wishlists` tables and all indexes are already defined in `schema.ts`. Phase 2 needs a `recordSwipe` mutation (insert to swipes, conditionally insert to wishlists on right-swipe), an `undoSwipe` mutation (delete last swipe + last wishlist entry by `userId`/`productId`), and a `getCardQueue` query (products filtered by unswiped). The key constraint is Convex's hard `.collect()` limit of 1024 documents — the card queue query must use `.take(20)` against an indexed, filtered query, not `.collect()` against the full products table.

**Primary recommendation:** Use `useSprings` + `useDrag` imperatively. Three `animated.div` wrappers keyed to card index (Active=top, Next=middle, Preview=bottom). During drag, update springs via `api.start()` — never via React state. Record swipes in Convex on gesture completion (`last === true`, threshold exceeded), not on every frame.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SWIPE-01 | Exactly 3 cards in DOM at all times (Active, Next, Preview) | useSprings manages N springs; slice card queue to 3 visible; replace as cards are swiped off |
| SWIPE-02 | Active card tracks 1:1 with pointer/finger during drag, no perceived lag | useDrag + api.start() bypasses React reconciler; direct DOM transform via animated.div style prop |
| SWIPE-03 | Release above threshold: card springs out with swipe velocity as initial spring velocity; release below: snaps back | `trigger = velocity[0] > 0.2`; spring `config: { tension: 200 }` for fling, `tension: 500` for snap-back; `config.velocity` accepts gesture velocity |
| SWIPE-04 | Right swipe → wishlist entry; Left swipe → swipe record with direction='left' | `recordSwipe` mutation: always inserts to swipes; if direction='right', also inserts to wishlists |
| SWIPE-05 | Undo restores last card to top, reverts Convex record | `undoSwipe` mutation: db.delete on last swipe record (and wishlist record if right-swipe) by `userId`, ordered by `swipedAt` |
| GHOST-01 | Every swipe recorded: direction, timestamp, userId, full product snapshot | `swipes` table already has correct schema; `recordSwipe` mutation populates all fields |
| GHOST-02 | Card queue returns only unswiped products; client pre-fetches ~20 | `getCardQueue` query: fetch swiped productIds for user, then `.take(20)` from active products not in that set |
| UX-01 | Haptic pulse on right-swipe | `navigator.vibrate(50)` after direction='right' confirmed; guard with `if ('vibrate' in navigator)` |
| UX-02 | Visual pulse/glow on save (Dopamine Hit) | Tailwind v4 custom keyframe animation via `@theme`; class applied for ~600ms after right-swipe |
| UX-03 | Directional overlay: green+heart (right), red+X (left) during drag | Overlay `div` with opacity driven by `x` spring value; interpolate: positive x → green, negative x → red |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@use-gesture/react` | 10.3.1 | Drag/touch gesture tracking | Provides `movement`, `velocity`, `direction` on every frame; `first`/`last` for gesture lifecycle; ref-based, no React state during drag |
| `@react-spring/web` | 10.0.3 | Spring physics animation | Imperative `api.start()` writes directly to DOM via `animated.*` components; no re-render during animation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS v4 (already installed) | 4.x | Overlay tints, glow animation keyframes | UX-02, UX-03 visual feedback; `@theme` block for custom `--animate-*` values |
| Convex React hooks (already installed) | 1.32.0 | `useQuery` for card queue, `useMutation` for record/undo | Server state; do NOT use for gesture state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@use-gesture/react` + `@react-spring/web` | Framer Motion | Framer Motion couples gesture to animation via declarative API — cannot bypass React reconciler; fails SWIPE-02 requirement |
| `@use-gesture/react` + `@react-spring/web` | `react-tinder-card` npm package | Pre-built but inflexible; cannot attach Convex mutations; limited physics control; hides the card queue logic |
| `useSprings` (one spring per card) | `useSpring` per card component | `useSprings` shares one `api`; can animate all cards from one drag handler without prop drilling |

**Installation:**
```bash
npm install @use-gesture/react @react-spring/web
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/swipe/
├── page.tsx                    # Server: auth guard (already exists)
├── _components/
│   ├── SwipeShell.tsx          # Client: header + upsertUser (already exists)
│   ├── SwipeDeck.tsx           # Client: useSprings + useDrag + card queue state
│   ├── SwipeCard.tsx           # Presentational: animated.div wrapper, product data
│   └── SwipeOverlay.tsx        # Directional tint + icon, driven by x spring value
convex/
├── swipes.ts                   # recordSwipe, undoSwipe mutations
├── cardQueue.ts                # getCardQueue query
```

### Pattern 1: useSprings + useDrag Imperative Update (SWIPE-01, SWIPE-02, SWIPE-03)

**What:** One spring per card position. Drag handler calls `api.start(i => ...)` to update only the dragged card's spring values. All other cards animate to their stack positions.

**When to use:** Any time the gesture state changes (every frame during drag).

**Example — from official react-spring cards-stack demo:**
```typescript
// Source: https://raw.githubusercontent.com/pmndrs/react-spring/main/demo/src/sandboxes/cards-stack/src/App.tsx
import { useSprings, animated, to as interpolate } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'  // NOTE: use @use-gesture/react, not react-use-gesture

// Position each card in the deck
const to = (i: number) => ({ x: 0, y: i * -4, scale: 1, rot: 0 })
const from = (_i: number) => ({ x: 0, rot: 0, scale: 1.5, y: -1000 })

// CSS transform from spring values
const trans = (r: number, s: number) =>
  `perspective(1500px) rotateZ(${r}deg) scale(${s})`

function SwipeDeck({ cards }: { cards: Product[] }) {
  const [gone] = useState(() => new Set<number>())
  const [props, api] = useSprings(cards.length, i => ({ ...to(i), from: from(i) }))

  const bind = useDrag(({ args: [index], active, movement: [mx], direction: [xDir], velocity: [vx] }) => {
    const trigger = vx > 0.2           // velocity threshold for fling-out
    const dir = xDir < 0 ? -1 : 1     // -1 = left, 1 = right

    if (!active && trigger) gone.add(index)

    api.start(i => {
      if (index !== i) return          // only animate the dragged card
      const isGone = gone.has(index)
      const x = isGone ? (200 + window.innerWidth) * dir : active ? mx : 0
      const rot = mx / 100 + (isGone ? dir * 10 * vx : 0)
      const scale = active ? 1.1 : 1
      return {
        x, rot, scale,
        delay: undefined,
        config: {
          friction: 50,
          tension: active ? 800 : isGone ? 200 : 500,
          velocity: isGone ? vx : undefined,  // pass gesture velocity to spring
        },
      }
    })
  })

  return (
    <>
      {props.map(({ x, y, rot, scale }, i) => (
        <animated.div key={i} style={{ x, y, position: 'absolute' }}>
          <animated.div
            {...bind(i)}
            style={{ transform: interpolate([rot, scale], trans) }}
          >
            <SwipeCard product={cards[i]} />
          </animated.div>
        </animated.div>
      ))}
    </>
  )
}
```

**Critical note:** The official demo imports from `react-use-gesture` (old package name). Use `@use-gesture/react` instead. The API is identical; only the import path differs.

### Pattern 2: Convex recordSwipe Mutation (GHOST-01, SWIPE-04)

**What:** Single mutation handles both swipe directions. Inserts to `swipes` always. Inserts to `wishlists` only on right-swipe.

**When to use:** Called once per completed swipe (`!active && trigger` in useDrag handler).

```typescript
// convex/swipes.ts
import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const recordSwipe = mutation({
  args: {
    productId: v.id('products'),
    direction: v.union(v.literal('right'), v.literal('left')),
    productSnapshot: v.object({
      title: v.string(),
      imageUrl: v.string(),
      priceAmount: v.number(),
      priceCurrency: v.string(),
      affiliateUrl: v.string(),
      sourceStore: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    const swipeId = await ctx.db.insert('swipes', {
      userId: user._id,
      productId: args.productId,
      direction: args.direction,
      swipedAt: Date.now(),
      productSnapshot: args.productSnapshot,
    })

    if (args.direction === 'right') {
      await ctx.db.insert('wishlists', {
        userId: user._id,
        productId: args.productId,
        savedAt: Date.now(),
        productSnapshot: args.productSnapshot,
      })
    }

    return swipeId
  },
})
```

### Pattern 3: Convex undoSwipe Mutation (SWIPE-05)

**What:** Delete the most recent swipe record for the user. If the swipe was right, also delete the wishlist entry.

```typescript
// convex/swipes.ts (continued)
export const undoSwipe = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) throw new Error('User not found')

    // Get the last swipe ordered by time descending
    const lastSwipe = await ctx.db
      .query('swipes')
      .withIndex('by_user_time', q => q.eq('userId', user._id))
      .order('desc')
      .first()

    if (!lastSwipe) return null

    await ctx.db.delete(lastSwipe._id)

    // If right-swipe, also remove from wishlist
    if (lastSwipe.direction === 'right') {
      const wishlistEntry = await ctx.db
        .query('wishlists')
        .withIndex('by_user_product', q =>
          q.eq('userId', user._id).eq('productId', lastSwipe.productId)
        )
        .unique()
      if (wishlistEntry) await ctx.db.delete(wishlistEntry._id)
    }

    return lastSwipe
  },
})
```

### Pattern 4: Card Queue Query (GHOST-02)

**What:** Return ~20 products the user has not yet swiped. Uses indexed query to get all swiped productIds, then takes 20 products not in that set.

**Constraint:** Convex `.collect()` throws if more than 1024 documents match. For a small v1 dataset (DummyJSON ~100 products), `.collect()` on user swipes is safe. On the products side, use `.take(N)` with a filter expression.

```typescript
// convex/cardQueue.ts
import { query } from './_generated/server'

export const getCardQueue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique()
    if (!user) return []

    // Collect productIds this user has already swiped
    const swiped = await ctx.db
      .query('swipes')
      .withIndex('by_user', q => q.eq('userId', user._id))
      .collect()

    const swipedIds = new Set(swiped.map(s => s.productId))

    // Fetch active products, filter out already-swiped, take first 20
    const queue: typeof products = []
    const cursor = ctx.db
      .query('products')
      .withIndex('by_store')  // or full table scan for v1
      .filter(q => q.eq(q.field('isActive'), true))

    // Manual take-with-filter: iterate until we have 20
    // Using .collect() risks limit; paginate instead
    const allActive = await cursor.collect()  // safe for v1 (<100 products from DummyJSON)
    for (const p of allActive) {
      if (!swipedIds.has(p._id)) {
        queue.push(p)
        if (queue.length >= 20) break
      }
    }

    return queue
  },
})
```

**v1 note:** DummyJSON provides ~100 products. `.collect()` on products is safe. For v2 (real store APIs with 10k+ products), replace with a proper indexed pagination query. Document this limit in a TODO comment.

### Pattern 5: Directional Overlay (UX-03)

**What:** Overlay div inside the card, driven by the `x` spring value via `interpolate`. Opacity and color toggle based on direction.

```typescript
// Inside SwipeCard or as SwipeOverlay
// x is a SpringValue<number> passed down from useSprings
<animated.div
  style={{
    opacity: x.to(x => Math.min(Math.abs(x) / 100, 1)),
    backgroundColor: x.to(x =>
      x > 0 ? 'rgba(0, 200, 0, 0.3)' : 'rgba(200, 0, 0, 0.3)'
    ),
    position: 'absolute', inset: 0, borderRadius: 'inherit',
  }}
>
  <animated.span style={{ opacity: x.to(x => (x > 20 ? 1 : 0)) }}>
    {/* Heart icon */}
  </animated.span>
  <animated.span style={{ opacity: x.to(x => (x < -20 ? 1 : 0)) }}>
    {/* X icon */}
  </animated.span>
</animated.div>
```

### Pattern 6: Haptic Feedback (UX-01)

**What:** Call `navigator.vibrate()` on confirmed right-swipe.

```typescript
// Called after recordSwipe for direction='right'
function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(50)  // 50ms pulse
  }
}
```

**Browser support:** Chrome/Firefox on Android. No effect on iOS (not supported) or desktop. Silently no-ops where unsupported.

### Pattern 7: Dopamine Glow Animation (UX-02)

**What:** Tailwind v4 custom keyframe animation applied to the card for ~600ms after a right-swipe is confirmed.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --animate-glow-pulse: glow-pulse 0.6s ease-out;
  @keyframes glow-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.8); }
    50%  { box-shadow: 0 0 30px 15px rgba(34, 197, 94, 0.4); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }
}
```

Applied in React:
```typescript
// Card component: add class for 600ms after right-swipe confirmed
const [glowing, setGlowing] = useState(false)

function onRightSwipe() {
  setGlowing(true)
  setTimeout(() => setGlowing(false), 700)
}

<div className={glowing ? 'animate-glow-pulse' : ''}>
```

### Anti-Patterns to Avoid

- **Calling `useMutation` inside the useDrag handler directly:** useDrag runs 60fps; call `recordSwipe` only once when `!active && trigger` (gesture complete above threshold), not on every movement frame.
- **Storing drag position in React state:** Every `setState` during drag causes a re-render, breaking 60fps. Use spring values only; React state is only for "has this card been swiped" (deck index pointer).
- **Using `useQuery` for gesture state:** Query results are server-reactive; gesture state is client-local. Keep them separate. Only query for card queue on mount and when queue drains.
- **`.collect()` on the products table in production:** Safe for v1 (< 100 products) but would throw for > 1024 products. Add TODO comment.
- **Rotating all 3 springs on drag:** Only the active (top) card should track the gesture. Use `if (index !== i) return` in `api.start()` to skip other springs.
- **Importing from `react-use-gesture`:** This is the old v6 package name. Use `@use-gesture/react` (v10).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spring physics | Custom CSS transition or requestAnimationFrame loop | `@react-spring/web` useSprings | Velocity transfer on release, configurable tension/friction, cancellation — all edge cases handled |
| Gesture tracking | `onMouseMove` / `onTouchMove` + state | `@use-gesture/react` useDrag | Handles pointer capture, touch normalization, velocity calculation, multi-pointer, pointer lock — 1000+ edge cases |
| Swipe threshold detection | Custom distance math | `velocity[0]` from useDrag state | Library already computes velocity with proper easing; raw distance is unreliable for flick gestures |
| Card overlay tint | Separate DOM mutation via ref | Spring `x` value interpolated directly to `backgroundColor` | Stays in sync with spring physics at 60fps without separate tracking |

**Key insight:** The gesture+spring pairing from pmndrs is specifically designed to work together — the velocity at gesture release becomes the initial spring velocity, creating the "sling" feeling. Hand-rolling either half loses this integration.

---

## Common Pitfalls

### Pitfall 1: Gesture Handler Fires Convex Mutations on Every Frame
**What goes wrong:** Developer calls `useMutation` in the drag handler body. At 60fps this fires 60 mutations per second during drag, hitting Convex rate limits and causing UI lag.
**Why it happens:** `useDrag` fires on every pointer/touch move event.
**How to avoid:** Gate Convex writes behind `!active && trigger` (gesture complete AND above threshold). Only one mutation fires per swipe.
**Warning signs:** Network tab shows dozens of Convex calls per second during drag.

### Pitfall 2: React State Mutation Inside useDrag
**What goes wrong:** `const [x, setX] = useState(0)` updated in the drag handler causes React to re-render 60 times per second, making the card feel laggy or jumpy.
**Why it happens:** React state always triggers reconciler.
**How to avoid:** Use `api.start()` to update spring values imperatively. Only `useState` for card-completion tracking (the `gone` Set pattern).
**Warning signs:** Profiler shows many renders during drag; card lags behind pointer.

### Pitfall 3: useSprings Count Mismatch
**What goes wrong:** `useSprings(n, fn)` is called with `n` derived from a Convex query. When the query updates (new products added), React throws "rendered more/fewer hooks" because the number of springs changed.
**Why it happens:** useSprings is a hook; hooks cannot have dynamic counts between renders.
**How to avoid:** Fix the spring count at mount (e.g., 20 — matching the queue pre-fetch size). Replace card content in the existing spring slots as cards are consumed. Do not change the `n` argument.
**Warning signs:** "React has detected a change in the order of hooks" error.

### Pitfall 4: Convex collect() Limit
**What goes wrong:** `getCardQueue` uses `.collect()` on `products` table with 1024+ documents — throws a Convex error.
**Why it happens:** Hard limit of 1024 documents per `.collect()`.
**How to avoid:** For v1 (DummyJSON, ~100 products): `.collect()` is safe. Add a TODO comment: "Replace with paginated query when product count exceeds 1024." For v2: use `.take()` with manual filtering loop or proper index-driven pagination.
**Warning signs:** Convex error: "Too many documents read in a single function execution."

### Pitfall 5: Safari / iOS Haptics
**What goes wrong:** `navigator.vibrate(50)` throws on iOS Safari — no vibration API support.
**Why it happens:** iOS Safari does not implement the Web Vibration API as of 2025.
**How to avoid:** Always guard: `if ('vibrate' in navigator) navigator.vibrate(50)`.
**Warning signs:** Uncaught TypeError in Safari console.

### Pitfall 6: Card 3-DOM-Invariant When Queue is Exhausted
**What goes wrong:** When fewer than 3 products remain, the requirement "exactly 3 cards in the DOM" cannot be met. Rendering 3 cards with `undefined` data causes crashes.
**Why it happens:** The requirement assumes the queue always has >= 3 products while swiping.
**How to avoid:** Render only the available cards (1 or 2) when queue < 3, plus an "empty state" behind them. Clarify with product owner whether "exactly 3" applies only when queue >= 3.
**Warning signs:** TypeError accessing `product.title` on undefined card.

### Pitfall 7: Undo Across Right-Swipes
**What goes wrong:** `undoSwipe` deletes the last swipe record but not the corresponding wishlist entry, leaving orphaned wishlist items.
**Why it happens:** Two separate inserts (swipes + wishlists) with no foreign key enforcement.
**How to avoid:** `undoSwipe` mutation must check `lastSwipe.direction === 'right'` and delete from wishlists using `by_user_product` index. Both deletes happen in the same mutation (atomic transaction in Convex).
**Warning signs:** Item remains in wishlist after undo; product re-appears in deck.

---

## Code Examples

### Complete useDrag + useSprings Integration
```typescript
// Source: adapted from https://github.com/pmndrs/react-spring/tree/main/demo/src/sandboxes/cards-stack
import { useSprings, animated, to as interpolate } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

const SWIPE_VELOCITY_THRESHOLD = 0.2  // horizontal velocity (px/ms) to confirm swipe
const SWIPE_DISTANCE_THRESHOLD = 100  // horizontal movement (px) alternative trigger

const to = (i: number) => ({ x: 0, y: i * -4, scale: 1, rot: 0, zIndex: i })
const from = () => ({ x: 0, rot: 0, scale: 1.5, y: -1000 })
const trans = (r: number, s: number) => `rotateZ(${r}deg) scale(${s})`

function SwipeDeck({ queue }: { queue: Product[] }) {
  const [topIndex, setTopIndex] = useState(0)   // which product is active
  const gone = useRef(new Set<number>())         // use ref, not state — no re-render

  const [props, api] = useSprings(queue.length, i => ({ ...to(i), from: from() }))

  const bind = useDrag(({
    args: [index],
    active,
    movement: [mx],
    direction: [xDir],
    velocity: [vx],
    last,
  }) => {
    const trigger = vx > SWIPE_VELOCITY_THRESHOLD || Math.abs(mx) > SWIPE_DISTANCE_THRESHOLD
    const dir = xDir < 0 ? -1 : 1  // -1 = left, +1 = right

    if (last && trigger) {
      gone.current.add(index)
      // Record swipe in Convex (called once per completed gesture)
      const direction = dir === 1 ? 'right' : 'left'
      recordSwipeMutation({ productId: queue[index]._id, direction, productSnapshot: snapshot(queue[index]) })
      if (direction === 'right') triggerHaptic()
    }

    api.start(i => {
      if (index !== i) return  // skip non-active cards
      const isGone = gone.current.has(index)
      return {
        x: isGone ? (200 + window.innerWidth) * dir : active ? mx : 0,
        rot: mx / 100 + (isGone ? dir * 10 * vx : 0),
        scale: active ? 1.1 : 1,
        config: {
          friction: 50,
          tension: active ? 800 : isGone ? 200 : 500,
        },
      }
    })
  })

  return (
    <>
      {props.slice(0, 3).map(({ x, y, rot, scale }, i) => (
        <animated.div key={queue[topIndex + i]?._id ?? i} style={{ x, y, position: 'absolute' }}>
          <animated.div {...bind(topIndex + i)} style={{ transform: interpolate([rot, scale], trans) }}>
            <SwipeCard product={queue[topIndex + i]} xSpring={x} />
          </animated.div>
        </animated.div>
      ))}
    </>
  )
}
```

### Convex Mutation Hook Call Pattern
```typescript
// In SwipeDeck (client component)
'use client'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

const recordSwipe = useMutation(api.swipes.recordSwipe)
const undoSwipe = useMutation(api.swipes.undoSwipe)

// Call inside bind() only when last === true && trigger is met
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-use-gesture` (package name) | `@use-gesture/react` | v10 (2022) | Old package still on npm but unmaintained at v6. Import path changed. |
| `useSprings` with `set()` method | `useSprings` with `api.start()` | react-spring v9 | `set()` removed in v9+; use `api.start({ immediate: true })` for jump cuts |
| v9 `interpolate()` | `to()` from `@react-spring/web` | react-spring v9 | Renamed to `to`; can be aliased: `import { to as interpolate }` |
| Manual `velocity` calculation | `velocity` array from useDrag state | @use-gesture/react v10 | Library computes per-axis velocity; `velocity[0]` = horizontal, `velocity[1]` = vertical |
| react-spring v9 | react-spring v10 | Jan 2025 | v10 adds React 19 support; SpringContext API breaking change; peer deps now include react@19 |

**Deprecated/outdated:**
- `react-use-gesture` npm package: Do NOT use — frozen at v6, replaced by `@use-gesture/react`
- `useSprings` `set()` method: Removed in v9+ — use `api.start({ immediate: true })` for non-animated updates
- `interpolate` named export: Renamed to `to` — alias it on import if needed for readability

---

## Open Questions

1. **Exactly 3 cards when queue < 3**
   - What we know: Requirement says "exactly 3 cards at all times while queue has products"
   - What's unclear: "while queue has products" — does this mean only when >= 3, or >= 1?
   - Recommendation: Plan should render however many cards exist (1-3) and show an "empty state" behind them. Document assumption and revisit with product owner.

2. **useSprings count stability with dynamic queue**
   - What we know: Hooks cannot have variable call counts; queue length changes as user swipes
   - What's unclear: Best strategy — fixed N=20 springs with rotating content, or re-keyed component?
   - Recommendation: Fix spring count at 20 (matching pre-fetch size). Replace card data in spring slots as cards are consumed, using an index offset (`topIndex`). Reset springs when queue reloads.

3. **Undo after queue reset**
   - What we know: After all cards are swiped, the demo resets; undo should not cross a reset boundary
   - What's unclear: Should undo be disabled after a queue reset? Convex still has the record.
   - Recommendation: Disable Undo button when `gone.current.size === 0` (no cards in current session gone). The Convex record can be deleted but the card won't re-appear in the current queue unless the queue reloads.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest 29 |
| Config file | `jest.config.ts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

**Note:** Current Jest config matches only `**/__tests__/**/*.test.ts`. Swipe Engine logic is primarily React component behavior and Convex mutation logic — most verification is manual/integration, not unit-testable with the current Jest setup. Unit tests apply to pure utility functions only.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SWIPE-01 | 3 cards in DOM | manual | — visual inspection | ❌ |
| SWIPE-02 | 1:1 tracking no lag | manual | — human feel test | ❌ |
| SWIPE-03 | Fling-out vs snap-back physics | manual | — human feel test | ❌ |
| SWIPE-04 | Right=wishlist, Left=skip recorded | manual | — Convex dashboard inspection | ❌ |
| SWIPE-05 | Undo reverts Convex record + card | manual | — Convex dashboard inspection | ❌ |
| GHOST-01 | Swipe record has all fields | unit | `npm test -- --testPathPattern=swipes` | ❌ Wave 0 |
| GHOST-02 | Queue excludes swiped products | unit | `npm test -- --testPathPattern=cardQueue` | ❌ Wave 0 |
| UX-01 | Haptic fires on right-swipe | manual | — requires physical device | ❌ |
| UX-02 | Glow animation fires | manual | — visual inspection | ❌ |
| UX-03 | Tint/icon overlay during drag | manual | — visual inspection | ❌ |

### Sampling Rate
- **Per task commit:** `npm test` (unit tests for any pure utilities)
- **Per wave merge:** `npm test` + manual visual verification on mobile viewport
- **Phase gate:** Full suite green + all 5 success criteria verified manually before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `convex/normaliser/__tests__/swipes.test.ts` — covers GHOST-01 (snapshot shape validation)
- [ ] `convex/normaliser/__tests__/cardQueue.test.ts` — covers GHOST-02 (filter logic)
- Framework install: not needed — Jest + ts-jest already installed

*Note: Convex mutation/query logic cannot be unit-tested with Jest without mocking the entire Convex context. Tests for GHOST-01 and GHOST-02 should validate the shape of args/return values and pure filter helper functions, not the database calls themselves.*

---

## Sources

### Primary (HIGH confidence)
- `@react-spring/web@10.0.3` peer deps — verified via `npm info @react-spring/web peerDependencies` (React 19 supported)
- `@use-gesture/react@10.3.1` peer deps — verified via `npm info @use-gesture/react peerDependencies`
- [Official react-spring cards-stack demo source](https://raw.githubusercontent.com/pmndrs/react-spring/main/demo/src/sandboxes/cards-stack/src/App.tsx) — useSprings + useDrag canonical pattern
- [react-spring Imperative API docs](https://react-spring.dev/docs/concepts/imperative-api) — api.start() bypasses React render
- [react-spring Interpolation docs](https://react-spring.dev/docs/advanced/interpolation) — to() transform string pattern
- Schema `convex/schema.ts` — all tables/indexes already defined for Phase 2 writes

### Secondary (MEDIUM confidence)
- [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) — navigator.vibrate() API, browser support confirmed
- [Convex collect() limit 1024 docs](https://docs.convex.dev/database/pagination) — verified via WebSearch citing official docs
- [Tailwind CSS v4 @theme keyframes](https://tailwindcss.com/docs/animation) — @theme block for custom --animate-* variables

### Tertiary (LOW confidence)
- React-spring v10 + React 19 issue resolution: GitHub issue #2341 shows "COMPLETED" but PR was draft as of Jan 2025 — npm peer dep verification (HIGH) overrides this concern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — peer deps verified via npm, official sources
- Architecture: HIGH — canonical demo source fetched from official repo
- Pitfalls: MEDIUM — based on known library behaviors + Convex documented limits
- Micro-UX patterns: MEDIUM — MDN for vibrate, Tailwind v4 docs for @theme keyframes

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable libraries; react-spring v10 active but slow-moving)
