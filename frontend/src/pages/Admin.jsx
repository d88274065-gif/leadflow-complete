import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import StatCard from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Database, Activity as ActivityIcon } from 'lucide-react';
import moment from 'moment';

export default function Admin() {
  const { organization, isAdmin } = useOrg();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => { if (organization?.id) load(); }, [organization?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [users, leads, deals, logs] = await Promise.all([
        base44.entities.UserProfile.filter({ org_id: organization.id }, '-created_date', 200).catch(() => []),
        base44.entities.Lead.filter({ org_id: organization.id }, '-created_date', 500).catch(() => []),
        base44.entities.Deal.filter({ org_id: organization.id }, '-created_date', 500).catch(() => []),
        base44.entities.AuditLog.filter({ org_id: organization.id }, '-created_date', 30).catch(() => []),
      ]);
      setStats({ totalUsers: users.length, totalLeads: leads.length, totalDeals: deals.length });
      setAuditLogs(logs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!isAdmin()) return <Navigate to="/" replace />;
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500">Organization-wide settings and oversight</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Team Members" value={stats?.totalUsers || 0} icon={Users} color="indigo" />
        <StatCard title="Total Leads" value={stats?.totalLeads || 0} icon={Database} color="blue" />
        <StatCard title="Total Deals" value={stats?.totalDeals || 0} icon={ActivityIcon} color="green" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Audit Log</h3>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No audit events recorded yet</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{log.user_name || 'System'}</span> {log.action} <span className="text-gray-500">{log.target}</span>
                  </p>
                </div>
                <span className="text-xs text-gray-400">{moment(log.created_date).fromNow()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-red-100 p-5">
        <h3 className="font-semibold text-red-600 mb-1">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-3">These actions are irreversible. Proceed with caution.</p>
        <Badge variant="destructive" className="cursor-pointer">Delete Organization</Badge>
      </div>
    </div>
  );
}
