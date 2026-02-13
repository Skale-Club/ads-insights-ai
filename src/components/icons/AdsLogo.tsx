import { cn } from '@/lib/utils';

interface AdsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AdsLogo({ className, size = 'md' }: AdsLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-24 w-24',
  };

  return (
    <img
      src="/Ads Insights AI.svg"
      alt="Ads Insights AI Logo"
      className={cn(sizeClasses[size], 'object-contain', className)}
    />
  );
}