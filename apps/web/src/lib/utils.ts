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
