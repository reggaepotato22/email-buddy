import { useEffect, useState } from 'react';
import { Plus, Play, Pause, CheckCircle, XCircle, Send, Clock, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

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
  const navigate = useNavigate();

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'sending': return <Play className="w-4 h-4 text-blue-600" />;
      case 'paused': return <Pause className="w-4 h-4 text-amber-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'sending': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'failed': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'sending').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
            <p className="text-muted-foreground mt-1">{stats.total} total • {stats.active} active • {stats.completed} completed</p>
          </div>
          <Button 
            onClick={() => navigate('/campaigns/new')}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Campaigns List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No campaigns yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first campaign to start sending emails</p>
                <Button className="mt-4" onClick={() => navigate('/campaigns/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const progress = campaign.total_recipients > 0 
                ? (campaign.sent_count / campaign.total_recipients) * 100 
                : 0;
              const openRate = campaign.sent_count > 0 
                ? ((campaign.opened_count || 0) / campaign.sent_count * 100).toFixed(1)
                : '0.0';
              const clickRate = campaign.sent_count > 0 
                ? ((campaign.clicked_count || 0) / campaign.sent_count * 100).toFixed(1)
                : '0.0';

              return (
                <Card 
                  key={campaign.id} 
                  className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group" 
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Left: Campaign info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(campaign.status)}
                          <h3 className="font-semibold text-lg truncate">{campaign.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Right: Stats */}
                      <div className="flex items-center gap-6 lg:gap-8">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{campaign.sent_count}</p>
                          <p className="text-xs text-muted-foreground">Sent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-600">{openRate}%</p>
                          <p className="text-xs text-muted-foreground">Opens</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{clickRate}%</p>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1.5">
                        <span>{campaign.sent_count} of {campaign.total_recipients} recipients</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
