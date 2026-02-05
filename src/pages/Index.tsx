import { useState } from 'react';
import { MealPlanProvider } from '@/contexts/MealPlanContext';
import { Header } from '@/components/Header';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { RecipeLibrary } from '@/components/RecipeLibrary';
import { DailyMacroSummary } from '@/components/DailyMacroSummary';
import { Recipe } from '@/types/meal';

function MealPlannerApp() {
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Recipe Library */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <RecipeLibrary
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                className="h-[calc(100vh-8rem)]"
              />
            </div>
          </div>

          {/* Main Content - Calendar */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <DailyMacroSummary />
            <WeeklyCalendar />
          </div>

          {/* Right Sidebar - Info/Stats */}
          <div className="lg:col-span-3 order-3">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Tips Card */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border p-4 shadow-sm">
                <h3 className="font-display font-semibold text-foreground mb-2">Quick Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Drag recipes from the library to your calendar
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Click a day header to see detailed macros
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Use the settings icon to adjust your targets
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Each meal slot is independent and customizable
                  </li>
                </ul>
              </div>

              {/* Macro Legend */}
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <h3 className="font-display font-semibold text-foreground mb-3">Macro Colors</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-macro-calories" />
                    <span className="text-sm text-muted-foreground">Calories (kcal)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-macro-protein" />
                    <span className="text-sm text-muted-foreground">Protein (g)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-macro-carbs" />
                    <span className="text-sm text-muted-foreground">Carbohydrates (g)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-macro-fat" />
                    <span className="text-sm text-muted-foreground">Fat (g)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const Index = () => {
  return (
    <MealPlanProvider>
      <MealPlannerApp />
    </MealPlanProvider>
  );
};

export default Index;
