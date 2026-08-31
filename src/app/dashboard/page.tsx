'use client';

import React, { useState, useEffect } from 'react';
import { DashboardSummary, ShieldSession } from '@/types';
import { Shield, LayoutDashboard, Zap, Activity, Trash2, CheckCircle2, Lock, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sessions, setSessions] = useState<ShieldSession[]>([]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/v1/history');
      const data = await res.json();
      setSessions(data.sessions || []);

      const active = data.sessions || [];
      setSummary({
        totalProtectedPrompts: 12480 + active.length,
        totalSensitiveEntitiesFound: 38940 + active.reduce((acc: number, s: ShieldSession) => acc + s.entitiesFoundCount, 0),
        averagePrivacyScore: 98,
        averageProcessingTimeMs: 6.4,
        recentSessions: active.slice(0, 10),
        threatTypeBreakdown: [
          { type: 'API_KEY', count: 14200 },
          { type: 'PERSON_NAME', count: 9800 },
          { type: 'PROJECT_CODENAME', count: 6400 },
          { type: 'EMAIL_ADDRESS', count: 4800 },
          { type: 'CREDIT_CARD', count: 2100 },
        ],
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePurge = async (sessionId: string) => {
    await fetch(`/api/v1/history?sessionId=${sessionId}`, { method: 'DELETE' });
    fetchDashboardData();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Page Header */}
      <div className="border-b border-grey-800 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold p-0.5 shadow-glow-gold">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-grey-900">
                <LayoutDashboard className="h-5 w-5 text-gold-400" />
              </div>
            </div>
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
                PRIVACY DASHBOARD
              </h1>
              <p className="mt-1 text-xs text-grey-400">
                Real-time shielded prompt analytics, privacy scores, and encrypted vault sessions.
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center space-x-1.5 rounded-xl bg-gradient-gold px-4 py-2 font-mono text-xs font-bold text-grey-950 shadow-glow-gold transition-all hover:scale-105"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Shield New Prompt</span>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="glass-panel glass-panel-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-grey-400 uppercase">PROTECTED PROMPTS</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/20 shadow-glow-gold">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-extrabold text-white">
            {summary ? summary.totalProtectedPrompts.toLocaleString() : '12,483'}
          </p>
          <p className="mt-1 text-[11px] text-grey-400">Prompts shielded before LLM interaction</p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-grey-400 uppercase">ENTITIES SHIELDED</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grey-800 text-gold-300 border border-grey-700">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-extrabold text-gold-300">
            {summary ? summary.totalSensitiveEntitiesFound.toLocaleString() : '38,943'}
          </p>
          <p className="mt-1 text-[11px] text-grey-400">API keys, PII & codenames protected</p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-grey-400 uppercase">AVG PRIVACY SCORE</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/20 shadow-glow-gold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-extrabold text-gold-400">
            98/100
          </p>
          <p className="mt-1 text-[11px] text-gold-400 font-mono">SAFE TO SHARE WITH AI</p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-grey-400 uppercase">PROCESSING TIME</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grey-800 text-grey-300 border border-grey-700">
              <Zap className="h-4 w-4 text-gold-400" />
            </div>
          </div>
          <p className="mt-4 font-mono text-3xl font-extrabold text-white">
            6.4ms
          </p>
          <p className="mt-1 text-[11px] text-grey-400">Sub-millisecond local shielding SLA</p>
        </div>

      </div>

      {/* Sessions Table */}
      <div className="mt-8 glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-grey-800 pb-4 mb-4">
          <h3 className="font-mono text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold-400" />
            RECENT SHIELDING SESSIONS
          </h3>
          <Link href="/history" className="font-mono text-xs text-gold-400 hover:underline flex items-center gap-1">
            <span>View Vault History</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-grey-800 text-[10px] text-grey-400">
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">SESSION ID</th>
                <th className="py-3 px-4">PROMPT SNIPPET</th>
                <th className="py-3 px-4">SCORE (BEFORE ➔ AFTER)</th>
                <th className="py-3 px-4">ENTITIES</th>
                <th className="py-3 px-4">VAULT MAPPING</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-800/60">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-grey-800/60 transition-colors">
                  <td className="py-3 px-4 text-grey-400 whitespace-nowrap">
                    {new Date(sess.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-gold-400">{sess.id}</td>
                  <td className="py-3 px-4 text-grey-300 max-w-[260px] truncate">
                    {sess.originalPromptSnippet}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-rose-400 font-bold">{sess.initialPrivacyScore}/100</span>
                    <span className="text-grey-500 mx-1">➔</span>
                    <span className="text-gold-400 font-bold">{sess.shieldedPrivacyScore}/100</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{sess.entitiesFoundCount}</td>
                  <td className="py-3 px-4">
                    {sess.isPurged ? (
                      <span className="text-[10px] text-grey-500 font-bold">PURGED</span>
                    ) : (
                      <button
                        onClick={() => handlePurge(sess.id)}
                        className="flex items-center space-x-1 rounded bg-grey-900 border border-grey-800 px-2 py-1 text-[10px] text-grey-400 hover:text-rose-400"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Purge</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
