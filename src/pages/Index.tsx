import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { Recipe } from '@/types/meal';

const Index = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRecipe, setDraggedRecipe] = useState<Recipe | null>(null);

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Recipe Library */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <RecipeLibrary
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className="h-[calc(100vh-7rem)]"
            />
          </div>

          {/* Main Content - Calendar */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <WeeklyCalendar />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
