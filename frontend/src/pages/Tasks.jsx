import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';
import { Plus, Search, CheckSquare, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import moment from 'moment';
import { useToast } from '@/components/ui/use-toast';

const priorityColors = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600'
};

const defaultForm = { title: '', description: '', due_date: '', priority: 'medium', status: 'pending' };

export default function Tasks() {
  const { organization, currentUser } = useOrg();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (organization?.id) loadTasks(); }, [organization?.id]);

  const loadTasks = async () => {
    setLoading(true);
    const data = await base44.entities.Task.filter({ org_id: organization.id }, '-created_date', 200);
    setTasks(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const data = { ...form, org_id: organization.id };
      if (editId) {
        await base44.entities.Task.update(editId, data);
      } else {
        await base44.entities.Task.create({ ...data, assigned_to: currentUser?.id });
      }
      toast({ title: editId ? 'Task updated' : 'Task created' });
      setShowForm(false);
      setForm(defaultForm);
      setEditId(null);
      await loadTasks();
    } catch (e) {
      toast({ title: 'Failed to save task', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleComplete = async (task) => {
    await base44.entities.Task.update(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
    loadTasks();
  };

  const handleDelete = async (id) => {
    await base44.entities.Task.delete(id);
    toast({ title: 'Task deleted' });
    loadTasks();
  };

  const openEdit = (t) => {
    setForm({ title: t.title, description: t.description || '', due_date: t.due_date || '', priority: t.priority || 'medium', status: t.status || 'pending' });
    setEditId(t.id);
    setShowForm(true);
  };

  const filtered = tasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));
  const pending = filtered.filter(t => t.status !== 'completed');
  const completed = filtered.filter(t => t.status === 'completed');

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">{pending.length} pending · {completed.length} completed</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found" description={search ? 'Try a different search' : 'Add your first task to get started'} actionLabel={!search ? 'Add Task' : undefined} onAction={!search ? () => setShowForm(true) : undefined} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {[...pending, ...completed].map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
              <Checkbox checked={t.status === 'completed'} onCheckedChange={() => toggleComplete(t)} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</p>
                {t.description && <p className="text-xs text-gray-500 truncate">{t.description}</p>}
              </div>
              <Badge variant="secondary" className={`text-[10px] capitalize ${priorityColors[t.priority] || ''}`}>{t.priority}</Badge>
              <span className="text-xs text-gray-400 w-20 text-right">{t.due_date ? moment(t.due_date).format('MMM D') : '—'}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-gray-100 rounded"><MoreHorizontal className="w-4 h-4 text-gray-400" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-red-600">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="mt-1" /></div>
              <div><Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high','urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
