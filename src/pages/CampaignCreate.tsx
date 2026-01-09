import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Users, FileText, Settings2, Send, 
  Check, Filter, Clock, Shield, Sparkles, Zap, AlertTriangle,
  ChevronDown, Search, Tag, Plus, Minus, Play, Pause
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  tags: string[];
  status: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  html_content: string;
}

interface SegmentRule {
  id: string;
  field: 'tags' | 'company' | 'status' | 'email_domain';
  operator: 'contains' | 'equals' | 'not_contains' | 'starts_with' | 'ends_with';
  value: string;
}

interface DeliverabilityIssue {
  type: 'warning' | 'error';
  message: string;
}

const STEPS = [
  { id: 1, name: 'Audience', icon: Users },
  { id: 2, name: 'Template', icon: FileText },
  { id: 3, name: 'Settings', icon: Settings2 },
  { id: 4, name: 'Review', icon: Shield },
];

const MERGE_TAGS = [
  { tag: '{{first_name}}', label: 'First Name', fallback: 'there' },
  { tag: '{{last_name}}', label: 'Last Name', fallback: '' },
  { tag: '{{email}}', label: 'Email', fallback: '' },
  { tag: '{{company}}', label: 'Company', fallback: '' },
  { tag: '{{full_name}}', label: 'Full Name', fallback: 'there' },
];

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // Step 1: Audience Selection
  const [selectionMode, setSelectionMode] = useState<'all' | 'manual' | 'segment'>('all');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [segmentRules, setSegmentRules] = useState<SegmentRule[]>([]);
  const [segmentLogic, setSegmentLogic] = useState<'and' | 'or'>('and');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Step 2: Template
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Step 3: Settings
  const [campaignName, setCampaignName] = useState('');
  const [sendTimeOptimization, setSendTimeOptimization] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<'now' | 'scheduled'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [batchSize, setBatchSize] = useState(10);
  const [batchDelay, setBatchDelay] = useState(3);
  const [smtpPassword, setSmtpPassword] = useState('');
  
  // Step 4: Review & Deliverability
  const [deliverabilityIssues, setDeliverabilityIssues] = useState<DeliverabilityIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [contactsRes, templatesRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('email_templates').select('*').order('created_at', { ascending: false })
    ]);
    
    const contactsList = contactsRes.data || [];
    setContacts(contactsList);
    setTemplates(templatesRes.data || []);
    
    // Extract all unique tags
    const tags = new Set<string>();
    contactsList.forEach(c => c.tags?.forEach((t: string) => tags.add(t)));
    setAllTags([...tags]);
    
    setLoading(false);
  };

  // Smart Segmentation Logic
  const getFilteredContacts = useCallback(() => {
    if (selectionMode === 'all') return contacts;
    if (selectionMode === 'manual') return contacts.filter(c => selectedContacts.has(c.id));
    
    // Segment mode
    if (segmentRules.length === 0) return contacts;
    
    return contacts.filter(contact => {
      const results = segmentRules.map(rule => {
        let fieldValue = '';
        
        switch (rule.field) {
          case 'tags':
            fieldValue = contact.tags?.join(',') || '';
            break;
          case 'company':
            fieldValue = contact.company || '';
            break;
          case 'status':
            fieldValue = contact.status || '';
            break;
          case 'email_domain':
            fieldValue = contact.email.split('@')[1] || '';
            break;
        }
        
        const val = fieldValue.toLowerCase();
        const ruleVal = rule.value.toLowerCase();
        
        switch (rule.operator) {
          case 'contains':
            return val.includes(ruleVal);
          case 'equals':
            return val === ruleVal;
          case 'not_contains':
            return !val.includes(ruleVal);
          case 'starts_with':
            return val.startsWith(ruleVal);
          case 'ends_with':
            return val.endsWith(ruleVal);
          default:
            return true;
        }
      });
      
      return segmentLogic === 'and' 
        ? results.every(r => r) 
        : results.some(r => r);
    });
  }, [contacts, selectionMode, selectedContacts, segmentRules, segmentLogic]);

  const filteredContacts = getFilteredContacts();
  const recipientCount = filteredContacts.length;

  const addSegmentRule = () => {
    setSegmentRules([...segmentRules, {
      id: crypto.randomUUID(),
      field: 'tags',
      operator: 'contains',
      value: ''
    }]);
  };

  const updateSegmentRule = (id: string, updates: Partial<SegmentRule>) => {
    setSegmentRules(segmentRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeSegmentRule = (id: string) => {
    setSegmentRules(segmentRules.filter(r => r.id !== id));
  };

  // Deliverability Check
  const runDeliverabilityCheck = async () => {
    setIsChecking(true);
    const issues: DeliverabilityIssue[] = [];
    
    const template = templates.find(t => t.id === selectedTemplate);
    
    // Check template for spam triggers
    if (template) {
      const spamWords = ['free', 'winner', 'click here', 'act now', 'limited time', 'urgent'];
      const content = (template.subject + ' ' + template.html_content).toLowerCase();
      
      spamWords.forEach(word => {
        if (content.includes(word)) {
          issues.push({
            type: 'warning',
            message: `Template contains potential spam trigger word: "${word}"`
          });
        }
      });
      
      // Check for missing unsubscribe link
      if (!template.html_content.includes('unsubscribe')) {
        issues.push({
          type: 'warning',
          message: 'Consider adding an unsubscribe link for compliance'
        });
      }
      
      // Check subject length
      if (template.subject.length > 60) {
        issues.push({
          type: 'warning',
          message: 'Subject line is longer than 60 characters (may be truncated)'
        });
      }
    }
    
    // Check recipient count
    if (recipientCount > 500) {
      issues.push({
        type: 'warning',
        message: `Sending to ${recipientCount} recipients. Consider using slow-send settings.`
      });
    }
    
    // Check SMTP
    if (!smtpPassword) {
      issues.push({
        type: 'error',
        message: 'SMTP password is required to send emails'
      });
    }
    
    // Simulate checking
    await new Promise(r => setTimeout(r, 1500));
    
    setDeliverabilityIssues(issues);
    setIsChecking(false);
    
    return issues.filter(i => i.type === 'error').length === 0;
  };

  // Create Campaign
  const handleCreateCampaign = async () => {
    const canSend = await runDeliverabilityCheck();
    if (!canSend) {
      toast({ title: 'Please fix errors before sending', variant: 'destructive' });
      return;
    }
    
    setCreating(true);
    
    try {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: campaignName,
          template_id: selectedTemplate,
          status: scheduledTime === 'scheduled' ? 'scheduled' : 'draft',
          total_recipients: recipientCount,
          scheduled_at: scheduledTime === 'scheduled' 
            ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() 
            : null
        })
        .select()
        .single();
      
      if (campaignError) throw campaignError;
      
      // Create campaign recipients
      const recipients = filteredContacts.map(contact => ({
        campaign_id: campaign.id,
        contact_id: contact.id,
        status: 'pending'
      }));
      
      const { error: recipientsError } = await supabase
        .from('campaign_recipients')
        .insert(recipients);
      
      if (recipientsError) throw recipientsError;
      
      // If sending now, trigger the edge function
      if (scheduledTime === 'now') {
        toast({ title: 'Campaign created! Starting to send...' });
        
        // Start sending in background
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        fetch(`${supabaseUrl}/functions/v1/send-bulk-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id: campaign.id,
            smtp_password: smtpPassword
          })
        }).catch(console.error);
      } else {
        toast({ title: 'Campaign scheduled successfully!' });
      }
      
      navigate('/campaigns');
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to create campaign', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Preview with merge tags replaced
  const getPreviewContent = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return { subject: '', content: '' };
    
    const sampleContact = filteredContacts[0] || {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      company: 'Acme Inc'
    };
    
    let subject = template.subject;
    let content = template.html_content;
    
    // Replace merge tags
    subject = subject
      .replace(/\{\{first_name\}\}/g, sampleContact.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, sampleContact.last_name || '')
      .replace(/\{\{email\}\}/g, sampleContact.email || '')
      .replace(/\{\{company\}\}/g, sampleContact.company || '')
      .replace(/\{\{full_name\}\}/g, `${sampleContact.first_name || ''} ${sampleContact.last_name || ''}`.trim() || 'there');
    
    content = content
      .replace(/\{\{first_name\}\}/g, sampleContact.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, sampleContact.last_name || '')
      .replace(/\{\{email\}\}/g, sampleContact.email || '')
      .replace(/\{\{company\}\}/g, sampleContact.company || '')
      .replace(/\{\{full_name\}\}/g, `${sampleContact.first_name || ''} ${sampleContact.last_name || ''}`.trim() || 'there');
    
    return { subject, content };
  };

  const canProceed = () => {
    switch (step) {
      case 1: return recipientCount > 0;
      case 2: return !!selectedTemplate;
      case 3: return !!campaignName && !!smtpPassword;
      case 4: return true;
      default: return false;
    }
  };

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Campaign</h1>
            <p className="text-muted-foreground">Step {step} of 4</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  step === s.id 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : step > s.id 
                      ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                <span className="hidden sm:inline font-medium">{s.name}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            {/* Step 1: Audience */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Select Your Audience
                  </h2>
                  
                  {/* Selection Mode */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                      { id: 'all', label: 'All Contacts', desc: `Send to all ${contacts.length} active contacts`, icon: Users },
                      { id: 'segment', label: 'Smart Segment', desc: 'Filter by rules (tags, company, etc.)', icon: Filter },
                      { id: 'manual', label: 'Manual Select', desc: 'Hand-pick specific contacts', icon: Search },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectionMode(mode.id as typeof selectionMode)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectionMode === mode.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <mode.icon className={`w-6 h-6 mb-2 ${selectionMode === mode.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-semibold">{mode.label}</p>
                        <p className="text-sm text-muted-foreground">{mode.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Smart Segmentation */}
                  {selectionMode === 'segment' && (
                    <div className="space-y-4 p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Segmentation Rules
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Match</span>
                          <Select value={segmentLogic} onValueChange={(v: 'and' | 'or') => setSegmentLogic(v)}>
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="and">ALL</SelectItem>
                              <SelectItem value="or">ANY</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {segmentRules.map((rule, idx) => (
                        <div key={rule.id} className="flex items-center gap-2 flex-wrap">
                          {idx > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {segmentLogic.toUpperCase()}
                            </Badge>
                          )}
                          <Select 
                            value={rule.field} 
                            onValueChange={(v) => updateSegmentRule(rule.id, { field: v as SegmentRule['field'] })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tags">Tags</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="status">Status</SelectItem>
                              <SelectItem value="email_domain">Email Domain</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={rule.operator} 
                            onValueChange={(v) => updateSegmentRule(rule.id, { operator: v as SegmentRule['operator'] })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_contains">Not Contains</SelectItem>
                              <SelectItem value="starts_with">Starts With</SelectItem>
                              <SelectItem value="ends_with">Ends With</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Input
                            placeholder="Value..."
                            value={rule.value}
                            onChange={(e) => updateSegmentRule(rule.id, { value: e.target.value })}
                            className="w-40"
                          />
                          
                          <Button variant="ghost" size="icon" onClick={() => removeSegmentRule(rule.id)}>
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button variant="outline" size="sm" onClick={addSegmentRule}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Rule
                      </Button>
                    </div>
                  )}

                  {/* Manual Selection */}
                  {selectionMode === 'manual' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search contacts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto space-y-1 border rounded-xl p-2">
                        {contacts
                          .filter(c => 
                            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map(contact => (
                            <label
                              key={contact.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedContacts.has(contact.id)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedContacts);
                                  checked ? newSet.add(contact.id) : newSet.delete(contact.id);
                                  setSelectedContacts(newSet);
                                }}
                              />
                              <div>
                                <p className="font-medium text-sm">
                                  {contact.first_name || contact.last_name 
                                    ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                                    : contact.email}
                                </p>
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              </div>
                              {contact.tags?.length > 0 && (
                                <div className="flex gap-1 ml-auto">
                                  {contact.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                            </label>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Recipient Count */}
                  <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Selected Recipients</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">{recipientCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Template */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Choose Your Template
                  </h2>
                  
                  {/* Merge Tags Info */}
                  <div className="mb-6 p-4 rounded-xl bg-secondary/50">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Hyper-Personalization Merge Tags
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use these tags in your template to personalize each email:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MERGE_TAGS.map(mt => (
                        <Badge key={mt.tag} variant="outline" className="font-mono text-xs">
                          {mt.tag} → {mt.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {templates.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No templates yet</p>
                      <Button className="mt-4" onClick={() => navigate('/templates')}>
                        Create Template
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selectedTemplate === template.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            {selectedTemplate === template.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{template.subject}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Preview */}
                  {selectedTemplate && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Preview (with sample data)</h3>
                      <div className="border rounded-xl overflow-hidden">
                        <div className="p-3 bg-muted/50 border-b">
                          <p className="text-sm"><strong>Subject:</strong> {getPreviewContent().subject}</p>
                        </div>
                        <div 
                          className="p-6 bg-white min-h-[200px]" 
                          dangerouslySetInnerHTML={{ __html: getPreviewContent().content }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Settings */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Campaign Settings
                </h2>
                
                <div className="grid gap-6">
                  {/* Campaign Name */}
                  <div>
                    <Label htmlFor="campaign-name" className="text-sm font-medium">Campaign Name *</Label>
                    <Input
                      id="campaign-name"
                      placeholder="e.g., January Newsletter"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  
                  {/* SMTP Password */}
                  <div>
                    <Label htmlFor="smtp-password" className="text-sm font-medium">SMTP Password *</Label>
                    <Input
                      id="smtp-password"
                      type="password"
                      placeholder="Enter your SMTP password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required to authenticate with your mail server. Configure SMTP in Settings.
                    </p>
                  </div>
                  
                  {/* Send Time */}
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Send Time Optimization
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setScheduledTime('now')}
                          className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                            scheduledTime === 'now' ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <Play className="w-5 h-5 mx-auto mb-1" />
                          <p className="text-sm font-medium">Send Now</p>
                        </button>
                        <button
                          onClick={() => setScheduledTime('scheduled')}
                          className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                            scheduledTime === 'scheduled' ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <Clock className="w-5 h-5 mx-auto mb-1" />
                          <p className="text-sm font-medium">Schedule</p>
                        </button>
                      </div>
                      
                      {scheduledTime === 'scheduled' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Date</Label>
                            <Input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Time</Label>
                            <Input
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <p className="text-sm font-medium">AI Send-Time Optimization</p>
                          <p className="text-xs text-muted-foreground">Automatically send when recipients are most likely to open</p>
                        </div>
                        <Switch
                          checked={sendTimeOptimization}
                          onCheckedChange={setSendTimeOptimization}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Safe-Send Settings */}
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Safe-Send Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label className="text-sm">Batch Size</Label>
                          <span className="text-sm text-muted-foreground">{batchSize} emails per batch</span>
                        </div>
                        <Slider
                          value={[batchSize]}
                          onValueChange={([v]) => setBatchSize(v)}
                          min={5}
                          max={50}
                          step={5}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label className="text-sm">Delay Between Batches</Label>
                          <span className="text-sm text-muted-foreground">{batchDelay} seconds</span>
                        </div>
                        <Slider
                          value={[batchDelay]}
                          onValueChange={([v]) => setBatchDelay(v)}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Estimated time to send {recipientCount} emails: ~{Math.ceil(recipientCount / batchSize) * batchDelay} seconds
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Deliverability */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Review & Deliverability Check
                </h2>
                
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-3xl font-bold text-primary">{recipientCount}</p>
                    <p className="text-sm text-muted-foreground">Recipients</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-3xl font-bold">{templates.find(t => t.id === selectedTemplate)?.name?.slice(0, 10)}...</p>
                    <p className="text-sm text-muted-foreground">Template</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-3xl font-bold">{scheduledTime === 'now' ? 'Now' : scheduleDate || 'TBD'}</p>
                    <p className="text-sm text-muted-foreground">Send Time</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <p className="text-3xl font-bold">{batchSize}</p>
                    <p className="text-sm text-muted-foreground">Batch Size</p>
                  </div>
                </div>
                
                {/* Deliverability Check */}
                <div className="p-4 rounded-xl border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Deliverability Check
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={runDeliverabilityCheck}
                      disabled={isChecking}
                    >
                      {isChecking ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Checking...
                        </>
                      ) : (
                        'Run Check'
                      )}
                    </Button>
                  </div>
                  
                  {deliverabilityIssues.length === 0 && !isChecking && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Check className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                      <p>Click "Run Check" to verify your campaign</p>
                    </div>
                  )}
                  
                  {deliverabilityIssues.length > 0 && (
                    <div className="space-y-2">
                      {deliverabilityIssues.map((issue, i) => (
                        <div 
                          key={i} 
                          className={`p-3 rounded-lg flex items-start gap-2 ${
                            issue.type === 'error' 
                              ? 'bg-red-500/10 text-red-600' 
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Campaign Name Display */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="text-xl font-bold">{campaignName}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/campaigns')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step < 4 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreateCampaign}
              disabled={creating || !canProceed()}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {scheduledTime === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}