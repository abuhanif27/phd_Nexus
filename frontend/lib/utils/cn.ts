import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence handling
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Sleep/delay utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random ID (not cryptographically secure)
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
