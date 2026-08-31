'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, ShieldCheck, RefreshCw, Plus, Globe, Check, Cpu, FileText, Lock, Stethoscope, DollarSign, Scale, Terminal } from 'lucide-react';

interface DomainPack {
  id: string;
  name: string;
  category: string;
  description: string;
  isEnabled: boolean;
  termsCount: number;
  patternsCount: number;
}

interface ExternalConnector {
  id: string;
  name: string;
  url: string;
  status: string;
  termsCount: number;
  lastSyncedAt?: string;
}

export default function RulesAndDictionaryPage() {
  const [domainPacks, setDomainPacks] = useState<DomainPack[]>([]);
  const [connectors, setConnectors] = useState<ExternalConnector[]>([]);
  const [stats, setStats] = useState({ enabledDomainPacksCount: 0, totalActiveTermsCount: 0, externalConnectorsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [newTerm, setNewTerm] = useState('');
  const [newEntityType, setNewEntityType] = useState('CUSTOM_TERM');
  const [apiUrl, setApiUrl] = useState('');
  const [apiName, setApiName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const categoryIcons: Record<string, React.ReactNode> = {
    Healthcare: <Stethoscope className="w-5 h-5 text-gold-400" />,
    Financial: <DollarSign className="w-5 h-5 text-gold-300" />,
    Legal: <Scale className="w-5 h-5 text-grey-200" />,
    Engineering: <Terminal className="w-5 h-5 text-gold-400" />,
    Government: <Lock className="w-5 h-5 text-rose-400" />,
  };

  const fetchDictionaryData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/dictionary');
      const data = await res.json();
      if (data.status === 'success') {
        setDomainPacks(data.domainPacks || []);
        setConnectors(data.externalConnectors || []);
        setStats(data.stats || { enabledDomainPacksCount: 0, totalActiveTermsCount: 0, externalConnectorsCount: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch dictionary data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDictionaryData();
  }, []);

  const handleTogglePack = async (packId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/v1/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_domain_pack',
          packId,
          enabled: !currentEnabled,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDomainPacks((prev) =>
          prev.map((pack) => (pack.id === packId ? { ...pack, isEnabled: !currentEnabled } : pack))
        );
        setFeedback(`Pack ${packId} updated successfully`);
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Failed to toggle pack:', err);
    }
  };

  const handleAddCustomTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim()) return;

    try {
      const res = await fetch('/api/v1/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_import',
          terms: [{ term: newTerm.trim(), type: newEntityType }],
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNewTerm('');
        setFeedback(`Added "${newTerm.trim()}" to dictionary`);
        fetchDictionaryData();
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Failed to add custom term:', err);
    }
  };

  const handleAddConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiUrl.trim() || !apiName.trim()) return;

    try {
      const res = await fetch('/api/v1/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_external_connector',
          connectorConfig: {
            id: `ext_${Date.now()}`,
            name: apiName.trim(),
            url: apiUrl.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setApiUrl('');
        setApiName('');
        setFeedback(`Connected external API "${apiName.trim()}"`);
        fetchDictionaryData();
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Failed to add external API connector:', err);
    }
  };

  return (
    <div className="min-h-screen bg-grey-900 text-grey-100 p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-grey-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gold-500/10 rounded-xl border border-gold-500/20 text-gold-400 shadow-glow-gold">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-gold bg-clip-text text-transparent">
                  Global Industry Lexicons & Rules
                </h1>
                <p className="text-grey-400 text-sm mt-0.5">
                  Multi-industry domain dictionary catalogs, custom codename rules & live API connectors
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchDictionaryData}
            className="flex items-center gap-2 px-4 py-2 bg-grey-800 hover:bg-grey-750 border border-grey-700 rounded-lg text-sm font-medium transition text-grey-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Catalogs
          </button>
        </div>

        {feedback && (
          <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl text-gold-300 text-sm flex items-center gap-2 shadow-glow-gold animate-fade-in-up">
            <Check className="w-4 h-4 text-gold-400" />
            {feedback}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-grey-850 border border-grey-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-grey-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Domain Packs</span>
              <ShieldCheck className="w-5 h-5 text-gold-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.enabledDomainPacksCount} / {domainPacks.length}</div>
            <p className="text-xs text-grey-400 mt-1">Healthcare, Finance, Legal, DevOps, Defense</p>
          </div>

          <div className="p-6 bg-grey-850 border border-grey-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-grey-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Industry Terms</span>
              <FileText className="w-5 h-5 text-gold-400" />
            </div>
            <div className="text-3xl font-extrabold text-gold-400">{stats.totalActiveTermsCount}</div>
            <p className="text-xs text-grey-400 mt-1">Active in Sub-15ms Detection Pipeline</p>
          </div>

          <div className="p-6 bg-grey-850 border border-grey-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-grey-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Remote API Connectors</span>
              <Globe className="w-5 h-5 text-gold-300" />
            </div>
            <div className="text-3xl font-extrabold text-gold-300">{stats.externalConnectorsCount}</div>
            <p className="text-xs text-grey-400 mt-1">Live REST Webhooks & Enterprise Repositories</p>
          </div>
        </div>

        {/* Industry Domain Lexicon Packs Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gold-400" />
              Industry Domain Lexicon Catalogs
            </h2>
            <span className="text-xs text-grey-400">Toggle domain packs to auto-enable specialized terminology matching</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domainPacks.map((pack) => (
              <div
                key={pack.id}
                className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  pack.isEnabled
                    ? 'bg-grey-850 border-gold-500/40 shadow-glow-gold'
                    : 'bg-grey-950/60 border-grey-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      {categoryIcons[pack.category] || <BookOpen className="w-5 h-5 text-gold-400" />}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-grey-800 text-grey-300 border border-grey-700">
                        {pack.category}
                      </span>
                    </div>
                    <button
                      onClick={() => handleTogglePack(pack.id, pack.isEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pack.isEnabled ? 'bg-gold-500 shadow-glow-gold' : 'bg-grey-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-grey-950 transition-transform ${
                          pack.isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-white">{pack.name}</h3>
                  <p className="text-grey-400 text-xs mt-1.5 line-clamp-2">{pack.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-grey-800/80 flex items-center justify-between text-xs text-grey-400 font-mono">
                  <span>{pack.termsCount} Standard Terms</span>
                  <span>{pack.patternsCount} Regex Rules</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Terms & External API Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          {/* Quick Add Custom Term */}
          <div className="p-6 bg-grey-850 border border-grey-800 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-gold-400" />
              Add Custom Term or Codename
            </h3>
            <form onSubmit={handleAddCustomTerm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-grey-400 mb-1.5 font-mono">Term / Keyword</label>
                <input
                  type="text"
                  placeholder="e.g. Project Phoenix, SEC_AUDIT_2026"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-grey-950 border border-grey-800 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-grey-400 mb-1.5 font-mono">Entity Classification</label>
                <select
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-grey-950 border border-grey-800 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500/50 font-mono"
                >
                  <option value="PROJECT_CODENAME">PROJECT_CODENAME</option>
                  <option value="SECRET_KEY">SECRET_KEY</option>
                  <option value="INTERNAL_ID">INTERNAL_ID</option>
                  <option value="CUSTOM_TERM">CUSTOM_TERM</option>
                  <option value="PHI">PHI (Medical)</option>
                  <option value="FINANCIAL_INFO">FINANCIAL_INFO</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-gold text-grey-950 font-bold rounded-xl text-sm transition shadow-glow-gold flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <Plus className="w-4 h-4" /> Add to Active Lexicon
              </button>
            </form>
          </div>

          {/* Connect Remote API Dictionary */}
          <div className="p-6 bg-grey-850 border border-grey-800 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-gold-300" />
              Connect External REST Dictionary API
            </h3>
            <form onSubmit={handleAddConnector} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-grey-400 mb-1.5 font-mono">Connector Name</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Glossary API"
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-grey-950 border border-grey-800 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-grey-400 mb-1.5 font-mono">REST JSON URL Endpoint</label>
                <input
                  type="url"
                  placeholder="https://api.company.com/v1/glossary"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-grey-950 border border-grey-800 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500/50 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-grey-800 hover:bg-grey-750 text-gold-300 border border-gold-500/30 font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 text-gold-400" /> Connect & Sync API
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
