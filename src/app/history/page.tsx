'use client';

import React, { useState, useEffect } from 'react';
import { ShieldSession } from '@/types';
import { History, Lock, Trash2, Search } from 'lucide-react';

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ShieldSession[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState<ShieldSession | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/v1/history');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePurgeOne = async (sessionId: string) => {
    await fetch(`/api/v1/history?sessionId=${sessionId}`, { method: 'DELETE' });
    fetchHistory();
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
    }
  };

  const handlePurgeAll = async () => {
    if (confirm('Are you sure you want to permanently delete ALL vault mappings? This action cannot be undone.')) {
      await fetch('/api/v1/history?purgeAll=true', { method: 'DELETE' });
      fetchHistory();
      setSelectedSession(null);
    }
  };

  const filtered = sessions.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.originalPromptSnippet.toLowerCase().includes(search.toLowerCase()) ||
      s.protectedPrompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="border-b border-grey-800 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold p-0.5 shadow-glow-gold">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-grey-900">
                <History className="h-5 w-5 text-gold-400" />
              </div>
            </div>
            <div>
              <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
                HISTORY & VAULT MAPPINGS
              </h1>
              <p className="mt-1 text-xs text-grey-400">
                Temporary encrypted mapping vault. Zero plaintext prompts are stored permanently.
              </p>
            </div>
          </div>

          <button
            onClick={handlePurgeAll}
            className="flex items-center space-x-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 font-mono text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge All Vault Mappings</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-6 flex items-center space-x-2 rounded-xl border border-grey-800 bg-grey-950 px-3.5 py-2 font-mono text-xs text-grey-200 focus-within:border-gold-500/50">
        <Search className="h-4 w-4 text-grey-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search history by session ID, protected prompt snippet, or placeholders..."
          className="w-full bg-transparent outline-none placeholder:text-grey-600 text-grey-200"
        />
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-grey-800 bg-grey-900 font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-grey-800 bg-grey-950/80 text-[10px] text-grey-400">
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">SESSION ID</th>
                <th className="py-3 px-4">PROTECTED PROMPT SNIPPET</th>
                <th className="py-3 px-4">SCORE</th>
                <th className="py-3 px-4">ENTITIES</th>
                <th className="py-3 px-4">EXPIRES AT</th>
                <th className="py-3 px-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-800/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-grey-800/60 transition-colors">
                  <td className="py-3 px-4 text-grey-400 whitespace-nowrap">
                    {new Date(s.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-gold-400">{s.id}</td>
                  <td className="py-3 px-4 text-gold-200 max-w-[280px] truncate">
                    {s.protectedPrompt}
                  </td>
                  <td className="py-3 px-4 font-bold text-gold-400">
                    {s.shieldedPrivacyScore}/100
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{s.entitiesFoundCount}</td>
                  <td className="py-3 px-4 text-grey-500 text-[10px]">
                    {new Date(s.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedSession(s)}
                        className="rounded bg-grey-950 border border-grey-800 px-2 py-1 text-[10px] text-grey-300 hover:text-gold-400"
                      >
                        Inspect
                      </button>
                      {!s.isPurged && (
                        <button
                          onClick={() => handlePurgeOne(s.id)}
                          className="rounded bg-rose-500/10 border border-rose-500/30 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/20"
                        >
                          Purge
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspector Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-grey-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-grey-800 bg-grey-900 p-6 shadow-2xl font-mono text-xs shadow-glow-gold">
            <div className="flex items-center justify-between border-b border-grey-800 pb-4">
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-gold-400" />
                <h3 className="text-base font-bold text-white">SESSION VAULT MAPPINGS</h3>
              </div>
              <button onClick={() => setSelectedSession(null)} className="text-grey-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-grey-950 p-3">
                <div>
                  <span className="text-[10px] text-grey-500">SESSION ID</span>
                  <div className="font-bold text-white">{selectedSession.id}</div>
                </div>
                <div>
                  <span className="text-[10px] text-grey-500">EXPIRES AT</span>
                  <div className="font-bold text-gold-400">{new Date(selectedSession.expiresAt).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <span className="font-bold text-gold-400">PROTECTED PROMPT:</span>
                <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-grey-950 p-3 text-gold-200 leading-relaxed max-h-32 overflow-y-auto border border-grey-800">
                  {selectedSession.protectedPrompt}
                </pre>
              </div>

              <div>
                <span className="font-bold text-grey-200">ENCRYPTED PLACEHOLDER MAPPINGS:</span>
                {selectedSession.isPurged ? (
                  <div className="mt-1 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-rose-400">
                    Mappings permanently deleted.
                  </div>
                ) : (
                  <div className="mt-1 space-y-1.5 rounded-xl bg-grey-950 p-3 border border-grey-800">
                    {Object.entries(selectedSession.encryptedMappings).map(([placeholderKey, originalVal]) => (
                      <div key={placeholderKey} className="flex items-center justify-between text-xs border-b border-grey-900 pb-1">
                        <span className="font-bold text-gold-400 font-mono">[[{placeholderKey}]]</span>
                        <span className="text-grey-400 font-mono">➔</span>
                        <span className="text-grey-200 font-mono font-semibold">{originalVal}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
