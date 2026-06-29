import React, { useState } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { User, Building2, Bell, Save } from 'lucide-react';

export default function Settings() {
  const { currentUser, organization, setCurrentUser } = useOrg();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [emailNotifs, setEmailNotifs] = useState(currentUser?.email_notifications ?? true);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: fullName, email_notifications: emailNotifs });
      const me = await base44.auth.me();
      setCurrentUser(me);
      toast({ title: 'Profile updated' });
    } catch (e) {
      toast({ title: 'Failed to update profile', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleSaveOrg = async () => {
    if (!organization?.id) return;
    setSaving(true);
    try {
      await base44.entities.Organization.update(organization.id, { name: orgName });
      toast({ title: 'Workspace updated' });
    } catch (e) {
      toast({ title: 'Failed to update workspace', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile and workspace preferences</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Profile</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={currentUser?.email || ''} disabled className="mt-1 bg-gray-50" />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Input value={currentUser?.role?.replace('_', ' ') || ''} disabled className="mt-1 bg-gray-50 capitalize" />
          </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save Profile
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Workspace</h3>
        </div>
        <div>
          <Label className="text-xs">Workspace Name</Label>
          <Input value={orgName} onChange={e => setOrgName(e.target.value)} className="mt-1" />
        </div>
        <Button onClick={handleSaveOrg} disabled={saving} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save Workspace
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email Notifications</p>
            <p className="text-xs text-gray-500">Receive updates about leads, deals, and tasks</p>
          </div>
          <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
        </div>
      </div>
    </div>
  );
}
