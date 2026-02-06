import { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, Plus, Search, Pencil, Trash2, Flame, Beef, Wheat, Droplet, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const RecipesPage = () => {
  const { recipes, addRecipe, updateRecipe, deleteRecipe, ingredients: ingredientDb, calculateMacrosFromIngredients, weeklyPlan } = useMealPlan();
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

  const filteredRecipes = recipes.filter((recipe) => {
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

  const currentMacros = calculateMacrosFromIngredients(
    formIngredients.map(i => ({ ingredientId: i.ingredientId, amount: i.amount }))
  );

  const handleAddIngredient = (ingredientId: string) => {
    const ing = ingredientDb.find(i => i.id === ingredientId);
    if (ing) {
      setFormIngredients([...formIngredients, {
        ingredientId: ing.id,
        name: ing.name,
        amount: 100,
        unit: 'g',
      }]);
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientAmountChange = (index: number, amount: number) => {
    const updated = [...formIngredients];
    updated[index] = { ...updated[index], amount };
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
      link: formLink || undefined,
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
      link: formLink || undefined,
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
    return Object.values(weeklyPlan).some(day =>
      Object.values(day).some(meal => (meal as any)?.recipeId === id)
    );
  };

  const availableIngredients = ingredientDb.filter(
    ing => !formIngredients.some(fi => fi.ingredientId === ing.id)
  );

  const categoryColors: Record<RecipeCategory, string> = {
    breakfast: 'bg-category-breakfast/10 text-category-breakfast',
    main: 'bg-category-lunch/10 text-category-lunch',
    shake: 'bg-macro-protein/10 text-macro-protein',
    snack: 'bg-category-snack/10 text-category-snack',
    side: 'bg-muted text-muted-foreground',
    dessert: 'bg-category-dinner/10 text-category-dinner',
  };

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
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Dish
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {RECIPE_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-2">
                <Checkbox
                  id={`filter-${cat}`}
                  checked={selectedCategories.has(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                />
                <Label htmlFor={`filter-${cat}`} className="text-sm cursor-pointer capitalize">
                  {CATEGORY_LABELS[cat]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="group hover:shadow-md transition-shadow">
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
            </Card>
          ))}
          {filteredRecipes.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recipes found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen || !!editingRecipe} onOpenChange={(open) => { if (!open) { setIsAddOpen(false); setEditingRecipe(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Edit Dish' : 'Add Dish'}</DialogTitle>
            <DialogDescription>
              {editingRecipe ? 'Update your dish details' : 'Create a new dish for your menu'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dish Name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Chicken Stir Fry" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formCategory} onValueChange={(v) => setFormCategory(v as RecipeCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>


              {/* Ingredients */}
              <div className="space-y-3">
                <Label>Ingredients</Label>
                <div className="space-y-2">
                  {formIngredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <span className="flex-1 text-sm font-medium truncate">{ing.name}</span>
                      <Input
                        type="number"
                        value={ing.amount}
                        onChange={(e) => handleIngredientAmountChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-center"
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground w-6">{ing.unit}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveIngredient(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {availableIngredients.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <Select onValueChange={handleAddIngredient}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add ingredient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIngredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>Instructions (optional)</Label>
                <Textarea 
                  value={formInstructions} 
                  onChange={(e) => setFormInstructions(e.target.value)} 
                  placeholder="Step-by-step preparation instructions..." 
                  rows={4} 
                />
              </div>

              {/* Link */}
              <div className="space-y-2">
                <Label>Recipe Link (optional)</Label>
                <Input 
                  value={formLink} 
                  onChange={(e) => setFormLink(e.target.value)} 
                  placeholder="https://..." 
                  type="url"
                />
              </div>

              {/* Macro Totals */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <Label className="mb-3 block">Dish Totals</Label>
                <div className="grid grid-cols-4 gap-3">
                  <MacroCard icon={<Flame className="h-4 w-4" />} label="Calories" value={currentMacros.calories} colorClass="text-macro-calories bg-macro-calories/10" />
                  <MacroCard icon={<Beef className="h-4 w-4" />} label="Protein" value={currentMacros.protein} colorClass="text-macro-protein bg-macro-protein/10" />
                  <MacroCard icon={<Wheat className="h-4 w-4" />} label="Carbs" value={currentMacros.carbs} colorClass="text-macro-carbs bg-macro-carbs/10" />
                  <MacroCard icon={<Droplet className="h-4 w-4" />} label="Fat" value={currentMacros.fat} colorClass="text-macro-fat bg-macro-fat/10" />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingRecipe(null); }}>Cancel</Button>
            <Button onClick={editingRecipe ? handleSaveEdit : handleSaveNew} disabled={!formName || formIngredients.length === 0}>
              {editingRecipe ? 'Save Changes' : 'Add Dish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
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

function MacroCard({ icon, label, value, colorClass }: { icon: React.ReactNode; label: string; value: number; colorClass: string }) {
  return (
    <div className="text-center space-y-1">
      <div className={cn('inline-flex p-2 rounded-lg', colorClass)}>
        {icon}
      </div>
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default RecipesPage;
