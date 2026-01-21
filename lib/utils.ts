import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a glob pattern (with * wildcards) to a RegExp
 * Examples: "10.2.50.*" matches "10.2.50.100", "switch*" matches "switch01"
 */
export function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars (except *)
    .replace(/\*/g, '.*');                   // Convert * to .*
  return new RegExp(`^${escaped}$`, 'i');    // Case-insensitive, full match
}

/**
 * Check if a value matches any of the glob patterns
 */
export function matchesAnyPattern(value: string | null, patterns: string[]): boolean {
  if (!value || patterns.length === 0) return false;
  return patterns.some(pattern => globToRegex(pattern).test(value));
}

/**
 * Parse comma-separated filter patterns from env var
 */
export function parseFilterPatterns(envValue: string | undefined): string[] {
  if (!envValue || envValue.trim() === '') return [];
  return envValue.split(',').map(p => p.trim()).filter(p => p.length > 0);
}
