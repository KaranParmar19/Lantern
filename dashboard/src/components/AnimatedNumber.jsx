'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedNumber — Smoothly counts up/down to a target value.
 * Uses requestAnimationFrame for buttery-smooth 60fps animation.
 *
 * Props:
 *   value     - target number
 *   duration  - animation duration in ms (default 800)
 *   decimals  - decimal places (default 0)
 *   formatter - optional function to format the final display
 */
export default function AnimatedNumber({ value, duration = 800, decimals = 0, formatter }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = prevValue.current;
    const end = typeof value === 'number' ? value : parseFloat(value) || 0;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted = formatter
    ? formatter(display)
    : decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString();

  return <>{formatted}</>;
}
