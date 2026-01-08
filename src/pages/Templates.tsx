import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, FileText, Copy, Code } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Template {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  created_at: string;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({ name: '', subject: '', html_content: '' });
  const { toast } = useToast();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setTemplates(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = editingTemplate
      ? await supabase.from('email_templates').update(formData).eq('id', editingTemplate.id)
      : await supabase.from('email_templates').insert(formData);

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: editingTemplate ? 'Template updated' : 'Template created' });
      setIsOpen(false);
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', html_content: '' });
      fetchTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Template deleted' }); fetchTemplates(); }
  };

  const handleDuplicate = async (template: Template) => {
    const { error } = await supabase.from('email_templates').insert({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      html_content: template.html_content
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Template duplicated' }); fetchTemplates(); }
  };

  const startEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, subject: template.subject, html_content: template.html_content });
    setIsOpen(true);
  };

  const placeholders = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{company}}'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Templates</h1>
            <p className="text-muted-foreground mt-1">{templates.length} templates available</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { 
            setIsOpen(open); 
            if (!open) { 
              setEditingTemplate(null); 
              setFormData({ name: '', subject: '', html_content: '' }); 
            } 
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Template</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Template Name</label>
                  <Input 
                    placeholder="e.g., Welcome Email" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email Subject</label>
                  <Input 
                    placeholder="e.g., Welcome to our newsletter, {{first_name}}!" 
                    value={formData.subject} 
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">HTML Content</label>
                    <div className="flex gap-1">
                      {placeholders.map(p => (
                        <Badge 
                          key={p} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-secondary text-xs"
                          onClick={() => setFormData({ ...formData, html_content: formData.html_content + p })}
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Textarea 
                    placeholder="<html>...</html>" 
                    value={formData.html_content} 
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })} 
                    rows={12} 
                    className="font-mono text-sm"
                    required 
                  />
                </div>
                <Button type="submit" className="w-full">{editingTemplate ? 'Update' : 'Create'} Template</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No templates yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first email template to get started</p>
                <Button className="mt-4" onClick={() => setIsOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 flex items-center justify-center">
                          <Code className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{template.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(template.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{template.subject}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPreviewTemplate(template)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => startEdit(template)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-destructive/10"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {previewTemplate?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm"><strong>Subject:</strong> {previewTemplate?.subject}</p>
              </div>
              <div 
                className="border rounded-xl p-6 bg-white min-h-[300px]" 
                dangerouslySetInnerHTML={{ __html: previewTemplate?.html_content || '' }} 
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
