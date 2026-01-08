import { useEffect, useState } from 'react';
import { Plus, Upload, Search, Trash2, Edit2, X, Tag, Users, UserPlus } from 'lucide-react';
import Papa from 'papaparse';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  tags: string[];
  status: string;
  created_at: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
    tags: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading contacts', description: error.message, variant: 'destructive' });
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    const { error } = await supabase.from('contacts').insert({
      email: formData.email,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      company: formData.company || null,
      phone: formData.phone || null,
      tags
    });

    if (error) {
      toast({ title: 'Error adding contact', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contact added successfully' });
      setIsAddOpen(false);
      resetForm();
      fetchContacts();
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    const { error } = await supabase
      .from('contacts')
      .update({
        email: formData.email,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        company: formData.company || null,
        phone: formData.phone || null,
        tags
      })
      .eq('id', editingContact.id);

    if (error) {
      toast({ title: 'Error updating contact', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contact updated successfully' });
      setEditingContact(null);
      resetForm();
      fetchContacts();
    }
  };

  const handleDeleteContact = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting contact', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contact deleted' });
      fetchContacts();
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const importedContacts = results.data
          .filter((row: any) => row.email)
          .map((row: any) => ({
            email: row.email,
            first_name: row.first_name || row.firstName || null,
            last_name: row.last_name || row.lastName || null,
            company: row.company || null,
            phone: row.phone || null,
            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : []
          }));

        if (importedContacts.length === 0) {
          toast({ title: 'No valid contacts found', variant: 'destructive' });
          return;
        }

        const { error } = await supabase.from('contacts').insert(importedContacts);
        if (error) {
          toast({ title: 'Error importing contacts', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: `${importedContacts.length} contacts imported!` });
          setIsImportOpen(false);
          fetchContacts();
        }
      },
      error: (error) => {
        toast({ title: 'Error parsing file', description: error.message, variant: 'destructive' });
      }
    });
  };

  const resetForm = () => {
    setFormData({ email: '', first_name: '', last_name: '', company: '', phone: '', tags: '' });
  };

  const startEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      email: contact.email,
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      company: contact.company || '',
      phone: contact.phone || '',
      tags: contact.tags.join(', ')
    });
  };

  const allTags = [...new Set(contacts.flatMap(c => c.tags))];

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || contact.tags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'unsubscribed': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'bounced': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const activeCount = contacts.filter(c => c.status === 'active').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground mt-1">{contacts.length} total • {activeCount} active</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="shadow-sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Contacts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-secondary/50 border border-dashed">
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload a CSV file with columns:
                    </p>
                    <code className="text-xs bg-background px-2 py-1 rounded">
                      email, first_name, last_name, company, phone, tags
                    </code>
                  </div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    className="cursor-pointer"
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddContact} className="space-y-4">
                  <Input
                    placeholder="Email *"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="First name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                    <Input
                      placeholder="Last name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                  <Input
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Tags (comma separated)"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                  <Button type="submit" className="w-full">Add Contact</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedTag && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setSelectedTag(null)}
                    className="bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {selectedTag}
                    <X className="w-3 h-3 ml-1" />
                  </Button>
                )}
                {allTags.slice(0, 5).map(tag => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Table */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No contacts found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm || selectedTag ? 'Try adjusting your filters' : 'Add your first contact to get started'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Company</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">Tags</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="w-24 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-semibold text-primary">
                            {(contact.first_name?.[0] || contact.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {contact.first_name || contact.last_name
                                ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                                : contact.email}
                            </p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {contact.company || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                          {contact.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{contact.tags.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(contact.status)}`}>
                          {contact.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(contact)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="h-8 w-8 hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingContact} onOpenChange={() => { setEditingContact(null); resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateContact} className="space-y-4">
              <Input
                placeholder="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="First name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                <Input
                  placeholder="Last name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <Input
                placeholder="Company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                placeholder="Tags (comma separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <Button type="submit" className="w-full">Update Contact</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
