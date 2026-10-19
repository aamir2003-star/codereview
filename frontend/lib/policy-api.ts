const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface OrgPolicy {
  organizationId: string;
  rules: Record<string, { enabled: boolean; severity?: string }>;
  excludePaths: string[];
  maxViolationsAllowed: number;
}

export async function fetchOrgPolicy(
  token: string,
  orgId: string
): Promise<{ policy: OrgPolicy; availableRules: PolicyRule[] }> {
  const res = await fetch(`${API_URL}/api/policies/${orgId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch org policy');
  return await res.json();
}

export async function updateOrgPolicy(
  token: string,
  orgId: string,
  policy: Partial<OrgPolicy>
): Promise<OrgPolicy> {
  const res = await fetch(`${API_URL}/api/policies/${orgId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(policy),
  });
  if (!res.ok) throw new Error('Failed to update org policy');
  const data = await res.json();
  return data.policy;
}
