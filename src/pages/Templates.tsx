import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const { canEdit, user } = useAuth();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setTemplates(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, created_by: user?.id };
    
    const { error } = editingTemplate
      ? await supabase.from('email_templates').update(formData).eq('id', editingTemplate.id)
      : await supabase.from('email_templates').insert(payload);

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

  const startEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, subject: template.subject, html_content: template.html_content });
    setIsOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground">{templates.length} templates</p>
          </div>
          {canEdit && (
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setEditingTemplate(null); setFormData({ name: '', subject: '', html_content: '' }); } }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Template</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Template</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input placeholder="Template name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  <Input placeholder="Email subject (use {{first_name}} for personalization)" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
                  <Textarea placeholder="HTML content (use {{first_name}}, {{last_name}}, {{email}}, {{company}})" value={formData.html_content} onChange={(e) => setFormData({ ...formData, html_content: e.target.value })} rows={10} required />
                  <Button type="submit" className="w-full">{editingTemplate ? 'Update' : 'Create'} Template</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 truncate">{template.subject}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)}><Eye className="w-4 h-4" /></Button>
                  {canEdit && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => startEdit(template)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader><DialogTitle>{previewTemplate?.name}</DialogTitle></DialogHeader>
            <div className="border rounded-lg p-4" dangerouslySetInnerHTML={{ __html: previewTemplate?.html_content || '' }} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}