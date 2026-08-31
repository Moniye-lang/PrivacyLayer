'use client';

import React, { useState, useEffect } from 'react';
import { MaskResponsePayload, MaskingStrategy } from '@/types';
import { ShieldCheck, Zap, AlertTriangle, Copy, Check, Sparkles, RefreshCw, Cpu } from 'lucide-react';

const PRESET_PROMPTS = [
  {
    label: 'Executive Codename Leak',
    prompt: 'The CEO approved Project Phoenix deployment for customer CUST-9021. Send sk-proj-8492019842019842019842 to server.',
  },
  {
    label: 'Database Credentials & Password',
    prompt: 'Connect to production database at mongodb://admin:SecretP@ssword99@db.prod.internal:27017 and run backup.',
  },
  {
    label: 'HR & Employee PII',
    prompt: 'Create HR report for EMP-9421 (SSN: 489-02-9912, john.doe@enterprise.com) with annual salary $145,000.',
  },
  {
    label: 'Medical & PHI Context',
    prompt: 'Patient Dr. Alexander Smith diagnosed with stage 2 hypertension. Medical record #MRN-882910.',
  },
];

export const InteractivePlayground: React.FC = () => {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].prompt);
  const [strategy, setStrategy] = useState<MaskingStrategy>('REPLACE');
  const [department, setDepartment] = useState('Engineering');
  const [result, setResult] = useState<MaskResponsePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleMask = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/mask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          strategy,
          department,
          customCodenames: ['Project Phoenix', 'Operation Titan', 'Falcon Horizon'],
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Mask error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleMask();
  }, [prompt, strategy, department]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-grey-800 bg-grey-900/90 p-6 shadow-2xl backdrop-blur-xl">
      
      {/* Top Selector Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-grey-800 pb-5">
        
        {/* Preset Prompt Buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="self-center font-mono text-xs text-grey-400">Presets:</span>
          {PRESET_PROMPTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(preset.prompt)}
              className="rounded-lg border border-grey-800 bg-grey-900/60 px-3 py-1 text-xs text-grey-300 transition-all hover:border-gold-500/50 hover:text-white"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Strategy & Dept Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 rounded-lg border border-grey-800 bg-grey-900/80 p-1">
            {(['REPLACE', 'REDACT', 'TOKENIZE', 'DETERMINISTIC'] as MaskingStrategy[]).map((strat) => (
              <button
                key={strat}
                onClick={() => setStrategy(strat)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-mono font-medium transition-all ${
                  strategy === strat
                    ? 'bg-gold-500 text-grey-950 font-bold shadow-glow-gold'
                    : 'text-grey-400 hover:text-grey-200'
                }`}
              >
                {strat}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main Split Interface */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Left Box: Original Prompt */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-grey-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              ORIGINAL PROMPT (INPUT)
            </span>
            <span className="text-[11px] text-grey-400">{prompt.length} chars</span>
          </div>

          <div className="relative rounded-xl border border-grey-800 bg-grey-950/80 p-4 font-mono text-xs text-grey-200 focus-within:border-gold-500/50">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="w-full resize-none bg-transparent outline-none text-grey-200 placeholder:text-grey-600"
              placeholder="Paste prompt containing API keys, codenames, emails, passwords..."
            />
          </div>
        </div>

        {/* Right Box: Masked Protected Output */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-gold-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
              PROTECTED PROMPT (AI READY)
            </span>
            {result && (
              <button
                onClick={() => copyToClipboard(result.maskedPrompt)}
                className="flex items-center space-x-1 text-[11px] text-grey-400 hover:text-gold-400"
              >
                {copied ? <Check className="h-3 w-3 text-gold-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="relative flex flex-col justify-between min-h-[140px] rounded-xl border border-gold-500/40 bg-grey-950/90 p-4 font-mono text-xs text-gold-200 shadow-glow-gold">
            {loading ? (
              <div className="flex h-32 items-center justify-center space-x-2 text-gold-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Executing Context Engine...</span>
              </div>
            ) : result ? (
              <p className="whitespace-pre-wrap leading-relaxed">{result.maskedPrompt}</p>
            ) : null}

            {/* Metrics Footer */}
            {result && (
              <div className="mt-4 flex flex-wrap items-center justify-between border-t border-grey-800/80 pt-3 text-[11px] text-grey-400 font-sans">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-gold-400" />
                    Latency: <strong className="text-white font-mono">{result.latency.totalMs}ms</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-gold-400" />
                    Risk Score: <strong className="text-gold-400 font-mono">{result.riskScore}/100</strong>
                  </span>
                </div>
                <div>
                  Entities Found: <strong className="text-gold-400 font-mono">{result.entitiesDetectedCount}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Entity Breakdown Badges */}
      {result && result.entities.length > 0 && (
        <div className="mt-6 border-t border-grey-800/80 pt-4">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-grey-400">
            Detected Entities & Contextual Confidence
          </h4>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {result.entities.map((entity, idx) => (
              <div
                key={`${entity.placeholder}-${idx}`}
                className="flex items-center space-x-2 rounded-lg border border-grey-700 bg-grey-900/90 px-3 py-1.5 text-xs"
              >
                <span className="font-mono font-bold text-gold-400">{entity.type}</span>
                <span className="rounded bg-grey-800 px-1.5 py-0.5 text-[10px] text-grey-300">
                  {entity.placeholder}
                </span>
                <span className="text-[10px] font-semibold text-gold-300 font-mono">
                  {Math.round(entity.confidence * 100)}% conf
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
