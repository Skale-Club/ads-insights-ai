import { cn } from '@/lib/utils';

export function matchTypeBadgeClass(matchType: string | null | undefined): string {
  const mt = String(matchType || '').toLowerCase();

  // Pastel, distinct colors per match type.
  const base = 'border font-medium';

  if (mt === 'exact') return cn(base, 'bg-emerald-100 text-emerald-950 border-emerald-200');
  if (mt === 'phrase') return cn(base, 'bg-sky-100 text-sky-950 border-sky-200');
  if (mt === 'broad') return cn(base, 'bg-amber-100 text-amber-950 border-amber-200');

  return cn(base, 'bg-slate-100 text-slate-900 border-slate-200');
}

