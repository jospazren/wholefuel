import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Recipe, RecipeCategory, RECIPE_CATEGORIES, CATEGORY_LABELS, RecipeIngredient } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, Plus, Search, Pencil, Trash2, Flame, Beef, Wheat, Droplet, X, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
const RecipesPage = () => {
  const {
    recipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    ingredients: ingredientDb,
    calculateMacrosFromIngredients,
    weeklyPlan
  } = useMealPlan();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<RecipeCategory>>(new Set());
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Recipe | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<RecipeCategory>('main');
  const [formIngredients, setFormIngredients] = useState<RecipeIngredient[]>([]);
  const [formInstructions, setFormInstructions] = useState('');
  const [formLink, setFormLink] = useState('');
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const ingredientsRef = useRef<HTMLDivElement>(null);

  // Track scroll position for "Add ingredient" visibility
  useEffect(() => {
    const el = ingredientsRef.current;
    if (!el) return;
    const checkScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
      setIsAtBottom(atBottom);
    };
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    return () => el.removeEventListener('scroll', checkScroll);
  }, [formIngredients.length]);
  const resetForm = () => {
    setFormName('');
    setFormCategory('main');
    setFormIngredients([]);
    setFormInstructions('');
    setFormLink('');
  };
  const toggleCategory = (cat: RecipeCategory) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(cat)) {
      newSet.delete(cat);
    } else {
      newSet.add(cat);
    }
    setSelectedCategories(newSet);
  };
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(recipe.category);
    return matchesSearch && matchesCategory;
  });
  const handleAddClick = () => {
    resetForm();
    setIsAddOpen(true);
  };
  const handleEditClick = (recipe: Recipe) => {
    setFormName(recipe.name);
    setFormCategory(recipe.category);
    setFormIngredients([...recipe.ingredients]);
    setFormInstructions(recipe.instructions || '');
    setFormLink(recipe.link || '');
    setEditingRecipe(recipe);
  };
  const currentMacros = calculateMacrosFromIngredients(formIngredients.map(i => ({
    ingredientId: i.ingredientId,
    amount: i.amount
  })));

  // Get ingredient info including serving and macros
  const getIngredientInfo = (ingredientId: string, amount: number) => {
    const ing = ingredientDb.find(i => i.id === ingredientId);
    if (!ing) return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      serving: ''
    };
    const multiplier = amount / ing.servingGrams;
    return {
      calories: Math.round(ing.caloriesPer100g * multiplier),
      protein: Math.round(ing.proteinPer100g * multiplier),
      carbs: Math.round(ing.carbsPer100g * multiplier),
      fat: Math.round(ing.fatPer100g * multiplier),
      serving: ing.servingDescription || `${ing.servingGrams}g`,
      servingGrams: ing.servingGrams
    };
  };
  const handleAddIngredient = (ingredientId: string) => {
    const ing = ingredientDb.find(i => i.id === ingredientId);
    if (ing) {
      setFormIngredients([...formIngredients, {
        ingredientId: ing.id,
        name: ing.name,
        amount: ing.servingGrams,
        // Default to 1 serving
        unit: 'g'
      }]);
    }
  };
  const handleRemoveIngredient = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
    setSwappingIndex(null);
  };
  const handleIngredientAmountChange = (index: number, amount: number) => {
    const updated = [...formIngredients];
    updated[index] = {
      ...updated[index],
      amount
    };
    setFormIngredients(updated);
  };
  const handleSwapIngredient = (index: number, newIngredientId: string) => {
    const ing = ingredientDb.find(i => i.id === newIngredientId);
    if (ing) {
      const updated = [...formIngredients];
      updated[index] = {
        ingredientId: ing.id,
        name: ing.name,
        amount: updated[index].amount,
        unit: 'g'
      };
      setFormIngredients(updated);
    }
    setSwappingIndex(null);
  };
  const handleMoveIngredient = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formIngredients.length) return;
    const updated = [...formIngredients];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFormIngredients(updated);
  };
  const handleSaveNew = () => {
    const newRecipe: Recipe = {
      id: `recipe-${Date.now()}`,
      name: formName,
      description: '',
      category: formCategory,
      servings: 1,
      ingredients: formIngredients,
      totalMacros: currentMacros,
      instructions: formInstructions || undefined,
      link: formLink || undefined
    };
    addRecipe(newRecipe);
    setIsAddOpen(false);
    resetForm();
  };
  const handleSaveEdit = () => {
    if (!editingRecipe) return;
    updateRecipe(editingRecipe.id, {
      name: formName,
      category: formCategory,
      ingredients: formIngredients,
      totalMacros: currentMacros,
      instructions: formInstructions || undefined,
      link: formLink || undefined
    });
    setEditingRecipe(null);
    resetForm();
  };
  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteRecipe(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Check if recipe is used in current week plan
  const isRecipeUsedThisWeek = (id: string) => {
    return Object.values(weeklyPlan).some(day => Object.values(day).some(meal => (meal as any)?.recipeId === id));
  };
  const availableIngredients = ingredientDb.filter(ing => !formIngredients.some(fi => fi.ingredientId === ing.id));
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
            Add Dish
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

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || !!editingRecipe} onOpenChange={open => {
      if (!open) {
        setIsAddOpen(false);
        setEditingRecipe(null);
      }
    }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Compact header: Name + Category left, Macros right */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Recipe name..." className="text-base font-semibold h-9 max-w-[200px]" />
              <Select value={formCategory} onValueChange={v => setFormCategory(v as RecipeCategory)}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {/* Macro totals */}
            <div className="flex items-center gap-4 shrink-0 py-[8px] mr-[20px]">
              <div className="flex items-center gap-1 text-macro-calories">
                <Flame className="h-4 w-4" />
                <span className="font-bold text-sm">{currentMacros.calories}</span>
              </div>
              <div className="flex items-center gap-1 text-macro-protein">
                <Beef className="h-4 w-4" />
                <span className="font-bold text-sm">{currentMacros.protein}g</span>
              </div>
              <div className="flex items-center gap-1 text-macro-carbs">
                <Wheat className="h-4 w-4" />
                <span className="font-bold text-sm">{currentMacros.carbs}g</span>
              </div>
              <div className="flex items-center gap-1 text-macro-fat">
                <Droplet className="h-4 w-4" />
                <span className="font-bold text-sm">{currentMacros.fat}g</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
            <div className="space-y-4 py-4">


              {/* Ingredients */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ingredients</Label>
                  {/* Column headers */}
                  <div className="flex items-center text-sm font-medium gap-2 pr-20">
                    <span className="w-16 text-center">Qty</span>
                    <span className="w-24 text-center">Serving</span>
                    <span className="w-12 text-center">Cal</span>
                    <span className="space-y-2">P</span>
                    <span className="w-10 text-center">C</span>
                    <span className="w-10 text-center">F</span>
                  </div>
                </div>
                <div ref={ingredientsRef} className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {formIngredients.map((ing, idx) => {
                  const info = getIngredientInfo(ing.ingredientId, ing.amount);
                  const servingMultiplier = info.servingGrams ? ing.amount / info.servingGrams : 1;
                  const handleMultiplierChange = (newMultiplier: number) => {
                    const newAmount = Math.round(newMultiplier * (info.servingGrams || 100));
                    handleIngredientAmountChange(idx, newAmount);
                  };
                  return <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        {/* Move up/down buttons */}
                        <div className="flex flex-col shrink-0">
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => handleMoveIngredient(idx, 'up')} disabled={idx === 0}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => handleMoveIngredient(idx, 'down')} disabled={idx === formIngredients.length - 1}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Ingredient name or swap selector */}
                        {swappingIndex === idx ? <Select onValueChange={id => handleSwapIngredient(idx, id)} open={true} onOpenChange={open => !open && setSwappingIndex(null)}>
                            <SelectTrigger className="flex-1 h-8">
                              <SelectValue placeholder={ing.name} />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredientDb.filter(i => i.id !== ing.ingredientId && !formIngredients.some(fi => fi.ingredientId === i.id)).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                            </SelectContent>
                          </Select> : <span className="flex-1 text-sm font-medium truncate">{ing.name}</span>}
                        
                        {/* Serving multiplier input */}
                        <div className="flex items-center shrink-0 w-16">
                          <span className="text-sm text-muted-foreground mr-1">×</span>
                          <Input type="number" value={Math.round(servingMultiplier * 100) / 100} onChange={e => handleMultiplierChange(parseFloat(e.target.value) || 0)} className="w-12 h-8 text-center text-sm px-1" min={0} step={0.5} />
                        </div>
                        
                        {/* Serving info */}
                        <span className="w-24 text-sm text-muted-foreground text-center shrink-0 truncate" title={info.serving}>
                          {info.serving}
                        </span>
                        
                        {/* Per-ingredient macros - fixed widths */}
                        <span className="w-12 text-sm text-macro-calories text-center shrink-0">{info.calories}</span>
                        <span className="w-10 text-sm text-macro-protein text-center shrink-0">{info.protein}</span>
                        <span className="w-10 text-sm text-macro-carbs text-center shrink-0">{info.carbs}</span>
                        <span className="w-10 text-sm text-macro-fat text-center shrink-0">{info.fat}</span>
                        
                        {/* Swap button */}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0" onClick={() => setSwappingIndex(swappingIndex === idx ? null : idx)} title="Swap ingredient">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        
                        {/* Remove button */}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemoveIngredient(idx)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>;
                })}
                </div>

                {availableIngredients.length > 0 && (formIngredients.length === 0 || isAtBottom) && <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <Select onValueChange={handleAddIngredient}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add ingredient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIngredients.map(ing => <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>}
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>Instructions (optional)</Label>
                <Textarea value={formInstructions} onChange={e => setFormInstructions(e.target.value)} placeholder="Step-by-step preparation instructions..." rows={4} />
              </div>

              {/* Link */}
              <div className="space-y-2">
                <Label>Recipe Link (optional)</Label>
                <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="https://..." type="url" />
              </div>

            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setIsAddOpen(false);
            setEditingRecipe(null);
          }}>Cancel</Button>
            <Button onClick={editingRecipe ? handleSaveEdit : handleSaveNew} disabled={!formName || formIngredients.length === 0}>
              {editingRecipe ? 'Save Changes' : 'Add Recipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
function MacroCard({
  icon,
  label,
  value,
  colorClass
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}) {
  return <div className="text-center space-y-1">
      <div className={cn('inline-flex p-2 rounded-lg', colorClass)}>
        {icon}
      </div>
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>;
}
export default RecipesPage;