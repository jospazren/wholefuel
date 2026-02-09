import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { BaseIngredient } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Apple, Plus, Search, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortField = 'name' | 'caloriesPerServing' | 'proteinPerServing' | 'fatPerServing' | 'carbsPerServing' | 'fiberPerServing' | 'sodiumPerServing' | 'servingDescription';
type SortDirection = 'asc' | 'desc';

const IngredientsPage = () => {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient, recipes } = useMealPlan();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingIngredient, setEditingIngredient] = useState<BaseIngredient | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<BaseIngredient | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    caloriesPerServing: '',
    proteinPerServing: '',
    fatPerServing: '',
    carbsPerServing: '',
    fiberPerServing: '',
    sodiumPerServing: '',
    brand: '',
    servingDescription: '100g',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      caloriesPerServing: '',
      proteinPerServing: '',
      fatPerServing: '',
      carbsPerServing: '',
      fiberPerServing: '',
      sodiumPerServing: '',
      brand: '',
      servingDescription: '100g',
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredIngredients = ingredients
    .filter(ing => ing.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const handleAddClick = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleEditClick = (ing: BaseIngredient) => {
    setFormData({
      name: ing.name,
      caloriesPerServing: ing.caloriesPerServing.toString(),
      proteinPerServing: ing.proteinPerServing.toString(),
      fatPerServing: ing.fatPerServing.toString(),
      carbsPerServing: ing.carbsPerServing.toString(),
      fiberPerServing: ing.fiberPerServing.toString(),
      sodiumPerServing: ing.sodiumPerServing.toString(),
      brand: ing.brand || '',
      servingDescription: ing.servingDescription || '100g',
    });
    setEditingIngredient(ing);
  };

  const handleSaveNew = () => {
    const newIngredient: BaseIngredient = {
      id: `ing-${Date.now()}`,
      name: formData.name,
      caloriesPerServing: parseFloat(formData.caloriesPerServing) || 0,
      proteinPerServing: parseFloat(formData.proteinPerServing) || 0,
      fatPerServing: parseFloat(formData.fatPerServing) || 0,
      carbsPerServing: parseFloat(formData.carbsPerServing) || 0,
      fiberPerServing: parseFloat(formData.fiberPerServing) || 0,
      sodiumPerServing: parseFloat(formData.sodiumPerServing) || 0,
      brand: formData.brand || undefined,
      servingDescription: formData.servingDescription || '100g',
      servingGrams: 100, // Default value, no longer user-editable
    };
    addIngredient(newIngredient);
    setIsAddOpen(false);
    resetForm();
  };

  const handleSaveEdit = () => {
    if (!editingIngredient) return;
    updateIngredient(editingIngredient.id, {
      name: formData.name,
      caloriesPerServing: parseFloat(formData.caloriesPerServing) || 0,
      proteinPerServing: parseFloat(formData.proteinPerServing) || 0,
      fatPerServing: parseFloat(formData.fatPerServing) || 0,
      carbsPerServing: parseFloat(formData.carbsPerServing) || 0,
      fiberPerServing: parseFloat(formData.fiberPerServing) || 0,
      sodiumPerServing: parseFloat(formData.sodiumPerServing) || 0,
      brand: formData.brand || undefined,
      servingDescription: formData.servingDescription || '100g',
    });
    setEditingIngredient(null);
    resetForm();
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteIngredient(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Check if ingredient is used in any recipe
  const isIngredientUsed = (id: string) => {
    return recipes.some(r => r.ingredients.some(i => i.ingredientId === id));
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort(field)}>
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
              <Apple className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Ingredients</h1>
              <p className="text-sm text-muted-foreground">Manage your ingredient database</p>
            </div>
          </div>
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Ingredient
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
            <TableRow>
                <SortHeader field="name">Name</SortHeader>
                <SortHeader field="servingDescription">Serving</SortHeader>
                <SortHeader field="caloriesPerServing">Calories</SortHeader>
                <SortHeader field="proteinPerServing">Protein</SortHeader>
                <SortHeader field="fatPerServing">Fat</SortHeader>
                <SortHeader field="carbsPerServing">Carbs</SortHeader>
                <SortHeader field="fiberPerServing">Fiber</SortHeader>
                <SortHeader field="sodiumPerServing">Sodium</SortHeader>
                <TableHead>Brand</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIngredients.map((ing) => (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{ing.servingDescription || '100g'}</TableCell>
                  <TableCell className="text-macro-calories">{ing.caloriesPerServing}</TableCell>
                  <TableCell className="text-macro-protein">{ing.proteinPerServing}g</TableCell>
                  <TableCell className="text-macro-fat">{ing.fatPerServing}g</TableCell>
                  <TableCell className="text-macro-carbs">{ing.carbsPerServing}g</TableCell>
                  <TableCell className="text-muted-foreground">{ing.fiberPerServing}g</TableCell>
                  <TableCell className="text-muted-foreground">{ing.sodiumPerServing}mg</TableCell>
                  <TableCell className="text-muted-foreground">{ing.brand || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(ing)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(ing)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredIngredients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No ingredients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ingredient</DialogTitle>
            <DialogDescription>Add a new ingredient to your database. Values are per serving.</DialogDescription>
          </DialogHeader>
          <IngredientForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNew} disabled={!formData.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingIngredient} onOpenChange={(open) => !open && setEditingIngredient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ingredient</DialogTitle>
            <DialogDescription>Update ingredient values. All values are per serving.</DialogDescription>
          </DialogHeader>
          <IngredientForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIngredient(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!formData.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && isIngredientUsed(deleteConfirm.id)
                ? `"${deleteConfirm.name}" is used in one or more recipes. Deleting it may affect those recipes.`
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

function IngredientForm({ formData, setFormData }: { formData: any; setFormData: (data: any) => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Chicken Breast" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="servingDescription">Serving Description</Label>
          <Input id="servingDescription" value={formData.servingDescription} onChange={(e) => setFormData({ ...formData, servingDescription: e.target.value })} placeholder="e.g., 1 egg (60g)" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="brand">Brand (optional)</Label>
          <Input id="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g., Generic" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="calories">Calories (per serving)</Label>
          <Input id="calories" type="number" value={formData.caloriesPerServing} onChange={(e) => setFormData({ ...formData, caloriesPerServing: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="protein">Protein (g per serving)</Label>
          <Input id="protein" type="number" value={formData.proteinPerServing} onChange={(e) => setFormData({ ...formData, proteinPerServing: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="fat">Fat (g per serving)</Label>
          <Input id="fat" type="number" value={formData.fatPerServing} onChange={(e) => setFormData({ ...formData, fatPerServing: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="carbs">Carbs (g per serving)</Label>
          <Input id="carbs" type="number" value={formData.carbsPerServing} onChange={(e) => setFormData({ ...formData, carbsPerServing: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="fiber">Fiber (g per serving)</Label>
          <Input id="fiber" type="number" value={formData.fiberPerServing} onChange={(e) => setFormData({ ...formData, fiberPerServing: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sodium">Sodium (mg per serving)</Label>
          <Input id="sodium" type="number" value={formData.sodiumPerServing} onChange={(e) => setFormData({ ...formData, sodiumPerServing: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export default IngredientsPage;
