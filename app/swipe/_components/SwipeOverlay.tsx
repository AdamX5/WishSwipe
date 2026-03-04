'use client'
import { animated } from '@react-spring/web'
import type { SpringValue } from '@react-spring/web'

interface SwipeOverlayProps {
  xSpring: SpringValue<number>
}

export default function SwipeOverlay({ xSpring }: SwipeOverlayProps) {
  return (
    <animated.div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: xSpring.to(x =>
          x > 0
            ? `rgba(0, 200, 0, ${Math.min(Math.abs(x) / 200, 0.35)})`
            : `rgba(200, 0, 0, ${Math.min(Math.abs(x) / 200, 0.35)})`
        ),
      }}
    >
      {/* Heart icon — visible when dragging right */}
      <animated.span
        style={{
          fontSize: '4rem',
          opacity: xSpring.to(x => (x > 20 ? Math.min((x - 20) / 80, 1) : 0)),
          position: 'absolute',
        }}
        aria-hidden="true"
      >
        ❤️
      </animated.span>

      {/* X icon — visible when dragging left */}
      <animated.span
        style={{
          fontSize: '4rem',
          opacity: xSpring.to(x => (x < -20 ? Math.min((Math.abs(x) - 20) / 80, 1) : 0)),
          position: 'absolute',
        }}
        aria-hidden="true"
      >
        ✕
      </animated.span>
    </animated.div>
  )
}
