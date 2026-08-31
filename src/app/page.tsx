'use client';

import React from 'react';
import { ShieldWorkspace } from '@/components/ShieldWorkspace';
import { ArchitectureVisualizer } from '@/components/ArchitectureVisualizer';
import { LiveThreatFeed } from '@/components/LiveThreatFeed';
import { PricingCalculator } from '@/components/PricingCalculator';
import { Shield, Lock, Eye, Copy, ArrowRight, Check, Sparkles, Terminal, Code, Users, Cpu, ShieldCheck } from 'lucide-react';

const TARGET_PERSONAS = [
  { title: 'Developers', desc: 'Protect API keys, JWT tokens, AWS secrets, and database connection URIs.', icon: Code },
  { title: 'Lawyers & Legal', desc: 'Shield client names, NDA case details, settlements, and confidential contracts.', icon: Lock },
  { title: 'Doctors & Healthcare', desc: 'Anonymize patient names, medical record numbers, and PHI diagnostic notes.', icon: ShieldCheck },
  { title: 'Founders & Execs', desc: 'Keep internal project codenames, M&A targets, and valuation numbers private.', icon: Sparkles },
  { title: 'Researchers & Students', desc: 'Safely analyze proprietary data and study notes without data retention risk.', icon: Terminal },
  { title: 'Consultants & Freelancers', desc: 'Maintain client confidentiality across every AI tool (ChatGPT, Claude, Gemini).', icon: Users },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col space-y-24 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.12),transparent_50%)]" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            
            {/* Live Ticker */}
            <div className="mb-6">
              <LiveThreatFeed />
            </div>

            {/* Core Value Proposition & Positioning */}
            <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 font-mono text-xs font-semibold text-gold-400 shadow-glow-gold">
              YOU DECIDE WHAT AI SEES
            </span>

            <h1 className="mt-4 max-w-4xl font-mono text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              The Layer Between Your Data <br className="hidden sm:inline" />
              <span className="text-gradient-gold">And AI.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base text-grey-300 sm:text-lg leading-relaxed font-sans">
              100% deterministic, explainable, and local privacy engine. Detects, masks, and restores sensitive information before prompts reach ChatGPT, Claude, Gemini, Cursor, or any AI model.
            </p>

            {/* Main Interactive 3-Step Workspace App */}
            <div className="mt-12 w-full max-w-6xl">
              <ShieldWorkspace />
            </div>

          </div>
        </div>
      </section>

      {/* Visual 3-Step Core Workflow Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gold-400">
            3-STEP WORKFLOW
          </span>
          <h2 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
            How The Privacy Layer Works
          </h2>
          <p className="mt-2 text-sm text-grey-400">
            No prompt is ever sent directly to an LLM. You remain in complete control.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          
          <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/30 font-mono font-bold shadow-glow-gold">
              1
            </div>
            <h3 className="mt-4 font-mono text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold-400" />
              1. Shield
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-grey-400 font-sans">
              Paste your prompt. Detects API keys, names, emails, codenames, and secrets. Every entity is replaced with a unique <code className="font-mono text-gold-400">[[PLACEHOLDER_001]]</code>.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-grey-800 text-gold-300 border border-grey-700 font-mono font-bold">
              2
            </div>
            <h3 className="mt-4 font-mono text-base font-bold text-white flex items-center gap-2">
              <Copy className="h-4 w-4 text-gold-300" />
              2. Ask (Copy Protected)
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-grey-400 font-sans">
              Click <strong>Copy Protected Prompt</strong> and paste into ChatGPT, Claude, Gemini, Cursor, or Copilot. Zero real secrets are exposed.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/30 font-mono font-bold shadow-glow-gold">
              3
            </div>
            <h3 className="mt-4 font-mono text-base font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-gold-400" />
              3. Reveal
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-grey-400 font-sans">
              Paste the AI’s response back. The restoration engine instantly replaces all placeholders with original values while preserving context.
            </p>
          </div>

        </div>
      </section>

      {/* Target Users Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gold-400">
            BUILT FOR EVERY AI USER
          </span>
          <h2 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
            One Privacy Engine. All Professions.
          </h2>
          <p className="mt-2 text-sm text-grey-400">
            From individual developers to doctors and lawyers — protect sensitive data before hitting submit.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TARGET_PERSONAS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="glass-panel glass-panel-hover rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-grey-900 text-gold-400 border border-grey-800 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-mono text-base font-bold text-white">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-grey-400 font-sans">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Architecture Visualizer */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ArchitectureVisualizer />
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gold-400">
            TRANSPARENT PRICING
          </span>
          <h2 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
            Simple Plans for Every Privacy Need
          </h2>
          <p className="mt-2 text-sm text-grey-400">
            From solo innovators to enterprise AI fleets.
          </p>
        </div>
        <div className="mt-8">
          <PricingCalculator />
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass-panel relative overflow-hidden rounded-3xl p-12 text-center shadow-glow-gold border-gold-500/40">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl" />
          <h2 className="font-mono text-3xl font-extrabold text-white sm:text-4xl">
            Shield Your Prompts Today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-grey-300 font-sans">
            Make Privacy Layer your default step before every interaction with AI.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <a
              href="#shield-workspace"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="rounded-xl bg-gradient-gold px-8 py-3.5 text-sm font-mono font-bold text-grey-950 shadow-glow-gold transition-all hover:scale-105"
            >
              Start Shielding Free
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
