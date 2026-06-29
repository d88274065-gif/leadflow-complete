import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, Building2, Sparkles, Plus, CheckSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

const statusColors = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-indigo-100 text-indigo-700', proposal_sent: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-orange-100 text-orange-700', won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700'
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization, currentUser } = useOrg();
  const { toast } = useToast();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);

  useEffect(() => { loadLead(); }, [id]);

  const loadLead = async () => {
    setLoading(true);
    try {
      const l = await base44.entities.Lead.get(id);
      setLead(l);
      const [n, a, t] = await Promise.all([
        base44.entities.Note.filter({ entity_id: id, entity_type: 'lead' }, '-created_date', 50).catch(() => []),
        base44.entities.Activity.filter({ org_id: l.org_id }, '-created_date', 100).catch(() => []),
        base44.entities.Task.filter({ org_id: l.org_id, related_lead_id: id }, '-created_date', 50).catch(() => []),
      ]);
      setNotes(n);
      setActivities(a.filter(act => act.related_lead_id === id || (act.title || '').includes(`${l.first_name} ${l.last_name}`)));
      setTasks(t);
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to load lead', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await base44.entities.Note.create({
        entity_id: id, entity_type: 'lead', content: newNote,
        org_id: lead.org_id, created_by: currentUser?.id, created_by_name: currentUser?.full_name,
      });
      setNewNote('');
      loadLead();
      toast({ title: 'Note added' });
    } catch (e) {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    }
  };

  const handleAiScore = async () => {
    setScoring(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Score this sales lead from 0-100 based on likelihood to convert. Name: ${lead.first_name} ${lead.last_name}, Company: ${lead.company_name || 'Unknown'}, Title: ${lead.job_title || 'Unknown'}, Source: ${lead.source}, Value: $${lead.value || 0}, Status: ${lead.status}. Return JSON with score (number) and summary (string).`,
        response_json_schema: { type: 'object', properties: { score: { type: 'number' }, summary: { type: 'string' } } }
      });
      await base44.entities.Lead.update(lead.id, { ai_score: res.score, ai_summary: res.summary });
      toast({ title: 'AI Score updated', description: `Score: ${res.score}/100` });
      loadLead();
    } catch (e) {
      toast({ title: 'AI scoring failed', description: e.message, variant: 'destructive' });
    } finally { setScoring(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (!lead) return <div className="text-center py-20 text-gray-500">Lead not found</div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate('/leads')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Leads
      </button>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-semibold text-indigo-600">
              {lead.first_name?.[0]}{lead.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
              <p className="text-sm text-gray-500">{lead.job_title} {lead.company_name && `at ${lead.company_name}`}</p>
              <Badge variant="secondary" className={`mt-2 text-[10px] capitalize ${statusColors[lead.status] || ''}`}>
                {lead.status?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <Button onClick={handleAiScore} disabled={scoring} variant="outline" size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {scoring ? 'Scoring...' : 'AI Score'}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" /> {lead.email || '—'}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" /> {lead.phone || '—'}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600"><Building2 className="w-4 h-4 text-gray-400" /> {lead.company_name || '—'}</div>
        </div>

        {lead.ai_score != null && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold text-indigo-700">AI Score: {lead.ai_score}/100</span>
              {lead.ai_summary && <p className="text-xs text-indigo-600 mt-0.5">{lead.ai_summary}</p>}
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note about this lead..." rows={3} />
            <Button onClick={handleAddNote} size="sm" className="mt-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Note
            </Button>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No notes yet</p>
          ) : notes.map(n => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm text-gray-700">{n.content}</p>
              <p className="text-xs text-gray-400 mt-2">{n.created_by_name} · {moment(n.created_date).fromNow()}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tasks linked to this lead</p>
          ) : tasks.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <CheckSquare className={`w-4 h-4 ${t.status === 'completed' ? 'text-green-500' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-gray-400">{t.due_date ? moment(t.due_date).format('MMM D, YYYY') : 'No due date'}</p>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No activity recorded</p>
          ) : activities.map(a => (
            <div key={a.id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700">{a.title}</p>
                <p className="text-xs text-gray-400">{moment(a.created_date).fromNow()}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
