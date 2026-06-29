import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';
import { Plus, Search, Handshake, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import moment from 'moment';
import { useToast } from '@/components/ui/use-toast';

const stageColors = {
  qualification: 'bg-blue-100 text-blue-700',
  proposal: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-orange-100 text-orange-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-700',
};

const defaultForm = { title: '', company_name: '', contact_name: '', value: 0, stage: 'qualification', expected_close_date: '', notes: '' };

export default function Deals() {
  const { organization, currentUser } = useOrg();
  const { toast } = useToast();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (organization?.id) loadDeals(); }, [organization?.id]);

  const loadDeals = async () => {
    setLoading(true);
    const data = await base44.entities.Deal.filter({ org_id: organization.id }, '-created_date', 200);
    setDeals(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const dealData = { ...form, org_id: organization.id, value: parseFloat(form.value) || 0 };
      if (editId) {
        await base44.entities.Deal.update(editId, dealData);
      } else {
        await base44.entities.Deal.create(dealData);
        await base44.entities.Activity.create({ org_id: organization.id, type: 'deal_created', title: `New deal: ${form.title}`, performed_by: currentUser?.id, performed_by_name: currentUser?.full_name });
      }
      toast({ title: editId ? 'Deal updated' : 'Deal created' });
      setShowForm(false);
      setForm(defaultForm);
      setEditId(null);
      await loadDeals();
    } catch (e) {
      toast({ title: 'Failed to save deal', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await base44.entities.Deal.delete(id);
    toast({ title: 'Deal deleted' });
    loadDeals();
  };

  const openEdit = (deal) => {
    setForm({ title: deal.title, company_name: deal.company_name || '', contact_name: deal.contact_name || '', value: deal.value || 0, stage: deal.stage || 'qualification', expected_close_date: deal.expected_close_date || '', notes: deal.notes || '' });
    setEditId(deal.id);
    setShowForm(true);
  };

  const filtered = deals.filter(d => {
    const matchSearch = !search || `${d.title} ${d.company_name}`.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || d.stage === stageFilter;
    return matchSearch && matchStage;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500">{deals.length} total deals · ${deals.reduce((s, d) => s + (d.value || 0), 0).toLocaleString()} total value</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Deal
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..." className="pl-9" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="qualification">Qualification</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="closed_won">Closed Won</SelectItem>
            <SelectItem value="closed_lost">Closed Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Handshake} title="No deals found" description={search ? 'Try a different search' : 'Create your first deal to get started'} actionLabel={!search ? 'Add Deal' : undefined} onAction={!search ? () => setShowForm(true) : undefined} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Deal</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Company</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Stage</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Value</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Close Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.company_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-[10px] capitalize ${stageColors[d.stage] || ''}`}>
                        {d.stage?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">${(d.value || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{d.expected_close_date ? moment(d.expected_close_date).format('MMM D, YYYY') : '—'}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-gray-100 rounded"><MoreHorizontal className="w-4 h-4 text-gray-400" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(d)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(d.id)} className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Deal' : 'New Deal'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs">Deal Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Company</Label><Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Contact</Label><Input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Value ($)</Label><Input type="number" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})} className="mt-1" /></div>
              <div><Label className="text-xs">Expected Close</Label><Input type="date" value={form.expected_close_date} onChange={e => setForm({...form, expected_close_date: e.target.value})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm({...form, stage: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['qualification','proposal','negotiation','closed_won','closed_lost'].map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="mt-1" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create Deal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
