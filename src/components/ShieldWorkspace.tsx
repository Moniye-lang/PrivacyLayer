'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldResponsePayload, RevealResponsePayload, EntityCategory, EntityType, ManualOverride } from '@/types';
import {
  Shield, Copy, Check, Lock, Unlock, Sparkles, AlertTriangle, Trash2, ShieldCheck, CheckCircle2, Eye, Layers, Settings, X, RefreshCw, Image as ImageIcon, FileText, ClipboardPaste, ArrowRight, ChevronRight
} from 'lucide-react';
import { learnedCacheStore } from '@/lib/engine/learnedCache';
import { ImageShieldEditor } from './ImageShieldEditor';

const STORAGE_KEY = 'privacy_layer_active_session';

const DEMO_PROMPTS = [
  {
    label: 'DB Credentials & URI',
    text: `Connect to production database at mongodb+srv://admin:SecretPass99@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority and run full backup script.`,
  },
  {
    label: 'Prompt & API Key',
    text: `Tell Han to email Aaliya regarding Project Titan. My API key is sk-proj-84920194829104.`,
  },
  {
    label: 'HR & PII Data',
    text: `Prepare HR review for CEO David (SSN: 489-02-9912, david@enterprise.com) with Bank Account #987654321 at Company ABC Ltd.`,
  },
  {
    label: 'Source Code & Secrets',
    text: `Repository Sentinel config:\nconst API_KEY = "sk-ant-api03-abcdef123456";\nlet dbPass = "SecretPass123";`,
  },
];

const DICT_CATEGORY_MAP: Record<string, EntityType> = {
  PROJECT: 'PROJECT_CODENAME',
  REPOSITORY: 'REPOSITORY',
  EMPLOYEE: 'PERSON_NAME',
  COMPANY: 'ORGANIZATION',
  PRODUCT: 'PRODUCT',
};

const MASK_TYPE_OPTIONS: { label: string; type: EntityType }[] = [
  { label: 'Person', type: 'PERSON_NAME' },
  { label: 'Project', type: 'PROJECT_CODENAME' },
  { label: 'Repository', type: 'REPOSITORY' },
  { label: 'Organization', type: 'ORGANIZATION' },
  { label: 'Secret', type: 'SOURCE_CODE_SECRET' },
  { label: 'Custom Term', type: 'CUSTOM_TERM' },
];

const TARGET_AIS = [
  'ChatGPT', 'Claude', 'Gemini', 'Cursor', 'DeepSeek', 'Grok', 'Copilot', 'Any AI'
];

export const ShieldWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  // Mobile Stepper Step (1: Input, 2: Protected, 3: Reveal)
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);

  // Step 1 State: Shield Input
  const [rawPrompt, setRawPrompt] = useState(DEMO_PROMPTS[0].text);
  const [shielding, setShielding] = useState(false);
  const [shieldResult, setShieldResult] = useState<ShieldResponsePayload | null>(null);
  const [animatedScore, setAnimatedScore] = useState<number>(22);
  const [copiedProtected, setCopiedProtected] = useState(false);
  const [customTerms, setCustomTerms] = useState<string[]>([]);

  // Step 3 State: Reveal Input
  const [aiResponseInput, setAiResponseInput] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [revealResult, setRevealResult] = useState<RevealResponsePayload | null>(null);
  const [copiedRevealed, setCopiedRevealed] = useState(false);
  const [purged, setPurged] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  // Modals & UI Controls State
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [dictCategory, setDictCategory] = useState<string>('PROJECT');
  const [dictTerm, setDictTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Text selection for manual override
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Stage 2 (Protected Output) In-Place Editing & Unmasking State
  const [isEditingStage2, setIsEditingStage2] = useState<boolean>(false);
  const [stage2ActiveToken, setStage2ActiveToken] = useState<string | null>(null);
  const [stage2SelectedText, setStage2SelectedText] = useState<string>('');
  const [stage2SelectionRange, setStage2SelectionRange] = useState<{ start: number; end: number } | null>(null);
  const stage2TextareaRef = useRef<HTMLTextAreaElement>(null);

  // Trigger subtle device haptics when supported
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15]);
      } catch {
        // ignore if not allowed
      }
    }
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Restore active session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ShieldResponsePayload;
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setShieldResult(parsed);
          setMobileStep(2);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('[ShieldWorkspace] Restore error:', e);
    }
  }, []);

  // Animated Privacy Score
  useEffect(() => {
    if (shieldResult) {
      const targetScore = shieldResult.shieldedPrivacyScore;
      let startScore = shieldResult.initialPrivacyScore;
      setAnimatedScore(startScore);

      const interval = setInterval(() => {
        startScore += 2;
        if (startScore >= targetScore) {
          setAnimatedScore(targetScore);
          clearInterval(interval);
        } else {
          setAnimatedScore(startScore);
        }
      }, 20);

      return () => clearInterval(interval);
    }
  }, [shieldResult]);

  // Handle Manual Selection
  const handleTextSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        const selected = rawPrompt.substring(start, end);
        if (selected.trim().length > 0) {
          setSelectedText(selected.trim());
          setSelectionRange({ start, end });
        }
      }
    }
  };

  // Add Manual Override (Mask) with Line-Aware Multi-Line Splitting
  const addManualMask = (type: EntityType = 'CUSTOM_TERM') => {
    if (!selectedText || !selectionRange) return;

    const rawSelected = rawPrompt.substring(selectionRange.start, selectionRange.end);
    const lines = rawSelected.split('\n');

    if (lines.length > 1) {
      const newOverrides: ManualOverride[] = [];
      const newCustomTerms: string[] = [...customTerms];
      let currentPos = selectionRange.start;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          const lineStartOffset = line.indexOf(trimmed);
          const lineStart = currentPos + (lineStartOffset >= 0 ? lineStartOffset : 0);
          const lineEnd = lineStart + trimmed.length;

          learnedCacheStore.addCustomTerm(trimmed, type);
          if (!newCustomTerms.includes(trimmed)) {
            newCustomTerms.push(trimmed);
          }

          newOverrides.push({
            text: trimmed,
            start: lineStart,
            end: lineEnd,
            action: 'MASK',
            type,
          });
        }
        currentPos += line.length + 1; // +1 for \n delimiter
      }

      setCustomTerms(newCustomTerms);
      setManualOverrides([
        ...manualOverrides.filter(
          (o) => Math.max(o.start, selectionRange.start) >= Math.min(o.end, selectionRange.end)
        ),
        ...newOverrides,
      ]);
      triggerHaptic();
      showToast(`Multi-line manual override: ${newOverrides.length} line(s) masked as ${type.replace(/_/g, ' ').toLowerCase()}.`);
    } else {
      const trimmed = selectedText.trim();
      learnedCacheStore.addCustomTerm(trimmed, type);
      if (!customTerms.includes(trimmed)) {
        setCustomTerms([...customTerms, trimmed]);
      }

      const trimmedOffset = rawSelected.indexOf(trimmed);
      const exactStart = selectionRange.start + (trimmedOffset >= 0 ? trimmedOffset : 0);
      const exactEnd = exactStart + trimmed.length;

      setManualOverrides([
        ...manualOverrides.filter(
          (o) => Math.max(o.start, exactStart) >= Math.min(o.end, exactEnd)
        ),
        {
          text: trimmed,
          start: exactStart,
          end: exactEnd,
          action: 'MASK',
          type,
        },
      ]);
      triggerHaptic();
      showToast(`Manual override: "${trimmed}" masked as ${type.replace(/_/g, ' ').toLowerCase()}.`);
    }

    setSelectedText('');
    setSelectionRange(null);
  };

  // Add Manual Override (Unmask) with Line-Aware Multi-Line Splitting
  const addManualUnmask = () => {
    if (!selectedText || !selectionRange) return;

    const rawSelected = rawPrompt.substring(selectionRange.start, selectionRange.end);
    const lines = rawSelected.split('\n');

    if (lines.length > 1) {
      const newOverrides: ManualOverride[] = [];
      let currentPos = selectionRange.start;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          const lineStartOffset = line.indexOf(trimmed);
          const lineStart = currentPos + (lineStartOffset >= 0 ? lineStartOffset : 0);
          const lineEnd = lineStart + trimmed.length;

          newOverrides.push({
            text: trimmed,
            start: lineStart,
            end: lineEnd,
            action: 'UNMASK',
          });
        }
        currentPos += line.length + 1;
      }

      setManualOverrides([
        ...manualOverrides.filter(
          (o) => Math.max(o.start, selectionRange.start) >= Math.min(o.end, selectionRange.end)
        ),
        ...newOverrides,
      ]);
      triggerHaptic();
      showToast(`Multi-line manual override: ${newOverrides.length} line(s) excluded from masking.`);
    } else {
      const trimmed = selectedText.trim();
      const trimmedOffset = rawSelected.indexOf(trimmed);
      const exactStart = selectionRange.start + (trimmedOffset >= 0 ? trimmedOffset : 0);
      const exactEnd = exactStart + trimmed.length;

      setManualOverrides([
        ...manualOverrides.filter(
          (o) => Math.max(o.start, exactStart) >= Math.min(o.end, exactEnd)
        ),
        {
          text: trimmed,
          start: exactStart,
          end: exactEnd,
          action: 'UNMASK',
        },
      ]);
      triggerHaptic();
      showToast(`Manual override: "${trimmed}" excluded from masking.`);
    }

    setSelectedText('');
    setSelectionRange(null);
  };

  // Stage 2: In-place text selection on protected prompt
  const handleStage2TextSelect = () => {
    if (stage2TextareaRef.current) {
      const start = stage2TextareaRef.current.selectionStart;
      const end = stage2TextareaRef.current.selectionEnd;
      if (start !== end && shieldResult) {
        const selected = shieldResult.protectedPrompt.substring(start, end);
        if (selected.trim().length > 0) {
          setStage2SelectedText(selected.trim());
          setStage2SelectionRange({ start, end });
        }
      }
    }
  };

  // Stage 2: 1-Click Unmask token back to original plaintext
  const handleStage2UnmaskToken = (placeholder: string) => {
    if (!shieldResult) return;
    const originalValue = shieldResult.plaintextMappings?.[placeholder];
    if (!originalValue) return;

    const updatedPrompt = shieldResult.protectedPrompt.split(placeholder).join(originalValue);
    const updatedMappings = { ...(shieldResult.plaintextMappings || {}) };
    delete updatedMappings[placeholder];

    const updatedEntities = shieldResult.detectedEntities.filter((e) => e.placeholder !== placeholder);

    const updatedResult: ShieldResponsePayload = {
      ...shieldResult,
      protectedPrompt: updatedPrompt,
      plaintextMappings: updatedMappings,
      detectedEntities: updatedEntities,
    };

    setShieldResult(updatedResult);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedResult));

    // Register an unmask override so future re-shields remember this choice
    setManualOverrides((prev) => [
      ...prev,
      {
        text: originalValue,
        start: 0,
        end: originalValue.length,
        action: 'UNMASK',
      },
    ]);

    setStage2ActiveToken(null);
    triggerHaptic();
    showToast(`Unmasked "${originalValue}" and restored original text.`);
  };

  // Stage 2: In-place Masking of newly selected text
  const handleStage2MaskText = (type: EntityType = 'CUSTOM_TERM') => {
    if (!shieldResult || !stage2SelectedText) return;
    const trimmed = stage2SelectedText.trim();
    if (!trimmed) return;

    const typeKey = type === 'CUSTOM_TERM' ? 'CUSTOM_TERM' : type;
    const existingCount = shieldResult.detectedEntities.filter((e) => e.type === type).length;
    const counterStr = String(existingCount + 1).padStart(3, '0');
    const placeholder = `[[${typeKey}_${counterStr}]]`;

    const updatedPrompt = shieldResult.protectedPrompt.replace(trimmed, placeholder);
    const updatedMappings = {
      ...shieldResult.plaintextMappings,
      [placeholder]: trimmed,
    };

    const updatedEntities = [
      ...shieldResult.detectedEntities,
      {
        placeholder,
        type,
        text: trimmed,
        start: 0,
        end: trimmed.length,
        confidence: 1.0,
        evidence: 'Stage 2 In-Place Manual Mask',
      },
    ];

    const updatedResult: ShieldResponsePayload = {
      ...shieldResult,
      protectedPrompt: updatedPrompt,
      plaintextMappings: updatedMappings,
      detectedEntities: updatedEntities,
    };

    setShieldResult(updatedResult);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedResult));

    if (!customTerms.includes(trimmed)) {
      setCustomTerms((prev) => [...prev, trimmed]);
    }
    learnedCacheStore.addCustomTerm(trimmed, type);

    setStage2SelectedText('');
    setStage2SelectionRange(null);
    triggerHaptic();
    showToast(`Masked "${trimmed}" as ${placeholder} in Stage 2.`);
  };

  // Stage 2: Direct prompt textarea editing
  const handleStage2DirectEdit = (newPromptText: string) => {
    if (!shieldResult) return;
    const updatedResult: ShieldResponsePayload = {
      ...shieldResult,
      protectedPrompt: newPromptText,
    };
    setShieldResult(updatedResult);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedResult));
  };

  // Handle Shield Prompt (1-Tap Shield & Copy)
  const handleShield = async () => {
    if (!rawPrompt.trim()) return;
    setShielding(true);
    setRevealResult(null);
    setRevealError(null);
    setAiResponseInput('');
    setPurged(false);

    try {
      const res = await fetch('/api/v1/shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: rawPrompt, customTerms, manualOverrides }),
      });
      const data: ShieldResponsePayload = await res.json();
      
      if (res.ok) {
        setShieldResult(data);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        // 1-Tap Copy & Haptic Feedback
        try {
          await navigator.clipboard.writeText(data.protectedPrompt);
          setCopiedProtected(true);
          triggerHaptic();
          showToast('🛡 Prompt Shielded & Auto-Copied!');
          setTimeout(() => setCopiedProtected(false), 2500);
        } catch {
          showToast('🛡 Prompt Shielded!');
        }

        // On mobile, auto-advance to Step 2
        setMobileStep(2);
      } else {
        alert((data as any).error || 'Failed to shield prompt.');
      }
    } catch (err) {
      console.error('Shield error:', err);
    } finally {
      setShielding(false);
    }
  };

  // Copy Protected Prompt
  const copyProtectedPrompt = () => {
    if (!shieldResult) return;
    navigator.clipboard.writeText(shieldResult.protectedPrompt);
    setCopiedProtected(true);
    triggerHaptic();
    showToast('Copied Protected Prompt to Clipboard!');
    setTimeout(() => setCopiedProtected(false), 2000);
  };

  // 1-Tap Clipboard Paste into Reveal Box
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setAiResponseInput(text);
        triggerHaptic();
        showToast('Pasted AI response from clipboard!');
      } else {
        showToast('Clipboard is empty.');
      }
    } catch (err) {
      showToast('Clipboard read permission denied. Please paste manually.');
    }
  };

  // Handle Reveal AI Response
  const handleReveal = async () => {
    if (!shieldResult || !aiResponseInput.trim()) return;
    setRevealing(true);
    setRevealError(null);

    try {
      const res = await fetch('/api/v1/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: shieldResult.sessionId,
          aiResponse: aiResponseInput,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setRevealResult(data);
        try {
          await navigator.clipboard.writeText(data.restoredResponse);
          setCopiedRevealed(true);
          triggerHaptic();
          showToast('🔓 Original Text Restored & Auto-Copied!');
          setTimeout(() => setCopiedRevealed(false), 2500);
        } catch {
          showToast('🔓 Original Text Restored!');
        }
      } else {
        setRevealError(data.error || 'Failed to reveal response.');
        if (data.code === 'SESSION_NOT_FOUND' || data.code === 'SESSION_PURGED') {
          setPurged(true);
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err: any) {
      console.error('Reveal error:', err);
      setRevealError(err.message || 'Network error executing reveal.');
    } finally {
      setRevealing(false);
    }
  };

  // Copy Restored Response
  const copyRevealedText = () => {
    if (!revealResult) return;
    navigator.clipboard.writeText(revealResult.restoredResponse);
    setCopiedRevealed(true);
    triggerHaptic();
    showToast('Copied Restored Response!');
    setTimeout(() => setCopiedRevealed(false), 2000);
  };

  // Purge Vault Mapping
  const handlePurgeMapping = async () => {
    if (!shieldResult) return;
    await fetch(`/api/v1/history?sessionId=${shieldResult.sessionId}`, {
      method: 'DELETE',
    });
    setPurged(true);
    setRevealResult(null);
    sessionStorage.removeItem(STORAGE_KEY);
    triggerHaptic();
    showToast('Encrypted mapping vault purged permanently.');
  };

  // Add term to User Dictionary Modal
  const handleAddDictTerm = () => {
    if (!dictTerm.trim()) return;
    const entityType = DICT_CATEGORY_MAP[dictCategory] || 'CUSTOM_TERM';
    learnedCacheStore.addCustomTerm(dictTerm.trim(), entityType);
    if (!customTerms.includes(dictTerm.trim())) {
      setCustomTerms([...customTerms, dictTerm.trim()]);
    }
    triggerHaptic();
    showToast(`Added "${dictTerm.trim()}" to User Dictionary.`);
    setDictTerm('');
  };

  const groupedEntities = shieldResult
    ? shieldResult.detectedEntities.reduce((acc, ent) => {
        const typeName = ent.type.replace(/_/g, ' ');
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  return (
    <div id="shield-workspace" className="w-full space-y-6 sm:space-y-8 rounded-2xl sm:rounded-3xl border border-grey-800 bg-grey-900/95 p-4 sm:p-8 shadow-2xl backdrop-blur-xl relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-5 z-50 flex items-center space-x-2 rounded-xl border border-gold-500/50 bg-grey-950 px-4 py-2.5 font-mono text-xs text-gold-300 shadow-glow-gold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-gold-400 shrink-0" />
          <span className="font-medium whitespace-nowrap">{toastMessage}</span>
        </div>
      )}

      {/* Top Workspace Tab Mode Switcher: Text Shield vs Image Shield */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-grey-800 pb-4 gap-3">
        <div className="flex items-center space-x-1.5 rounded-xl bg-grey-950 p-1 border border-grey-800 self-start">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center space-x-1.5 sm:space-x-2 rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 font-mono text-xs font-bold transition-all ${
              activeTab === 'text'
                ? 'bg-gradient-gold text-grey-950 shadow-glow-gold'
                : 'text-grey-400 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Text Shield</span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center space-x-1.5 sm:space-x-2 rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 font-mono text-xs font-bold transition-all ${
              activeTab === 'image'
                ? 'bg-gradient-gold text-grey-950 shadow-glow-gold'
                : 'text-grey-400 hover:text-white'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Image Shield</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 font-mono text-[10px] sm:text-[11px] text-gold-400 shadow-glow-gold self-start sm:self-auto">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
          <span>100% Deterministic Privacy</span>
        </div>
      </div>

      {activeTab === 'image' ? (
        <ImageShieldEditor />
      ) : (
        <>
          {/* Top Bar: Sample Prompts & User Dictionary Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-grey-800 pb-4">
            {/* Horizontal Scrollable Demo Prompts for Mobile */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth w-full sm:w-auto">
              <div className="flex items-center gap-1.5 font-mono text-xs text-gold-400 shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">EXAMPLES:</span>
              </div>
              {DEMO_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRawPrompt(p.text);
                    setShieldResult(null);
                    setRevealResult(null);
                    setRevealError(null);
                    setMobileStep(1);
                  }}
                  className="shrink-0 rounded-lg border border-grey-800 bg-grey-900/80 px-2.5 py-1 text-[11px] font-mono text-grey-300 transition-all hover:border-gold-500/50 hover:text-white active:scale-95 whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
              <button
                onClick={() => setShowDictionaryModal(true)}
                className="flex items-center space-x-1.5 rounded-xl border border-grey-800 bg-grey-900 px-3 py-1.5 font-mono text-xs text-grey-300 hover:border-gold-500/50 hover:text-white transition-all active:scale-95"
              >
                <Settings className="h-3.5 w-3.5 text-gold-400" />
                <span>Custom Dictionaries ({customTerms.length})</span>
              </button>
            </div>
          </div>

          {/* Mobile Stepper Header (Visible on mobile/tablet < lg) */}
          <div className="lg:hidden flex items-center justify-between bg-grey-950/90 rounded-2xl border border-grey-800 p-1.5 font-mono text-xs">
            <button
              onClick={() => setMobileStep(1)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-1 rounded-xl transition-all ${
                mobileStep === 1
                  ? 'bg-gradient-gold text-grey-950 font-bold shadow-glow-gold'
                  : 'text-grey-400 hover:text-white'
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                mobileStep === 1 ? 'bg-grey-950 text-gold-400' : 'bg-grey-800 text-grey-300'
              }`}>1</span>
              <span className="truncate">Input</span>
            </button>

            <ChevronRight className="h-3.5 w-3.5 text-grey-600 shrink-0" />

            <button
              onClick={() => setMobileStep(2)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-1 rounded-xl transition-all ${
                mobileStep === 2
                  ? 'bg-gradient-gold text-grey-950 font-bold shadow-glow-gold'
                  : 'text-grey-400 hover:text-white'
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                mobileStep === 2 ? 'bg-grey-950 text-gold-400' : 'bg-grey-800 text-grey-300'
              }`}>2</span>
              <span className="truncate">Protected</span>
              {shieldResult && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>

            <ChevronRight className="h-3.5 w-3.5 text-grey-600 shrink-0" />

            <button
              onClick={() => setMobileStep(3)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-1 rounded-xl transition-all ${
                mobileStep === 3
                  ? 'bg-gradient-gold text-grey-950 font-bold shadow-glow-gold'
                  : 'text-grey-400 hover:text-white'
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                mobileStep === 3 ? 'bg-grey-950 text-gold-400' : 'bg-grey-800 text-grey-300'
              }`}>3</span>
              <span className="truncate">Reveal</span>
              {revealResult && <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />}
            </button>
          </div>

          {/* Main Workflow Grid (On mobile, displays active mobileStep; on desktop lg, displays 3-column side-by-side) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* STEP 1: 🛡 SHIELD & MANUAL CONTROLS */}
            <div className={`flex flex-col space-y-4 rounded-2xl border border-grey-800/80 bg-grey-950/70 p-4 sm:p-6 shadow-lg ${
              mobileStep === 1 ? 'block' : 'hidden lg:flex'
            }`}>
              <div className="flex items-center justify-between border-b border-grey-800/80 pb-3">
                <div className="flex items-center space-x-2.5 font-mono text-sm font-bold text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-grey-950 text-xs font-extrabold">1</span>
                  <span>STEP 1: 🛡 PASTE PROMPT</span>
                </div>
                <Shield className="h-4 w-4 text-gold-400" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <label className="font-semibold text-grey-400">Sensitive input text:</label>
                  {selectedText && (
                    <span className="text-gold-400 font-bold animate-pulse truncate max-w-[150px]">
                      &quot;{selectedText}&quot;
                    </span>
                  )}
                </div>

                <textarea
                  ref={textareaRef}
                  value={rawPrompt}
                  onChange={(e) => setRawPrompt(e.target.value)}
                  onSelect={handleTextSelect}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-grey-800 bg-grey-900/90 p-3 font-mono text-xs text-grey-200 outline-none focus:border-gold-500/50 placeholder:text-grey-600 leading-relaxed"
                  placeholder="Paste prompt containing sensitive data..."
                />

                {selectedText && (
                  <div className="flex flex-col gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 p-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gold-300 font-semibold text-[11px]">Manual Override:</span>
                      <button
                        onClick={() => { setSelectedText(''); setSelectionRange(null); }}
                        className="rounded bg-grey-800 px-2 py-1 text-[11px] text-grey-400 hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {MASK_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.type}
                          onClick={() => addManualMask(opt.type)}
                          className="rounded bg-gold-500/20 px-2 py-1 text-[10px] font-bold text-gold-300 hover:bg-gold-500/30 active:scale-95"
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        onClick={addManualUnmask}
                        className="rounded bg-grey-700/60 px-2 py-1 text-[10px] font-bold text-grey-300 hover:bg-grey-600/60 active:scale-95"
                      >
                        Unmask
                      </button>
                    </div>
                  </div>
                )}

                {manualOverrides.length > 0 && (
                  <div className="rounded-lg border border-grey-800 bg-grey-900/60 px-2.5 py-1.5 font-mono text-[10px] text-grey-400">
                    {manualOverrides.length} manual override{manualOverrides.length > 1 ? 's' : ''} queued
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-grey-800 bg-grey-900/60 p-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-grey-400 text-[10px] uppercase font-semibold">INITIAL PRIVACY SCORE</span>
                  {shieldResult ? (
                    <span className="text-rose-400 font-bold text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {shieldResult.initialPrivacyScore} / 100 • {shieldResult.riskLevel} RISK
                    </span>
                  ) : (
                    <span className="text-gold-400 font-bold text-xs">UNEVALUATED</span>
                  )}
                </div>
              </div>

              <button
                onClick={handleShield}
                disabled={shielding || !rawPrompt.trim()}
                className="group flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-gold py-3.5 font-mono text-xs font-extrabold text-grey-950 shadow-glow-gold transition-all active:scale-95 hover:scale-[1.02] disabled:opacity-50 min-h-[44px]"
              >
                {shielding ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-grey-950" />
                    <span>Shielding Data...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 text-grey-950" />
                    <span>🛡 SHIELD & COPY PROMPT</span>
                  </>
                )}
              </button>
            </div>

            {/* STEP 2: 📋 PROTECTED PROMPT & TRUST EXPLAINABILITY */}
            <div className={`flex flex-col space-y-4 rounded-2xl border ${shieldResult?.safetyVerdict === 'REVIEW REQUIRED' ? 'border-amber-500/50 shadow-glow-amber' : 'border-gold-500/40 shadow-glow-gold'} bg-grey-950/70 p-4 sm:p-6 ${
              mobileStep === 2 ? 'block' : 'hidden lg:flex'
            }`}>
              <div className="flex items-center justify-between border-b border-grey-800/80 pb-3">
                <div className="flex items-center space-x-2.5 font-mono text-sm font-bold text-gold-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-grey-950 text-xs font-extrabold">2</span>
                  <span>STEP 2: 📋 PROTECTED OUTPUT</span>
                </div>
                <Copy className="h-4 w-4 text-gold-400" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-semibold text-grey-400">Sanitized Prompt:</span>
                  <div className="flex items-center space-x-2">
                    {shieldResult && (
                      <button
                        onClick={() => {
                          setIsEditingStage2(!isEditingStage2);
                          setStage2ActiveToken(null);
                        }}
                        className="px-2 py-0.5 rounded-lg border border-grey-750 bg-grey-900 hover:border-gold-500/50 text-[10px] text-gold-300 transition-all font-mono active:scale-95"
                      >
                        {isEditingStage2 ? '👁 View Tokens' : '✏️ Edit Directly'}
                      </button>
                    )}
                    {shieldResult && (
                      <span className={`font-bold font-mono ${shieldResult.safetyVerdict === 'REVIEW REQUIRED' ? 'text-amber-400' : 'text-gold-400'}`}>
                        Score: <span className="text-gold-300 text-sm font-extrabold">{animatedScore} / 100</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage 2 Content: Direct Edit Textarea vs Interactive Clickable Token View */}
                <div className="relative min-h-[160px] rounded-xl border border-gold-500/30 bg-grey-900/90 p-3 font-mono text-xs text-gold-200 leading-relaxed overflow-y-auto max-h-[250px]">
                  {shieldResult ? (
                    isEditingStage2 ? (
                      <div className="space-y-2">
                        <textarea
                          ref={stage2TextareaRef}
                          value={shieldResult.protectedPrompt}
                          onChange={(e) => handleStage2DirectEdit(e.target.value)}
                          onSelect={handleStage2TextSelect}
                          rows={5}
                          className="w-full resize-none bg-transparent font-mono text-xs text-gold-200 outline-none leading-relaxed"
                          placeholder="Edit protected prompt..."
                        />
                        {stage2SelectedText && (
                          <div className="flex items-center space-x-1.5 pt-1 border-t border-grey-800 text-[10px] overflow-x-auto">
                            <span className="text-grey-400 font-bold shrink-0">Mask &quot;{stage2SelectedText.substring(0, 15)}...&quot; as:</span>
                            <button
                              onClick={() => handleStage2MaskText('CUSTOM_TERM')}
                              className="px-2 py-0.5 rounded bg-gold-500/20 border border-gold-500/40 text-gold-300 font-bold shrink-0 hover:bg-gold-500/30"
                            >
                              CUSTOM
                            </button>
                            <button
                              onClick={() => handleStage2MaskText('PERSON_NAME')}
                              className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold shrink-0 hover:bg-indigo-500/30"
                            >
                              PERSON
                            </button>
                            <button
                              onClick={() => handleStage2MaskText('COMPANY_SECRET')}
                              className="px-2 py-0.5 rounded bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold shrink-0 hover:bg-pink-500/30"
                            >
                              SECRET
                            </button>
                            <button
                              onClick={() => handleStage2MaskText('API_KEY')}
                              className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold shrink-0 hover:bg-amber-500/30"
                            >
                              API_KEY
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed animate-fade-in-up">
                        {shieldResult.protectedPrompt.split(/(\[\[[A-Z0-9_]+?_\d{3,4}\]\])/g).map((part, index) => {
                          const isToken = /^\[\[[A-Z0-9_]+?_\d{3,4}\]\]$/.test(part);
                          if (isToken) {
                            const originalVal = shieldResult.plaintextMappings?.[part] || 'Protected Value';
                            const isSelected = stage2ActiveToken === part;

                            return (
                              <span key={index} className="relative inline-block my-0.5 mx-0.5">
                                <button
                                  onClick={() => setStage2ActiveToken(isSelected ? null : part)}
                                  className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold transition-all border ${
                                    isSelected
                                      ? 'bg-gold-400 text-grey-950 border-gold-300 shadow-glow-gold scale-105'
                                      : 'bg-gold-500/20 text-gold-300 border-gold-500/40 hover:bg-gold-500/30 hover:border-gold-400'
                                  }`}
                                  title={`Tap to unmask "${originalVal}"`}
                                >
                                  <span>{part}</span>
                                  <span className="text-[8px] opacity-75">▼</span>
                                </button>

                                {/* Token Popover Action */}
                                {isSelected && (
                                  <div className="absolute left-0 top-full mt-1.5 z-40 w-64 rounded-xl border border-gold-500/60 bg-grey-950 p-3 shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-1 text-left">
                                    <div className="border-b border-grey-800 pb-1.5">
                                      <span className="text-[9px] uppercase tracking-wider text-grey-400 font-bold block">Original Text:</span>
                                      <span className="font-mono text-xs text-white font-bold break-all">{originalVal}</span>
                                    </div>

                                    <div className="flex flex-col space-y-1 pt-1">
                                      <button
                                        onClick={() => handleStage2UnmaskToken(part)}
                                        className="flex items-center justify-center space-x-1.5 w-full rounded-lg bg-gradient-gold py-1.5 text-[11px] font-bold text-grey-950 shadow-glow-gold transition-all active:scale-95"
                                      >
                                        <Unlock className="h-3 w-3" />
                                        <span>🔓 Unmask (Restore Plaintext)</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          handleStage2DirectEdit(shieldResult.protectedPrompt.replace(part, ''));
                                          setStage2ActiveToken(null);
                                          showToast(`Removed token ${part}`);
                                        }}
                                        className="flex items-center justify-center space-x-1.5 w-full rounded-lg bg-grey-900 hover:bg-rose-500/20 border border-grey-800 hover:border-rose-500/40 py-1 text-[10px] text-grey-400 hover:text-rose-300 transition-all"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" />
                                        <span>Delete Token</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </span>
                            );
                          }
                          return <span key={index}>{part}</span>;
                        })}
                      </div>
                    )
                  ) : (
                    <div className="flex h-32 items-center justify-center text-center text-grey-500 font-sans text-xs">
                      Run <strong>🛡 Step 1</strong> to generate protected output.
                    </div>
                  )}
                </div>
              </div>

              {shieldResult && (
                <div className="rounded-xl border border-grey-800 bg-grey-900/80 p-3 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-grey-400 font-bold uppercase tracking-wider">TRUST SUMMARY</span>
                    <button
                      onClick={() => setShowExplainModal(true)}
                      className="flex items-center space-x-1 text-[10px] text-gold-400 hover:underline p-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Inspect Multi-Votes</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {Object.entries(groupedEntities).map(([typeName, count]) => (
                      <div key={typeName} className="flex items-center justify-between text-grey-300 text-[11px]">
                        <span className="flex items-center gap-1.5 text-gold-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="capitalize">{typeName}</span>
                        </span>
                        <span className="font-bold text-gold-400">✓ {count} protected</span>
                      </div>
                    ))}
                  </div>

                  {shieldResult.safetyVerdict === 'REVIEW REQUIRED' && (
                    <div className="border-t border-amber-500/30 pt-2 text-[10px] font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>REVIEW REQUIRED: Remaining unresolved secret candidate</span>
                    </div>
                  )}
                </div>
              )}

              {shieldResult && (
                <div className="space-y-2">
                  <button
                    onClick={copyProtectedPrompt}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-gold py-3 font-mono text-xs font-extrabold text-grey-950 shadow-glow-gold transition-all active:scale-95 hover:scale-[1.02] min-h-[44px]"
                  >
                    {copiedProtected ? <Check className="h-4 w-4 text-grey-950" /> : <Copy className="h-4 w-4 text-grey-950" />}
                    <span>{copiedProtected ? 'COPIED TO CLIPBOARD!' : 'Copy Protected Prompt'}</span>
                  </button>

                  <button
                    onClick={() => setMobileStep(3)}
                    className="lg:hidden flex w-full items-center justify-center space-x-1.5 rounded-xl border border-grey-800 bg-grey-900 py-2.5 font-mono text-xs font-semibold text-gold-400 active:scale-95"
                  >
                    <span>Proceed to Step 3 (Reveal)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="pt-1">
                <span className="font-mono text-[10px] text-grey-500 uppercase tracking-wider block mb-1.5">
                  Safe for target AI:
                </span>
                <div className="flex flex-wrap gap-1">
                  {TARGET_AIS.map((ai) => (
                    <span key={ai} className="rounded bg-grey-900 border border-grey-800 px-2 py-0.5 font-mono text-[9px] sm:text-[10px] text-grey-300">
                      {ai}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* STEP 3: 🔓 PASTE RESPONSE & REVEAL */}
            <div className={`flex flex-col space-y-4 rounded-2xl border border-grey-700 bg-grey-950/70 p-4 sm:p-6 shadow-sm ${
              mobileStep === 3 ? 'block' : 'hidden lg:flex'
            }`}>
              <div className="flex items-center justify-between border-b border-grey-800/80 pb-3">
                <div className="flex items-center space-x-2.5 font-mono text-sm font-bold text-gold-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-grey-800 text-gold-400 border border-gold-500/40 text-xs font-extrabold">3</span>
                  <span>STEP 3: 🔓 REVEAL AI OUTPUT</span>
                </div>
                <Unlock className="h-4 w-4 text-gold-300" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <label className="font-semibold text-grey-400">
                    Paste AI reply with [[PLACEHOLDERS]]:
                  </label>
                  {/* 1-Tap Paste Button */}
                  <button
                    onClick={handlePasteFromClipboard}
                    className="flex items-center space-x-1 rounded-lg bg-gold-500/10 border border-gold-500/30 px-2 py-0.5 text-[10px] font-mono text-gold-300 hover:bg-gold-500/20 active:scale-95"
                  >
                    <ClipboardPaste className="h-3 w-3" />
                    <span>Paste</span>
                  </button>
                </div>

                <textarea
                  value={aiResponseInput}
                  onChange={(e) => setAiResponseInput(e.target.value)}
                  rows={4}
                  disabled={purged}
                  className="w-full resize-none rounded-xl border border-grey-800 bg-grey-900/90 p-3 font-mono text-xs text-grey-200 outline-none focus:border-gold-500/50 placeholder:text-grey-600 leading-relaxed"
                  placeholder="Paste AI response here..."
                />

                <button
                  onClick={handleReveal}
                  disabled={revealing || !aiResponseInput.trim() || !shieldResult || purged}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-grey-800 hover:bg-grey-750 border border-gold-500/30 py-3 font-mono text-xs font-extrabold text-gold-300 transition-all disabled:opacity-50 shadow-md active:scale-95 min-h-[44px]"
                >
                  {revealing ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-gold-400" />
                  ) : (
                    <Unlock className="h-4 w-4 text-gold-400" />
                  )}
                  <span>🔓 REVEAL & RESTORE VALUES</span>
                </button>

                {revealError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 font-mono text-xs text-rose-300">
                    <span className="font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Reveal Error:</span>
                    <p className="mt-1 text-[11px] font-sans leading-normal">{revealError}</p>
                  </div>
                )}

                {revealResult && (
                  <div className="relative mt-3 rounded-xl border border-gold-500/40 bg-grey-900/95 p-3 font-mono text-xs text-gold-200 shadow-glow-gold space-y-2">
                    <div className="flex items-center justify-between border-b border-grey-800 pb-2">
                      <span className="text-[10px] text-gold-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Restored {revealResult.restoredCount} items losslessly
                      </span>
                      <button
                        onClick={copyRevealedText}
                        className="flex items-center space-x-1 text-[10px] text-grey-300 hover:text-white p-1"
                      >
                        {copiedRevealed ? <Check className="h-3 w-3 text-gold-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedRevealed ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed animate-fade-in-up text-white">{revealResult.restoredResponse}</p>
                  </div>
                )}
              </div>

              {shieldResult && (
                <div className="border-t border-grey-800/80 pt-3">
                  {purged ? (
                    <span className="text-[10px] text-rose-400 font-mono">
                      ✓ Ephemeral mapping vault purged.
                    </span>
                  ) : (
                    <button
                      onClick={handlePurgeMapping}
                      className="flex items-center space-x-1.5 text-[11px] text-grey-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Purge Session Mapping Vault</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          <div className="rounded-2xl border border-grey-800/80 bg-grey-950 p-3.5 sm:p-4 font-mono text-xs text-grey-300">
            <div className="flex items-center space-x-2 text-gold-400 font-bold mb-1">
              <Lock className="h-4 w-4 shrink-0" />
              <span>PRIVACY LAYER GUARANTEE</span>
            </div>
            <p className="text-[11px] text-grey-400 font-sans leading-relaxed">
              Zero LLM transmission for sensitivity detection. Every detection decision is 100% deterministic, explainable, and local. You decide what AI sees.
            </p>
          </div>
        </>
      )}

      {/* MODAL 1: EXPLAINABLE DETECTOR MODAL (Mobile Bottom Sheet / Desktop Modal) */}
      {showExplainModal && shieldResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md">
          {/* Backdrop dismissal */}
          <div className="fixed inset-0" onClick={() => setShowExplainModal(false)} />

          <div className="relative z-10 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border-t sm:border border-grey-800 bg-grey-950 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden flex justify-center pb-1">
              <div className="h-1 w-12 rounded-full bg-grey-700" />
            </div>

            <div className="flex items-center justify-between border-b border-grey-800 pb-3">
              <div className="flex items-center space-x-2 font-mono text-xs sm:text-sm font-bold text-gold-400">
                <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>MULTI-DETECTOR VOTING DIAGNOSTICS</span>
              </div>
              <button onClick={() => setShowExplainModal(false)} className="text-grey-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-grey-400 font-sans">
              Privacy Layer combines independent detectors (Secret, Dictionary, Regex, Offline NER, Syntactic, Context). Multi-voting breakdown:
            </p>

            <div className="space-y-3 font-mono text-xs">
              {shieldResult.detectedEntities.map((ent, idx) => (
                <div key={idx} className="rounded-xl border border-grey-800 bg-grey-900/90 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gold-400 truncate max-w-[180px]">{ent.placeholder}</span>
                    <span className="rounded bg-grey-800 px-2 py-0.5 text-[10px] text-gold-300 font-bold border border-grey-700">
                      Confidence: {Math.round(ent.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-grey-300">
                    <span className="text-grey-500">Category:</span> {ent.category} • <span className="text-grey-500">Type:</span> {ent.type}
                  </div>
                  <div className="text-[11px] text-grey-400 font-sans">
                    <span className="font-semibold text-grey-300">Reason:</span> {ent.reason}
                  </div>
                  
                  {ent.votes && ent.votes.length > 0 && (
                    <div className="mt-2 border-t border-grey-800/80 pt-2 space-y-1">
                      <span className="text-[10px] text-grey-500 uppercase font-bold">Stage Votes:</span>
                      {ent.votes.map((v, vIdx) => (
                        <div key={vIdx} className="flex items-center justify-between text-[10px] text-grey-300 pl-2 border-l border-gold-500/40">
                          <span className="font-bold text-grey-200">[{v.stage}]</span>
                          <span className="truncate max-w-[150px]">{v.reason}</span>
                          <span className="text-gold-400 font-bold">{Math.round(v.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowExplainModal(false)}
                className="w-full sm:w-auto rounded-xl bg-grey-800 px-4 py-2.5 text-xs font-mono text-white hover:bg-grey-700 active:scale-95"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: USER DICTIONARIES MODAL (Mobile Bottom Sheet / Desktop Modal) */}
      {showDictionaryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md">
          {/* Backdrop dismissal */}
          <div className="fixed inset-0" onClick={() => setShowDictionaryModal(false)} />

          <div className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border-t sm:border border-grey-800 bg-grey-950 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden flex justify-center pb-1">
              <div className="h-1 w-12 rounded-full bg-grey-700" />
            </div>

            <div className="flex items-center justify-between border-b border-grey-800 pb-3">
              <div className="flex items-center space-x-2 font-mono text-xs sm:text-sm font-bold text-white">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gold-400" />
                <span>USER DICTIONARIES</span>
              </div>
              <button onClick={() => setShowDictionaryModal(false)} className="text-grey-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-grey-400 font-sans leading-relaxed">
              Register internal Projects, Repositories, Employees, or Products to shield with 100% confidence across all prompts.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={dictCategory}
                  onChange={(e) => setDictCategory(e.target.value)}
                  className="rounded-xl border border-grey-800 bg-grey-900 px-3 py-2 text-xs text-grey-200 outline-none"
                >
                  <option value="PROJECT">Project</option>
                  <option value="REPOSITORY">Repository</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="COMPANY">Company</option>
                  <option value="PRODUCT">Product</option>
                </select>

                <input
                  type="text"
                  value={dictTerm}
                  onChange={(e) => setDictTerm(e.target.value)}
                  placeholder="e.g. Project Titan, MOAA..."
                  className="flex-1 rounded-xl border border-grey-800 bg-grey-900 px-3 py-2 text-xs text-grey-200 outline-none focus:border-gold-500/50"
                />

                <button
                  onClick={handleAddDictTerm}
                  className="rounded-xl bg-gold-500 px-3 py-2 font-bold text-grey-950 hover:bg-gold-400 shadow-glow-gold active:scale-95"
                >
                  + Register
                </button>
              </div>

              <div className="mt-3 max-h-48 overflow-y-auto space-y-1 rounded-xl border border-grey-800 bg-grey-900/60 p-3">
                <span className="text-[10px] text-grey-500 uppercase font-bold block mb-2">Registered Terms ({customTerms.length}):</span>
                {customTerms.length === 0 ? (
                  <span className="text-grey-500 text-xs italic">No custom terms registered yet.</span>
                ) : (
                  customTerms.map((term, i) => (
                    <div key={i} className="flex items-center justify-between text-grey-300 text-xs py-1 border-b border-grey-800/50">
                      <span>✓ {term}</span>
                      <button
                        onClick={() => setCustomTerms(customTerms.filter((t) => t !== term))}
                        className="text-rose-400 hover:text-rose-300 text-[10px] p-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="w-full sm:w-auto rounded-xl bg-gradient-gold px-4 py-2.5 font-mono text-xs font-bold text-grey-950 shadow-glow-gold active:scale-95"
              >
                Save & Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

