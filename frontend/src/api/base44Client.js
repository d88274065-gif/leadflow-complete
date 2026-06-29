import { supabase } from '@/lib/supabaseClient';

// Map base44 entity names -> actual Supabase table names
const TABLE_MAP = {
  Organization: 'organizations',
  UserProfile: 'user_profiles',
  Lead: 'leads',
  Deal: 'deals',
  Contact: 'contacts',
  Company: 'companies',
  Task: 'tasks',
  Note: 'notes',
  Activity: 'activities',
  Message: 'messages',
  Notification: 'notifications',
  TeamInvite: 'team_invites',
  AuditLog: 'audit_logs',
  Subscription: 'subscriptions',
};

function normalizeOrderBy(orderBy) {
  if (!orderBy) return { column: 'created_at', ascending: false };
  const desc = orderBy.startsWith('-');
  let col = desc ? orderBy.slice(1) : orderBy;
  if (col === 'created_date') col = 'created_at';
  if (col === 'updated_date') col = 'updated_at';
  return { column: col, ascending: !desc };
}

function makeEntity(entityName) {
  const table = TABLE_MAP[entityName];
  if (!table) {
    console.warn(`Unknown entity "${entityName}" - no table mapping found`);
  }

  return {
    async filter(query = {}, orderBy = '-created_date', limit = 100) {
      let q = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(query || {})) {
        if (value !== undefined && value !== null) {
          q = q.eq(key, value);
        }
      }
      const { column, ascending } = normalizeOrderBy(orderBy);
      q = q.order(column, { ascending });
      if (limit) q = q.limit(limit);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}

const entities = Object.keys(TABLE_MAP).reduce((acc, name) => {
  acc[name] = makeEntity(name);
  return acc;
}, {});

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      ...(profile || {}),
    };
  },

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async register({ full_name, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) throw error;

    if (data?.user?.id) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        full_name,
        email,
      });
    }
    return data;
  },

  async logout(redirectPath) {
    await supabase.auth.signOut();
    if (redirectPath) {
      window.location.href = redirectPath;
    }
  },

  async updateMe(payload) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');

    const { data, error: updateError } = await supabase
      .from('user_profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (updateError) throw updateError;
    return data;
  },

  async requestPasswordReset({ email }) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  },

  async resetPassword({ password }) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return true;
  },

  redirectToLogin(redirectPath) {
    window.location.href = '/login';
  },
};

export const base44 = {
  entities,
  auth,
};