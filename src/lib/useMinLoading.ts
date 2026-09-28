import { useEffect, useRef, useState } from "react";

export const MIN_LOADING_MS = 1000;

/** Mantiene `true` al menos `minMs` desde que empezó la carga, para que el indicador no parpadee. */
export function useMinLoading(loading: boolean, minMs = MIN_LOADING_MS): boolean {
  const [holding, setHolding] = useState(loading);
  const startedAt = useRef(loading ? Date.now() : 0);

  useEffect(() => {
    if (loading) {
      startedAt.current = Date.now();
      setHolding(true);
      return;
    }
    const wait = startedAt.current + minMs - Date.now();
    if (wait <= 0) {
      setHolding(false);
      return;
    }
    const timer = window.setTimeout(() => setHolding(false), wait);
    return () => window.clearTimeout(timer);
  }, [loading, minMs]);

  return loading || holding;
}

export function waitMinLoading(startedAt: number, minMs = MIN_LOADING_MS): Promise<void> {
  const wait = startedAt + minMs - Date.now();
  return wait > 0 ? new Promise((resolve) => window.setTimeout(resolve, wait)) : Promise.resolve();
}
