import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateText(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}
