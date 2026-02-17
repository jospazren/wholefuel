import { AppLayout } from '@/components/AppLayout';
import { ApiKeyManager } from '@/components/ApiKeyManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const SettingsPage = () => {
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

        {/* Claude Desktop / MCP API Keys */}
        <ApiKeyManager />

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
