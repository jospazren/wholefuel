import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { Recipe } from '@/types/meal';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const Index = () => {
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRecipe, setDraggedRecipe] = useState<Recipe | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Force sidebar closed on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleDragStart = (recipe: Recipe) => {
    setIsDragging(true);
    setDraggedRecipe(recipe);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedRecipe(null);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-2.75rem)]">
        {/* Left Sidebar - Recipe Library (desktop only) */}
        {!isMobile && (
          <div className={cn(
            "transition-all duration-300 shrink-0 border-r border-white/30 overflow-hidden",
            sidebarOpen ? "w-[240px] opacity-100" : "w-0 opacity-0 border-r-0"
          )}>
            <RecipeLibrary
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className="h-full"
            />
          </div>
        )}

        {/* Main Content - Calendar */}
        <div className={cn("flex-1 min-w-0 overflow-auto", isMobile ? "p-2" : "p-4 lg:p-6")}>
          <WeeklyCalendar
            className="h-full"
            sidebarOpen={isMobile ? false : sidebarOpen}
            onToggleSidebar={isMobile ? undefined : () => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
