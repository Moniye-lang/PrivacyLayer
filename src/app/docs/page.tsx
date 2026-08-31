'use client';

import React, { useState } from 'react';
import {
  Shield, Code, Terminal, FileText, Check, Copy
} from 'lucide-react';

const ENDPOINTS = [
  { method: 'POST', path: '/api/v1/shield', label: 'Shield Prompt (Step 1)', color: 'text-gold-400 bg-gold-500/10 border-gold-500/30' },
  { method: 'POST', path: '/api/v1/reveal', label: 'Reveal Response (Step 3)', color: 'text-gold-300 bg-grey-800 border-grey-700' },
  { method: 'GET', path: '/api/v1/history', label: 'Vault History & Sessions', color: 'text-gold-400 bg-gold-500/10 border-gold-500/30' },
  { method: 'DELETE', path: '/api/v1/history', label: 'One-Click Purge Vault Mappings', color: 'text-rose-400 bg-rose-500/20 border-rose-500/30' },
];

const SDK_CODE = {
  python: `import requests

# Step 1: Shield
shield_res = requests.post("http://localhost:3000/api/v1/shield", json={
    "prompt": "Write an email to John Doe regarding Project Falcon. My API key is sk-proj-84920194829..."
}).json()

print(shield_res["protectedPrompt"])
# Output: Write an email to [[PERSON_001]] regarding [[PROJECT_001]]. My API key is [[APIKEY_001]].

session_id = shield_res["sessionId"]

# Step 2: Ask (User pastes protectedPrompt into ChatGPT / Claude / Gemini)
ai_response = "Hello [[PERSON_001]], Welcome to [[PROJECT_001]]!"

# Step 3: Reveal
reveal_res = requests.post("http://localhost:3000/api/v1/reveal", json={
    "sessionId": session_id,
    "aiResponse": ai_response
}).json()

print(reveal_res["restoredResponse"])
# Output: Hello John Doe, Welcome to Project Falcon!`,

  node: `import { PrivacyLayer } from '@privacy-layer/sdk';

// Initialize Privacy Layer
const client = new PrivacyLayer({ apiKey: process.env.PRIVACY_LAYER_KEY });

// Step 1: Shield
const { sessionId, protectedPrompt, initialPrivacyScore } = await client.shield({
  prompt: 'Connect to database mongodb://admin:SecretPass99@db.prod:27017',
});

console.log(protectedPrompt); 
// Output: Connect to database [[DBCONN_001]]

// Step 3: Reveal after AI response
const { restoredResponse } = await client.reveal({
  sessionId,
  aiResponse: 'Use [[DBCONN_001]] to initialize pool.',
});

console.log(restoredResponse);`,

  curl: `# Step 1: Shield Prompt
curl -X POST http://localhost:3000/api/v1/shield \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write email to John Doe regarding Project Falcon. Key: sk-proj-12345"
  }'

# Step 3: Reveal AI Response
curl -X POST http://localhost:3000/api/v1/reveal \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "shd_9a8f2k",
    "aiResponse": "Hello [[PERSON_001]], Welcome to [[PROJECT_001]]!"
  }'`,
};

export default function DocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'python' | 'node' | 'curl'>('python');

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="border-b border-grey-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold p-0.5 shadow-glow-gold">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-grey-900">
              <FileText className="h-5 w-5 text-gold-400" />
            </div>
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
              DEVELOPER API & SDK REFERENCE
            </h1>
            <p className="mt-1 text-xs text-grey-400">
              Integrate The Privacy Layer into your local workflows, CLI tools, scripts, or custom extensions.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8 font-mono text-xs">

        {/* Section 1: Endpoints */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center space-x-2 border-b border-grey-800 pb-4 mb-4">
            <Terminal className="h-5 w-5 text-gold-400" />
            <h2 className="text-base font-bold text-white">API ENDPOINTS REFERENCE</h2>
          </div>
          <div className="space-y-3">
            {ENDPOINTS.map((ep) => (
              <div key={ep.path + ep.method} className="flex items-center justify-between rounded-xl border border-grey-800 bg-grey-950 p-3 hover:border-grey-700 transition-colors">
                <div className="flex items-center space-x-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${ep.color}`}>{ep.method}</span>
                  <code className="text-grey-200">{ep.path}</code>
                </div>
                <span className="text-grey-400">{ep.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Code Snippets */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between border-b border-grey-800 pb-4 mb-4">
            <div className="flex items-center space-x-2">
              <Code className="h-5 w-5 text-gold-400" />
              <h2 className="text-base font-bold text-white">SDK QUICKSTART</h2>
            </div>
            <div className="flex items-center space-x-2">
              {(['python', 'node', 'curl'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`rounded-lg border px-3 py-1 font-mono text-xs font-semibold capitalize transition-all ${
                    activeLang === lang
                      ? 'border-gold-500/50 bg-gold-500/10 text-gold-400 shadow-glow-gold'
                      : 'border-grey-800 bg-grey-900/60 text-grey-400 hover:text-grey-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-xl border border-grey-800 bg-grey-950 overflow-hidden">
            <div className="flex items-center justify-between border-b border-grey-800 px-4 py-2">
              <span className="text-[10px] text-grey-500">example.{activeLang === 'python' ? 'py' : activeLang === 'node' ? 'ts' : 'sh'}</span>
              <button
                onClick={() => copyText(SDK_CODE[activeLang], `sdk-${activeLang}`)}
                className="flex items-center space-x-1 text-[10px] text-grey-400 hover:text-gold-400"
              >
                {copiedId === `sdk-${activeLang}` ? <Check className="h-3 w-3 text-gold-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedId === `sdk-${activeLang}` ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs text-grey-300 leading-relaxed max-h-96">
              <code>{SDK_CODE[activeLang]}</code>
            </pre>
          </div>
        </div>

        {/* Section 3: Placeholder Format Standard */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center space-x-2 border-b border-grey-800 pb-4 mb-4">
            <Shield className="h-5 w-5 text-gold-400" />
            <h2 className="text-base font-bold text-white">PLACEHOLDER STANDARD SPECIFICATION</h2>
          </div>
          <p className="text-grey-400 font-sans text-xs mb-4">
            All detected entities are mapped to double-bracketed unique placeholders preserving type context.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
            {[
              { type: 'Person Name', placeholder: '[[PERSON_001]]' },
              { type: 'Project Codename', placeholder: '[[PROJECT_001]]' },
              { type: 'API Key', placeholder: '[[APIKEY_001]]' },
              { type: 'Email Address', placeholder: '[[EMAIL_001]]' },
              { type: 'Phone Number', placeholder: '[[PHONE_001]]' },
              { type: 'DB Connection', placeholder: '[[DBCONN_001]]' },
              { type: 'Password', placeholder: '[[PASSWORD_001]]' },
              { type: 'Medical Record', placeholder: '[[MEDICAL_001]]' },
            ].map((item) => (
              <div key={item.type} className="rounded-xl border border-grey-800 bg-grey-950 p-3">
                <span className="text-[10px] text-grey-500 block">{item.type}</span>
                <span className="font-bold text-gold-400">{item.placeholder}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
