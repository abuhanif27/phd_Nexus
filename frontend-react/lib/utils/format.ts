import { format as dateFnsFormat, formatDistance, formatRelative } from 'date-fns';

/**
 * Format a date to a readable string
 * @param date - Date to format
 * @param formatStr - Format string (date-fns format)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, formatStr = 'PPP'): string {
  return dateFnsFormat(new Date(date), formatStr);
}

/**
 * Format date time
 */
export function formatDateTime(date: Date | string | number): string {
  return dateFnsFormat(new Date(date), 'PPP p');
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
}

/**
 * Format relative date (e.g., "yesterday at 5:30 PM")
 */
export function formatRelativeDate(date: Date | string | number): string {
  return formatRelative(new Date(date), new Date());
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}
