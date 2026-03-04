---
phase: 02-swipe-engine
plan: 02
subsystem: swipe-ui
tags: [gesture, physics, react-spring, use-gesture, swipe-deck, card-ui]
dependency_graph:
  requires: [02-01]
  provides: [SwipeDeck, SwipeCard, swipe-page-wired]
  affects: [app/swipe/page.tsx]
tech_stack:
  added: []
  patterns:
    - useSprings with fixed SPRING_COUNT=20 (hooks cannot have dynamic counts)
    - Absolute queue index strategy prevents card-advance bug
    - topIndex/gone useRef — no React state mutations during drag
    - api.start() imperative spring updates bypass React reconciler
key_files:
  created:
    - app/swipe/_components/SwipeCard.tsx
    - app/swipe/_components/SwipeDeck.tsx
  modified:
    - app/swipe/page.tsx
decisions:
  - SPRING_COUNT fixed at 20 (not derived from queue.length) — React hook count must be stable
  - Absolute queue indices (topIndex.current + displayPosition) used throughout — display position i only for zIndex ordering
  - gone.current and springs slots both keyed on absolute index — prevents next-card immediate-fly-off bug
  - recordSwipeMutation called only inside if (last && trigger) — not on every drag frame
  - touchAction: none on draggable animated.div — required for mobile browser drag
metrics:
  duration: 5 min
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
requirements_met: [SWIPE-01, SWIPE-02, SWIPE-03]
---

# Phase 2 Plan 2: SwipeDeck Gesture Engine Summary

**One-liner:** Physics-based 3-card swipe deck using useSprings + useDrag with absolute-index strategy that prevents the card-advance bug, recording completed swipes to Convex without touching React state during drag.

## What Was Built

### SwipeCard (app/swipe/_components/SwipeCard.tsx)

Pure presentational component. Receives `product: Doc<'products'>` and `xSpring: SpringValue<number>` props. Renders product image, title, price (cents to decimal with currency), store badge (uppercase), and optional star rating. Not animated itself — parent SwipeDeck wraps it in `animated.div`.

### SwipeDeck (app/swipe/_components/SwipeDeck.tsx)

Core gesture component with `'use client'` directive. Architecture:

- **State:** `useQuery(api.cardQueue.getCardQueue)` for the live product queue; `useMutation(api.swipes.recordSwipe)` for writes
- **Refs:** `topIndex` (absolute pointer into queue[]) and `gone` (Set of swiped absolute indices) — both `useRef`, never `useState`
- **Springs:** `useSprings(20, ...)` — fixed count, maps 1:1 to absolute queue positions
- **Drag:** `useDrag` receives `absIndex = topIndex.current + displayPosition` — never raw display position
- **Render:** `displayQueue = queue.slice(topIndex.current, topIndex.current + 3)` advances as cards leave
- **Empty state:** Shows placeholder `div` when fewer than 3 cards remain; "No more products" message when exhausted

### page.tsx (app/swipe/page.tsx)

Server component with Clerk auth guard. Replaced placeholder text with `<SwipeDeck />` inside flex-centered layout, with `p-4` padding added.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create SwipeCard presentational component | a0f3a5a | app/swipe/_components/SwipeCard.tsx |
| 2 | Create SwipeDeck gesture engine and wire into page | acec454 | app/swipe/_components/SwipeDeck.tsx, app/swipe/page.tsx |

## Verification Results

- `npm test` — 33 tests passing (4 suites)
- `npx tsc --noEmit` — zero errors in new files (pre-existing error in SwipeShell.tsx from Phase 01, logged to deferred-items.md)
- No `useState` in useDrag handler — confirmed by grep
- `api_.start()` called imperatively — no React reconciler involvement during drag
- `recordSwipeMutation` only inside `if (last && trigger)` block
- `bind(absIndex)` uses absolute index throughout
- `springs[absIndex]` maps each card to dedicated spring slot
- `touchAction: 'none'` present on draggable element

## Deviations from Plan

### Out-of-scope issue logged (not fixed)

**Pre-existing TypeScript error in SwipeShell.tsx** — `afterSignOutUrl` prop no longer valid on Clerk v7 `UserButton`. This existed since Phase 01 Plan 02 (commit d529da5) and is unrelated to this plan's changes. Logged to `deferred-items.md`.

No deviations to the plan itself — executed exactly as written.

## Key Decisions

1. **SPRING_COUNT = 20 (fixed constant):** React hook array sizes cannot change between renders. Using a fixed count well above typical queue sizes avoids hook rule violations and is the canonical react-spring pattern.

2. **Absolute index strategy:** `topIndex.current + i` gives each card a stable, unique identity in `gone.current` and the `springs` array for its entire lifetime. Using display position `i` (0-2) instead would cause the card-advance bug: after top card is swiped, the next card inherits position 0, finds 0 already in `gone`, and immediately flies off screen.

3. **No React state during drag:** `topIndex` and `gone` are `useRef` — mutations to them do not trigger re-renders. Spring updates go through `api_.start()` imperatively. This is what enables 60fps drag tracking without React reconciler overhead.

4. **recordSwipeMutation gated on `last && trigger`:** Called exactly once per completed swipe, not on every pointer move event (which would flood Convex with writes).

## Self-Check: PASSED

All created files found on disk. All task commits verified in git log.

| Check | Result |
|-------|--------|
| app/swipe/_components/SwipeCard.tsx | FOUND |
| app/swipe/_components/SwipeDeck.tsx | FOUND |
| app/swipe/page.tsx | FOUND |
| .planning/phases/02-swipe-engine/02-02-SUMMARY.md | FOUND |
| commit a0f3a5a (SwipeCard) | FOUND |
| commit acec454 (SwipeDeck) | FOUND |
