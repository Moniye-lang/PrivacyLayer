'use client';

import React, { useState } from 'react';
import { Shield, Copy, Unlock, ArrowRight, Cpu, Zap, Lock } from 'lucide-react';

const STEPS = [
  {
    id: 'shield',
    icon: Shield,
    step: '1',
    label: '🛡 SHIELD',
    sublabel: 'Privacy Engine Runs',
    color: 'text-gold-400',
    borderColor: 'border-gold-500/50',
    bgColor: 'bg-gold-500/10',
    description: 'Regex + Semantic NLP detects all sensitive entities. Each one replaced with a unique [[PLACEHOLDER_001]].',
    demo: {
      input: 'Write to John Doe about Project Falcon.\nKey: sk-proj-84920194829104',
      output: 'Write to [[PERSON_001]] about [[PROJECT_001]].\nKey: [[API_KEY_001]]',
    },
  },
  {
    id: 'copy',
    icon: Copy,
    step: '2',
    label: '📋 COPY & ASK',
    sublabel: 'Paste Into Any AI',
    color: 'text-grey-200',
    borderColor: 'border-grey-600',
    bgColor: 'bg-grey-800/80',
    description: 'Copy the shielded prompt. Paste directly into ChatGPT, Claude, Gemini, Cursor, or any LLM. Zero secrets transmitted.',
    demo: {
      input: 'Write to [[PERSON_001]] about [[PROJECT_001]].',
      output: 'Hello [[PERSON_001]], I\'ve reviewed [[PROJECT_001]] and it\'s looking great!',
    },
  },
  {
    id: 'reveal',
    icon: Unlock,
    step: '3',
    label: '🔓 REVEAL',
    sublabel: 'Restore Original Values',
    color: 'text-gold-300',
    borderColor: 'border-gold-500/40',
    bgColor: 'bg-gold-500/10',
    description: 'Paste the AI response back. Encrypted mapping vault instantly restores every placeholder to its original value.',
    demo: {
      input: 'Hello [[PERSON_001]], I\'ve reviewed [[PROJECT_001]] and it\'s looking great!',
      output: 'Hello John Doe, I\'ve reviewed Project Falcon and it\'s looking great!',
    },
  },
];

export const ArchitectureVisualizer: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string>('shield');

  const activeStepData = STEPS.find((s) => s.id === activeStep)!;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gold-400">
          HOW IT WORKS
        </span>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          🛡 Shield → 🤖 Ask Any AI → 🔓 Reveal
        </h2>
        <p className="mt-2 text-sm text-grey-400 font-sans">
          The complete workflow for private AI conversations. Click any step to explore.
        </p>
      </div>

      {/* Step Selector Pills */}
      <div className="flex justify-center space-x-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center space-x-2 rounded-xl border px-5 py-2.5 font-mono text-xs font-bold transition-all hover:scale-105 ${
                isActive
                  ? `${step.borderColor} ${step.bgColor} ${step.color} shadow-glow-gold`
                  : 'border-grey-800 bg-grey-900/60 text-grey-400 hover:border-grey-700'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${isActive ? 'bg-gold-400 text-grey-950' : 'bg-grey-800 text-grey-400'} text-[10px] font-extrabold`}>
                {step.step}
              </span>
              <Icon className="h-3.5 w-3.5" />
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Step Detail Card */}
      <div className={`glass-panel rounded-2xl border p-6 transition-all ${activeStepData.borderColor}`}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          
          {/* Left: Description */}
          <div className="flex flex-col justify-center space-y-3">
            <div className={`flex items-center space-x-2 ${activeStepData.color}`}>
              <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                STEP {activeStepData.step}
              </span>
            </div>
            <h3 className="font-mono text-xl font-extrabold text-white">{activeStepData.label}</h3>
            <p className={`font-mono text-sm font-semibold ${activeStepData.color}`}>{activeStepData.sublabel}</p>
            <p className="text-sm leading-relaxed text-grey-300 font-sans">{activeStepData.description}</p>
          </div>

          {/* Right: Before / After Demo */}
          <div className="space-y-3 font-mono text-xs">
            <div className="rounded-xl border border-grey-800 bg-grey-950 p-3.5">
              <span className="text-[10px] text-grey-500 uppercase font-bold tracking-wider">INPUT</span>
              <pre className="mt-1.5 whitespace-pre-wrap leading-relaxed text-grey-300">{activeStepData.demo.input}</pre>
            </div>
            <div className="flex justify-center">
              <ArrowRight className={`h-5 w-5 ${activeStepData.color}`} />
            </div>
            <div className={`rounded-xl border p-3.5 ${activeStepData.bgColor} ${activeStepData.borderColor} border-opacity-40`}>
              <span className="text-[10px] text-grey-400 uppercase font-bold tracking-wider">OUTPUT</span>
              <pre className={`mt-1.5 whitespace-pre-wrap leading-relaxed ${activeStepData.color} font-bold`}>{activeStepData.demo.output}</pre>
            </div>
          </div>

        </div>
      </div>

      {/* Feature Trust Row */}
      <div className="flex flex-wrap justify-center gap-8 font-mono text-xs text-grey-400">
        {[
          { icon: Cpu, label: 'Sub-10ms Detection Engine' },
          { icon: Lock, label: 'AES-256 Vault Encryption' },
          { icon: Zap, label: 'Supports Any AI Model' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center space-x-2">
            <Icon className="h-4 w-4 text-gold-400" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
