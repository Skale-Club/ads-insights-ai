import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDashboard, DateRangePreset } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

const datePresets: { value: DateRangePreset; label: string }[] = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last14', label: 'Last 14 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisYear', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'allTime', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

export function TopBar() {
  const {
    selectedAccount,
    setSelectedAccount,
     visibleAccounts,
    dateRange,
    setDateRange,
    dateRangePreset,
    setDateRangePreset,
    setLastRefreshed,
  } = useDashboard();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh - will be replaced with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLastRefreshed(new Date());
    setIsRefreshing(false);
  };

  const currentPreset = datePresets.find((p) => p.value === dateRangePreset);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        {/* Account Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-between">
              <span className="truncate">
                {selectedAccount?.name || 'Select Account'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[250px]">
             {visibleAccounts.length === 0 ? (
               <DropdownMenuItem disabled>
                 No accounts loaded
               </DropdownMenuItem>
             ) : (
               visibleAccounts.map((account) => (
              <DropdownMenuItem
                key={account.id}
                onClick={() => setSelectedAccount(account)}
                className="flex flex-col items-start"
              >
                   <div className="flex items-center gap-2">
                     <span className="font-medium">{account.name}</span>
                     {account.isManager && (
                       <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">MCC</span>
                     )}
                   </div>
                <span className="text-xs text-muted-foreground">
                  {account.customerId}
                </span>
              </DropdownMenuItem>
               ))
             )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {currentPreset?.label}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {datePresets.map((preset) => (
              <DropdownMenuItem
                key={preset.value}
                onClick={() => setDateRangePreset(preset.value)}
                className={cn(dateRangePreset === preset.value && 'bg-accent')}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Custom Date Range Picker */}
        {dateRangePreset === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, 'MMM dd, yyyy')} -{' '}
                {format(dateRange.to, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Button
        variant="outline"
        onClick={handleRefresh}
        disabled={isRefreshing || !selectedAccount}
      >
        <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
      </Button>
    </header>
  );
}
