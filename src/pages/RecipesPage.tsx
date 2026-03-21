import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipesContext';
import { useMeals } from '@/contexts/MealsContext';
import { Recipe, MealSlotEntry, RecipeIngredient } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UtensilsCrossed, Plus, Search, Pencil, Trash2, ArrowUpDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecipeEditorDialog, RecipeEditorMode } from '@/components/RecipeEditorDialog';
import { ManageTagsDialog } from '@/components/ManageTagsDialog';

type SortField = 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'ingredients' | 'timesCooked' | 'lastCooked';
type SortDirection = 'asc' | 'desc';

const RecipesPage = () => {
  const {
    recipes, addRecipe, updateRecipe, deleteRecipe,
    calculateMacrosFromIngredients, allTags, isLoading,
  } = useRecipes();
  const { weeklyPlan } = useMealPlan();
  const { getMeal, meals } = useMeals();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [editorMode, setEditorMode] = useState<RecipeEditorMode | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Recipe | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterNeverCooked, setFilterNeverCooked] = useState(false);

  // Compute usage stats from meals
  const recipeUsage = useMemo(() => {
    const usage = new Map<string, { timesCooked: number; lastCooked: string | null }>();
    meals.forEach(meal => {
      if (meal.sourceRecipeId) {
        const existing = usage.get(meal.sourceRecipeId);
        const mealDate = meal.createdAt || null;
        if (existing) {
          existing.timesCooked++;
          if (mealDate && (!existing.lastCooked || mealDate > existing.lastCooked)) {
            existing.lastCooked = mealDate;
          }
        } else {
          usage.set(meal.sourceRecipeId, { timesCooked: 1, lastCooked: mealDate });
        }
      }
    });
    return usage;
  }, [meals]);

  const toggleTag = (tag: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) newSet.delete(tag);
    else newSet.add(tag);
    setSelectedTags(newSet);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = recipes.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase());
      const matchesTags = selectedTags.size === 0 || recipe.tags.some(t => selectedTags.has(t));
      const usage = recipeUsage.get(recipe.id);
      const matchesNeverCooked = !filterNeverCooked || !usage || usage.timesCooked === 0;
      return matchesSearch && matchesTags && matchesNeverCooked;
    });

    list.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      const aUsage = recipeUsage.get(a.id);
      const bUsage = recipeUsage.get(b.id);

      switch (sortField) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'calories': aVal = a.totalMacros?.calories ?? 0; bVal = b.totalMacros?.calories ?? 0; break;
        case 'protein': aVal = a.totalMacros?.protein ?? 0; bVal = b.totalMacros?.protein ?? 0; break;
        case 'carbs': aVal = a.totalMacros?.carbs ?? 0; bVal = b.totalMacros?.carbs ?? 0; break;
        case 'fat': aVal = a.totalMacros?.fat ?? 0; bVal = b.totalMacros?.fat ?? 0; break;
        case 'ingredients': aVal = a.ingredients.length; bVal = b.ingredients.length; break;
        case 'timesCooked': aVal = aUsage?.timesCooked ?? 0; bVal = bUsage?.timesCooked ?? 0; break;
        case 'lastCooked': aVal = aUsage?.lastCooked ?? ''; bVal = bUsage?.lastCooked ?? ''; break;
        default: aVal = 0; bVal = 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return list;
  }, [recipes, search, selectedTags, filterNeverCooked, sortField, sortDirection, recipeUsage]);

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
        name: data.name, tags: data.tags, ingredients: data.ingredients,
        totalMacros: macros, instructions: data.instructions, notes: data.notes, link: data.link,
      });
    } else {
      addRecipe({
        id: `recipe-${Date.now()}`, name: data.name, description: '',
        tags: data.tags, ingredients: data.ingredients, totalMacros: macros,
        instructions: data.instructions, notes: data.notes, link: data.link,
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const SortHeader = ({ field, children, className: cls }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn('cursor-pointer hover:bg-muted/50', cls)} onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn('h-3 w-3', sortField === field ? 'text-primary' : 'text-muted-foreground/50')} />
      </div>
    </TableHead>
  );

  return (
    <AppLayout>
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
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setSelectedTags(new Set())}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-all',
                selectedTags.size === 0 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
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
                  selectedTags.has(tag) ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
              >
                {tag}
              </button>
            ))}
            <span className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setFilterNeverCooked(v => !v)}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-all',
                filterNeverCooked ? 'bg-amber-500/15 text-amber-700 shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              Never cooked
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="name">Name</SortHeader>
                <TableHead>Tags</TableHead>
                <SortHeader field="calories">Cal</SortHeader>
                <SortHeader field="protein">P</SortHeader>
                <SortHeader field="carbs">C</SortHeader>
                <SortHeader field="fat">F</SortHeader>
                <SortHeader field="ingredients">Ing.</SortHeader>
                <SortHeader field="timesCooked">Cooked</SortHeader>
                <SortHeader field="lastCooked">Last</SortHeader>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-12 rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <>
                  {filteredAndSorted.map(recipe => {
                    const usage = recipeUsage.get(recipe.id);
                    return (
                      <TableRow key={recipe.id} className="cursor-pointer hover:bg-muted/30" onClick={() => handleEditClick(recipe)}>
                        <TableCell className="font-medium">{recipe.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {recipe.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-macro-calories">{recipe.totalMacros?.calories ?? 0}</TableCell>
                        <TableCell className="text-macro-protein">{recipe.totalMacros?.protein ?? 0}</TableCell>
                        <TableCell className="text-macro-carbs">{recipe.totalMacros?.carbs ?? 0}</TableCell>
                        <TableCell className="text-macro-fat">{recipe.totalMacros?.fat ?? 0}</TableCell>
                        <TableCell className="text-muted-foreground">{recipe.ingredients.length}</TableCell>
                        <TableCell className="text-muted-foreground">{usage?.timesCooked ?? 0}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(usage?.lastCooked ?? null)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(recipe)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(recipe)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredAndSorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No recipes found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <RecipeEditorDialog
        mode={editorMode}
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditorMode(null); setEditingRecipeId(null); }}
        onSave={handleEditorSave}
      />

      <ManageTagsDialog open={manageTagsOpen} onClose={() => setManageTagsOpen(false)} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && isRecipeUsedThisWeek(deleteConfirm.id)
                ? `"${deleteConfirm.name}" is used in your current week's meal plan. Deleting it won't remove existing meals but the base recipe will be gone.`
                : `Are you sure you want to delete "${deleteConfirm?.name}"?`}
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
    </AppLayout>
  );
};

export default RecipesPage;
