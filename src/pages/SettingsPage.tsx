import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { WeeklyTargetsForm } from '@/components/WeeklyTargetsForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SettingsPage = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const mcpServerUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const copyToClipboard = async (text: string, type: 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
      toast.success(`${type === 'url' ? 'URL' : 'Token'} copied to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const maskedToken = accessToken 
    ? `${accessToken.slice(0, 20)}...${accessToken.slice(-10)}`
    : 'Not logged in';

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure your meal planning preferences</p>
          </div>
        </div>

        {/* Weekly Targets */}
        <WeeklyTargetsForm />

        {/* MCP Server Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Claude Desktop Integration</CardTitle>
            <CardDescription>Connect Claude Desktop to manage your meal plan with natural language</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Server URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">MCP Server URL</label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                  {mcpServerUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(mcpServerUrl, 'url')}
                >
                  {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Auth Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Auth Token</label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                  {showToken ? (accessToken || 'Not logged in') : maskedToken}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {accessToken && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(accessToken, 'token')}
                  >
                    {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Note: Token expires after 1 hour. Refresh this page to get a new token.
              </p>
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
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>App Preferences</CardTitle>
            <CardDescription>Additional settings coming soon</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li>Theme customization</li>
              <li>Default serving sizes</li>
              <li>Notification preferences</li>
              <li>Data export/import</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
