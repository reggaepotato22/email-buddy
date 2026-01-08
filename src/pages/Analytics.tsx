import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Mail, MousePointer, Users, Send, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalEmails: number;
  totalOpens: number;
  totalClicks: number;
  totalContacts: number;
  openRate: number;
  clickRate: number;
  campaigns: {
    id: string;
    name: string;
    sent_count: number;
    opened_count: number;
    clicked_count: number;
    status: string;
  }[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    totalEmails: 0,
    totalOpens: 0,
    totalClicks: 0,
    totalContacts: 0,
    openRate: 0,
    clickRate: 0,
    campaigns: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [campaignsRes, contactsRes] = await Promise.all([
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('contacts').select('id', { count: 'exact', head: true })
      ]);

      const campaigns = campaignsRes.data || [];
      const totalEmails = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
      const totalOpens = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
      const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicked_count || 0), 0);

      setData({
        totalEmails,
        totalOpens,
        totalClicks,
        totalContacts: contactsRes.count || 0,
        openRate: totalEmails > 0 ? (totalOpens / totalEmails) * 100 : 0,
        clickRate: totalEmails > 0 ? (totalClicks / totalEmails) * 100 : 0,
        campaigns: campaigns.slice(0, 10)
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Emails Sent', 
      value: data.totalEmails, 
      icon: Mail, 
      change: '+12.5%',
      positive: true,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/10'
    },
    { 
      title: 'Total Opens', 
      value: data.totalOpens, 
      icon: TrendingUp, 
      change: '+8.2%',
      positive: true,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-500/10 to-green-600/10'
    },
    { 
      title: 'Total Clicks', 
      value: data.totalClicks, 
      icon: MousePointer, 
      change: '+5.7%',
      positive: true,
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 to-purple-600/10'
    },
    { 
      title: 'Active Contacts', 
      value: data.totalContacts, 
      icon: Users, 
      change: '+2.3%',
      positive: true,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 to-orange-600/10'
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your email campaign performance</p>
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
                    <div className={`flex items-center gap-1 mt-1 text-sm ${stat.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.change}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Open Rate Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{data.openRate.toFixed(1)}%</span>
                  <span className="text-sm text-emerald-600 flex items-center">
                    <ArrowUpRight className="w-3 h-3" />
                    +2.3% from last month
                  </span>
                </div>
                <Progress value={data.openRate} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {data.totalOpens.toLocaleString()} opens from {data.totalEmails.toLocaleString()} emails sent
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-blue-600" />
                Click Rate Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{data.clickRate.toFixed(1)}%</span>
                  <span className="text-sm text-blue-600 flex items-center">
                    <ArrowUpRight className="w-3 h-3" />
                    +1.8% from last month
                  </span>
                </div>
                <Progress value={data.clickRate} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  {data.totalClicks.toLocaleString()} clicks from {data.totalEmails.toLocaleString()} emails sent
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Performance Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-muted-foreground" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.campaigns.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No campaign data yet</p>
                <p className="text-sm text-muted-foreground mt-1">Analytics will appear here once you send campaigns</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.campaigns.map((campaign) => {
                  const openRate = campaign.sent_count > 0 
                    ? ((campaign.opened_count || 0) / campaign.sent_count * 100)
                    : 0;
                  const clickRate = campaign.sent_count > 0 
                    ? ((campaign.clicked_count || 0) / campaign.sent_count * 100)
                    : 0;

                  return (
                    <div key={campaign.id} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">{campaign.sent_count.toLocaleString()} emails sent</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-emerald-600">{openRate.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Opens</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-blue-600">{clickRate.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                        </div>
                      </div>
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
