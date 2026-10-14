'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/lib/auth-context';
import { Activity, Clock, ShieldCheck, User } from 'lucide-react';

interface AuditEvent {
  _id: string;
  action: string;
  actorId?: {
    username: string;
    email: string;
  };
  actorEmail?: string;
  targetType: string;
  timestamp: string;
}

export default function AuditPage() {
  const { token } = useAuth();
  const { currentOrg } = useOrganization();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!token || !currentOrg) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    setLoading(true);
    fetch(`${API_URL}/api/audit/${currentOrg._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.logs || []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [token, currentOrg]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="mb-8 pb-4 border-b border-zinc-800">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span>Audit & Compliance Logs</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Immutable activity stream recording authentication, member invitations, review triggers, and policy edits.
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
            <span>Recent Events</span>
            <span>Live Audit Stream</span>
          </div>

          <div className="divide-y divide-zinc-800/50">
            {events.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500">
                {loading ? 'Loading audit records...' : 'No audit records logged for this organization.'}
              </div>
            ) : (
              events.map((evt) => (
                <div key={evt._id} className="p-4 flex items-center justify-between text-xs hover:bg-zinc-800/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <div>
                      <span className="font-semibold text-zinc-200">{evt.action}</span>
                      <span className="text-zinc-500 ml-2">on {evt.targetType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-zinc-400">
                    <span>{evt.actorEmail || evt.actorId?.username || 'System'}</span>
                    <span className="text-zinc-500">{new Date(evt.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
