const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface OrgMember {
  userId: {
    _id: string;
    username: string;
    avatarUrl?: string;
    email?: string;
  };
  role: 'owner' | 'admin' | 'reviewer' | 'member';
  joinedAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  members: OrgMember[];
  billingEmail: string;
  settings: {
    enforceMfa: boolean;
    autoReviewEnabled: boolean;
    defaultBranch: string;
    maxConcurrentReviews: number;
  };
}

export async function fetchUserOrgs(token: string): Promise<Organization[]> {
  const res = await fetch(`${API_URL}/api/orgs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch organizations');
  const data = await res.json();
  return data.organizations || [];
}

export async function createOrganization(
  token: string,
  payload: { name: string; slug: string; billingEmail: string; description?: string }
): Promise<Organization> {
  const res = await fetch(`${API_URL}/api/orgs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create organization');
  }
  const data = await res.json();
  return data.organization;
}

export async function updateMemberRole(
  token: string,
  orgId: string,
  targetUserId: string,
  newRole: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/orgs/${orgId}/members/role`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetUserId, newRole }),
  });
  if (!res.ok) throw new Error('Failed to update member role');
}

export async function removeOrgMember(token: string, orgId: string, memberId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/orgs/${orgId}/members/${memberId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to remove member');
}
