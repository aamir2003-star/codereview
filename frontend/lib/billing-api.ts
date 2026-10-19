const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface BillingStatus {
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: string;
  features: Record<string, boolean | number>;
  quota: {
    hasQuota: boolean;
    used: number;
    quota: number;
    percentUsed: number;
  };
}

export async function fetchBillingStatus(token: string, orgId: string): Promise<BillingStatus> {
  const res = await fetch(`${API_URL}/api/billing/${orgId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch billing status');
  return await res.json();
}

export async function upgradePlanTier(
  token: string,
  orgId: string,
  planTier: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/billing/${orgId}/upgrade`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planTier }),
  });
  if (!res.ok) throw new Error('Failed to upgrade plan');
  return await res.json();
}
