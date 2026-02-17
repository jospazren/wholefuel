import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Recipe, RecipeCategory, RECIPE_CATEGORIES, CATEGORY_LABELS } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecipeEditorDialog, RecipeEditorMode } from '@/components/RecipeEditorDialog';

const RecipesPage = () => {
  const {
    recipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    calculateMacrosFromIngredients,
    weeklyPlan
  } = useMealPlan();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<RecipeCategory>>(new Set());
  const [editorMode, setEditorMode] = useState<RecipeEditorMode | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Recipe | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const toggleCategory = (cat: RecipeCategory) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(cat)) newSet.delete(cat);
    else newSet.add(cat);
    setSelectedCategories(newSet);
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(recipe.category);
    return matchesSearch && matchesCategory;
  });

  const handleAddClick = () => {
    setEditorMode({ type: 'add' });
    setEditingRecipeId(null);
    setEditorOpen(true);
  };

  const handleEditClick = (recipe: Recipe) => {
    setEditorMode({ type: 'editRecipe', recipe });
    setEditingRecipeId(recipe.id);
    setEditorOpen(true);
  };

  const handleEditorSave = (data: { name: string; category: RecipeCategory; ingredients: any[]; instructions?: string; notes?: string; link?: string }) => {
    const macros = calculateMacrosFromIngredients(data.ingredients.map(i => ({
      ingredientId: i.ingredientId,
      servingMultiplier: i.servingMultiplier,
    })));

    if (editingRecipeId) {
      updateRecipe(editingRecipeId, {
        name: data.name,
        category: data.category,
        ingredients: data.ingredients,
        totalMacros: macros,
        instructions: data.instructions,
        notes: data.notes,
        link: data.link,
      });
    } else {
      addRecipe({
        id: `recipe-${Date.now()}`,
        name: data.name,
        description: '',
        category: data.category,
        servings: 1,
        ingredients: data.ingredients,
        totalMacros: macros,
        instructions: data.instructions,
        notes: data.notes,
        link: data.link,
      });
    }
    setEditorOpen(false);
    setEditorMode(null);
    setEditingRecipeId(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteRecipe(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const isRecipeUsedThisWeek = (id: string) => {
    return Object.values(weeklyPlan).some(day => Object.values(day).some(meal => (meal as any)?.recipeId === id));
  };

  const categoryColors: Record<RecipeCategory, string> = {
    breakfast: 'bg-category-breakfast/10 text-category-breakfast',
    main: 'bg-category-lunch/10 text-category-lunch',
    shake: 'bg-macro-protein/10 text-macro-protein',
    snack: 'bg-category-snack/10 text-category-snack',
    side: 'bg-muted text-muted-foreground',
    dessert: 'bg-category-dinner/10 text-category-dinner'
  };

  return <AppLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Menu</h1>
            <p className="text-sm text-muted-foreground">Create and manage your dishes</p>
          </div>
        </div>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Recipe
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {RECIPE_CATEGORIES.map(cat => <div key={cat} className="flex items-center gap-2">
            <Checkbox id={`filter-${cat}`} checked={selectedCategories.has(cat)} onCheckedChange={() => toggleCategory(cat)} />
            <Label htmlFor={`filter-${cat}`} className="text-sm cursor-pointer capitalize">
              {CATEGORY_LABELS[cat]}
            </Label>
          </div>)}
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map(recipe => <Card key={recipe.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-foreground">{recipe.name}</h3>
              <Badge className={cn('shrink-0', categoryColors[recipe.category])}>
                {CATEGORY_LABELS[recipe.category]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm mb-3">
              <span className="text-macro-calories font-medium">{recipe.totalMacros.calories} kcal</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-macro-protein">{recipe.totalMacros.protein}P</span>
              <span className="text-macro-carbs">{recipe.totalMacros.carbs}C</span>
              <span className="text-macro-fat">{recipe.totalMacros.fat}F</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              {recipe.ingredients.length} ingredients
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleEditClick(recipe)}>
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(recipe)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>)}
        {filteredRecipes.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No recipes found</p>
        </div>}
      </div>
    </div>

    {/* Unified Editor Dialog */}
    <RecipeEditorDialog
      mode={editorMode}
      open={editorOpen}
      onClose={() => { setEditorOpen(false); setEditorMode(null); setEditingRecipeId(null); }}
      onSave={handleEditorSave}
    />

    {/* Delete Confirmation */}
    <AlertDialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteConfirm && isRecipeUsedThisWeek(deleteConfirm.id) ? `"${deleteConfirm.name}" is used in your current week's meal plan. Deleting it won't remove existing meals but the base recipe will be gone.` : `Are you sure you want to delete "${deleteConfirm?.name}"?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </AppLayout>;
};

export default RecipesPage;
