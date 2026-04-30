// Apple-style motion tokens.
// Reference: https://developer.apple.com/design/human-interface-guidelines/motion

export const duration = {
  instant: 0.1,
  fast: 0.18,
  base: 0.24,
  slow: 0.4,
  slower: 0.6,
} as const;

export const easing = {
  // Apple's signature ease — used across iOS/macOS
  standard: [0.32, 0.72, 0, 1] as [number, number, number, number],
  decelerate: [0, 0, 0.2, 1] as [number, number, number, number],
  accelerate: [0.4, 0, 1, 1] as [number, number, number, number],
  bounceOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;

export const spring = {
  gentle: { type: 'spring' as const, stiffness: 260, damping: 28 },
  standard: { type: 'spring' as const, stiffness: 300, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 400, damping: 20 },
  stiff: { type: 'spring' as const, stiffness: 500, damping: 35 },
};

export const scale = {
  hoverUp: 1.02,
  hoverDown: 0.98,
  pop: 1.05,
  dramatic: 1.15,
} as const;

// Ready-to-use variants for common patterns.

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.base, ease: easing.standard },
};

export const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: duration.base, ease: easing.standard },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
  transition: { duration: duration.fast, ease: easing.standard },
};

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: duration.base, ease: easing.standard },
};

// Interactive element presets — apply to any button or link.

export const interactive = {
  whileHover: { scale: scale.hoverUp },
  whileTap: { scale: scale.hoverDown },
  transition: spring.standard,
};

export const interactiveGentle = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: spring.gentle,
};

// Stagger children animation
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.base, ease: easing.standard },
};

// Haptic — mobile only
export function haptic(strength: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  const duration = { light: 10, medium: 20, heavy: 30 }[strength];
  navigator.vibrate(duration);
}

// Respect reduced motion preference
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
