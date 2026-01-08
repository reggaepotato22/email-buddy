import { useEffect, useState } from 'react';
import { Send, Users, FileText, BarChart3, TrendingUp, Clock, ArrowUpRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalContacts: number;
  totalTemplates: number;
  totalCampaigns: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
}

interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  total_recipients: number;
  opened_count: number;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalTemplates: 0,
    totalCampaigns: 0,
    emailsSent: 0,
    openRate: 0,
    clickRate: 0
  });
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchRecentCampaigns();
  }, []);

  const fetchStats = async () => {
    try {
      const [contactsRes, templatesRes, campaignsRes] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('email_templates').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns').select('*')
      ]);

      const campaigns = campaignsRes.data || [];
      const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
      const totalOpened = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
      const totalClicked = campaigns.reduce((acc, c) => acc + (c.clicked_count || 0), 0);

      setStats({
        totalContacts: contactsRes.count || 0,
        totalTemplates: templatesRes.count || 0,
        totalCampaigns: campaigns.length,
        emailsSent: totalSent,
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, status, sent_count, total_recipients, opened_count, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentCampaigns(data || []);
  };

  const statCards = [
    { 
      title: 'Total Contacts', 
      value: stats.totalContacts, 
      icon: Users, 
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/10'
    },
    { 
      title: 'Templates', 
      value: stats.totalTemplates, 
      icon: FileText, 
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 to-purple-600/10'
    },
    { 
      title: 'Campaigns', 
      value: stats.totalCampaigns, 
      icon: Send, 
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-500/10 to-green-600/10'
    },
    { 
      title: 'Emails Sent', 
      value: stats.emailsSent, 
      icon: BarChart3, 
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 to-orange-600/10'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'sending': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'failed': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your email marketing overview.</p>
          </div>
          <Button 
            onClick={() => navigate('/campaigns/new')} 
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
          >
            <Zap className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card 
              key={index} 
              className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value.toLocaleString()}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-600/10">
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Open Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">{stats.openRate.toFixed(1)}%</p>
                    <span className="text-sm text-emerald-600 flex items-center">
                      <ArrowUpRight className="w-3 h-3" />
                      2.3%
                    </span>
                  </div>
                  <Progress value={stats.openRate} className="mt-3 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Click Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">{stats.clickRate.toFixed(1)}%</p>
                    <span className="text-sm text-blue-600 flex items-center">
                      <ArrowUpRight className="w-3 h-3" />
                      1.8%
                    </span>
                  </div>
                  <Progress value={stats.clickRate} className="mt-3 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Campaigns */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Recent Campaigns
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
                View all
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No campaigns yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first campaign to get started!</p>
                <Button className="mt-4" onClick={() => navigate('/campaigns/new')}>
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => {
                  const progress = campaign.total_recipients > 0 
                    ? (campaign.sent_count / campaign.total_recipients) * 100 
                    : 0;
                  return (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold truncate">{campaign.name}</p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{campaign.sent_count}/{campaign.total_recipients} sent</span>
                          <span>•</span>
                          <span>{campaign.opened_count || 0} opens</span>
                        </div>
                        <Progress value={progress} className="mt-2 h-1.5" />
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-4" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
