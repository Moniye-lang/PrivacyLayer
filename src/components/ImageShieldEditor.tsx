'use client';

import React, { useState, useRef, useEffect, PointerEvent } from 'react';
import {
  Upload,
  Shield,
  Eye,
  Trash2,
  AlertTriangle,
  Download,
  Check,
  RefreshCw,
  Lock,
  Sparkles,
  Layers,
  ClipboardPaste,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { EntityType, ImageRect, ImageSelection, ShieldImageResponsePayload } from '@/types';
import { shieldImage } from '@/lib/engine/image/imageShieldEngine';
import { imageRevealEngineInstance } from '@/lib/engine/image/imageRevealEngine';
import { autoDetectImageSensitiveRegions } from '@/lib/engine/image/autoImageShieldClient';
import { getImageGeometry, pointerToNativeCoords, nativeToDisplayStyle, getAbbreviatedPlaceholder } from '@/lib/engine/image/imageGeometry';

const COMMON_ENTITY_TYPES: { type: EntityType; label: string; color: string }[] = [
  { type: 'PERSON_NAME', label: 'PERSON', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { type: 'EMAIL_ADDRESS', label: 'EMAIL', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { type: 'PHONE_NUMBER', label: 'PHONE', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { type: 'API_KEY', label: 'API_KEY', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { type: 'PASSWORD', label: 'PASSWORD', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { type: 'CONNECTION_STRING', label: 'CONNECTION_STRING', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { type: 'COMPANY_SECRET', label: 'SECRET', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  { type: 'ORGANIZATION', label: 'COMPANY', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { type: 'PROJECT_CODENAME', label: 'PROJECT', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { type: 'CUSTOM_TERM', label: 'CUSTOM', color: 'bg-slate-700 text-slate-200 border-slate-600' },
];

// Helper to create crisp sample SVG mock images for instant testing
const createSampleImage = (type: 'credentials' | 'medical' | 'financial'): string => {
  let content = '';
  if (type === 'credentials') {
    content = `
      <rect width="900" height="550" fill="#0d1117" rx="16"/>
      <rect x="20" y="20" width="860" height="40" fill="#161b22" rx="8"/>
      <circle cx="45" cy="40" r="6" fill="#ff5f56"/>
      <circle cx="65" cy="40" r="6" fill="#ffbd2e"/>
      <circle cx="85" cy="40" r="6" fill="#27c93f"/>
      <text x="120" y="44" fill="#8b949e" font-family="monospace" font-size="13">server-config.env — confidential</text>
      
      <text x="50" y="110" fill="#58a6ff" font-family="monospace" font-size="16" font-weight="bold"># Production Infrastructure Credentials</text>
      <text x="50" y="160" fill="#7ee787" font-family="monospace" font-size="15">AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"</text>
      <text x="50" y="210" fill="#7ee787" font-family="monospace" font-size="15">STRIPE_SECRET_KEY="sk_test_51MzMockSecretKeyForDemoTesting123456789"</text>
      <text x="50" y="260" fill="#7ee787" font-family="monospace" font-size="15">DB_CONNECTION="mongodb+srv://admin:SecurePass99@prod-db.corp.net/main"</text>
      <text x="50" y="310" fill="#7ee787" font-family="monospace" font-size="15">GITHUB_AUTH_TOKEN="ghp_MockSecretToken9876543210abcdefghijklmn"</text>
      <text x="50" y="360" fill="#7ee787" font-family="monospace" font-size="15">SUPPORT_LEAD="David Miller (david.miller@enterprise.com)"</text>
      <text x="50" y="410" fill="#7ee787" font-family="monospace" font-size="15">EMERGENCY_HOTLINE="+1-555-839-2019"</text>
      <text x="50" y="470" fill="#8b949e" font-family="monospace" font-size="13"># Confidential: Internal deployment pipeline only</text>
    `;
  } else if (type === 'medical') {
    content = `
      <rect width="900" height="550" fill="#ffffff" rx="16"/>
      <rect x="0" y="0" width="900" height="80" fill="#0f172a"/>
      <text x="40" y="50" fill="#38bdf8" font-family="sans-serif" font-size="22" font-weight="bold">METROPOLITAN HEALTHCARE CLINIC</text>
      <text x="650" y="50" fill="#94a3b8" font-family="sans-serif" font-size="14">CONFIDENTIAL PHI</text>

      <text x="40" y="130" fill="#334155" font-family="sans-serif" font-size="16"><b>Patient Name:</b> Sarah Jenkins</text>
      <text x="450" y="130" fill="#334155" font-family="sans-serif" font-size="16"><b>Date of Birth:</b> 04/18/1984</text>
      <text x="40" y="180" fill="#334155" font-family="sans-serif" font-size="16"><b>SSN:</b> 982-44-1029</text>
      <text x="450" y="180" fill="#334155" font-family="sans-serif" font-size="16"><b>Phone:</b> (555) 234-5678</text>
      <text x="40" y="230" fill="#334155" font-family="sans-serif" font-size="16"><b>Email:</b> sarah.jenkins@email.com</text>
      <text x="450" y="230" fill="#334155" font-family="sans-serif" font-size="16"><b>Medical Record #:</b> MRN-902194</text>

      <rect x="40" y="270" width="820" height="2" fill="#e2e8f0"/>
      <text x="40" y="310" fill="#0f172a" font-family="sans-serif" font-size="16" font-weight="bold">Physician Clinical Assessment:</text>
      <text x="40" y="350" fill="#475569" font-family="sans-serif" font-size="14">Patient diagnosed with acute cardiac arrhythmia. Prescribed 50mg Metoprolol daily.</text>
      <text x="40" y="380" fill="#475569" font-family="sans-serif" font-size="14">Attending Physician: Dr. Robert Vance, MD | License: #MD-8839201</text>
      <rect x="40" y="430" width="820" height="70" fill="#f8fafc" rx="8" stroke="#cbd5e1"/>
      <text x="60" y="470" fill="#64748b" font-family="sans-serif" font-size="13">WARNING: Protected Health Information subject to HIPAA Title 45 CFR.</text>
    `;
  } else {
    content = `
      <rect width="900" height="550" fill="#090d16" rx="16"/>
      <rect x="30" y="30" width="840" height="490" fill="#111827" rx="12" stroke="#374151"/>
      <text x="60" y="80" fill="#f59e0b" font-family="sans-serif" font-size="20" font-weight="bold">ENTERPRISE INVOICE & PAYMENT VOUCHER</text>
      <text x="60" y="130" fill="#9ca3af" font-family="sans-serif" font-size="14">Account Holder: Marcus Aurelius Corp</text>
      <text x="500" y="130" fill="#9ca3af" font-family="sans-serif" font-size="14">Tax ID / EIN: 84-9201948</text>
      <text x="60" y="180" fill="#9ca3af" font-family="sans-serif" font-size="14">Billing Contact: marcus@aurelius-enterprises.com</text>
      <text x="500" y="180" fill="#9ca3af" font-family="sans-serif" font-size="14">Routing #: 021000021</text>
      <text x="60" y="230" fill="#9ca3af" font-family="sans-serif" font-size="14">Bank Account: 987654321048</text>
      <text x="500" y="230" fill="#9ca3af" font-family="sans-serif" font-size="14">Credit Card: 4532 •••• •••• 8849</text>
      <rect x="60" y="270" width="780" height="150" fill="#1f2937" rx="8"/>
      <text x="80" y="310" fill="#e5e7eb" font-family="monospace" font-size="14">Item: Project Titan Cloud Hosting License (Enterprise Q3)</text>
      <text x="80" y="350" fill="#e5e7eb" font-family="monospace" font-size="14">Amount Due: $24,500.00 USD</text>
      <text x="80" y="390" fill="#10b981" font-family="monospace" font-size="14">Payment Status: PAID via Corporate Visa ending in 8849</text>
    `;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="550" viewBox="0 0 900 550">${content}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const ImageShieldEditor: React.FC = () => {
  // 1. Dynamic Image State
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [imageNaturalDim, setImageNaturalDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayedDim, setDisplayedDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  // 2. Big Canvas View Controls (Zoom & Full Width Expansion)
  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // 3. Dynamic Selections State
  const [selections, setSelections] = useState<ImageSelection[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<ImageRect | null>(null);

  // 4. Pending Selection Picker State
  const [pendingRect, setPendingRect] = useState<ImageRect | null>(null);
  const [selectedType, setSelectedType] = useState<EntityType>('CUSTOM_TERM');
  const [customLabel, setCustomLabel] = useState<string>('');

  // 5. Processing & Result State
  const [isShielding, setIsShielding] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [shieldedResult, setShieldedResult] = useState<ShieldImageResponsePayload | null>(null);
  const [restoredImageSrc, setRestoredImageSrc] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Global Clipboard Paste Listener (Ctrl+V anywhere in window to paste image)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            loadImageFromFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [sourceImageUrl]);

  // Responsive ResizeObserver for dynamic overlay tracking
  useEffect(() => {
    if (!imgRef.current) return;

    const updateDimensions = () => {
      if (imgRef.current) {
        setDisplayedDim({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [sourceImageUrl, isImageLoaded, zoomLevel, isExpandedView]);

  const loadImageFromFile = (file: File) => {
    if (sourceImageUrl && sourceImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(sourceImageUrl);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSourceImage(file);
      setSourceImageUrl(dataUrl);
      setSelections([]);
      setShieldedResult(null);
      setRestoredImageSrc(null);
      setError(null);
      setIsImageLoaded(false);
      setZoomLevel(100);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFromFile(file);
  };

  const loadPresetSample = (type: 'credentials' | 'medical' | 'financial') => {
    const sampleUrl = createSampleImage(type);
    setSourceImage(null);
    setSourceImageUrl(sampleUrl);
    setSelections([]);
    setShieldedResult(null);
    setRestoredImageSrc(null);
    setError(null);
    setIsImageLoaded(false);
    setZoomLevel(100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFromFile(file);
    }
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      const natW = imgRef.current.naturalWidth;
      const natH = imgRef.current.naturalHeight;
      setImageNaturalDim({ width: natW, height: natH });
      setDisplayedDim({ width: imgRef.current.clientWidth, height: imgRef.current.clientHeight });
      setIsImageLoaded(true);
    }
  };


  // Convert client pointer position to native image resolution using single geometry helper
  const getNativeImageCoords = (e: PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const geom = getImageGeometry(imgRef.current);
    console.log('[IMAGE GEOMETRY]', geom);
    return pointerToNativeCoords(e.clientX, e.clientY, imgRef.current);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!sourceImageUrl || !isImageLoaded) return;
    const coords = getNativeImageCoords(e);
    setStartPoint(coords);
    setIsDrawing(true);
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
    const coords = getNativeImageCoords(e);

    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const width = Math.abs(coords.x - startPoint.x);
    const height = Math.abs(coords.y - startPoint.y);

    setCurrentRect({ x, y, width, height });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !startPoint) return;
    setIsDrawing(false);

    let committedRect: ImageRect;

    if (currentRect && (currentRect.width > 8 || currentRect.height > 8)) {
      // 1. Drag-to-Mask: User dragged a custom boundary box
      committedRect = { ...currentRect };
    } else {
      // 2. Tap-to-Mask: Smart 1-Tap Line & Word Snapping (Ideal for mobile screens)
      const natW = imageNaturalDim.width || 800;
      const natH = imageNaturalDim.height || 600;

      // Check if tap fell inside an existing selection (tap to delete)
      const tappedExisting = selections.find(
        (s) =>
          startPoint.x >= s.rect.x &&
          startPoint.x <= s.rect.x + s.rect.width &&
          startPoint.y >= s.rect.y &&
          startPoint.y <= s.rect.y + s.rect.height
      );

      if (tappedExisting) {
        removeSelection(tappedExisting.id);
        setCurrentRect(null);
        setStartPoint(null);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(10); } catch {}
        }
        return;
      }

      // Compute smart line-proportional box centered on tap point
      const smartW = Math.max(120, Math.min(340, Math.round(natW * 0.28)));
      const smartH = Math.max(26, Math.min(48, Math.round(natH * 0.055)));

      const targetX = Math.max(0, Math.min(natW - smartW, Math.round(startPoint.x - smartW / 2)));
      const targetY = Math.max(0, Math.min(natH - smartH, Math.round(startPoint.y - smartH / 2)));

      committedRect = {
        x: targetX,
        y: targetY,
        width: smartW,
        height: smartH,
      };
    }

    let typeKey: string;
    if (selectedType === 'CUSTOM_TERM') {
      const cleanCustom = customLabel.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      typeKey = cleanCustom || 'CUSTOM_TERM';
    } else {
      typeKey = selectedType;
    }
    const existingCount = selections.filter((s) => s.entityType === selectedType).length;
    const counterStr = String(existingCount + 1).padStart(3, '0');
    const placeholder = `[[${typeKey}_${counterStr}]]`;

    const newSelection: ImageSelection = {
      id: `sel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rect: committedRect,
      entityType: selectedType,
      customLabel: customLabel.trim() || undefined,
      placeholder,
      evidence: 'Manual user selection (Tap-to-Mask)',
      priority: 100,
    };

    setSelections((prev) => [...prev, newSelection]);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(15); } catch {}
    }

    setCurrentRect(null);
    setStartPoint(null);
  };

  const confirmSelection = () => {
    if (!pendingRect) return;

    let typeKey: string;
    if (selectedType === 'CUSTOM_TERM') {
      const cleanCustom = customLabel.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      typeKey = cleanCustom || 'CUSTOM_TERM';
    } else {
      typeKey = selectedType;
    }
    const existingCount = selections.filter((s) => s.entityType === selectedType).length;
    const counterStr = String(existingCount + 1).padStart(3, '0');
    const placeholder = `[[${typeKey}_${counterStr}]]`;

    const newSelection: ImageSelection = {
      id: `sel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rect: pendingRect,
      entityType: selectedType,
      customLabel: customLabel.trim() || undefined,
      placeholder,
      evidence: 'Manual user selection',
      priority: 100,
    };

    console.log(`[MANUAL SELECTION GEOMETRY]
MANUAL:
x=${pendingRect.x}
y=${pendingRect.y}
width=${pendingRect.width}
height=${pendingRect.height}

IMAGE:
naturalWidth=${imageNaturalDim.width}
naturalHeight=${imageNaturalDim.height}
displayWidth=${displayedDim.width}
displayHeight=${displayedDim.height}
`);

    setSelections((prev) => [...prev, newSelection]);
    setPendingRect(null);
    setCustomLabel('');
  };

  const removeSelection = (id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAutoDetect = async () => {
    if (!sourceImageUrl) return;
    if (imgRef.current) {
      console.log('=== [UI AUTO-DETECT INVOCATION TRACE] ===');
      console.log('[UI DIAGNOSTIC] Image Ref Element:', {
        naturalWidth: imgRef.current.naturalWidth,
        naturalHeight: imgRef.current.naturalHeight,
        clientWidth: imgRef.current.clientWidth,
        clientHeight: imgRef.current.clientHeight,
        srcLength: sourceImageUrl.length,
      });
    }
    setIsAutoDetecting(true);
    setError(null);
    try {
      const autoSelections = await autoDetectImageSensitiveRegions(sourceImageUrl);
      if (autoSelections.length === 0) {
        setError('No sensitive text regions detected in image.');
      } else {
        setSelections(autoSelections);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : err?.message || err?.error || 'Failed to detect sensitive regions');
      setError('Error auto-detecting sensitive regions: ' + msg);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleAutoShield = async () => {
    if (!sourceImageUrl || isAutoDetecting || isShielding) return;
    setIsAutoDetecting(true);
    setError(null);
    try {
      const autoSelections = await autoDetectImageSensitiveRegions(sourceImageUrl);
      if (autoSelections.length === 0) {
        setError('No sensitive text regions detected in image.');
        setIsAutoDetecting(false);
        return;
      }
      setSelections(autoSelections);
      setIsAutoDetecting(false);

      setIsShielding(true);
      const currentDisplayed = imgRef.current
        ? { width: imgRef.current.clientWidth, height: imgRef.current.clientHeight }
        : displayedDim;

      const selectionsWithDim = autoSelections.map((s) => ({
        ...s,
        displayedDim: s.displayedDim || currentDisplayed,
      }));

      const result = await shieldImage({
        imageDataUrl: sourceImageUrl,
        selections: selectionsWithDim,
      });
      setShieldedResult(result);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : err?.message || err?.error || 'Failed to auto-shield image');
      setError('Auto-Shield failed: ' + msg);
    } finally {
      setIsAutoDetecting(false);
      setIsShielding(false);
    }
  };

  const handleShield = async () => {
    if (!sourceImageUrl || selections.length === 0 || isShielding) return;

    console.log('[SVG] shield button clicked');
    console.log('[SVG] native dimensions:', imageNaturalDim);
    console.log('[SVG] regions:', selections);

    setIsShielding(true);
    setError(null);
    try {
      const currentDisplayed = imgRef.current
        ? { width: imgRef.current.clientWidth, height: imgRef.current.clientHeight }
        : displayedDim;

      const selectionsWithDim = selections.map((s) => ({
        ...s,
        displayedDim: s.displayedDim || currentDisplayed,
      }));

      const result = await shieldImage({
        imageDataUrl: sourceImageUrl,
        selections: selectionsWithDim,
      });

      console.log('[SVG] result assigned:', result);
      setShieldedResult(result);
    } catch (err: any) {
      console.error('[SVG] Error in handleShield:', err);
      const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : err?.message || err?.error || 'Failed to generate shielded image');
      setError('Error generating shielded image: ' + msg);
    } finally {
      setIsShielding(false);
    }
  };

  const handleReveal = async () => {
    if (!shieldedResult) return;
    setIsRevealing(true);
    setError(null);
    try {
      const result = await imageRevealEngineInstance.restore({
        sessionId: shieldedResult.sessionId,
        shieldedImageDataUrl: shieldedResult.shieldedImageDataUrl,
      });
      setRestoredImageSrc(result.restoredImageDataUrl);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : err?.message || err?.error || 'Failed to restore image');
      setError('Error revealing image: ' + msg);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleReset = () => {
    if (sourceImageUrl && sourceImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(sourceImageUrl);
    }
    setSourceImage(null);
    setSourceImageUrl(null);
    setSelections([]);
    setShieldedResult(null);
    setRestoredImageSrc(null);
    setError(null);
    setIsImageLoaded(false);
    setImageNaturalDim({ width: 0, height: 0 });
    setDisplayedDim({ width: 0, height: 0 });
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  // Dynamic Scale Ratios for overlay rendering
  const displayScaleX = displayedDim.width > 0 && imageNaturalDim.width > 0
    ? displayedDim.width / imageNaturalDim.width
    : 1;
  const displayScaleY = displayedDim.height > 0 && imageNaturalDim.height > 0
    ? displayedDim.height / imageNaturalDim.height
    : 1;

  return (
    <div className="flex flex-col space-y-8">
      {/* Privacy Warning Header */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed font-sans">
            <span className="font-semibold font-mono text-amber-300">USER PRIVACY WARNING: </span>
            Review your shielded image before sending. Privacy Layer may miss sensitive information or incorrectly identify non-sensitive content. The original sensitive image data is encrypted in your local session vault.
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 font-mono text-xs text-rose-300">
          <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Error:</span>
          <p className="mt-1 text-[11px] font-sans">{error}</p>
        </div>
      )}

      {!sourceImageUrl ? (
        /* WORKFLOW STATE 1: UPLOAD & PRESET SELECTION VIEW */
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`glass-panel relative flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border-2 border-dashed p-6 sm:p-12 text-center transition-all ${
              isDraggingFile
                ? 'border-gold-400 bg-gold-500/15 shadow-glow-gold scale-[1.01]'
                : 'border-grey-700/80 hover:border-gold-500/50 bg-grey-950/60'
            }`}
          >
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
              onChange={handleFileUpload}
              className="absolute inset-0 cursor-pointer opacity-0 z-10"
            />
            <div className="flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/30 shadow-glow-gold mb-3 sm:mb-4">
              <Upload className="h-7 w-7 sm:h-9 sm:w-9" />
            </div>
            <h3 className="font-mono text-base sm:text-xl font-bold text-white">Upload, Drag & Drop, or Paste Image</h3>
            <p className="mt-1 max-w-md text-xs text-grey-400 font-sans leading-relaxed">
              Drag & drop screenshot or document image, press <kbd className="rounded bg-grey-800 px-1.5 py-0.5 font-mono text-[11px] text-gold-300 border border-grey-700">Ctrl+V</kbd> to paste from clipboard, or click to browse.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 z-20">
              <label className="cursor-pointer rounded-xl bg-gradient-gold px-5 py-2.5 font-mono text-xs font-bold text-grey-950 shadow-glow-gold transition-all hover:scale-105 active:scale-95 flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Select Image File</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const items = await navigator.clipboard.read();
                    for (const item of items) {
                      const imageType = item.types.find((t) => t.startsWith('image/'));
                      if (imageType) {
                        const blob = await item.getType(imageType);
                        const file = new File([blob], 'pasted_image.png', { type: imageType });
                        loadImageFromFile(file);
                        return;
                      }
                    }
                    setError('No image found in clipboard. Copy an image or screenshot first.');
                  } catch (err) {
                    setError('Clipboard read access denied. Use Ctrl+V or file selector.');
                  }
                }}
                className="rounded-xl border border-grey-700 bg-grey-900 px-4 py-2.5 font-mono text-xs font-bold text-grey-300 hover:border-gold-500/50 hover:text-white transition-all active:scale-95 flex items-center space-x-1.5"
              >
                <ClipboardPaste className="h-4 w-4 text-gold-400" />
                <span>Paste from Clipboard</span>
              </button>
            </div>
          </div>

          {/* Quick Instant Demo Presets */}
          <div className="glass-panel p-5 rounded-2xl border border-grey-800 bg-grey-950/80 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-gold-400">
              <Sparkles className="h-4 w-4" />
              <span>OR TEST INSTANTLY WITH A SAMPLE DOCUMENT:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => loadPresetSample('credentials')}
                className="flex flex-col items-start p-3.5 rounded-xl border border-grey-800 bg-grey-900/90 hover:border-gold-500/50 text-left transition-all group"
              >
                <div className="flex items-center space-x-2 mb-1 text-xs font-mono font-bold text-white group-hover:text-gold-300">
                  <Lock className="h-3.5 w-3.5 text-gold-400" />
                  <span>Server .env & Secrets</span>
                </div>
                <p className="text-[11px] text-grey-400 font-sans">
                  Contains AWS keys, Stripe secret, MongoDB URI, and phone.
                </p>
              </button>

              <button
                onClick={() => loadPresetSample('medical')}
                className="flex flex-col items-start p-3.5 rounded-xl border border-grey-800 bg-grey-900/90 hover:border-gold-500/50 text-left transition-all group"
              >
                <div className="flex items-center space-x-2 mb-1 text-xs font-mono font-bold text-white group-hover:text-gold-300">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Medical & Patient PHI</span>
                </div>
                <p className="text-[11px] text-grey-400 font-sans">
                  Contains Patient SSN, MRN, clinical diagnosis, and contact.
                </p>
              </button>

              <button
                onClick={() => loadPresetSample('financial')}
                className="flex flex-col items-start p-3.5 rounded-xl border border-grey-800 bg-grey-900/90 hover:border-gold-500/50 text-left transition-all group"
              >
                <div className="flex items-center space-x-2 mb-1 text-xs font-mono font-bold text-white group-hover:text-gold-300">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Invoice & Credit Card</span>
                </div>
                <p className="text-[11px] text-grey-400 font-sans">
                  Contains Corporate EIN, bank account, routing, and card number.
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : isShielding ? (
        /* WORKFLOW STATE 2: SHIELDING PROCESSING VIEW */
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-glow-gold flex flex-col items-center justify-center min-h-[300px]">
          <RefreshCw className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-gold-400 mb-2" />
          <h3 className="font-mono text-base sm:text-lg font-bold text-white">Generating Shielded PNG Image...</h3>
          <p className="text-xs text-grey-400 font-sans max-w-sm">
            Compositing native SVG structures, obscuring sensitive pixels, and exporting a rasterized PNG image buffer.
          </p>
        </div>
      ) : shieldedResult ? (
        /* WORKFLOW STATE 3: SHIELDED RESULT VIEW */
        <div data-testid="shielded-image-result" className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-gold-500/40 space-y-5 sm:space-y-6 shadow-glow-gold">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-grey-800 pb-4 gap-4">
            <div>
              <span className="font-mono text-xs font-bold text-gold-400 uppercase tracking-widest flex items-center gap-1.5">
                <Check className="h-4 w-4 text-gold-400" />
                SHIELDED IMAGE READY
              </span>
              <h3 className="font-mono text-base sm:text-xl font-extrabold text-white mt-1">
                Safe to Share with AI (ChatGPT / Claude / Gemini)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => downloadImage(shieldedResult.shieldedImageDataUrl, `shielded_${shieldedResult.documentVersionId}.png`)}
                className="flex items-center space-x-1.5 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3 sm:px-4 py-2 font-mono text-xs font-semibold text-gold-400 hover:bg-gold-500/20 active:scale-95 transition-all shadow-glow-gold"
              >
                <Download className="h-4 w-4" />
                <span>Download PNG</span>
              </button>
              <button
                onClick={handleReveal}
                disabled={isRevealing}
                className="flex items-center space-x-1.5 rounded-xl border border-grey-700 bg-grey-800 px-3 sm:px-4 py-2 font-mono text-xs font-semibold text-gold-300 hover:bg-grey-750 active:scale-95 transition-all disabled:opacity-50"
              >
                <Eye className="h-4 w-4 text-gold-400" />
                <span>{isRevealing ? 'Restoring...' : 'Test Reveal'}</span>
              </button>
              <button
                onClick={() => setShieldedResult(null)}
                className="flex items-center space-x-1.5 rounded-xl border border-grey-700 bg-grey-900 px-3 py-2 font-mono text-xs text-grey-300 hover:bg-grey-800 active:scale-95 transition-all"
              >
                <span>Edit Regions</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center space-x-1.5 rounded-xl border border-grey-800 px-3 py-2 font-mono text-xs text-grey-500 hover:text-white active:scale-95 transition-all"
              >
                <span>New Image</span>
              </button>
            </div>
          </div>

          {/* Standalone Composited Shielded PNG Output View (Expansive Canvas) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-gold-400 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gold-400" />
                Generated Shielded Image (Self-Contained PNG Buffer)
              </span>
              <span className="text-grey-500 text-[10px] sm:text-xs">{shieldedResult.entitiesCount} region(s) masked ({imageNaturalDim.width} x {imageNaturalDim.height}px)</span>
            </div>
            <div className="rounded-2xl border border-gold-500/40 bg-grey-950 p-3 sm:p-6 flex justify-center shadow-glow-gold overflow-auto min-h-[400px] max-h-[80vh]">
              <img
                src={shieldedResult.shieldedImageDataUrl}
                alt="Shielded image"
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>

          {/* Restored Image Preview if Reveal Executed */}
          {restoredImageSrc && (
            <div className="pt-4 sm:pt-6 border-t border-grey-800 space-y-3">
              <span className="font-mono text-xs font-semibold text-gold-300 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gold-400" />
                Losslessly Restored Image
              </span>
              <div className="rounded-2xl border border-grey-700 bg-grey-950 p-3 sm:p-6 flex justify-center overflow-auto min-h-[300px] max-h-[80vh]">
                <img src={restoredImageSrc} alt="Restored" className="max-h-[75vh] w-auto object-contain rounded-xl" />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* WORKFLOW STATE 4: INTERACTIVE CANVAS EDITOR VIEW (BIG & EXPANDABLE) */
        <div className={`grid grid-cols-1 gap-6 ${isExpandedView ? 'lg:grid-cols-12' : 'lg:grid-cols-12'}`}>
          {/* Main Interactive Canvas Viewer (Expands up to full width in expanded view) */}
          <div className={`${isExpandedView ? 'lg:col-span-12' : 'lg:col-span-8'} flex flex-col space-y-4`}>
            <div className="glass-panel relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-4 border-grey-800">
              {/* Canvas Header Controls: Zoom, Auto-Detect, Fullscreen Toggle */}
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-grey-800 mb-3 font-mono text-xs text-grey-400 gap-2">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-gold-400" />
                  <span className="font-semibold text-grey-200">
                    Canvas ({imageNaturalDim.width} x {imageNaturalDim.height}px)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-1 rounded-lg bg-grey-900 border border-grey-800 px-1 py-0.5">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                      className="p-1 rounded hover:bg-grey-800 text-grey-400 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-1 text-[10px] font-mono text-grey-300 min-w-[36px] text-center">
                      {zoomLevel}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                      className="p-1 rounded hover:bg-grey-800 text-grey-400 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    {zoomLevel !== 100 && (
                      <button
                        onClick={() => setZoomLevel(100)}
                        className="text-[9px] px-1 text-gold-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Expand / Minimize Toggle */}
                  <button
                    onClick={() => setIsExpandedView(!isExpandedView)}
                    className="flex items-center space-x-1 rounded-lg bg-grey-900 border border-grey-800 px-2.5 py-1 text-xs text-grey-300 hover:text-white transition-all"
                    title={isExpandedView ? 'Show Sidebar' : 'Expand Full Width'}
                  >
                    {isExpandedView ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{isExpandedView ? 'Standard View' : 'Wide View'}</span>
                  </button>

                  {/* Auto-Detect */}
                  <button
                    onClick={handleAutoDetect}
                    disabled={isAutoDetecting || isShielding || !isImageLoaded}
                    className="flex items-center space-x-1.5 rounded-lg bg-gold-500/15 px-2.5 sm:px-3 py-1 text-xs font-bold text-gold-400 border border-gold-500/40 hover:bg-gold-500/25 active:scale-95 transition-all disabled:opacity-50 shadow-glow-gold whitespace-nowrap"
                  >
                    {isAutoDetecting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-gold-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                    )}
                    <span>{isAutoDetecting ? 'Scanning...' : '⚡ AUTO-DETECT'}</span>
                  </button>

                  {/* 1-Click Auto-Shield */}
                  <button
                    onClick={handleAutoShield}
                    disabled={isAutoDetecting || isShielding || !isImageLoaded}
                    className="flex items-center space-x-1.5 rounded-lg bg-gradient-gold px-2.5 sm:px-3 py-1 text-xs font-extrabold text-grey-950 shadow-glow-gold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>AUTO-SHIELD</span>
                  </button>
                </div>
              </div>

              {/* Active Drawing Tool Category Palette */}
              <div className="flex flex-col space-y-2 pb-2.5 mb-2 border-b border-grey-850 font-mono text-[11px]">
                <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-grey-400 font-bold shrink-0 text-[10px] uppercase tracking-wider pl-1">
                    Active Tool:
                  </span>
                  {COMMON_ENTITY_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setSelectedType(t.type)}
                      className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 font-bold text-[11px] ${
                        selectedType === t.type
                          ? 'border-gold-500 bg-gold-500/20 text-gold-300 shadow-glow-gold scale-105'
                          : 'border-grey-800 bg-grey-900/60 text-grey-400 hover:border-grey-700 hover:text-grey-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Inline Custom Label Input when CUSTOM is selected */}
                {selectedType === 'CUSTOM_TERM' && (
                  <div className="flex items-center space-x-2 bg-grey-900/90 border border-gold-500/40 rounded-xl px-3 py-1.5 animate-in fade-in slide-in-from-top-1">
                    <span className="text-[10px] font-bold text-gold-400 shrink-0">Custom Token Label:</span>
                    <input
                      type="text"
                      placeholder="e.g. MONGO_URI, STRIPE_SECRET, TOKEN (optional)"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-gold-200 placeholder:text-grey-600"
                    />
                    {customLabel && (
                      <span className="font-mono text-[10px] text-gold-400/80 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20 shrink-0">
                        Preview: [[{customLabel.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')}_001]]
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Big Responsive Image Canvas Container */}
              <div className={`flex justify-center bg-grey-950/90 rounded-xl sm:rounded-2xl p-3 sm:p-6 select-none overflow-auto min-h-[450px] ${
                isExpandedView ? 'max-h-[85vh]' : 'max-h-[75vh]'
              }`}>
                <div
                  ref={containerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="relative inline-block cursor-crosshair select-none touch-none"
                >
                  <img
                    ref={imgRef}
                    src={sourceImageUrl}
                    alt="Original workspace"
                    onLoad={handleImageLoad}
                    className="max-h-[75vh] w-auto block object-contain pointer-events-none rounded-xl shadow-2xl"
                  />

                  {/* Confirmed Selections Dynamic Overlay */}
                  {isImageLoaded &&
                    selections.map((sel) => {
                      const style = nativeToDisplayStyle(sel.rect, imgRef.current);
                      const displayW = parseInt(String(style.width || '100'), 10);
                      const displayLabel = displayW < 95
                        ? getAbbreviatedPlaceholder(sel.placeholder, true)
                        : sel.placeholder;

                      return (
                        <div
                          key={sel.id}
                          style={style}
                          className="absolute border-2 border-gold-500/80 bg-gold-500/20 rounded-sm flex items-center justify-center group pointer-events-auto overflow-hidden cursor-pointer shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelection(sel.id);
                          }}
                          title="Tap or click to remove redacted region"
                        >
                          <span className="font-mono text-[10px] leading-none font-bold text-gold-300 bg-grey-950/95 px-1.5 py-0.5 rounded border border-gold-500/40 truncate max-w-full">
                            {displayLabel}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelection(sel.id);
                            }}
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] shadow-md"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}

                  {/* Currently Drawing Rect Overlay */}
                  {isImageLoaded && currentRect && (
                    <div
                      style={nativeToDisplayStyle(currentRect, imgRef.current)}
                      className="absolute border-2 border-dashed border-gold-400 bg-gold-400/20 rounded pointer-events-none"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Bottom Actions (Spans 4 columns or 12 in expanded mode) */}
          <div className={`${isExpandedView ? 'lg:col-span-12' : 'lg:col-span-4'} flex flex-col space-y-5`}>
            {/* Pending Selection Entity Type Picker */}
            {pendingRect && (
              <div className="glass-panel p-5 rounded-2xl sm:rounded-3xl border-gold-500/50 space-y-4 shadow-glow-gold">
                <h4 className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold-400" />
                  Assign Entity Type
                </h4>
                <p className="text-xs text-grey-400 font-sans">
                  Select entity placeholder for region ({pendingRect.width} x {pendingRect.height}px):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {COMMON_ENTITY_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setSelectedType(t.type)}
                      className={`rounded-xl border p-2 text-left font-mono text-[11px] transition-all ${
                        selectedType === t.type
                          ? 'border-gold-500 bg-gold-500/20 text-gold-300 font-bold shadow-glow-gold'
                          : 'border-grey-800 bg-grey-900/60 text-grey-400 hover:border-grey-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {selectedType === 'CUSTOM_TERM' && (
                  <input
                    type="text"
                    placeholder="Enter custom label (e.g. MONGO_URI)"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="w-full rounded-xl border border-grey-700 bg-grey-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-gold-500/50"
                  />
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={confirmSelection}
                    className="flex-1 rounded-xl bg-gradient-gold px-4 py-2 font-mono text-xs font-bold text-grey-950 shadow-glow-gold hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Confirm Region
                  </button>
                  <button
                    onClick={() => setPendingRect(null)}
                    className="rounded-xl border border-grey-700 px-3 py-2 font-mono text-xs text-grey-400 hover:bg-grey-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Active Selections List & Shield Action */}
            <div className="glass-panel p-5 rounded-2xl sm:rounded-3xl border-grey-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gold-400" />
                  Redacted Regions ({selections.length})
                </h4>
                {selections.length > 0 && (
                  <button
                    onClick={() => setSelections([])}
                    className="text-[11px] font-mono text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selections.length === 0 ? (
                <p className="text-xs text-grey-500 font-mono italic">
                  No selections yet. Click & drag on the image above, or click <strong>⚡ AUTO-DETECT</strong>.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selections.map((sel) => (
                    <div
                      key={sel.id}
                      className="flex items-center justify-between rounded-xl border border-grey-800 bg-grey-950/60 p-2.5 text-xs"
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-mono font-bold text-gold-400 truncate">{sel.placeholder}</span>
                        <span className="font-mono text-[10px] text-grey-500">
                          {sel.rect.width}×{sel.rect.height}px ({sel.entityType})
                        </span>
                      </div>
                      <button
                        onClick={() => removeSelection(sel.id)}
                        className="text-grey-500 hover:text-rose-400 p-1"
                        title="Remove region"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col space-y-2">
                {selections.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleAutoShield}
                    disabled={!sourceImageUrl || !isImageLoaded || isAutoDetecting || isShielding}
                    className="w-full rounded-xl bg-gradient-gold py-3.5 font-mono text-xs font-extrabold text-grey-950 shadow-glow-gold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-2"
                  >
                    {isAutoDetecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-grey-950" />
                        <span>Auto-Detecting Regions...</span>
                      </>
                    ) : isShielding ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-grey-950" />
                        <span>Compositing Mask...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-grey-950" />
                        <span>⚡ 1-Click Auto-Shield</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleShield}
                    disabled={!sourceImageUrl || selections.length === 0 || !isImageLoaded || isShielding}
                    className="w-full rounded-xl bg-gradient-gold py-3.5 font-mono text-xs font-extrabold text-grey-950 shadow-glow-gold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {isShielding ? 'Generating Shielded Image...' : `🛡️ Shield Image (${selections.length} Regions)`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl border border-grey-800 py-2.5 font-mono text-xs text-grey-400 hover:bg-grey-800/60 transition-all"
                >
                  Upload Another Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

