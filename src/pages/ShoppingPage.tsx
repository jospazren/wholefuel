import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { ShoppingItem } from '@/types/meal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Download, Printer, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ShoppingPage = () => {
  const { generateShoppingList, weeklyPlan } = useMealPlan();
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  // Check if there are any meals in the plan
  const hasMeals = Object.values(weeklyPlan).some(day =>
    Object.values(day).some(meal => !!meal)
  );

  const handleGenerate = () => {
    const list = generateShoppingList();
    setShoppingList(list);
    setIsGenerated(true);
  };

  const handleTogglePurchased = (ingredientId: string) => {
    setShoppingList(prev => prev.map(item =>
      item.ingredientId === ingredientId
        ? { ...item, purchased: !item.purchased }
        : item
    ));
  };

  const handleAmountChange = (ingredientId: string, amount: number) => {
    setShoppingList(prev => prev.map(item =>
      item.ingredientId === ingredientId
        ? { ...item, totalAmount: amount }
        : item
    ));
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)} kg`;
    }
    return `${Math.round(amount)} g`;
  };

  const handleExport = () => {
    const text = shoppingList
      .map(item => `${item.purchased ? '✓' : '☐'} ${item.name}: ${formatAmount(item.totalAmount)}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shopping-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const purchasedCount = shoppingList.filter(item => item.purchased).length;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-foreground">Shopping List</h1>
              <p className="text-sm text-muted-foreground">
                {isGenerated ? `${shoppingList.length} items from your weekly plan` : 'Generate a list from your meal plan'}
              </p>
            </div>
          </div>
        </div>

        {!isGenerated ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Generate Your Shopping List</h3>
              <p className="text-muted-foreground mb-6">
                {hasMeals
                  ? 'Click below to aggregate all ingredients from your weekly meal plan'
                  : 'Add meals to your weekly plan first, then generate your shopping list'}
              </p>
              <Button onClick={handleGenerate} disabled={!hasMeals} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Generate Shopping List
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleGenerate} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <div className="flex-1" />
              <Badge variant="secondary" className="text-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {purchasedCount}/{shoppingList.length} purchased
              </Badge>
            </div>

            {/* Shopping List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Shopping List</CardTitle>
                <CardDescription>Week of {new Date().toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shoppingList.map((item) => (
                    <div
                      key={item.ingredientId}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg transition-colors',
                        item.purchased ? 'bg-primary/5' : 'bg-muted/50 hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={item.purchased}
                        onCheckedChange={() => handleTogglePurchased(item.ingredientId)}
                      />
                      <span className={cn(
                        'flex-1 font-medium',
                        item.purchased && 'line-through text-muted-foreground'
                      )}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={Math.round(item.totalAmount)}
                          onChange={(e) => handleAmountChange(item.ingredientId, parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-center"
                          min={0}
                        />
                        <span className="text-sm text-muted-foreground w-8">{item.unit}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatAmount(item.totalAmount)}
                      </Badge>
                    </div>
                  ))}
                  {shoppingList.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No items in your shopping list</p>
                      <p className="text-sm">Add meals to your weekly plan first</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ShoppingPage;
