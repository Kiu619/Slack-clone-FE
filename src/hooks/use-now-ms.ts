"use client";

import { useEffect, useState } from "react";

/**
 * Wall-clock "now" in epoch milliseconds, refreshed every `intervalMs`.
 * Lets pure render functions consume a stable `now` without calling
 * `Date.now()` directly (which React Compiler rejects as impure).
 *
 * `Date.now()` is intentionally confined to:
 *   - the lazy `useState` initializer (runs once at mount, not on re-render), and
 *   - the `setInterval` callback (runs inside an effect, not during render).
 *
 * Updates at most once per `intervalMs`; safe to call repeatedly.
 */
export function useNowMs(intervalMs: number = 60_000): number {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return nowMs;
}
