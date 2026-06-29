import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Search, Filter, Target, MoreHorizontal, Mail, Phone, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import moment from 'moment';
import { useToast } from '@/components/ui/use-toast';

const statusColors = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-indigo-100 text-indigo-700', proposal_sent: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-orange-100 text-orange-700', won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600'
};

const defaultForm = { first_name: '', last_name: '', email: '', phone: '', company_name: '', job_title: '', source: 'website', status: 'new', priority: 'medium', value: 0, notes: '' };

export default function Leads() {
  const { organization, currentUser } = useOrg();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiScoring, setAiScoring] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => { if (organization?.id) loadLeads(); }, [organization?.id]);

  const loadLeads = async () => {
    setLoading(true);
    const data = await base44.entities.Lead.filter({ org_id: organization.id }, '-created_date', 200);
    setLeads(data);
    setLoading(false);
  };

  const handleSave = async () => {
    const errors = {};
    if (!form.first_name?.trim()) errors.first_name = 'First name is required';
    if (!form.last_name?.trim()) errors.last_name = 'Last name is required';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});

    if (!organization?.id) {
      toast({ title: 'Error', description: 'Organization not loaded. Please refresh.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const leadData = { ...form, org_id: organization.id, value: parseFloat(form.value) || 0 };
      if (editId) {
        await base44.entities.Lead.update(editId, leadData);
        await base44.entities.Activity.create({ org_id: organization.id, type: 'status_change', title: `Updated lead ${form.first_name} ${form.last_name}`, performed_by: currentUser?.id, performed_by_name: currentUser?.full_name });
      } else {
        await base44.entities.Lead.create(leadData);
        await base44.entities.Activity.create({ org_id: organization.id, type: 'lead_created', title: `New lead: ${form.first_name} ${form.last_name}`, performed_by: currentUser?.id, performed_by_name: currentUser?.full_name });
      }
      toast({ title: editId ? 'Lead updated successfully' : 'Lead created successfully' });
      setShowForm(false);
      setForm(defaultForm);
      setEditId(null);
      await loadLeads();
    } catch (e) {
      console.error('[Leads] Save error:', e);
      toast({ title: 'Failed to save lead', description: e.message || 'An unexpected error occurred', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await base44.entities.Lead.delete(id);
    toast({ title: 'Lead deleted' });
    loadLeads();
  };

  const handleAiScore = async (lead) => {
    setAiScoring(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Score this sales lead from 0-100 based on likelihood to convert. Consider their info: Name: ${lead.first_name} ${lead.last_name}, Company: ${lead.company_name || 'Unknown'}, Title: ${lead.job_title || 'Unknown'}, Source: ${lead.source}, Value: $${lead.value || 0}, Status: ${lead.status}. Return a JSON with score (number 0-100) and summary (one sentence explanation).`,
        response_json_schema: { type: 'object', properties: { score: { type: 'number' }, summary: { type: 'string' } } }
      });
      await base44.entities.Lead.update(lead.id, { ai_score: res.score, ai_summary: res.summary });
      toast({ title: 'AI Score Updated', description: `Score: ${res.score}/100` });
      loadLeads();
    } catch (e) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    } finally { setAiScoring(false); }
  };

  const openEdit = (lead) => {
    setForm({ first_name: lead.first_name, last_name: lead.last_name, email: lead.email || '', phone: lead.phone || '', company_name: lead.company_name || '', job_title: lead.job_title || '', source: lead.source || 'website', status: lead.status || 'new', priority: lead.priority || 'medium', value: lead.value || 0, notes: lead.notes || '' });
    setEditId(lead.id);
    setShowForm(true);
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search || `${l.first_name} ${l.last_name} ${l.email} ${l.company_name}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{leads.length} total leads</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Lead
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Target} title="No leads found" description={search ? 'Try a different search' : 'Create your first lead to get started'} actionLabel={!search ? 'Add Lead' : undefined} onAction={!search ? () => setShowForm(true) : undefined} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Company</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Source</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">AI Score</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Value</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Created</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/leads/${l.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
                          {l.first_name?.[0]}{l.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{l.first_name} {l.last_name}</p>
                          <p className="text-xs text-gray-500">{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.company_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-[10px] capitalize ${statusColors[l.status] || ''}`}>
                        {l.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{l.source?.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      {l.ai_score != null ? (
                        <span className={`text-sm font-semibold ${l.ai_score >= 70 ? 'text-green-600' : l.ai_score >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {l.ai_score}/100
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{l.value ? `$${l.value.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{moment(l.created_date).format('MMM D')}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-gray-100 rounded"><MoreHorizontal className="w-4 h-4 text-gray-400" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(l)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAiScore(l)} disabled={aiScoring}><Sparkles className="w-3 h-3 mr-2" />AI Score</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(l.id)} className="text-red-600">Delete</DropdownMenuItem>
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

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setFormErrors({}); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Lead' : 'New Lead'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input value={form.first_name} onChange={e => { setForm({...form, first_name: e.target.value}); setFormErrors(p => ({...p, first_name: ''})); }} className={`mt-1 ${formErrors.first_name ? 'border-red-500' : ''}`} />
                {formErrors.first_name && <p className="text-xs text-red-500 mt-1">{formErrors.first_name}</p>}
              </div>
              <div>
                <Label className="text-xs">Last Name *</Label>
                <Input value={form.last_name} onChange={e => { setForm({...form, last_name: e.target.value}); setFormErrors(p => ({...p, last_name: ''})); }} className={`mt-1 ${formErrors.last_name ? 'border-red-500' : ''}`} />
                {formErrors.last_name && <p className="text-xs text-red-500 mt-1">{formErrors.last_name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Company</Label><Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Job Title</Label><Input value={form.job_title} onChange={e => setForm({...form, job_title: e.target.value})} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Source</Label>
                <Select value={form.source} onValueChange={v => setForm({...form, source: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['website','referral','linkedin','cold_call','email_campaign','social_media','trade_show','advertisement','partner','other'].map(s => (
                      <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['new','contacted','qualified','proposal_sent','negotiation','won','lost'].map(s => (
                      <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high','urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Value ($)</Label><Input type="number" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="mt-1" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create Lead'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
