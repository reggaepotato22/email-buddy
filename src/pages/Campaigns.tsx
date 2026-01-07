import { useEffect, useState } from 'react';
import { Plus, Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { canEdit } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'sending': return <Play className="w-4 h-4 text-primary" />;
      case 'paused': return <Pause className="w-4 h-4 text-warning" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground">{campaigns.length} campaigns</p>
          </div>
          {canEdit && <Button onClick={() => navigate('/campaigns/new')}><Plus className="w-4 h-4 mr-2" />New Campaign</Button>}
        </div>

        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No campaigns yet. Create your first one!</CardContent></Card>
          ) : campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(campaign.status)}
                    <h3 className="font-semibold">{campaign.name}</h3>
                  </div>
                  <span className="text-sm text-muted-foreground capitalize">{campaign.status}</span>
                </div>
                <Progress value={campaign.total_recipients > 0 ? (campaign.sent_count / campaign.total_recipients) * 100 : 0} className="mb-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{campaign.sent_count}/{campaign.total_recipients} sent</span>
                  <span>{campaign.opened_count} opens • {campaign.clicked_count} clicks</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}