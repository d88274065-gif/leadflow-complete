import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/lib/orgContext';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/shared/StatCard';
import { Target, Handshake, DollarSign, TrendingUp, Users, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

export default function Dashboard() {
  const { organization, currentUser } = useOrg();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    if (!organization?.id) { navigate('/onboarding'); return; }
    loadDashboard();
  }, [organization?.id]);

  const loadDashboard = async () => {
    const orgId = organization.id;
    try {
      const [leads, deals, tasks, activities] = await Promise.all([
        base44.entities.Lead.filter({ org_id: orgId }, '-created_date', 200),
        base44.entities.Deal.filter({ org_id: orgId }, '-created_date', 200),
        base44.entities.Task.filter({ org_id: orgId }, '-created_date', 200),
        base44.entities.Activity.filter({ org_id: orgId }, '-created_date', 10),
      ]);

      const wonDeals = deals.filter(d => d.stage === 'closed_won');
      const lostDeals = deals.filter(d => d.stage === 'closed_lost');
      const activeDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));
      const totalRevenue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
      const pipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
      const conversionRate = leads.length > 0 ? Math.round((wonDeals.length / leads.length) * 10000) / 100 : 0;

      const sourceCount = {};
      leads.forEach(l => { sourceCount[l.source || 'other'] = (sourceCount[l.source || 'other'] || 0) + 1; });
      const leadsBySource = Object.entries(sourceCount).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

      const statusCount = {};
      leads.forEach(l => { statusCount[l.status || 'new'] = (statusCount[l.status || 'new'] || 0) + 1; });
      const leadsByStatus = Object.entries(statusCount).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

      const monthlyData = {};
      leads.forEach(l => {
        const m = moment(l.created_date).format('MMM');
        monthlyData[m] = (monthlyData[m] || 0) + 1;
      });
      const leadsTrend = Object.entries(monthlyData).slice(-6).map(([month, count]) => ({ month, leads: count }));

      const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

      setStats({
        totalLeads: leads.length,
        activeLeads: leads.filter(l => !['won', 'lost'].includes(l.status)).length,
        totalDeals: deals.length,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        totalRevenue,
        pipelineValue,
        conversionRate,
        pendingTasks: pendingTasks.length,
        leadsBySource,
        leadsByStatus,
        leadsTrend,
      });

      setRecentLeads(leads.slice(0, 5));
      setUpcomingTasks(pendingTasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')).slice(0, 5));
      setRecentActivities(activities);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  const statusColors = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700', qualified: 'bg-indigo-100 text-indigo-700', proposal_sent: 'bg-purple-100 text-purple-700', negotiation: 'bg-orange-100 text-orange-700', won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {currentUser?.full_name?.split(' ')[0] || 'there'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={stats?.totalLeads || 0} icon={Target} color="indigo" />
        <StatCard title="Active Deals" value={stats?.totalDeals - (stats?.wonDeals || 0) - (stats?.lostDeals || 0)} icon={Handshake} color="blue" />
        <StatCard title="Revenue" value={`$${(stats?.totalRevenue || 0).toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard title="Conversion Rate" value={`${(stats?.conversionRate ?? 0).toFixed(2)}%`} icon={TrendingUp} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Lead Acquisition Trend</h3>
          {(stats?.leadsTrend?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.leadsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Lead Sources</h3>
          {(stats?.leadsBySource?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats.leadsBySource} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {stats.leadsBySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {stats?.leadsBySource?.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="capitalize">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Leads</h3>
            <button onClick={() => navigate('/leads')} className="text-xs text-indigo-600 hover:underline">View all</button>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No leads yet</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map(l => (
                <div key={l.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg -mx-2" onClick={() => navigate(`/leads/${l.id}`)}>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600">
                    {l.first_name?.[0]}{l.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.first_name} {l.last_name}</p>
                    <p className="text-xs text-gray-500 truncate">{l.company_name || l.email}</p>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${statusColors[l.status] || ''}`}>
                    {l.status?.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming Tasks</h3>
            <button onClick={() => navigate('/tasks')} className="text-xs text-indigo-600 hover:underline">View all</button>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No pending tasks</p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 -mx-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${t.priority === 'urgent' ? 'bg-red-500' : t.priority === 'high' ? 'bg-orange-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.due_date ? moment(t.due_date).format('MMM D') : 'No due date'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">{a.title}</p>
                    <p className="text-xs text-gray-400">{moment(a.created_date).fromNow()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Pipeline Value" value={`$${(stats?.pipelineValue || 0).toLocaleString()}`} icon={DollarSign} color="blue" />
        <StatCard title="Won Deals" value={stats?.wonDeals || 0} icon={Handshake} color="green" />
        <StatCard title="Lost Deals" value={stats?.lostDeals || 0} icon={AlertCircle} color="red" />
        <StatCard title="Pending Tasks" value={stats?.pendingTasks || 0} icon={Clock} color="orange" />
      </div>
    </div>
  );
}
