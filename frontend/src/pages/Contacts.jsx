import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';
import { Plus, Search, Users, MoreHorizontal, Mail, Phone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

const defaultForm = { first_name: '', last_name: '', email: '', phone: '', company_name: '', job_title: '', notes: '' };

export default function Contacts() {
  const { organization } = useOrg();
  const { toast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (organization?.id) loadContacts(); }, [organization?.id]);

  const loadContacts = async () => {
    setLoading(true);
    const data = await base44.entities.Contact.filter({ org_id: organization.id }, '-created_date', 200);
    setContacts(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.first_name?.trim() || !form.last_name?.trim()) { toast({ title: 'First and last name are required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const data = { ...form, org_id: organization.id };
      if (editId) {
        await base44.entities.Contact.update(editId, data);
      } else {
        await base44.entities.Contact.create(data);
      }
      toast({ title: editId ? 'Contact updated' : 'Contact created' });
      setShowForm(false);
      setForm(defaultForm);
      setEditId(null);
      await loadContacts();
    } catch (e) {
      toast({ title: 'Failed to save contact', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await base44.entities.Contact.delete(id);
    toast({ title: 'Contact deleted' });
    loadContacts();
  };

  const openEdit = (c) => {
    setForm({ first_name: c.first_name, last_name: c.last_name, email: c.email || '', phone: c.phone || '', company_name: c.company_name || '', job_title: c.job_title || '', notes: c.notes || '' });
    setEditId(c.id);
    setShowForm(true);
  };

  const filtered = contacts.filter(c => !search || `${c.first_name} ${c.last_name} ${c.email} ${c.company_name}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500">{contacts.length} total contacts</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Contact
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No contacts found" description={search ? 'Try a different search' : 'Add your first contact to get started'} actionLabel={!search ? 'Add Contact' : undefined} onAction={!search ? () => setShowForm(true) : undefined} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600 flex-shrink-0">
                    {c.first_name?.[0]}{c.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-gray-500">{c.job_title || ''}{c.job_title && c.company_name ? ' · ' : ''}{c.company_name || ''}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-gray-100 rounded"><MoreHorizontal className="w-4 h-4 text-gray-400" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-red-600">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 space-y-1.5">
                {c.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {c.email}</p>}
                {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Contact' : 'New Contact'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">First Name *</Label><Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Last Name *</Label><Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Company</Label><Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Job Title</Label><Input value={form.job_title} onChange={e => setForm({...form, job_title: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="mt-1" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create Contact'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
