import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Plus, Trash2, Key, Clock, AlertTriangle } from 'lucide-react';
import { useApiKeys, NewApiKey } from '@/hooks/useApiKeys';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ApiKeyManager() {
  const { apiKeys, loading, createApiKey, revokeApiKey } = useApiKeys();
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState('Claude Desktop');

  const mcpServerUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

  const handleCreateKey = async () => {
    setCreating(true);
    const key = await createApiKey(keyName);
    if (key) {
      setNewKey(key);
      toast.success('API key created successfully');
    } else {
      toast.error('Failed to create API key');
    }
    setCreating(false);
    setKeyName('Claude Desktop');
  };

  const handleCopyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.full_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('API key copied to clipboard');
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    const success = await revokeApiKey(keyId);
    if (success) {
      toast.success(`Revoked "${keyName}"`);
    } else {
      toast.error('Failed to revoke key');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Claude Desktop Integration
        </CardTitle>
        <CardDescription>
          Create persistent API keys that don't expire for Claude Desktop MCP connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Server URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">MCP Server URL</label>
          <code className="block px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
            {mcpServerUrl}
          </code>
        </div>

        {/* Newly Created Key Alert */}
        {newKey && (
          <div className="p-4 rounded-lg border border-[hsl(var(--status-warning)/0.3)] bg-[hsl(var(--status-warning)/0.1)] space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--status-warning))] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  Save your API key now!
                </p>
                <p className="text-sm text-muted-foreground">
                  This key won't be shown again. Copy it and add it to your Claude Desktop config.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-background rounded-md text-sm font-mono break-all border">
                {newKey.full_key}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopyKey}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setNewKey(null)}
              className="w-full"
            >
              I've saved my key
            </Button>
          </div>
        )}

        {/* Create New Key */}
        {!newKey && (
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g., Claude Desktop)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreateKey} disabled={creating || !keyName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Key'}
            </Button>
          </div>
        )}

        {/* Existing Keys */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Your API Keys</label>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
              No API keys yet. Create one to connect Claude Desktop.
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{key.name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <code className="bg-muted px-1.5 py-0.5 rounded">
                        {key.key_prefix}...
                      </code>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {key.last_used_at ? `Used ${formatDate(key.last_used_at)}` : 'Never used'}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently revoke "{key.name}". Any applications using this key will stop working immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRevokeKey(key.id, key.name)}>
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration Example */}
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium text-foreground">Claude Desktop Config</label>
          <p className="text-xs text-muted-foreground mb-2">
            Add this to your <code className="bg-muted px-1 rounded">claude_desktop_config.json</code>:
          </p>
          <pre className="px-3 py-2 bg-muted rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "mcpServers": {
    "wholefuel": {
      "url": "${mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
