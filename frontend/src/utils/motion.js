export function scrollBehavior() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === false ? 'smooth' : 'auto';
}
