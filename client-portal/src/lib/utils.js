/**
 * Utility helper to join class names cleanly
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
