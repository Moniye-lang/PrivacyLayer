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

export const ImageShieldEditor: React.FC = () => {
  // 1. Dynamic Image State
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [imageNaturalDim, setImageNaturalDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayedDim, setDisplayedDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  // 2. Dynamic Selections State
  const [selections, setSelections] = useState<ImageSelection[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<ImageRect | null>(null);

  // 3. Pending Selection Picker State
  const [pendingRect, setPendingRect] = useState<ImageRect | null>(null);
  const [selectedType, setSelectedType] = useState<EntityType>('API_KEY');
  const [customLabel, setCustomLabel] = useState<string>('');

  // 4. Processing & Result State
  const [isShielding, setIsShielding] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [shieldedResult, setShieldedResult] = useState<ShieldImageResponsePayload | null>(null);
  const [restoredImageSrc, setRestoredImageSrc] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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
  }, [sourceImageUrl, isImageLoaded]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
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
    if (!sourceImageUrl || pendingRect || !isImageLoaded) return;
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
    if (!isDrawing || !currentRect) return;
    setIsDrawing(false);

    if (currentRect.width > 10 && currentRect.height > 10) {
      setPendingRect(currentRect);
    }
    setCurrentRect(null);
    setStartPoint(null);
  };

  const confirmSelection = () => {
    if (!pendingRect) return;

    const typeKey = selectedType === 'CUSTOM_TERM' && customLabel.trim() ? customLabel.trim().toUpperCase() : selectedType;
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
        /* WORKFLOW STATE 1: UPLOAD VIEW */
        <div className="glass-panel relative flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border-2 border-dashed border-grey-700/80 p-6 sm:p-12 text-center transition-all hover:border-gold-500/50">
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
            onChange={handleFileUpload}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/30 shadow-glow-gold mb-3 sm:mb-4">
            <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <h3 className="font-mono text-base sm:text-lg font-bold text-white">Upload Image for Shielding</h3>
          <p className="mt-1 max-w-md text-xs text-grey-400 font-sans">
            Take photo or upload screenshot (PNG, JPG, WebP). Tap/drag over sensitive areas to redact.
          </p>
          <button className="mt-4 sm:mt-6 rounded-xl bg-gradient-gold px-5 sm:px-6 py-2.5 font-mono text-xs font-bold text-grey-950 shadow-glow-gold transition-all hover:scale-105 active:scale-95">
            Select Photo / Screenshot
          </button>
        </div>
      ) : isShielding ? (
        /* WORKFLOW STATE 2: SHIELDING PROCESSING VIEW */
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-glow-gold flex flex-col items-center justify-center min-h-[250px] sm:min-h-[300px]">
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

          {/* Standalone Composited Shielded PNG Output View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <div className="lg:col-span-12 space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-semibold text-gold-400 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gold-400" />
                  Generated Shielded Image (PNG Buffer)
                </span>
                <span className="text-grey-500 text-[10px] sm:text-xs">{shieldedResult.entitiesCount} masked ({imageNaturalDim.width} x {imageNaturalDim.height}px)</span>
              </div>
              <div className="rounded-2xl border border-gold-500/40 bg-grey-950 p-2 sm:p-4 flex justify-center shadow-glow-gold overflow-x-auto">
                <img
                  src={shieldedResult.shieldedImageDataUrl}
                  alt="Shielded image"
                  className="max-h-[500px] w-auto object-contain rounded-xl shadow-2xl"
                />
              </div>
            </div>
          </div>

          {/* Restored Image Preview if Reveal Executed */}
          {restoredImageSrc && (
            <div className="pt-4 sm:pt-6 border-t border-grey-800 space-y-3">
              <span className="font-mono text-xs font-semibold text-gold-300 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gold-400" />
                Losslessly Restored Image
              </span>
              <div className="rounded-2xl border border-grey-700 bg-grey-950 p-2 sm:p-4 flex justify-center overflow-x-auto">
                <img src={restoredImageSrc} alt="Restored" className="max-h-[500px] w-auto object-contain rounded-xl" />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* WORKFLOW STATE 4: INTERACTIVE CANVAS EDITOR VIEW */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Interactive Canvas Viewer */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div className="glass-panel relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-4 border-grey-800">
              <div className="flex items-center justify-between pb-3 border-b border-grey-800 mb-3 font-mono text-xs text-grey-400">
                <span className="flex items-center space-x-1.5 sm:space-x-2">
                  <Layers className="h-4 w-4 text-gold-400" />
                  <span className="truncate max-w-[150px] sm:max-w-none">Canvas ({imageNaturalDim.width} x {imageNaturalDim.height}px)</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAutoDetect}
                    disabled={isAutoDetecting || !isImageLoaded}
                    className="flex items-center space-x-1.5 rounded-lg bg-gold-500/15 px-2.5 sm:px-3 py-1 text-xs font-bold text-gold-400 border border-gold-500/40 hover:bg-gold-500/25 active:scale-95 transition-all disabled:opacity-50 shadow-glow-gold whitespace-nowrap"
                  >
                    {isAutoDetecting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-gold-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                    )}
                    <span>{isAutoDetecting ? 'Scanning...' : '⚡ AUTO-DETECT'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-center bg-grey-950/80 rounded-xl sm:rounded-2xl p-2 select-none overflow-x-auto">
                <div
                  ref={containerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative inline-block cursor-crosshair select-none touch-none"
                >
                  <img
                    ref={imgRef}
                    src={sourceImageUrl}
                    alt="Original workspace"
                    onLoad={handleImageLoad}
                    className="max-h-[500px] w-auto block object-contain pointer-events-none rounded-xl"
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
                          className="absolute border border-gold-500/60 bg-gold-500/15 rounded-sm flex items-center justify-center group pointer-events-auto overflow-hidden cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelection(sel.id);
                          }}
                          title="Tap or click to remove redacted region"
                        >
                          <span className="font-mono text-[9px] leading-none font-bold text-gold-300 bg-grey-950/90 px-1 py-0.5 rounded border border-gold-500/40 truncate max-w-full">
                            {displayLabel}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelection(sel.id);
                            }}
                            className="absolute -top-1 -right-1 flex sm:hidden sm:group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] shadow-md"
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

          {/* Right Sidebar: Selections & Actions */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            {/* Pending Selection Entity Type Picker */}
            {pendingRect && (
              <div className="glass-panel p-5 rounded-3xl border-gold-500/50 space-y-4 shadow-glow-gold">
                <h4 className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold-400" />
                  Assign Entity Type
                </h4>
                <p className="text-xs text-grey-400 font-sans">
                  Select entity placeholder for region ({pendingRect.width} x {pendingRect.height}px):
                </p>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
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
                    className="flex-1 rounded-xl bg-gradient-gold px-4 py-2 font-mono text-xs font-bold text-grey-950 shadow-glow-gold hover:scale-[1.02] transition-all"
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

            {/* Active Selections List */}
            <div className="glass-panel p-5 rounded-3xl border-grey-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gold-400" />
                  Selections ({selections.length})
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
                <p className="text-xs text-grey-500 font-mono italic">No region selections made yet. Click & drag on image.</p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selections.map((sel) => (
                    <div
                      key={sel.id}
                      className="flex items-center justify-between rounded-xl border border-grey-800 bg-grey-950/60 p-3 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-gold-400">{sel.placeholder}</span>
                        <span className="font-mono text-[10px] text-grey-500">
                          x:{sel.rect.x}, y:{sel.rect.y} ({sel.rect.width}×{sel.rect.height}px)
                        </span>
                      </div>
                      <button
                        onClick={() => removeSelection(sel.id)}
                        className="text-grey-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={handleShield}
                  disabled={!sourceImageUrl || selections.length === 0 || !isImageLoaded || isShielding}
                  className="w-full rounded-xl bg-gradient-gold py-3 font-mono text-xs font-bold text-grey-950 shadow-glow-gold disabled:opacity-50 transition-all hover:scale-105"
                >
                  {isShielding ? 'Generating Shielded Image...' : 'Shield Image Now'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl border border-grey-800 py-2 font-mono text-xs text-grey-400 hover:bg-grey-800/60"
                >
                  Upload New Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
