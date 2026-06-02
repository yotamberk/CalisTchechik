import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatVolumeLabel(volumeType: string, volumeValue: string): string {
  switch (volumeType) {
    case 'MAX':
      return 'MAX reps';
    case 'MAX_HOLD':
      return 'Max Hold';
    case 'TIME_SEC':
      return `${volumeValue}"`;
    case 'HEIGHT_CM':
      return `${volumeValue} cm`;
    default:
      return `${volumeValue} reps`;
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Returns the upcoming Sunday (or today if today is Sunday) as YYYY-MM-DD */
export function nextSundayStr(from: Date = new Date()): string {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return toDateInput(d);
}

/** Adds N days to a date string (YYYY-MM-DD) and returns YYYY-MM-DD */
export function addDaysToStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

/** Formats a Date as YYYY-MM-DD for date inputs */
export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Formats a duration in ms as "Xh Ym" or "Ym Zs" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
