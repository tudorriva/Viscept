import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely, resolving conflicts.
 * Drop-in compatible with shadcn/ui cn() pattern.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID suitable for nodes, edges, and other diagram elements.
 * Format: timestamp-counter-random
 * Example: 1715294400000-42-a3b2c1
 */
let _idCounter = 0;
export function generateId(): string {
  return `${Date.now()}-${++_idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
