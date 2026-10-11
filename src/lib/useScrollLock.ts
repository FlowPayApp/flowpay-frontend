import { useEffect } from "react";

let locks = 0;
let restore: (() => void) | null = null;

function lock() {
  const targets = [document.documentElement, document.body, ...document.querySelectorAll<HTMLElement>("main")];
  const saved = targets.map((el) => ({
    el,
    overflow: el.style.overflow,
    overscroll: el.style.overscrollBehavior,
    paddingRight: el.style.paddingRight,
  }));
  for (const el of targets) {
    // Al ocultar la barra de scroll el contenido se correría; se compensa con su ancho.
    const scrollbar = el.offsetWidth - el.clientWidth;
    if (el !== document.documentElement && el !== document.body && scrollbar > 0) {
      el.style.paddingRight = `${parseFloat(getComputedStyle(el).paddingRight) + scrollbar}px`;
    }
    el.style.overflow = "hidden";
    el.style.overscrollBehavior = "none";
  }
  return () => {
    for (const s of saved) {
      s.el.style.overflow = s.overflow;
      s.el.style.overscrollBehavior = s.overscroll;
      s.el.style.paddingRight = s.paddingRight;
    }
  };
}

/** Bloquea el scroll de la página de fondo mientras `active` sea true; admite varios modales a la vez. */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (locks === 0) restore = lock();
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        restore?.();
        restore = null;
      }
    };
  }, [active]);
}
