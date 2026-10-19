'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Organization, fetchUserOrgs } from '@/lib/org-api';

export function useOrganization() {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const orgs = await fetchUserOrgs(token);
      setOrganizations(orgs);
      if (orgs.length > 0 && !currentOrg) {
        setCurrentOrg(orgs[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentOrg]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  const selectOrg = (orgId: string) => {
    const org = organizations.find((o) => o._id === orgId);
    if (org) {
      setCurrentOrg(org);
    }
  };

  return {
    organizations,
    currentOrg,
    selectOrg,
    isLoading,
    error,
    refreshOrgs: loadOrgs,
  };
}
