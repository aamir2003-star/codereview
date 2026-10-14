'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BillingStatus, fetchBillingStatus, upgradePlanTier } from '@/lib/billing-api';

export function useBillingQuota(orgId?: string) {
  const { token } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    if (!token || !orgId) return;
    try {
      setIsLoading(true);
      const data = await fetchBillingStatus(token, orgId);
      setBilling(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, orgId]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const upgrade = async (planTier: string) => {
    if (!token || !orgId) return;
    try {
      setIsUpgrading(true);
      await upgradePlanTier(token, orgId, planTier);
      await loadBilling();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return {
    billing,
    isLoading,
    isUpgrading,
    error,
    upgrade,
    refresh: loadBilling,
  };
}
