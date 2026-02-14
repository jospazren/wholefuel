import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { Recipe } from '@/types/meal';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRecipe, setDraggedRecipe] = useState<Recipe | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <div className="p-4 lg:p-6">
        <div className="flex gap-4">
          {/* Left Sidebar - Recipe Library */}
          <div className={cn(
            "transition-all duration-300 overflow-hidden shrink-0",
            sidebarOpen ? "w-[240px] opacity-100" : "w-0 opacity-0"
          )}>
            <RecipeLibrary
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className="h-[calc(100vh-5.5rem)]"
            />
          </div>

          {/* Main Content - Calendar */}
          <div className="flex-1 min-w-0">
            <WeeklyCalendar
              className="h-[calc(100vh-5.5rem)]"
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
