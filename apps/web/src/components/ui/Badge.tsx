import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'yellow' | 'blue' | 'red' | 'gray' | 'purple';

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-brand-900/50 text-brand-400 border border-brand-800',
  yellow: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
  blue: 'bg-blue-900/50 text-blue-400 border border-blue-800',
  red: 'bg-red-900/50 text-red-400 border border-red-800',
  gray: 'bg-gray-800 text-gray-400 border border-gray-700',
  purple: 'bg-purple-900/50 text-purple-400 border border-purple-800',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    ADMIN: { label: 'Admin', variant: 'red' },
    TRAINER: { label: 'Trainer', variant: 'blue' },
    TRAINEE: { label: 'Trainee', variant: 'green' },
  };
  const { label, variant } = config[role] ?? { label: role, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}
