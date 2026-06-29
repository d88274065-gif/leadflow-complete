import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/shared/EmptyState';
import { MessageSquare, Plus, Mail, Phone, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

const channelIcons = { email: Mail, sms: MessageCircle, call: Phone };

export default function Messages() {
  const { organization, currentUser } = useOrg();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ lead_id: '', channel: 'email', subject: '', body: '' });

  useEffect(() => { if (organization?.id) load(); }, [organization?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [m, l] = await Promise.all([
        base44.entities.Message.filter({ org_id: organization.id }, '-created_date', 200),
        base44.entities.Lead.filter({ org_id: organization.id }, '-created_date', 200),
      ]);
      setMessages(m);
      setLeads(l);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const leadName = (id) => {
    const l = leads.find(x => x.id === id);
    return l ? `${l.first_name} ${l.last_name}` : 'Unknown';
  };

  const handleSend = async () => {
    if (!form.subject.trim() || !form.lead_id) {
      toast({ title: 'Lead and subject are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Message.create({
        ...form, org_id: organization.id, sent_by: currentUser?.id, sent_by_name: currentUser?.full_name,
      });
      toast({ title: 'Message logged' });
      setShowForm(false);
      setForm({ lead_id: '', channel: 'email', subject: '', body: '' });
      load();
    } catch (e) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">{messages.length} logged communications</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Log Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" description="Log your first communication with a lead" actionLabel="Log Message" onAction={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {messages.map(m => {
            const Icon = channelIcons[m.channel] || Mail;
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{m.subject}</p>
                    <span className="text-xs text-gray-400">{moment(m.created_date).format('MMM D, h:mm A')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">To: {leadName(m.lead_id)} · {m.sent_by_name}</p>
                  {m.body && <p className="text-sm text-gray-600 mt-2">{m.body}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Message</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
              <SelectContent>
                {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="call">Call</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            <Textarea placeholder="Message body / call notes..." rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSend} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
