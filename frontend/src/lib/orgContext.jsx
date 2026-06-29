import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndOrg();
  }, []);

  const loadUserAndOrg = async () => {
    try {
      const me = await base44.auth.me();
      setCurrentUser(me);

      if (me.org_id) {
        const orgs = await base44.entities.Organization.filter({ id: me.org_id });
        if (orgs.length > 0) setOrganization(orgs[0]);
      }
    } catch (e) {
      console.error('Failed to load user context', e);
    } finally {
      setLoading(false);
    }
  };

  const setupOrganization = async (orgData) => {
    const org = await base44.entities.Organization.create(orgData);
    await base44.auth.updateMe({ org_id: org.id, org_name: org.name, role: 'business_owner' });
    setOrganization(org);
    const me = await base44.auth.me();
    setCurrentUser(me);
    return org;
  };

  const ROLE_PERMISSIONS = {
    super_admin: ['manage_platform', 'manage_org', 'manage_team', 'manage_billing', 'view_all_leads', 'edit_all_leads', 'delete_leads', 'view_all_deals', 'edit_all_deals', 'view_analytics', 'use_ai', 'view_contacts', 'manage_contacts', 'view_tasks', 'edit_tasks'],
    business_owner: ['manage_org', 'manage_team', 'manage_billing', 'view_all_leads', 'edit_all_leads', 'delete_leads', 'view_all_deals', 'edit_all_deals', 'view_analytics', 'use_ai', 'view_contacts', 'manage_contacts', 'view_tasks', 'edit_tasks'],
    manager: ['view_all_leads', 'edit_all_leads', 'view_all_deals', 'edit_all_deals', 'view_analytics', 'use_ai', 'view_contacts', 'view_tasks', 'edit_tasks'],
    sales_agent: ['view_leads', 'edit_own_leads', 'view_deals', 'view_tasks', 'edit_own_tasks', 'view_contacts', 'use_ai'],
    // legacy roles
    admin: ['manage_org', 'manage_team', 'view_all_leads', 'edit_all_leads', 'view_all_deals', 'edit_all_deals', 'view_analytics', 'use_ai', 'view_contacts', 'view_tasks', 'edit_tasks'],
    user: ['view_leads', 'edit_own_leads', 'view_deals', 'view_tasks', 'view_contacts'],
  };

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    const role = currentUser.role;
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
    return perms.includes(permission);
  };

  const isAdmin = () => ['super_admin', 'business_owner', 'admin'].includes(currentUser?.role);

  return (
    <OrgContext.Provider value={{
      currentUser, organization, loading,
      setupOrganization, loadUserAndOrg,
      hasPermission, isAdmin,
      setOrganization, setCurrentUser
    }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
};
