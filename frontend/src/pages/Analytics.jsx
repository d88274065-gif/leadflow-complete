import React, { useState, useEffect } from 'react';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { DollarSign, TrendingUp, Target, Handshake } from 'lucide-react';
import moment from 'moment';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Analytics() {
  const { organization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { if (organization?.id) load(); }, [organization?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [leads, deals] = await Promise.all([
        base44.entities.Lead.filter({ org_id: organization.id }, '-created_date', 500),
        base44.entities.Deal.filter({ org_id: organization.id }, '-created_date', 500),
      ]);

      const stageCount = {};
      deals.forEach(d => { stageCount[d.stage || 'unknown'] = (stageCount[d.stage || 'unknown'] || 0) + 1; });
      const dealsByStage = Object.entries(stageCount).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

      const monthlyRevenue = {};
      deals.filter(d => d.stage === 'closed_won').forEach(d => {
        const m = moment(d.created_date).format('MMM');
        monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (d.value || 0);
      });
      const revenueTrend = Object.entries(monthlyRevenue).slice(-6).map(([month, revenue]) => ({ month, revenue }));

      const sourceCount = {};
      leads.forEach(l => { sourceCount[l.source || 'other'] = (sourceCount[l.source || 'other'] || 0) + 1; });
      const sourcePerf = Object.entries(sourceCount).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

      const won = deals.filter(d => d.stage === 'closed_won');
      const lost = deals.filter(d => d.stage === 'closed_lost');
      const winRate = (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
      const avgDealSize = won.length > 0 ? Math.round(won.reduce((s, d) => s + (d.value || 0), 0) / won.length) : 0;

      setData({ dealsByStage, revenueTrend, sourcePerf, winRate, avgDealSize, totalRevenue: won.reduce((s, d) => s + (d.value || 0), 0), totalLeads: leads.length });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Deep insights into your sales performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`$${(data?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard title="Win Rate" value={`${data?.winRate || 0}%`} icon={TrendingUp} color="indigo" />
        <StatCard title="Avg Deal Size" value={`$${(data?.avgDealSize || 0).toLocaleString()}`} icon={Handshake} color="purple" />
        <StatCard title="Total Leads" value={data?.totalLeads || 0} icon={Target} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {(data?.revenueTrend?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No closed deals yet</div>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Deals by Stage</h3>
          {(data?.dealsByStage?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.dealsByStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No deals yet</div>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Lead Source Performance</h3>
        {(data?.sourcePerf?.length || 0) > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.sourcePerf} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.sourcePerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>}
      </div>
    </div>
  );
}
