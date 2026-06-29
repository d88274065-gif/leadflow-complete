import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Mail, Trash2, UserCog } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment';

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700', business_owner: 'bg-indigo-100 text-indigo-700',
  manager: 'bg-blue-100 text-blue-700', sales_agent: 'bg-gray-100 text-gray-700',
};

export default function TeamManagement() {
  const { organization, isAdmin, currentUser } = useOrg();
  const { toast } = useToast();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('sales_agent');
  const [sending, setSending] = useState(false);

  useEffect(() => { if (organization?.id) load(); }, [organization?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [m, i] = await Promise.all([
        base44.entities.UserProfile.filter({ org_id: organization.id }, '-created_date', 200).catch(() => []),
        base44.entities.TeamInvite.filter({ org_id: organization.id, status: 'pending' }, '-created_date', 100).catch(() => []),
      ]);
      setMembers(m);
      setInvites(i);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      await base44.entities.TeamInvite.create({
        org_id: organization.id, email: inviteEmail, role: inviteRole, status: 'pending',
        invited_by: currentUser?.id, invited_by_name: currentUser?.full_name,
      });
      toast({ title: 'Invite sent', description: `${inviteEmail} has been invited` });
      setShowInvite(false);
      setInviteEmail('');
      load();
    } catch (e) {
      toast({ title: 'Failed to send invite', description: e.message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  const handleRevoke = async (id) => {
    await base44.entities.TeamInvite.update(id, { status: 'revoked' });
    toast({ title: 'Invite revoked' });
    load();
  };

  if (!isAdmin()) return <Navigate to="/" replace />;
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500">{members.length} members · {invites.length} pending invites</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Invite Member
        </Button>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites ({invites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600">
                  {m.full_name?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
              </div>
              <Badge variant="secondary" className={`text-[10px] capitalize ${roleColors[m.role] || ''}`}>
                <UserCog className="w-3 h-3 mr-1" /> {m.role?.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="invites" className="space-y-3">
          {invites.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending invites</p>
          ) : invites.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{inv.role?.replace('_', ' ')} · invited {moment(inv.created_date).fromNow()}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleRevoke(inv.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Revoke
              </Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_agent">Sales Agent</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="business_owner">Business Owner</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={sending} className="bg-indigo-600 hover:bg-indigo-700">
                {sending ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
