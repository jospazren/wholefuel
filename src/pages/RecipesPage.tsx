import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { useMeals } from '@/contexts/MealsContext';
import { Recipe, MealSlotEntry, RecipeIngredient } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, Plus, Search, Pencil, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecipeEditorDialog, RecipeEditorMode } from '@/components/RecipeEditorDialog';
import { ManageTagsDialog } from '@/components/ManageTagsDialog';

const RecipesPage = () => {
  const {
    recipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    calculateMacrosFromIngredients,
    allTags,
    isLoading,
  } = useRecipes();
  const { weeklyPlan } = useMealPlan();
  const { getMeal } = useMeals();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [editorMode, setEditorMode] = useState<RecipeEditorMode | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Recipe | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);

  const toggleTag = (tag: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) newSet.delete(tag);
    else newSet.add(tag);
    setSelectedTags(newSet);
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase());
    const matchesTags = selectedTags.size === 0 || recipe.tags.some(t => selectedTags.has(t));
    return matchesSearch && matchesTags;
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

  const handleEditorSave = (data: { name: string; tags: string[]; ingredients: RecipeIngredient[]; instructions?: string; notes?: string; link?: string }) => {
    const macros = calculateMacrosFromIngredients(data.ingredients.map(i => ({
      ingredientId: i.ingredientId,
      servingMultiplier: i.servingMultiplier,
    })));

    if (editingRecipeId) {
      updateRecipe(editingRecipeId, {
        name: data.name,
        tags: data.tags,
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
        tags: data.tags,
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
    return Object.values(weeklyPlan).some(day =>
      Object.values(day).some(entry => {
        const slotEntry = entry as MealSlotEntry | undefined;
        if (!slotEntry) return false;
        const meal = getMeal(slotEntry.mealId);
        return meal?.sourceRecipeId === id;
      })
    );
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setManageTagsOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Manage Tags
          </Button>
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Recipe
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTags(new Set())}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-all',
              selectedTags.size === 0
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-all',
                selectedTags.has(tag)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
                <div className="flex gap-1">
                  <div className="h-5 w-14 rounded-full bg-muted" />
                  <div className="h-5 w-12 rounded-full bg-muted" />
                </div>
                <div className="h-3 w-24 rounded bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : (
        <>
        {filteredRecipes.map(recipe => <Card key={recipe.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-foreground">{recipe.name}</h3>
            </div>
            <div className="flex items-center gap-3 text-sm mb-2">
              <span className="text-macro-calories font-medium">{recipe.totalMacros?.calories ?? 0} kcal</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-macro-protein">{recipe.totalMacros?.protein ?? 0}P</span>
              <span className="text-macro-carbs">{recipe.totalMacros?.carbs ?? 0}C</span>
              <span className="text-macro-fat">{recipe.totalMacros?.fat ?? 0}F</span>
            </div>
            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {recipe.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
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
        </>
        )}
      </div>
    </div>

    {/* Unified Editor Dialog */}
    <RecipeEditorDialog
      mode={editorMode}
      open={editorOpen}
      onClose={() => { setEditorOpen(false); setEditorMode(null); setEditingRecipeId(null); }}
      onSave={handleEditorSave}
    />

    {/* Manage Tags Dialog */}
    <ManageTagsDialog open={manageTagsOpen} onClose={() => setManageTagsOpen(false)} />

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
