import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Eye, EyeOff, ImagePlus, X, SwitchCamera, ZapOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Watermark overlay is ONLY shown for these 4 specific photo positions.
// All other positions (interior_door, vin_photo, mileage_photo, etc.) open the camera normally.
const OVERLAY_SVG_MAP: Record<string, string> = {
    diag_fr: '/overlays/front-left.svg',
    diag_rl: '/overlays/rear-left.svg',
    sill_right: '/overlays/rear-right.svg',
    sill_left: '/overlays/rear-left.svg',
};

interface CameraOverlayModalProps {
    photoId: string;
    photoLabel: string;
    onFileSelected: (file: File) => void;
    children: React.ReactNode;
}

const CameraOverlayModal: React.FC<CameraOverlayModalProps> = ({
    photoId,
    photoLabel,
    onFileSelected,
    children,
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [overlayVisible, setOverlayVisible] = useState(true);
    const [opacity, setOpacity] = useState(50);
    const [streaming, setStreaming] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [capturing, setCapturing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const overlaySrc = OVERLAY_SVG_MAP[photoId] ?? null;

    const startCamera = useCallback(async (facing: 'environment' | 'user') => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraError(null);
        setStreaming(false);

        const steps: MediaTrackConstraints[] = [
            { facingMode: { ideal: facing }, width: { ideal: 1920, max: 3840 }, height: { ideal: 1080, max: 2160 } },
            { facingMode: { ideal: facing }, width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } },
            { facingMode: { ideal: facing }, width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 } },
            { facingMode: { ideal: facing } },
            {}
        ];

        let stream: MediaStream | null = null;
        let lastErr: any = null;

        for (const step of steps) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: step,
                    audio: false,
                });
                if (stream) break;
            } catch (err: any) {
                lastErr = err;
            }
        }

        if (stream) {
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
            setStreaming(true);
        } else {
            console.error('[CameraOverlayModal] Camera failed after fallback steps:', lastErr);
            setCameraError(
                lastErr?.name === 'NotAllowedError'
                    ? t('cameraOverlay.permissionDenied', 'Kamerazugriff verweigert. Bitte Berechtigungen erlauben.')
                    : t('cameraOverlay.cameraError', 'Kamera konnte nicht geöffnet werden.')
            );
        }
    }, [t]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setStreaming(false);
    }, []);

    useEffect(() => {
        if (open) {
            startCamera(facingMode);
        } else {
            stopCamera();
        }
        return () => { if (!open) stopCamera(); };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Lock body scroll when modal is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const handleFlipCamera = async () => {
        const next: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(next);
        await startCamera(next);
    };

    const handleCapture = () => {
        const video = videoRef.current;
        if (!video || !streaming) return;
        setCapturing(true);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onFileSelected(file);
                    setOpen(false);
                }
                setCapturing(false);
            },
            'image/jpeg',
            0.85
        );
    };

    const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelected(file);
            setOpen(false);
        }
        e.target.value = '';
    };

    return (
        <>
            <div onClick={() => setOpen(true)} style={{ display: 'contents' }}>
                {children}
            </div>

            {open && (
                /* True full-screen overlay — covers the entire viewport including any nav bar area */
                <div
                    className="fixed inset-0 z-[9999] flex flex-col"
                    style={{ background: '#000' }}
                >
                    {/* ── Full-screen live camera feed ── */}
                    <div className="relative flex-1 overflow-hidden">
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            playsInline
                            muted
                            autoPlay
                        />

                        {/* SVG watermark overlay */}
                        {overlaySrc && overlayVisible && streaming && (
                            <img
                                src={overlaySrc}
                                alt="vehicle overlay"
                                className="absolute inset-0 w-full h-full object-contain select-none"
                                style={{
                                    opacity: opacity / 100,
                                    pointerEvents: 'none',
                                    mixBlendMode: 'screen',
                                }}
                                draggable={false}
                            />
                        )}

                        {/* Corner brackets */}
                        {[
                            'top-4 left-4 border-t-2 border-l-2',
                            'top-4 right-4 border-t-2 border-r-2',
                            'bottom-20 left-4 border-b-2 border-l-2',
                            'bottom-20 right-4 border-b-2 border-r-2',
                        ].map((cls, i) => (
                            <div key={i} className={`absolute ${cls} w-8 h-8 border-white/60 pointer-events-none`} />
                        ))}

                        {/* ── Top bar: label + close ── */}
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-safe-top"
                            style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
                            <span className="text-white font-semibold text-sm drop-shadow truncate max-w-[70vw]">{photoLabel}</span>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── Flip camera (top-right area) ── */}
                        {streaming && (
                            <button
                                onClick={handleFlipCamera}
                                className="absolute top-16 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                            >
                                <SwitchCamera className="w-5 h-5" />
                            </button>
                        )}

                        {/* ── Overlay controls bar (bottom of video area) ── */}
                        {overlaySrc && (
                            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3"
                                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}>
                                <button
                                    onClick={() => setOverlayVisible(v => !v)}
                                    className={`flex-shrink-0 p-2 rounded-full border transition-all ${overlayVisible
                                        ? 'border-blue-400/70 bg-blue-500/30 text-blue-300'
                                        : 'border-white/20 bg-black/30 text-white/40'
                                        }`}
                                >
                                    {overlayVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <div className={`flex items-center gap-2 flex-1 transition-opacity ${overlayVisible ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                    <span className="text-[10px] text-white/50">0%</span>
                                    <input
                                        type="range" min={0} max={100} value={opacity}
                                        onChange={e => setOpacity(Number(e.target.value))}
                                        className="flex-1 h-1 cursor-pointer"
                                        style={{ accentColor: '#60a5fa' }}
                                    />
                                    <span className="text-[10px] text-white/50 w-8 text-right">{opacity}%</span>
                                </div>
                            </div>
                        )}

                        {/* Error state */}
                        {cameraError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-8 text-center">
                                <ZapOff className="w-12 h-12 text-red-400" />
                                <p className="text-white/80 text-sm leading-relaxed">{cameraError}</p>
                                <button
                                    onClick={() => startCamera(facingMode)}
                                    className="mt-2 px-6 py-2.5 rounded-full bg-white/10 text-white text-sm border border-white/20 hover:bg-white/20 transition-colors"
                                >
                                    {t('cameraOverlay.retry', 'Erneut versuchen')}
                                </button>
                            </div>
                        )}

                        {/* Loading spinner */}
                        {!streaming && !cameraError && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* ── Bottom action bar ── */}
                    <div className="flex-shrink-0 flex items-center justify-around px-8 bg-black"
                        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', paddingTop: '20px' }}>

                        {/* Gallery */}
                        <label className="flex flex-col items-center gap-1 cursor-pointer">
                            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                                <ImagePlus className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] text-white/50">{t('step4.choosePhoto', 'Galerie')}</span>
                            <input
                                ref={galleryRef}
                                type="file"
                                accept="image/*"
                                onChange={handleGalleryFile}
                                className="hidden"
                            />
                        </label>

                        {/* Shutter button (large, centered) */}
                        <button
                            onClick={handleCapture}
                            disabled={!streaming || capturing}
                            className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-90"
                            style={{ background: 'rgba(255,255,255,0.15)' }}
                        >
                            {capturing ? (
                                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-white" />
                            )}
                        </button>

                        {/* Flip camera (bottom) */}
                        <button
                            onClick={handleFlipCamera}
                            className="flex flex-col items-center gap-1"
                            disabled={!streaming}
                        >
                            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-40">
                                <SwitchCamera className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] text-white/50">{t('cameraOverlay.flip', 'Wechseln')}</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default CameraOverlayModal;
