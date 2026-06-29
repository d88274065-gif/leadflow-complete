import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/lib/orgContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Onboarding() {
  const navigate = useNavigate();
  const { setupOrganization } = useOrg();
  const { toast } = useToast();
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setSaving(true);
    try {
      await setupOrganization({ name: orgName });
      navigate('/');
    } catch (err) {
      toast({ title: 'Could not create workspace', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your workspace</h1>
        <p className="text-sm text-gray-500 mt-2 mb-8">Give your organization a name to get started with VelocityAI CRM</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 text-left">
          <div>
            <Label className="text-xs">Organization Name</Label>
            <Input required value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Inc." className="mt-1" />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Setting up...' : 'Continue to Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
}
