'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Lock, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-grey-800/80 bg-grey-950 py-12 text-grey-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold p-0.5 shadow-glow-gold">
                <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-grey-900">
                  <Shield className="h-4 w-4 text-gold-400" />
                </div>
              </div>
              <span className="font-mono text-sm font-extrabold text-white tracking-wider">
                AQUIRE<span className="text-gold-400">1</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-grey-400 font-sans">
              The Privacy Layer for AI. Shield your sensitive data before it reaches any AI. Reveal it only after the AI has finished.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-gold-400/90">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
              <span>Zero LLM Transmission • Local Encryption</span>
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-grey-200">Workspace</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link href="/" className="hover:text-gold-400 transition-colors">Shield & Reveal</Link></li>
              <li><Link href="/dashboard" className="hover:text-gold-400 transition-colors">Privacy Dashboard</Link></li>
              <li><Link href="/history" className="hover:text-gold-400 transition-colors">History & Vault</Link></li>
              <li><Link href="/settings" className="hover:text-gold-400 transition-colors">Settings</Link></li>
            </ul>
          </div>

          {/* Col 3: Developers */}
          <div>
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-grey-200">Developers</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li><Link href="/docs" className="hover:text-gold-400 transition-colors">API Reference</Link></li>
              <li><Link href="/docs" className="hover:text-gold-400 transition-colors">SDK Quickstart</Link></li>
              <li><Link href="/docs" className="hover:text-gold-400 transition-colors">Placeholder Standard</Link></li>
              <li><Link href="/rules" className="hover:text-gold-400 transition-colors">Industry Lexicons & Rules</Link></li>
            </ul>
          </div>

          {/* Col 4: Security */}
          <div>
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-grey-200">Security</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li className="text-grey-400">Zero Data Retention</li>
              <li className="text-grey-400">AES-256 Vault Encryption</li>
              <li className="text-grey-400">Auto-Expire Mappings</li>
              <li className="text-grey-400">One-Click Purge</li>
            </ul>
          </div>

        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-grey-800/60 pt-6">
          <p className="font-mono text-[11px] text-grey-500">
            © {new Date().getFullYear()} Aquire1. The Privacy Layer for AI.
          </p>
          <div className="flex items-center space-x-1.5 rounded-full border border-grey-700/60 bg-grey-900/50 px-3 py-1 font-mono text-[10px] text-grey-400">
            <Lock className="h-3 w-3 text-gold-400" />
            <span>No data leaves your device without your permission.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
