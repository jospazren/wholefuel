import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Flame } from 'lucide-react';
interface AppLayoutProps {
  children: React.ReactNode;
}
export function AppLayout({
  children
}: AppLayoutProps) {
  const {
    weeklyTargets
  } = useMealPlan();
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 glass border-b h-12 flex items-center justify-between px-4 py-[8px]">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-macro-calories" />
                <span className="text-sm font-semibold text-foreground">{weeklyTargets.dailyCalories}</span>
                <span className="text-xs text-muted-foreground">kcal/day</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <div className="text-sm">
                <span className="font-semibold text-macro-protein">{weeklyTargets.protein}P</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="font-semibold text-macro-carbs">{weeklyTargets.carbs}C</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="font-semibold text-macro-fat">{weeklyTargets.fat}F</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>;
}