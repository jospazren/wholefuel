import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { Recipe } from '@/types/meal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useIngredients } from '@/contexts/IngredientsContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { cn } from '@/lib/utils';

function CalendarSkeleton() {
  return (
    <div
      className="rounded-3xl overflow-hidden flex flex-col h-full animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header skeleton */}
      <div className="border-b border-white/30 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
        <div className="h-8 w-32 rounded-full bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-xl bg-muted" />
          <div className="h-8 w-16 rounded-xl bg-muted" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="flex-1 p-3">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`header-${i}`} className="rounded-2xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="h-3 w-8 mx-auto rounded bg-muted" />
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-muted" />
                <div className="h-1.5 rounded-full bg-muted" />
              </div>
            </div>
          ))}
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={`cell-${i}`} className="h-14 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-full p-3 space-y-3 animate-pulse"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(236,253,245,0.2) 100%)',
      }}
    >
      <div className="h-8 rounded-2xl bg-muted" />
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 w-14 rounded-full bg-muted" />
        ))}
      </div>
      <div className="flex-1 space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.3)' }} />
        ))}
      </div>
    </div>
  );
}

const Index = () => {
  const isMobile = useIsMobile();
  const { isLoading: ingredientsLoading } = useIngredients();
  const { isLoading: recipesLoading } = useRecipes();
  const { isLoading: mealPlanLoading } = useMealPlan();
  const isLoading = ingredientsLoading || recipesLoading || mealPlanLoading;
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
            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <RecipeLibrary
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                className="h-full"
              />
            )}
          </div>
        )}

        {/* Main Content - Calendar */}
        <div className={cn("flex-1 min-w-0 overflow-auto", isMobile ? "p-2" : "p-4 lg:p-6")}>
          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <WeeklyCalendar
              className="h-full"
              sidebarOpen={isMobile ? false : sidebarOpen}
              onToggleSidebar={isMobile ? undefined : () => setSidebarOpen(!sidebarOpen)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
