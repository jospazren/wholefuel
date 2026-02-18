import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface ManageTagsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ManageTagsDialog({ open, onClose }: ManageTagsDialogProps) {
  const { allTags, recipes, renameTag, deleteTag } = useMealPlan();
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const getRecipeCount = (tag: string) => {
    return recipes.filter(r => r.tags.includes(tag)).length;
  };

  const handleAddTag = () => {
    const trimmed = newTagName.trim();
    if (trimmed && !allTags.includes(trimmed)) {
      // Tags are created by assigning to recipes, but we can add a placeholder
      // For now, we just clear the input - tags only exist when assigned to recipes
      setNewTagName('');
    }
  };

  const handleRename = async (oldName: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== oldName && !allTags.includes(trimmed)) {
      await renameTag(oldName, trimmed);
    }
    setEditingTag(null);
    setEditValue('');
  };

  const handleDelete = async (tagName: string) => {
    await deleteTag(tagName);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tag list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allTags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tags yet. Tags are created when you assign them to recipes.
              </p>
            )}
            {allTags.map(tag => (
              <div key={tag} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20">
                {editingTag === tag ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(tag); if (e.key === 'Escape') setEditingTag(null); }}
                      className="flex-1 h-7 px-2 text-sm rounded-lg border border-input bg-background outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button onClick={() => handleRename(tag)} className="text-primary p-1">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingTag(null)} className="text-muted-foreground p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {tag}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {getRecipeCount(tag)} recipe{getRecipeCount(tag) !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => { setEditingTag(tag); setEditValue(tag); }}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
