import { useState, useEffect } from 'react';
import { Save, Server, Mail, Shield, TestTube } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<SmtpSettings>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    use_tls: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('smtp_settings').select('*').limit(1).single();
    if (data) {
      setSettings({
        host: data.host,
        port: data.port,
        username: data.username,
        password: '', // Don't load password
        from_email: data.from_email,
        from_name: data.from_name,
        use_tls: data.use_tls ?? true
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    const { data: existing } = await supabase.from('smtp_settings').select('id').limit(1).single();
    
    const payload = {
      host: settings.host,
      port: settings.port,
      username: settings.username,
      from_email: settings.from_email,
      from_name: settings.from_name,
      use_tls: settings.use_tls
    };

    const { error } = existing
      ? await supabase.from('smtp_settings').update(payload).eq('id', existing.id)
      : await supabase.from('smtp_settings').insert(payload);

    setLoading(false);

    if (error) {
      toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved successfully' });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    // Simulate test - in production this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTesting(false);
    toast({ title: 'Connection test', description: 'SMTP connection test completed. Configure edge function for actual testing.' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your email sending settings</p>
        </div>

        {/* SMTP Configuration */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">SMTP Configuration</CardTitle>
                <CardDescription>Configure your cPanel mail server settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Host</label>
                <Input
                  placeholder="mail.yourdomain.com"
                  value={settings.host}
                  onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Port</label>
                <Input
                  type="number"
                  placeholder="587"
                  value={settings.port}
                  onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 587 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  placeholder="user@yourdomain.com"
                  value={settings.username}
                  onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={settings.password}
                  onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium">Use TLS/SSL</p>
                  <p className="text-sm text-muted-foreground">Enable secure connection (recommended)</p>
                </div>
              </div>
              <Switch
                checked={settings.use_tls}
                onCheckedChange={(checked) => setSettings({ ...settings, use_tls: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sender Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Sender Information</CardTitle>
                <CardDescription>Configure how your emails appear to recipients</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Name</label>
                <Input
                  placeholder="Your Company Name"
                  value={settings.from_name}
                  onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From Email</label>
                <Input
                  type="email"
                  placeholder="noreply@yourdomain.com"
                  value={settings.from_email}
                  onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1 sm:flex-none"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
