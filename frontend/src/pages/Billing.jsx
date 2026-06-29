import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, Zap, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const BACKEND_URL = 'https://leadflow-ai-crmi-production.up.railway.app';

const plans = [
  { id: 'starter', name: 'Starter', price: 0, features: ['Up to 100 leads', '1 team member', 'Basic analytics'] },
  { id: 'pro', name: 'Pro', price: 49, features: ['Unlimited leads', 'Up to 10 team members', 'AI lead scoring', 'Advanced analytics'] },
  { id: 'enterprise', name: 'Enterprise', price: 199, features: ['Everything in Pro', 'Unlimited team members', 'Priority support', 'Custom integrations'] },
];

export default function Billing() {
  const { organization, isAdmin, currentUser } = useOrg();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => { if (organization?.id) load(); }, [organization?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const subs = await base44.entities.Subscription.filter({ org_id: organization.id }, '-created_date', 1);
      setSubscription(subs[0] || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpgrade = async (plan) => {
    if (!isAdmin()) {
      toast({ title: 'Only admins can change the plan', variant: 'destructive' });
      return;
    }
    if (plan.price === 0) {
      try {
        if (subscription) {
          await base44.entities.Subscription.update(subscription.id, { plan: plan.id, status: 'active' });
        } else {
          await base44.entities.Subscription.create({ org_id: organization.id, plan: plan.id, status: 'active' });
        }
        toast({ title: `Switched to ${plan.name} plan` });
        load();
      } catch (e) {
        toast({ title: 'Failed to update plan', description: e.message, variant: 'destructive' });
      }
      return;
    }
    setUpgrading(plan.id);
    try {
      const stripe = await stripePromise;
      const response = await fetch(`${BACKEND_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          planPrice: plan.price,
          orgId: organization.id,
          userEmail: currentUser?.email || '',
          successUrl: `${window.location.origin}/billing`,
          cancelUrl: `${window.location.origin}/billing`,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.url) {
        window.location.href = data.url;
      } else {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (e) {
      toast({ title: 'Payment failed', description: e.message, variant: 'destructive' });
    } finally {
      setUpgrading(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast({ title: 'Successfully upgraded! 🎉' });
      load();
      window.history.replaceState({}, '', '/billing');
    }
    if (params.get('cancelled') === 'true') {
      toast({ title: 'Payment cancelled', variant: 'destructive' });
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  const currentPlan = subscription?.plan || 'starter';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-sm text-gray-500">Manage your subscription and payment details</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-lg font-bold text-gray-900 capitalize">{currentPlan}</p>
          </div>
        </div>
        {subscription?.status && (
          <Badge variant="secondary" className="bg-green-100 text-green-700 capitalize">{subscription.status}</Badge>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const isUpgrading = upgrading === plan.id;
          return (
            <div key={plan.id} className={`bg-white rounded-xl border p-6 relative ${isCurrent ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100'}`}>
              {plan.id === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600"><Zap className="w-3 h-3 mr-1" /> Popular</Badge>
                </div>
              )}
              <h3 className="font-semibold text-gray-900 text-lg">{plan.name}</h3>
              <p className="mt-2"><span className="text-3xl font-bold">${plan.price}</span><span className="text-sm text-gray-500">/mo</span></p>
              <ul className="mt-4 space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleUpgrade(plan)}
                disabled={isCurrent || isUpgrading}
                className={`w-full mt-5 ${isCurrent ? '' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                variant={isCurrent ? 'outline' : 'default'}
              >
                {isUpgrading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : isCurrent ? 'Current Plan' : plan.price === 0 ? 'Switch to Free' : `Upgrade - $${plan.price}/mo`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
       
