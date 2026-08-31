'use client';

import React, { useState } from 'react';
import { Settings, Lock, Shield, Key, Plus, Check } from 'lucide-react';

export default function SettingsPage() {
  const [autoExpire, setAutoExpire] = useState('60');
  const [customTerms, setCustomTerms] = useState(['Project Falcon', 'Operation Aegis', 'Falcon Horizon']);
  const [newTerm, setNewTerm] = useState('');
  const [aesEnabled, setAesEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTerm && !customTerms.includes(newTerm)) {
      setCustomTerms([...customTerms, newTerm]);
      setNewTerm('');
    }
  };

  const handleRemoveTerm = (term: string) => {
    setCustomTerms(customTerms.filter((t) => t !== term));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="border-b border-grey-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold p-0.5 shadow-glow-gold">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-grey-900">
              <Settings className="h-5 w-5 text-gold-400" />
            </div>
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
              PRIVACY SETTINGS
            </h1>
            <p className="mt-1 text-xs text-grey-400">
              Configure encrypted vault expiration timers, custom sensitive terms, and security keys.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6 font-mono text-xs">

        {/* Section 1: Auto-Expiration Timer */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center space-x-2 border-b border-grey-800 pb-4 mb-4">
            <Lock className="h-4 w-4 text-gold-400" />
            <h3 className="font-bold text-white text-sm">AUTOMATIC VAULT EXPIRATION</h3>
          </div>
          <p className="text-grey-400 mb-4 font-sans text-xs">
            Encrypted session mappings will automatically self-destruct after this duration.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '15 Minutes', val: '15' },
              { label: '1 Hour (Recommended)', val: '60' },
              { label: '24 Hours', val: '1440' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setAutoExpire(opt.val)}
                className={`rounded-xl border p-3 font-mono text-xs text-center transition-all ${
                  autoExpire === opt.val
                    ? 'border-gold-500/50 bg-gold-500/10 text-gold-400 font-bold shadow-glow-gold'
                    : 'border-grey-800 bg-grey-950 text-grey-400 hover:border-grey-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Custom Sensitive Terms */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center space-x-2 border-b border-grey-800 pb-4 mb-4">
            <Shield className="h-4 w-4 text-gold-400" />
            <h3 className="font-bold text-white text-sm">CUSTOM SENSITIVE TERMS REGISTRY</h3>
          </div>
          <p className="text-grey-400 mb-4 font-sans text-xs">
            Add internal project names, stealth codenames, or proprietary terms. The Shield engine will automatically detect and replace them with <code className="text-gold-400">[[PROJECT_001]]</code> or <code className="text-gold-400">[[TERM_001]]</code>.
          </p>

          <form onSubmit={handleAddTerm} className="flex space-x-2 mb-4">
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="e.g. Operation Aegis, Project Manhattan"
              className="flex-1 rounded-xl border border-grey-800 bg-grey-950 px-3.5 py-2 text-grey-200 outline-none focus:border-gold-500/50"
            />
            <button
              type="submit"
              className="flex items-center space-x-1 rounded-xl bg-gradient-gold px-4 py-2 font-bold text-grey-950 shadow-glow-gold hover:scale-105 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Term</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {customTerms.map((term) => (
              <div
                key={term}
                className="flex items-center space-x-2 rounded-lg border border-grey-800 bg-grey-950 px-3 py-1.5"
              >
                <span className="font-bold text-gold-400">{term}</span>
                <button
                  onClick={() => handleRemoveTerm(term)}
                  className="text-grey-500 hover:text-rose-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: AES-256 Encryption */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4 text-gold-400" />
                <h3 className="font-bold text-white text-sm">AES-256 VAULT ENCRYPTION</h3>
              </div>
              <p className="mt-1 text-grey-400 font-sans text-xs">
                Encrypts session mappings in local vault using AES-256 before storage.
              </p>
            </div>
            <button
              onClick={() => setAesEnabled(!aesEnabled)}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                aesEnabled ? 'bg-gold-500/15 text-gold-400 border border-gold-500/40 shadow-glow-gold' : 'bg-grey-900 text-grey-500'
              }`}
            >
              {aesEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 rounded-xl bg-gradient-gold px-6 py-3 font-bold text-grey-950 shadow-glow-gold hover:scale-105 transition-all"
          >
            {saved ? <Check className="h-4 w-4 text-grey-950" /> : <Settings className="h-4 w-4 text-grey-950" />}
            <span>{saved ? 'SETTINGS SAVED!' : 'SAVE SETTINGS'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
