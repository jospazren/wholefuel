import { MealSlotEntry, DayOfWeek, MealSlot, Recipe } from '@/types/meal';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { useMeals } from '@/contexts/MealsContext';
import { RecipeEditorDialog, RecipeEditorMode } from '@/components/RecipeEditorDialog';

interface MealEditSheetProps {
  meal: MealSlotEntry | null;
  day: DayOfWeek | null;
  slot: MealSlot | null;
  open: boolean;
  onClose: () => void;
}

export function MealEditSheet({ meal: entry, day, slot, open, onClose }: MealEditSheetProps) {
  const { removeMealFromSlot } = useMealPlan();
  const { recipes } = useRecipes();
  const { getMeal, getMealMacros, updateMeal } = useMeals();

  if (!entry || !day || !slot) return null;

  const mealData = getMeal(entry.mealId);
  if (!mealData) return null;

  // Build a pseudo-recipe from the meal for the editor
  const linkedRecipe = mealData.sourceRecipeId
    ? recipes.find(r => r.id === mealData.sourceRecipeId)
    : undefined;

  const macros = getMealMacros(mealData);

  const pseudoRecipe: Recipe = {
    id: mealData.id,
    name: mealData.name,
    description: '',
    tags: linkedRecipe?.tags || [],
    ingredients: (mealData.ingredients || []).map(i => ({
      ingredientId: i.ingredientId,
      name: i.name,
      servingMultiplier: i.servingMultiplier,
    })),
    totalMacros: macros,
    instructions: linkedRecipe?.instructions,
    notes: linkedRecipe?.notes,
    link: linkedRecipe?.link,
  };

  const handleDelete = () => {
    removeMealFromSlot(day, slot);
    onClose();
  };

  const mode: RecipeEditorMode = {
    type: 'editMeal',
    recipe: pseudoRecipe,
    onDelete: handleDelete,
  };

  const handleSave = (data: { name: string; ingredients: any[] }) => {
    updateMeal(entry.mealId, {
      name: data.name,
      ingredients: data.ingredients,
    });
    onClose();
  };

  return (
    <RecipeEditorDialog
      mode={mode}
      open={open}
      onClose={onClose}
      onSave={handleSave}
    />
  );
}
