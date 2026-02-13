 import { HeroMetrics } from '@/components/dashboard/HeroMetrics';
 import { QuickInsights } from '@/components/dashboard/QuickInsights';
 import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
 import { TopPerformers } from '@/components/dashboard/TopPerformers';
 import { useDashboard } from '@/contexts/DashboardContext';
 
 export default function OverviewPage() {
   const { selectedAccount } = useDashboard();
 
   if (!selectedAccount) {
     return (
       <div className="flex h-[50vh] items-center justify-center">
         <p className="text-muted-foreground">Please select an account to view analytics</p>
       </div>
     );
   }
 
   return (
     <div className="space-y-8 animate-fade-in">
       {/* Header */}
       <div>
         <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
         <p className="text-muted-foreground">
           {selectedAccount.name}
         </p>
       </div>
 
       {/* Hero Metrics - Most Important KPIs */}
       <HeroMetrics />
 
       {/* Quick Insights */}
       <QuickInsights />
 
       {/* Performance Chart */}
       <PerformanceChart />
 
       {/* Top Performers */}
       <TopPerformers />
     </div>
   );
 }
