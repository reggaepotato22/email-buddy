import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card>
          <CardHeader><CardTitle>SMTP Configuration</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            SMTP settings will be configured here. Admin only.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}