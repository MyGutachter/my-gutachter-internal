import clsx from 'clsx';
import { Camera, CarFront, ChevronLeft, ChevronRight, Copy, Download, Eye, EyeOff, Gauge, Images, Mail, Mic, MicOff, Phone, Smartphone, SwitchCamera, Trash2, User, Video, VideoOff, X, Zap, ZapOff, ZoomIn } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import CarInspectionLoader from './CarInspectionLoader';
import { CarOverlay, getPartIdFromKey } from './CarOverlay';
import { useWebRTC } from './useWebRTC';
import { UvvChecklistPanel } from './UvvChecklistPanel';
import { UvvInlineChecklistPanel } from './UvvInlineChecklistPanel';
import { VehicleReportStepsPanel } from './VehicleReportStepsPanel';
import ReportFormPage from '../../pages/ReportFormPage';
import { deleteScreenshot, getOrder, getScreenshots, uploadRecording, uploadScreenshot } from './videoApi';
import { API_BASE_URL } from './videoConfig';
import type { Order } from './videoTypes';

// Import car placeholder images
import car1 from '../../assets/car_placeholder/car-1.png';
import car2 from '../../assets/car_placeholder/car-2.png';
import car3 from '../../assets/car_placeholder/car-3.png';
import car4 from '../../assets/car_placeholder/car-4.png';
import car5 from '../../assets/car_placeholder/car-5.png';
import car6 from '../../assets/car_placeholder/car-6.png';
import car7 from '../../assets/car_placeholder/car-7.png';
import car8 from '../../assets/car_placeholder/car-8.png';
import OpenOtherAppTab from '../../components/OpenOtherAppTab';

const CAR_PLACEHOLDERS = [car1, car2, car3, car4, car5, car6, car7, car8];


// Sub-component for individual remote video
const AudioStream = ({ stream }: { stream: MediaStream }) => {
    const ref = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);
    return <audio ref={ref} autoPlay style={{ display: 'none' }} />;
};

const RemoteVideo = ({
    stream,
    userId,
    onClick,
    selectionMode,
    isHost,
    capabilities,
    onZoomChange,
    currentZoom,
    muted
}: {
    stream: MediaStream,
    userId: string,
    onClick?: () => void,
    selectionMode?: boolean,
    isHost: boolean,
    capabilities?: { min: number, max: number, step: number },
    onZoomChange?: (newZoom: number) => void,
    currentZoom?: number,
    muted?: boolean
}) => {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const handleZoomChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        if (onZoomChange) {
            onZoomChange(newZoom);
        }
    };

    return (
        <div
            className={clsx(
                "relative w-full h-full bg-black rounded-xl overflow-hidden flex items-center justify-center border border-gray-800 transition-all group",
                selectionMode ? "cursor-pointer ring-4 ring-primary hover:scale-95" : ""
            )}
            onClick={onClick}
        >
            <div className="w-full h-full flex items-center justify-center">
                <video
                    id={`video-${userId}`}
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={muted}
                    className="w-full h-full object-contain pointer-events-none"
                />
            </div>

            <div className="absolute top-4 left-4 bg-black/40 px-3 py-1 rounded text-sm text-white font-medium backdrop-blur-sm pointer-events-none z-10">
                {t('videoCall.user')} {userId.slice(0, 4)} {currentZoom && currentZoom > 1 && `(${currentZoom.toFixed(1)}x)`}
            </div>

            {selectionMode && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none z-20">
                    <div className="bg-primary text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                        <Camera size={20} />
                        {t('videoCall.clickToCapture')}
                    </div>
                </div>
            )}

            {isHost && capabilities && (
                <div
                    className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-md z-30 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ZoomIn size={14} className="text-white/70" />
                    <input
                        type="range"
                        min={capabilities.min}
                        max={capabilities.max}
                        step={capabilities.step}
                        value={currentZoom || capabilities.min}
                        onChange={handleZoomChange}
                        className="w-24 h-1 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-primary hover:bg-[var(--color-border-secondary)] transition-colors"
                        title={t('videoCall.zoom')}
                    />
                    <span className="text-white/70 text-xs font-mono min-w-[32px]">
                        {(currentZoom || capabilities.min).toFixed(1)}x
                    </span>
                </div>
            )}
        </div>
    );
};



export const VideoCall = () => {
    const { t } = useTranslation();

    const [roomId, setRoomId] = useState('');
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const [order, setOrder] = useState<Order | null>(null);

    // Participant details for display
    const pName = searchParams.get('pName');
    const pEmail = searchParams.get('pEmail');
    const pMobile = searchParams.get('pMobile');

    // Treat as guest if role is guest OR if we are NOT on the main /video-call route (e.g. /guest-video)
    const isGuest = searchParams.get('role') === 'guest' || location.pathname.includes('/guest-video');

    const [isJoined, setIsJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [notification, setNotification] = useState<string | null>(null);
    const [selectedParts, setSelectedParts] = useState<string[]>([]);
    const [hoveredPart, setHoveredPart] = useState<{ id: string; name: string } | null>(null);
    const [showUvvModal, setShowUvvModal] = useState(false);

    // Recording State
    const [recordingConsent, setRecordingConsent] = useState<'pending' | 'accepted'>('pending');
    const [isGuestConsentAccepted, setIsGuestConsentAccepted] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recordingFinishedRef = useRef(false);

    // Screenshot Selection Mode
    const [savedScreenshots, setSavedScreenshots] = useState<Record<string, string>>({});
    const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
    const [pendingCapturePart, setPendingCapturePart] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Hardware Zoom State
    const [zoomLevel, setZoomLevel] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number, max: number, step: number } | null>(null);
    const [remoteUserCapabilities, setRemoteUserCapabilities] = useState<Record<string, { min: number, max: number, step: number, current: number }>>({});

    // Mobile UI State
    const [showMobileCarOverlay, setShowMobileCarOverlay] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [isSavingScreenshot, setIsSavingScreenshot] = useState(false);
    const [expertSideTab, setExpertSideTab] = useState<'2d' | 'slots' | 'uvv' | 'report'>('2d');
    
    // Auto-fallback from UVV tab if not a Digital UVV claim
    useEffect(() => {
        if (order && order.claimType !== 'Digital UVV' && expertSideTab === 'uvv') {
            setExpertSideTab('2d');
        }
    }, [order, expertSideTab]);

    const [isSwitchingLocalCamera, setIsSwitchingLocalCamera] = useState(false);

    // Camera Overlay / Watermark State
    const [overlayVisible, setOverlayVisible] = useState(true);
    const [overlayOpacity, setOverlayOpacity] = useState(50);
    const [placeholderIndex, setPlaceholderIndex] = useState<number>(-1);

    // Flashlight State
    const [isFlashlightOn, setIsFlashlightOn] = useState(false);
    const [hasFlashlight, setHasFlashlight] = useState(false);
    const [isCheckingFlashlight, setIsCheckingFlashlight] = useState(false);

    // Track remote users' flashlight capabilities and states
    const [remoteUserFlashlightCapabilities, setRemoteUserFlashlightCapabilities] = useState<Record<string, { hasFlashlight: boolean, isOn: boolean }>>({});

    // Track remote users' camera facing state (F1/b1 toggle)
    const [remoteUserCameraFacing, setRemoteUserCameraFacing] = useState<Record<string, 'environment' | 'user'>>({});

    // Device info + speedometer
    const [localDeviceInfo, setLocalDeviceInfo] = useState<{ browser: string; os: string; deviceName: string } | null>(null);
    const [localSpeedMbps, setLocalSpeedMbps] = useState<number>(0);
    const [remoteUserDeviceInfo, setRemoteUserDeviceInfo] = useState<Record<string, { browser: string; os: string; deviceName: string; speedMbps: number }>>({});

    const startRecording = (stream: MediaStream) => {
        if (!stream || mediaRecorderRef.current || recordingFinishedRef.current) return;
        try {
            // Try codecs in order of preference
            const mimeTypes = [
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp8',
                'video/webm;codecs=vp9',
                'video/webm',
            ];
            let mimeType = '';
            for (const mt of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mt)) {
                    mimeType = mt;
                    break;
                }
            }
            if (!mimeType) {
                console.error('[Recording] No supported video MIME type found');
                return;
            }

            console.log('[Recording] Starting with MIME:', mimeType);
            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1000000 });
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                // Default empty handler - overridden by stopRecordingAndUpload
            };

            // Use timeslice of 1000ms so data is flushed periodically
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            console.log('[Recording] Started successfully');
        } catch (e) {
            console.error('[Recording] Error starting recording:', e);
        }
    };

    const stopRecordingAndUpload = (): Promise<void> => {
        // Immediately mark as finished to prevent useEffect from restarting
        recordingFinishedRef.current = true;

        return new Promise((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                const recorder = mediaRecorderRef.current;

                recorder.onstop = () => {
                    // Now it's safe to clean up refs
                    mediaRecorderRef.current = null;
                    setIsRecording(false);

                    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                    console.log('[Recording] Stop: blob size =', (blob.size / (1024 * 1024)).toFixed(2), 'MB, chunks:', recordedChunksRef.current.length);

                    if (blob.size === 0) {
                        console.warn('[Recording] Empty blob, skipping upload');
                        resolve();
                        return;
                    }

                    setIsUploadingVideo(true);

                    // Upload the raw WebM blob directly
                    uploadRecording(blob, roomId).then(() => {
                        console.log('[Recording] Upload successful');
                        setIsUploadingVideo(false);
                        resolve();
                    }).catch(err => {
                        console.error('[Recording] Upload failed:', err);
                        setIsUploadingVideo(false);
                        resolve();
                    });
                };

                recorder.stop();
            } else {
                mediaRecorderRef.current = null;
                setIsRecording(false);
                resolve();
            }
        });
    };

    const handleAcceptRecording = () => {
        setRecordingConsent('accepted');
        sendMessage('recording-consent-accepted', {});
    };

    const checkFlashlightAvailability = async (track: MediaStreamTrack) => {
        if (isCheckingFlashlight) return;

        setIsCheckingFlashlight(true);
        try {
            const capabilities = track.getCapabilities?.() as any;

            if (capabilities && 'torch' in capabilities) {
                setHasFlashlight(true);
                setIsCheckingFlashlight(false);

                if (isGuest) {
                    sendMessage('flashlight-state', {
                        hasFlashlight: true,
                        isOn: isFlashlightOn
                    });
                }
                return;
            }

            try {
                await track.applyConstraints({
                    advanced: [{ torch: false } as any]
                });
                setHasFlashlight(true);

                if (isGuest) {
                    sendMessage('flashlight-state', {
                        hasFlashlight: true,
                        isOn: isFlashlightOn
                    });
                }
            } catch (constraintErr) {
                setHasFlashlight(false);

                if (isGuest) {
                    sendMessage('flashlight-state', {
                        hasFlashlight: false,
                        isOn: false
                    });
                }
            }
        } catch (err) {
            console.error('[Flashlight] Error checking availability:', err);
            setHasFlashlight(false);
        } finally {
            setIsCheckingFlashlight(false);
        }
    };

    // Callback ref to avoid circular dependency with useWebRTC
    const signalHandlerRef = useRef<((msg: any) => void | Promise<void>) | null>(null);

    const { localStream, remoteStreams, connectionStates, startLocalStream, init, cleanup, toggleAudio, toggleVideo, switchCamera, sendMessage } = useWebRTC((msg) => {
        if (signalHandlerRef.current) {
            signalHandlerRef.current(msg);
        }
    });

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /**
     * Exports the canvas as a lossless PNG blob — no resize, no quality loss,
     * exact pixel-for-pixel copy of whatever is on the canvas.
     */
    const canvasToJpegBlobStable = async (sourceCanvas: HTMLCanvasElement): Promise<Blob> => {
        const srcW = sourceCanvas.width;
        const srcH = sourceCanvas.height;
        if (!srcW || !srcH) {
            throw new Error('Canvas has no size');
        }
        const blob = await new Promise<Blob | null>((resolve) => sourceCanvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to encode PNG');
        return blob;
    };

    /**
     * Reads the EXIF Orientation tag from a JPEG Blob.
     * Returns a value 1–8 (1 = no rotation needed).
     * Returns 1 on any parse failure so callers always get a safe default.
     *
     * EXIF orientation values:
     *   1 = 0°   2 = 0° flip-H   3 = 180°   4 = 180° flip-H
     *   5 = 90° flip-H   6 = 90° CW   7 = 270° flip-H   8 = 270° CW
     */
    const readExifOrientation = async (blob: Blob): Promise<number> => {
        try {
            // Only first 64KB is needed — EXIF is always near the start of the file
            const headerSlice = blob.slice(0, 65536);
            const buf = await headerSlice.arrayBuffer();
            const view = new DataView(buf);

            // Must start with JPEG SOI marker 0xFFD8
            if (view.getUint16(0) !== 0xFFD8) return 1;

            let offset = 2;
            while (offset < view.byteLength - 1) {
                const marker = view.getUint16(offset);
                offset += 2;

                // APP1 marker (0xFFE1) holds EXIF data
                if (marker === 0xFFE1) {
                    const segmentLength = view.getUint16(offset);
                    // Check for "Exif\0\0" header
                    if (
                        view.getUint8(offset + 2) === 0x45 && // E
                        view.getUint8(offset + 3) === 0x78 && // x
                        view.getUint8(offset + 4) === 0x69 && // i
                        view.getUint8(offset + 5) === 0x66   // f
                    ) {
                        const tiffOffset = offset + 8; // skip length(2) + "Exif\0\0"(6)
                        // Determine byte order
                        const byteOrder = view.getUint16(tiffOffset);
                        const littleEndian = byteOrder === 0x4949; // "II" = little-endian

                        const ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
                        const numEntries = view.getUint16(ifdOffset, littleEndian);

                        for (let i = 0; i < numEntries; i++) {
                            const entryOffset = ifdOffset + 2 + i * 12;
                            const tag = view.getUint16(entryOffset, littleEndian);
                            // Tag 0x0112 = Orientation
                            if (tag === 0x0112) {
                                return view.getUint16(entryOffset + 8, littleEndian);
                            }
                        }
                    }
                    offset += segmentLength;
                } else if ((marker & 0xFF00) === 0xFF00) {
                    // Skip other segments
                    offset += view.getUint16(offset);
                } else {
                    break;
                }
            }
        } catch {
            // Ignore parse errors — treat as no rotation
        }
        return 1;
    };

    /**
     * Draws an ImageBitmap onto a canvas, correcting for EXIF orientation.
     * The canvas is sized to the FINAL (post-rotation) pixel dimensions so the
     * stored image is always upright, regardless of how the phone was held.
     *
     * Orientation map:
     *   1 = 0°          → canvas = bmp.width  × bmp.height
     *   3 = 180°        → canvas = bmp.width  × bmp.height
     *   6 = 90° CW      → canvas = bmp.height × bmp.width   (portrait shot)
     *   8 = 270° CW     → canvas = bmp.height × bmp.width   (portrait shot)
     * (Flip variants 2/4/5/7 are rare on phones; handled defensively.)
     */
    const drawBitmapWithOrientation = (
        canvas: HTMLCanvasElement,
        bitmap: ImageBitmap,
        orientation: number
    ): boolean => {
        const bw = bitmap.width;
        const bh = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx || !bw || !bh) return false;

        // Orientations 5-8 swap width/height (the image was captured rotated 90/270°)
        const needsSwap = orientation >= 5 && orientation <= 8;
        canvas.width = needsSwap ? bh : bw;
        canvas.height = needsSwap ? bw : bh;

        ctx.save();

        switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, bw, 0); break;                    // flip H
            case 3: ctx.transform(-1, 0, 0, -1, bw, bh); break;                  // 180°
            case 4: ctx.transform(1, 0, 0, -1, 0, bh); break;                    // flip V
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;                      // 90° + flip H
            case 6: ctx.translate(bh, 0); ctx.rotate(Math.PI / 2); break;        // 90° CW
            case 7: ctx.transform(0, -1, -1, 0, bh, bw); break;                  // 270° + flip H
            case 8: ctx.translate(0, bw); ctx.rotate(-Math.PI / 2); break;       // 270° CW
            default: break;                                                        // 1: no-op
        }

        ctx.drawImage(bitmap, 0, 0);
        ctx.restore();
        return true;
    };

    // Signal Handler for Data Sync
    useEffect(() => {
        signalHandlerRef.current = async (msg: any) => {
            const { type, data } = msg;

            if (type === 'error') {
                const code = data?.code;
                const message = data?.message;

                if (code === 'MEETING_ENDED') {
                    if (!isGuest) {
                        showNotification(t('videoCall.restartingMeeting', { defaultValue: 'Restarting meeting…' }));
                        cleanup();
                        setTimeout(() => {
                            handleJoin(roomId);
                        }, 500);
                    } else {
                        showNotification(message || t('videoCall.meetingEnded', { defaultValue: 'This meeting has ended.' }));
                        cleanup();
                        setIsJoined(false);
                    }
                    return;
                }

                if (code === 'ROOM_FULL') {
                    showNotification(message || t('videoCall.meetingFull'));
                } else if (code === 'UNAUTHORIZED') {
                    showNotification(message || t('videoCall.unauthorized'));
                } else if (code === 'INVALID_JOIN') {
                    showNotification(message || t('videoCall.invalidJoin'));
                } else {
                    showNotification(message || t('videoCall.joinFailed'));
                }

                cleanup();
                setIsJoined(false);
                return;
            }

            if (type === 'user-joined') {
                if (selectedParts.length > 0) {
                    sendMessage('sync-state', {
                        selectedParts,
                        savedScreenshots
                    }, data);
                }

                if (zoomCapabilities) {
                    sendMessage('user-capabilities', {
                        capabilities: zoomCapabilities,
                        currentZoom: zoomLevel
                    }, data);
                }

                if (localDeviceInfo) {
                    sendMessage('user-device-info', {
                        ...localDeviceInfo,
                        speedMbps: localSpeedMbps
                    }, data);
                }

                if (isGuest && hasFlashlight) {
                    sendMessage('flashlight-state', {
                        hasFlashlight: true,
                        isOn: isFlashlightOn
                    }, data);
                }

                if (!isGuest && placeholderIndex !== -1) {
                    sendMessage('sync-overlay', {
                        visible: overlayVisible,
                        opacity: overlayOpacity,
                        placeholderIndex: placeholderIndex
                    }, data);
                }
            } else if (type === 'recording-consent-accepted') {
                if (!isGuest) {
                    setIsGuestConsentAccepted(true);
                }
            } else if (type === 'sync-state') {
                if (data.selectedParts) {
                    setSelectedParts(prev => Array.from(new Set([...prev, ...data.selectedParts])));
                }
                if (data.savedScreenshots) {
                    setSavedScreenshots(prev => ({ ...prev, ...data.savedScreenshots }));
                }
            } else if (type === 'part-update') {
                const { partId, action, filename } = data;
                if (action === 'add') {
                    setSelectedParts(prev => {
                        if (prev.includes(partId)) return prev;
                        return [...prev, partId];
                    });
                    if (filename) {
                        setSavedScreenshots(prev => ({ ...prev, [partId]: filename }));
                    }
                } else if (action === 'remove') {
                    setSelectedParts(prev => prev.filter(p => p !== partId));
                    setSavedScreenshots(prev => {
                        const next = { ...prev };
                        delete next[partId];
                        return next;
                    });
                }
            } else if (type === 'end-meeting') {
                showNotification(t('videoCall.hostEndedMeeting'));
                setTimeout(() => {
                    cleanup();
                    setIsJoined(false);
                    if (!isGuest) {
                        navigate('/video');
                    } else {
                        window.location.reload();
                    }
                }, 2000);
            } else if (type === 'user-capabilities') {
                const { capabilities, currentZoom, userId } = data;
                const senderId = msg.sender || userId;

                if (senderId && capabilities) {
                    if (typeof capabilities.min === 'number' &&
                        typeof capabilities.max === 'number' &&
                        capabilities.max > capabilities.min) {
                        setRemoteUserCapabilities(prev => ({
                            ...prev,
                            [senderId]: {
                                min: capabilities.min,
                                max: capabilities.max,
                                step: capabilities.step || 0.1,
                                current: currentZoom || capabilities.min
                            }
                        }));
                    }

                    if (zoomCapabilities) {
                        sendMessage('user-capabilities', {
                            capabilities: zoomCapabilities,
                            currentZoom: zoomLevel
                        }, senderId);
                    }
                }
            } else if (type === 'zoom-control') {
                const { zoom } = data;

                if (localStream && zoomCapabilities && zoom >= zoomCapabilities.min && zoom <= zoomCapabilities.max) {
                    const videoTrack = localStream.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.applyConstraints({
                            advanced: [{ zoom: zoom } as any]
                        }).then(() => {
                            setZoomLevel(zoom);
                            sendMessage('user-capabilities', {
                                capabilities: zoomCapabilities,
                                currentZoom: zoom
                            });
                        }).catch(err => {
                            console.error("[Zoom] Failed to apply zoom:", err);
                        });
                    }
                }
            } else if (type === 'flashlight-state') {
                const { hasFlashlight: remoteHasFlashlight, isOn, userId } = data;
                const senderId = msg.sender || userId;

                if (senderId) {
                    setRemoteUserFlashlightCapabilities(prev => ({
                        ...prev,
                        [senderId]: {
                            hasFlashlight: remoteHasFlashlight,
                            isOn: isOn
                        }
                    }));
                }
            } else if (type === 'flashlight-control') {
                const { turnOn } = data;

                if (!localStream || !hasFlashlight) {
                    console.warn('[Flashlight] Cannot control flashlight - not available');
                    return;
                }

                const track = localStream.getVideoTracks()[0];
                if (track) {
                    track.applyConstraints({
                        advanced: [{ torch: turnOn } as any]
                    }).then(() => {
                        setIsFlashlightOn(turnOn);
                        sendMessage('flashlight-state', {
                            hasFlashlight: true,
                            isOn: turnOn
                        });
                    }).catch(err => {
                        console.error('[Flashlight] Failed to apply host control:', err);
                    });
                }
            } else if (type === 'camera-flip-control') {
                const { facingMode } = data || {};
                const desiredFacingMode = (facingMode === 'user' || facingMode === 'environment') ? facingMode : null;

                if (!desiredFacingMode) {
                    console.warn('[Camera] Invalid camera-flip-control payload:', data);
                    return;
                }

                try {
                    const ok = await switchCamera(desiredFacingMode);
                    if (ok) {
                        sendMessage('camera-facing-state', { facingMode: desiredFacingMode });
                    }
                } catch (err) {
                    console.error('[Camera] Failed to switch camera from remote control:', err);
                }
            } else if (type === 'camera-facing-state') {
                const { facingMode, userId } = data || {};
                const senderId = msg.sender || userId;
                if (!senderId) return;

                if (facingMode === 'user' || facingMode === 'environment') {
                    setRemoteUserCameraFacing(prev => ({
                        ...prev,
                        [senderId]: facingMode
                    }));
                }
            } else if (type === 'sync-overlay') {
                const { visible, opacity, placeholderIndex: pIdx } = data || {};
                console.log('[Overlay] Received sync-overlay:', data);
                if (visible !== undefined) setOverlayVisible(visible);
                if (opacity !== undefined) setOverlayOpacity(opacity);
                if (pIdx !== undefined) setPlaceholderIndex(pIdx);
            }
        };
    }, [selectedParts, savedScreenshots, sendMessage, zoomCapabilities, zoomLevel, localStream, localDeviceInfo, localSpeedMbps, isGuest, hasFlashlight, isFlashlightOn, switchCamera, overlayVisible, overlayOpacity, placeholderIndex]);

    const parseUserAgent = useMemo(() => {
        const ua = navigator.userAgent || '';
        const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

        let browser = 'Unknown';
        if (/Edg\//.test(ua)) browser = 'Edge';
        else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
        else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
        else if (/Firefox\//.test(ua)) browser = 'Firefox';

        let os = 'Unknown';
        if (/Android/i.test(ua)) os = 'Android';
        else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
        else if (/Windows NT/i.test(ua)) os = 'Windows';
        else if (/Mac OS X/i.test(ua)) os = 'macOS';
        else if (/Linux/i.test(ua)) os = 'Linux';

        const deviceName = /iPhone/i.test(ua) ? 'iPhone'
            : /iPad/i.test(ua) ? 'iPad'
                : /Android/i.test(ua) ? 'Android'
                    : platform || 'Device';

        return { browser, os, deviceName };
    }, []);

    useEffect(() => {
        setLocalDeviceInfo(parseUserAgent);
    }, [parseUserAgent]);

    useEffect(() => {
        const conn: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        const readConnMbps = () => {
            const dl = conn?.downlink;
            if (typeof dl === 'number' && !Number.isNaN(dl)) {
                setLocalSpeedMbps(dl);
                return;
            }
        };

        readConnMbps();
        if (conn && typeof conn.addEventListener === 'function') {
            conn.addEventListener('change', readConnMbps);
        }

        const interval = window.setInterval(readConnMbps, 2000);

        return () => {
            window.clearInterval(interval);
            if (conn && typeof conn.removeEventListener === 'function') {
                conn.removeEventListener('change', readConnMbps);
            }
        };
    }, []);

    useEffect(() => {
        if (!isJoined || !localDeviceInfo) return;
        sendMessage('user-device-info', {
            ...localDeviceInfo,
            speedMbps: localSpeedMbps
        });
    }, [isJoined, localDeviceInfo, localSpeedMbps, sendMessage]);

    // Initial params check
    useEffect(() => {
        const rid = searchParams.get('roomId');
        if (rid) {
            setRoomId(rid);
            // Guests have no JWT; the shared axios 401 interceptor would redirect
            // them to /login, so only the authenticated organizer reads the order.
            if (!isGuest) {
                getOrder(rid).then(o => {
                    setOrder(o);
                }).catch(err => {
                    console.error('Failed to load order:', err);
                });
            }
            getScreenshots(rid).then(files => {
                if (files && files.length > 0) {
                    const loadedScreenshots: Record<string, string> = {};
                    const loadedParts: string[] = [];

                    files.forEach(partName => {
                        loadedScreenshots[partName] = partName;
                        loadedParts.push(partName);
                    });

                    setSavedScreenshots(prev => ({ ...prev, ...loadedScreenshots }));
                    setSelectedParts(prev => Array.from(new Set([...prev, ...loadedParts])));
                }
            });
        }

        if (!isGuest && !rid) {
            setRoomId(generateUuid());
        }

        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
            setIsMobile(true);
        }
    }, [searchParams, isGuest]);

    // Real-time tab sync listener
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const channel = new BroadcastChannel('my-gutachter-sync');
            channel.onmessage = (event) => {
                const { type, payload } = event.data;
                if (type === 'REPORT_STORE_UPDATE') {
                    setOrder(prev => {
                        if (!prev) return null;

                        const mapped: Partial<Order> = {};
                        if (payload.manufacturer !== undefined) mapped.vehicleMake = payload.manufacturer;
                        if (payload.baseModel !== undefined || payload.subModel !== undefined) {
                            mapped.vehicleModel = `${payload.baseModel || ''} ${payload.subModel || ''}`.trim();
                        }
                        if (payload.licensePlate !== undefined) mapped.licensePlateNumber = payload.licensePlate;
                        if (payload.vin !== undefined) mapped.vinNumber = payload.vin;
                        if (payload.keyNumber !== undefined) mapped.registrationNumber = payload.keyNumber;
                        if (payload.mileage !== undefined) mapped.mileage = payload.mileage;
                        if (payload.nextHU !== undefined) mapped.lastVehicleInspectionDate = payload.nextHU;
                        if (payload.status !== undefined) mapped.status = payload.status;
                        if (payload.uvvResult !== undefined) mapped.uvvResult = payload.uvvResult;
                        if (payload.uvvInspectionDate !== undefined) mapped.uvvInspectionDate = payload.uvvInspectionDate;
                        if (payload.meetingData !== undefined) mapped.meetingData = payload.meetingData;

                        return {
                            ...prev,
                            ...mapped
                        };
                    });
                }
            };
            return () => {
                channel.close();
            };
        }
    }, []);

    useEffect(() => {
        if (!localStream) return;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }

        const videoTrack = localStream.getVideoTracks()[0];
        if (!videoTrack) return;

        const detectCapabilities = async (retryCount = 0): Promise<void> => {
            try {
                if (retryCount === 0) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                let capabilities: any = {};

                if (typeof videoTrack.getCapabilities === 'function') {
                    capabilities = videoTrack.getCapabilities();
                }

                await checkFlashlightAvailability(videoTrack);

                if ('zoom' in capabilities) {
                    const zoomCap = capabilities.zoom;

                    if (typeof zoomCap === 'object' && zoomCap !== null) {
                        const caps = {
                            min: typeof zoomCap.min === 'number' ? zoomCap.min : 1,
                            max: typeof zoomCap.max === 'number' ? zoomCap.max : 1,
                            step: typeof zoomCap.step === 'number' ? zoomCap.step : 0.1
                        };

                        if (caps.max > caps.min) {
                            setZoomCapabilities(caps);

                            const settings = videoTrack.getSettings?.() as any;
                            const currentZoom = settings?.zoom || caps.min;
                            setZoomLevel(currentZoom);

                            sendMessage('user-capabilities', {
                                capabilities: caps,
                                currentZoom: currentZoom
                            });
                        } else {
                            setZoomCapabilities(null);
                        }
                    }
                } else {
                    try {
                        await videoTrack.applyConstraints({
                            advanced: [{ zoom: 1 } as any]
                        });

                        const fallbackCaps = { min: 1, max: 3, step: 0.1 };
                        setZoomCapabilities(fallbackCaps);
                        setZoomLevel(1);

                        sendMessage('user-capabilities', {
                            capabilities: fallbackCaps,
                            currentZoom: 1
                        });
                    } catch (e) {
                        setZoomCapabilities(null);
                    }
                }
            } catch (error) {
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount) * 200;
                    setTimeout(() => detectCapabilities(retryCount + 1), delay);
                } else {
                    setZoomCapabilities(null);
                    setHasFlashlight(false);
                }
            }
        };

        detectCapabilities();

    }, [localStream, sendMessage]);

    // Handle recording start when consent is accepted and stream is available
    useEffect(() => {
        if (!isGuest && isGuestConsentAccepted && !recordingFinishedRef.current && remoteStreams.size > 0 && !isRecording && !mediaRecorderRef.current) {
            const firstRemoteStream = Array.from(remoteStreams.values())[0];
            startRecording(firstRemoteStream);
        }
    }, [isGuest, isGuestConsentAccepted, remoteStreams.size, isRecording]);

    // Periodic capability broadcast
    useEffect(() => {
        if (!isJoined || !zoomCapabilities) return;

        const timeout = setTimeout(() => {
            sendMessage('user-capabilities', {
                capabilities: zoomCapabilities,
                currentZoom: zoomLevel
            });
        }, 1000);

        const interval = setInterval(() => {
            if (remoteStreams.size > 0) {
                sendMessage('user-capabilities', {
                    capabilities: zoomCapabilities,
                    currentZoom: zoomLevel
                });
            }
        }, 5000);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [isJoined, zoomCapabilities, zoomLevel, remoteStreams.size, sendMessage]);

    const generateUuid = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleCaptureFailure = (partId: string, errorMsg?: string) => {
        const message = errorMsg || t('videoCall.screenshotFailed');
        showNotification(message);
        sendMessage('part-update', { partId, action: 'remove' });
        setSelectedParts(prev => prev.filter(p => p !== partId));
    };

    const handleDeleteScreenshot = (filename: string) => {
        deleteScreenshot(roomId, filename)
            .then(() => {
                showNotification(t('videoCall.screenshotRemoved'));
                setSavedScreenshots(prev => {
                    const next = { ...prev };
                    delete next[filename];
                    return next;
                });
                setSelectedParts(prev => prev.filter(p => p !== filename));
                sendMessage('part-update', { partId: filename, action: 'remove' });

                // Broadcast screenshot deletion to other tabs
                if (typeof window !== 'undefined') {
                    const channel = new BroadcastChannel('my-gutachter-sync');
                    channel.postMessage({
                        type: 'SCREENSHOT_DELETED',
                        payload: { filename }
                    });
                    channel.close();
                }
            })
            .catch(() => showNotification(t('videoCall.removeScreenshotFailed')));
    };

    const handleJoin = async (id: string) => {
        if (!id) {
            showNotification(t('videoCall.invalidRoomId'));
            return;
        }

        setIsJoined(true);

        try {
            await startLocalStream(isGuest);
            init(id);
        } catch (e) {
            console.error('[VideoCall] Error joining meeting:', e);
            showNotification(t('videoCall.cameraMicError'));
            setIsJoined(false);
        }
    };

    const navigate = useNavigate();

    const handleEndCall = async () => {
        if (!isGuest && order?.claimType === 'Digital UVV') {
            setShowUvvModal(true);
            return;
        }
        await stopRecordingAndUpload();

        if (!isGuest) {
            sendMessage('end-meeting', {});
            setTimeout(() => {
                cleanup();
                setIsJoined(false);
                setIsMuted(false);
                setIsVideoEnabled(true);
                navigate('/video');
            }, 100);
        } else {
            cleanup();
            setIsJoined(false);
            setIsMuted(false);
            setIsVideoEnabled(true);
            window.location.reload();
        }
    };

    const handleToggleMic = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        toggleAudio(!newState);

        showNotification(newState ? t('videoCall.micOff') : t('videoCall.micOn'));
    };

    const handleToggleVideo = () => {
        const newState = !isVideoEnabled;
        setIsVideoEnabled(newState);
        toggleVideo(newState);
        showNotification(newState ? t('videoCall.camOn') : t('videoCall.camOff'));
    };

    const handleRemoteFlashlightToggle = (userId: string) => {
        const currentState = remoteUserFlashlightCapabilities[userId];
        if (!currentState || !currentState.hasFlashlight) {
            showNotification(t('videoCall.flashlightUnavailable'));
            return;
        }

        const newState = !currentState.isOn;
        sendMessage('flashlight-control', { turnOn: newState }, userId);

        setRemoteUserFlashlightCapabilities(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                isOn: newState
            }
        }));
    };



    /**
     * Detects if the current browser is Safari on iOS/iPadOS.
     * iOS Safari's ImageCapture.takePhoto() returns a full-sensor JPEG with EXIF
     * orientation that createImageBitmap() does NOT auto-correct — we must read
     * the EXIF tag and rotate the canvas ourselves.
     */
    const isIOS = (): boolean =>
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const captureScreenshot = async (videoElement: HTMLVideoElement, partId: string, userId: string) => {
        console.log('[Screenshot] captureScreenshot called');

        const uploadBlob = (blob: Blob) => {
            setIsSavingScreenshot(true);
            uploadScreenshot(blob, partId, roomId, userId)
                .then((filename) => {
                    showNotification(`${t('videoCall.screenshotSaved')} (${t('videoCall.user')} ${userId.slice(0, 4)})`);
                    setSelectedParts(prev => {
                        const filtered = prev.filter(p => p !== partId);
                        if (filtered.includes(filename)) return filtered;
                        return [...filtered, filename];
                    });
                    setSavedScreenshots(prev => {
                        const next = { ...prev };
                        delete next[partId];
                        next[filename] = filename;
                        return next;
                    });
                    sendMessage('part-update', { partId, action: 'remove' });
                    sendMessage('part-update', { partId: filename, action: 'add', filename });

                    // Broadcast screenshot taken to other tabs in real-time
                    if (typeof window !== 'undefined') {
                        const channel = new BroadcastChannel('my-gutachter-sync');
                        channel.postMessage({
                            type: 'SCREENSHOT_TAKEN',
                            payload: {
                                partId,
                                filename,
                                url: `${API_BASE_URL}/screenshots/${roomId}/${filename}`
                            }
                        });
                        channel.close();
                    }
                })
                .catch(() => handleCaptureFailure(partId))
                .finally(() => setIsSavingScreenshot(false));
        };

        const canvas = canvasRef.current;
        if (!canvas || !videoElement) {
            handleCaptureFailure(partId);
            return;
        }

        const stream = videoElement.srcObject as MediaStream;
        const track = stream?.getVideoTracks()[0];
        const AnyWindow = window as any;

        // ─── Strategy 1: grabFrame() ──────────────────────────────────────────
        // grabFrame() returns an ImageBitmap of the LIVE stream frame at the
        // STREAM resolution (e.g. 1920×1080) — no EXIF concerns.
        // NOTE: For remote WebRTC tracks on iOS, grabFrame() may return the raw
        // landscape buffer regardless of CVO. We apply the same orientation
        // correction as Strategy 3 to be safe.
        if (track && track.readyState === 'live' && !track.muted &&
            typeof AnyWindow.ImageCapture !== 'undefined') {
            try {
                const imageCapture = new AnyWindow.ImageCapture(track);
                const bitmap: ImageBitmap = await imageCapture.grabFrame();
                console.log('[Screenshot] grabFrame() size:', bitmap.width, 'x', bitmap.height);

                // Check if the bitmap has the same orientation mismatch as the video display
                const rect = videoElement.getBoundingClientRect();
                const displayIsPortrait = rect.height > rect.width;
                const bufferIsLandscape = bitmap.width > bitmap.height;
                const cvoRotationActive = displayIsPortrait && bufferIsLandscape;

                if (cvoRotationActive) {
                    // Apply 90° CW rotation to correct iOS CVO landscape buffer → portrait output
                    const targetW = bitmap.height;  // portrait width
                    const targetH = bitmap.width;   // portrait height

                    const MAX_CANVAS_PIXELS = 16_777_216;
                    let finalW = targetW;
                    let finalH = targetH;
                    if (finalW * finalH > MAX_CANVAS_PIXELS) {
                        const scale = Math.sqrt(MAX_CANVAS_PIXELS / (finalW * finalH));
                        finalW = Math.floor(finalW * scale);
                        finalH = Math.floor(finalH * scale);
                    }

                    canvas.width = finalW;
                    canvas.height = finalH;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('no 2d context');

                    ctx.save();
                    ctx.translate(finalW, 0);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, finalH, finalW);
                    ctx.restore();
                    console.log('[Screenshot] grabFrame() iOS CVO fix applied:', finalW, 'x', finalH);
                } else {
                    // Normal path — bitmap orientation matches display
                    const drawn = drawBitmapWithOrientation(canvas, bitmap, 1);
                    if (!drawn) throw new Error('drawBitmap failed');
                }

                bitmap.close?.();
                const blob = await canvasToJpegBlobStable(canvas);
                uploadBlob(blob);
                return;
            } catch (grabErr) {
                console.warn('[Screenshot] grabFrame() failed, trying takePhoto()', grabErr);
            }
        }

        // ─── Strategy 2: takePhoto() with EXIF orientation correction ────────
        // takePhoto() on iOS returns a full-sensor JPEG (e.g. 4032×3024) with an
        // EXIF Orientation tag (typically 6 = 90° CW for landscape, 1 for portrait).
        // createImageBitmap() on Safari does NOT honour this tag, so we read it
        // ourselves and rotate the canvas before drawing.
        if (track && track.readyState === 'live' && !track.muted &&
            typeof AnyWindow.ImageCapture !== 'undefined') {
            try {
                const imageCapture = new AnyWindow.ImageCapture(track);
                const photoBlob: Blob = await imageCapture.takePhoto();
                console.log('[Screenshot] takePhoto() blob size:', photoBlob.size,
                    'type:', photoBlob.type);

                // Read EXIF orientation BEFORE decoding — must parse the raw JPEG bytes
                const orientation = await readExifOrientation(photoBlob);
                console.log('[Screenshot] EXIF orientation:', orientation);

                // createImageBitmap with { imageOrientation: 'none' } is explicit:
                // we do NOT want the browser to auto-correct (behaviour is inconsistent
                // across browsers and iOS versions), we correct it ourselves below.
                const bmp = await createImageBitmap(photoBlob, { imageOrientation: 'none' });
                console.log('[Screenshot] Bitmap size (pre-rotation):', bmp.width, 'x', bmp.height);

                const drawn = drawBitmapWithOrientation(canvas, bmp, orientation);
                bmp.close?.();
                if (!drawn) throw new Error('drawBitmap failed');

                console.log('[Screenshot] Canvas size (post-rotation):', canvas.width, 'x', canvas.height);
                const blob = await canvasToJpegBlobStable(canvas);
                uploadBlob(blob);
                return;
            } catch (photoErr) {
                console.warn('[Screenshot] takePhoto() failed, falling back to video draw', photoErr);
            }
        }

        // ─── Strategy 3: drawImage from <video> element ───────────────────────
        // Last resort — reads the currently displayed frame directly from the
        // <video> element.
        //
        // ⚠️  iOS CVO DISTORTION FIX:
        // iOS Safari transmits a raw LANDSCAPE sensor buffer (e.g. 1920×1080) and
        // attaches a CVO RTP header tag to tell the GPU to rotate it 90° for display.
        // The GPU rotation is purely cosmetic — drawImage() ignores it entirely and
        // pulls the raw landscape buffer. If we naively size the canvas to the
        // *apparent* portrait dimensions (e.g. 1080×1920), the landscape pixels get
        // squashed horizontally and stretched vertically: severe distortion.
        //
        // Solution: Detect when videoWidth/videoHeight are aspect-ratio-inverted
        // relative to the display container. When they are, swap them to match the
        // true buffer layout, then use the 9-parameter drawImage() with "object-fit:
        // cover" math to crop and draw the correct region — pixel-perfect, no stretch.
        try {
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

            let vw = videoElement.videoWidth;
            let vh = videoElement.videoHeight;
            console.log('[Screenshot] Canvas fallback, raw video size:', vw, 'x', vh);

            if (!vw || !vh) {
                handleCaptureFailure(partId, t('videoCall.screenshotFailed'));
                return;
            }

            // ── iOS orientation detection ─────────────────────────────────────
            // Compare the raw buffer aspect ratio vs. the rendered display ratio.
            // If they are inverted (one is >1 and the other <1), the browser GPU is
            // applying a 90/270° CVO rotation to display the stream upright. In that
            // case we must swap vw/vh so the canvas matches the BUFFER, not the CSS.
            const rect = videoElement.getBoundingClientRect();
            const displayIsPortrait = rect.height > rect.width;
            const bufferIsLandscape = vw > vh;
            const cvoRotationActive = displayIsPortrait && bufferIsLandscape;

            // When CVO is active the "logical" portrait dimensions are (vh × vw).
            // Set the canvas to those so the final image appears upright.
            const targetW = cvoRotationActive ? vh : vw;   // output canvas width
            const targetH = cvoRotationActive ? vw : vh;   // output canvas height

            // Guard against the iOS 16-megapixel canvas memory limit
            const MAX_CANVAS_PIXELS = 16_777_216;
            let finalW = targetW;
            let finalH = targetH;
            if (finalW * finalH > MAX_CANVAS_PIXELS) {
                const scale = Math.sqrt(MAX_CANVAS_PIXELS / (finalW * finalH));
                finalW = Math.floor(finalW * scale);
                finalH = Math.floor(finalH * scale);
                console.warn(`[Screenshot] Canvas clamped to ${finalW}×${finalH} (iOS memory limit)`);
            }

            canvas.width = finalW;
            canvas.height = finalH;
            const ctx = canvas.getContext('2d');
            if (!ctx) { handleCaptureFailure(partId); return; }

            if (cvoRotationActive) {
                // ── Object-fit:cover crop of the landscape buffer into portrait canvas ──
                // The raw buffer is vw×vh (landscape). We want to fill a portrait canvas
                // of finalW×finalH (portrait). Scale to fill height, then centre-crop width.
                //
                //   scale   = finalH / vw   (buffer width maps to canvas height after 90° rot)
                //   scaled source width seen in canvas space = vh * scale
                //
                // We rotate the canvas context by 90° CW (same rotation the GPU was applying)
                // and draw the landscape buffer into it, cropping to fit.
                const scaleToFill = finalH / vw;            // how much to scale the buffer
                const scaledBufH = Math.round(vh * scaleToFill); // scaled buffer height

                // Centre-crop: trim excess from top and bottom of scaled buffer
                const cropTop = Math.max(0, Math.round((scaledBufH - finalW) / 2));

                // Source sub-rectangle (in raw buffer pixel space) for the centre-crop
                const srcScale = 1 / scaleToFill;
                const srcX = 0;
                const srcY = Math.round(cropTop * srcScale);
                const srcW = vw;
                const srcH = Math.round(finalW * srcScale);

                // Rotate canvas 90° CW so landscape buffer paints as portrait
                ctx.save();
                ctx.translate(finalW, 0);
                ctx.rotate(Math.PI / 2);
                // After rotation the drawing space is finalH wide × finalW tall
                // Draw the source sub-rect into the full rotated canvas
                ctx.drawImage(videoElement, srcX, srcY, srcW, srcH, 0, 0, finalH, finalW);
                ctx.restore();

                console.log('[Screenshot] iOS CVO portrait fix applied:', finalW, 'x', finalH,
                    '| src rect:', srcX, srcY, srcW, srcH);
            } else {
                // ── Normal (Android / desktop) path ──────────────────────────────────
                // Buffer and canvas are already the same orientation; draw directly.
                ctx.drawImage(videoElement, 0, 0, vw, vh, 0, 0, finalW, finalH);
            }

            const blob = await canvasToJpegBlobStable(canvas);
            uploadBlob(blob);
        } catch {
            handleCaptureFailure(partId);
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/guest-video?roomId=${roomId}&role=guest`;
        navigator.clipboard.writeText(url)
            .then(() => showNotification(t('videoCall.linkCopied')))
            .catch(() => prompt(t('videoCall.copyLinkPrompt'), url));
    };

    if (!isJoined) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-dark-900 text-white p-4">
                <div className="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold mb-6">{t('videoCall.joinMeeting')}</h2>

                    {!roomId ? (
                        <div className="text-red-500 font-medium mb-6">
                            {t('videoCall.invalidLink')}
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border-primary)]">
                                <span className="text-sm font-semibold text-[var(--color-text-primary)] block mb-1">{t('videoCall.joinWelcome')}</span>
                                <span className="text-xs text-[var(--color-text-muted)] block">{t('videoCall.joinInstruction')}</span>
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={() => handleJoin(roomId)}
                                    className="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-200 w-full"
                                >
                                    {t('videoCall.joinNow')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div >
        );
    }

    const remoteVideoEntries = Array.from(remoteStreams.entries()).filter(([, stream]) => stream.getVideoTracks().length > 0);
    const audioOnlyEntries = Array.from(remoteStreams.entries()).filter(([, stream]) => stream.getVideoTracks().length === 0);
    const primaryRemote = remoteVideoEntries.length > 0 ? remoteVideoEntries[0] : null;
    const primaryRemoteId = primaryRemote ? primaryRemote[0] : null;
    const primaryRemoteStream = primaryRemote ? primaryRemote[1] : null;

    const organiserControlUid = !isGuest ? primaryRemoteId : null;

    return (
        <div className={clsx("relative h-[100dvh] w-full bg-dark-900 flex flex-col overflow-hidden", isGuest ? "guest-mode" : "")}>
            {/* Two-tab workflow: open this order's vehicle report in a new tab (T7.7). Expert only. */}

            {isGuest && recordingConsent === 'pending' && (
                <div className="absolute inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-dark-800 border border-gray-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl animate-fade-in">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Video size={32} className="animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">{t('videoCall.recordingConsent.title')}</h2>
                        <p className="text-gray-300 text-sm mb-8 leading-relaxed">
                            {t('videoCall.recordingConsent.description')}
                        </p>
                        <button
                            onClick={handleAcceptRecording}
                            className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition-all w-full shadow-lg hover:shadow-orange-500/20"
                        >
                            {t('videoCall.recordingConsent.acceptButton')}
                        </button>
                    </div>
                </div>
            )}

            {notification && !isUploadingVideo && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                    <div className="bg-dark-800 text-white px-6 py-3 rounded-full shadow-lg border border-gray-700 flex items-center gap-2">
                        <span>{notification}</span>
                    </div>
                </div>
            )}

            {isUploadingVideo && (
                <div className="absolute inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-dark-800 border border-[var(--color-primary-orange)] p-8 rounded-2xl max-w-sm w-full text-center shadow-[0_0_40px_rgba(255,107,53,0.3)] animate-pulse">
                        <div className="w-16 h-16 border-4 border-[var(--color-primary-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h2 className="text-xl font-bold text-white mb-2">{t('videoCall.savingVideo')}</h2>
                        <p className="text-gray-400 text-sm">{t('videoCall.pleaseWait')}</p>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-2 lg:p-4 min-h-0">
                <div className={clsx("flex-grow relative bg-dark-800 rounded-2xl border border-gray-800 transition-all overflow-hidden", isGuest ? "w-full" : "w-full lg:w-2/3")}>
                    {!isGuest && roomId && (
                        <div className="absolute top-4 right-4 z-30">
                            <OpenOtherAppTab
                                target="report"
                                caseNumber={roomId}
                                className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-dark-800/80 hover:bg-dark-700 px-3 py-1.5 rounded-lg border border-gray-700 backdrop-blur-sm transition-colors cursor-pointer"
                            />
                        </div>
                    )}
                    <div className="relative w-full h-full bg-black">
                        {audioOnlyEntries.map(([uid, stream]) => (
                            <AudioStream key={uid} stream={stream} />
                        ))}

                        {((isGuest && !localStream) || (!isGuest && !primaryRemoteStream)) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <CarInspectionLoader text={t('videoCall.waiting')} size="lg" />
                                <div className="mt-4 text-xs text-gray-500 font-mono">
                                    {connectionStates.size > 0 ? (
                                        Array.from(connectionStates.entries()).map(([uid, state]) => (
                                            <div key={uid}>User {uid.slice(0, 4)}: {state}</div>
                                        ))
                                    ) : (
                                        <div>{t('videoCall.waiting')}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!isGuest && primaryRemoteId && primaryRemoteStream && (
                            <div className="absolute inset-0">
                                <RemoteVideo
                                    userId={primaryRemoteId}
                                    stream={primaryRemoteStream}
                                    isHost={!isGuest}
                                    capabilities={remoteUserCapabilities[primaryRemoteId]}
                                    currentZoom={remoteUserCapabilities[primaryRemoteId]?.current}
                                    onZoomChange={(newZoom) => {
                                        sendMessage('zoom-control', { zoom: newZoom }, primaryRemoteId);
                                        setRemoteUserCapabilities(prev => ({
                                            ...prev,
                                            [primaryRemoteId]: { ...prev[primaryRemoteId], current: newZoom }
                                        }));
                                    }}
                                    muted={false}
                                />
                                {placeholderIndex !== -1 && overlayVisible && (
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8 z-20">
                                        <img
                                            src={CAR_PLACEHOLDERS[placeholderIndex]}
                                            alt="car placeholder guide"
                                            className="w-full h-full object-contain select-none opacity-transition"
                                            style={{
                                                opacity: overlayOpacity / 100,
                                                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))',
                                            }}
                                            draggable={false}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {isGuest && localStream && (
                            <div className="absolute inset-0">
                                <RemoteVideo userId="Me" stream={localStream} isHost={false} muted={true} />
                                {placeholderIndex !== -1 && overlayVisible && (
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8 z-20">
                                        <img
                                            src={CAR_PLACEHOLDERS[placeholderIndex]}
                                            alt="car placeholder guide"
                                            className="w-full h-full object-contain select-none"
                                            style={{
                                                opacity: overlayOpacity / 100,
                                                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))',
                                            }}
                                            draggable={false}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Overlay Controls */}
                        {placeholderIndex !== -1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 z-30 transition-all hover:bg-black/80 shadow-2xl">
                                <button
                                    onClick={() => {
                                        const next = !overlayVisible;
                                        setOverlayVisible(next);
                                        sendMessage('sync-overlay', { visible: next });
                                    }}
                                    className={clsx(
                                        "p-1.5 rounded-full transition-all",
                                        overlayVisible ? "bg-primary text-white" : "bg-dark-700 text-gray-400 hover:text-white"
                                    )}
                                    title={overlayVisible ? t('videoCall.hideOverlay') : t('videoCall.showOverlay')}
                                >
                                    {overlayVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>

                                {(!isGuest) && (
                                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                                        <button
                                            onClick={() => {
                                                let nextIndex = placeholderIndex - 1;
                                                if (nextIndex < -1) nextIndex = CAR_PLACEHOLDERS.length - 1;
                                                setPlaceholderIndex(nextIndex);
                                                sendMessage('sync-overlay', { placeholderIndex: nextIndex });
                                            }}
                                            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                            title={t('videoCall.prevPlaceholder')}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-[10px] font-bold text-white/50 w-12 text-center uppercase tracking-tighter">
                                            {`Guide ${placeholderIndex + 1}`}
                                        </span>
                                        <button
                                            onClick={() => {
                                                let nextIndex = placeholderIndex + 1;
                                                if (nextIndex >= CAR_PLACEHOLDERS.length) nextIndex = -1;
                                                setPlaceholderIndex(nextIndex);
                                                sendMessage('sync-overlay', { placeholderIndex: nextIndex });
                                            }}
                                            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                            title={t('videoCall.nextPlaceholder')}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}

                                <div className={clsx("flex items-center gap-3 transition-opacity", !overlayVisible && "opacity-30 pointer-events-none")}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={overlayOpacity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setOverlayOpacity(val);
                                            sendMessage('sync-overlay', { opacity: val });
                                        }}
                                        className="w-24 lg:w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <span className="text-[10px] font-mono text-white/70 w-8">{overlayOpacity}%</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setPlaceholderIndex(-1);
                                        sendMessage('sync-overlay', { placeholderIndex: -1 });
                                    }}
                                    className="ml-1 p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-red-500 hover:text-white transition-all"
                                    title={t('videoCall.clearOverlay')}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {(!isGuest) && (
                    <div className={clsx(
                        "transition-all duration-300 ease-in-out flex flex-col bg-[var(--color-bg-card)] shadow-xl overflow-hidden",
                        isMobile ? (showMobileCarOverlay ? "fixed inset-0 z-50 rounded-none w-full h-full" : "hidden") : "hidden lg:block w-full lg:w-1/3 h-auto rounded-2xl"
                    )}>
                        {isMobile && (
                            <div className="flex justify-between items-center p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)]">
                                <h3 className="font-bold text-[var(--color-text-primary)]">{t('videoCall.carView')}</h3>
                                <button onClick={() => setShowMobileCarOverlay(false)} className="p-2 bg-[var(--color-bg-hover)] rounded-full">
                                    <X size={20} className="text-[var(--color-text-secondary)]" />
                                </button>
                            </div>
                        )}

                        {/* Tab selection in Video Call sidebar */}
                        <div className="flex border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex-shrink-0 overflow-x-auto">
                            <button
                                onClick={() => setExpertSideTab('2d')}
                                className={clsx(
                                    "flex-1 min-w-[60px] py-3 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap px-2",
                                    expertSideTab === '2d'
                                        ? "text-[var(--color-primary-orange)] bg-[var(--color-bg-card)]"
                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                                )}
                            >
                                {t('videoCall.2dView', { defaultValue: '2D Car View' })}
                                {expertSideTab === '2d' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-orange)] shadow-[0_-2px_6px_rgba(255,107,53,0.3)]"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setExpertSideTab('slots')}
                                className={clsx(
                                    "flex-1 min-w-[60px] py-3 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap px-2",
                                    expertSideTab === 'slots'
                                        ? "text-[var(--color-primary-orange)] bg-[var(--color-bg-card)]"
                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                                )}
                            >
                                {t('videoCall.reportSlots', { defaultValue: 'Foto-Slots' })}
                                {expertSideTab === 'slots' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-orange)] shadow-[0_-2px_6px_rgba(255,107,53,0.3)]"></div>
                                )}
                            </button>
                            {order?.claimType === 'Digital UVV' && (
                                <button
                                    onClick={() => setExpertSideTab('uvv')}
                                    className={clsx(
                                        "flex-1 min-w-[60px] py-3 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap px-2",
                                        expertSideTab === 'uvv'
                                            ? "text-[var(--color-primary-orange)] bg-[var(--color-bg-card)]"
                                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                                    )}
                                >
                                    {t('videoCall.uvvChecklist', { defaultValue: 'UVV Liste' })}
                                    {expertSideTab === 'uvv' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-orange)] shadow-[0_-2px_6px_rgba(255,107,53,0.3)]"></div>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => setExpertSideTab('report')}
                                className={clsx(
                                    "flex-1 min-w-[60px] py-3 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap px-2",
                                    expertSideTab === 'report'
                                        ? "text-[var(--color-primary-orange)] bg-[var(--color-bg-card)]"
                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                                )}
                            >
                                {t('videoCall.reportFields', { defaultValue: 'Bericht' })}
                                {expertSideTab === 'report' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-orange)] shadow-[0_-2px_6px_rgba(255,107,53,0.3)]"></div>
                                )}
                            </button>
                        </div>

                        <div className="max-h-[100%] flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                            {expertSideTab === '2d' ? (
                                <CarOverlay
                                    onPartSelected={(partName: string | null) => {
                                        if (partName) {
                                            if (remoteStreams.size > 1) {
                                                setPendingCapturePart(partName);
                                            } else {
                                                sendMessage('part-update', { partId: partName, action: 'add' });
                                                setSelectedParts(prev => [...prev, partName]);

                                                if (remoteStreams.size > 0) {
                                                    const [firstUserId] = remoteStreams.keys();
                                                    const videoEl = document.getElementById(`video-${firstUserId}`) as HTMLVideoElement;
                                                    if (videoEl) {
                                                        captureScreenshot(videoEl, partName, firstUserId);
                                                    } else {
                                                        handleCaptureFailure(partName, t('videoCall.videoNotFound'));
                                                    }
                                                } else {
                                                    handleCaptureFailure(partName, t('videoCall.waiting'));
                                                }
                                            }
                                        }
                                    }}
                                    onPartHover={setHoveredPart}
                                    selectedParts={selectedParts}
                                    savedScreenshots={savedScreenshots}
                                    onViewScreenshot={(filename) => setViewingScreenshot(filename)}
                                    svgContainerStyle={{ width: '85%', height: '85%' }}
                                />
                            ) : expertSideTab === 'slots' ? (
                                <VehicleReportStepsPanel
                                    order={order}
                                    roomId={roomId}
                                    savedScreenshots={savedScreenshots}
                                    onCapture={(slotId) => {
                                        if (remoteStreams.size > 1) {
                                            setPendingCapturePart(slotId);
                                        } else if (remoteStreams.size > 0) {
                                            const [firstUserId] = remoteStreams.keys();
                                            const videoEl = document.getElementById(`video-${firstUserId}`) as HTMLVideoElement;
                                            if (videoEl) {
                                                captureScreenshot(videoEl, slotId, firstUserId);
                                            } else {
                                                handleCaptureFailure(slotId, t('videoCall.videoNotFound'));
                                            }
                                        } else {
                                            handleCaptureFailure(slotId, t('videoCall.waiting'));
                                        }
                                    }}
                                    onDelete={(filename) => handleDeleteScreenshot(filename)}
                                    onView={(filename) => setViewingScreenshot(filename)}
                                />
                            ) : expertSideTab === 'uvv' ? (
                                order ? (
                                    <UvvInlineChecklistPanel
                                        order={order}
                                        roomId={roomId}
                                        onComplete={() => {
                                            showNotification(t('uvv.checklist.completed', { defaultValue: 'UVV-Prüfung abgeschlossen!' }));
                                            setExpertSideTab('2d');
                                        }}
                                    />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center p-8 text-[var(--color-text-muted)] text-xs text-center">
                                        {t('videoCall.loadingOrder', { defaultValue: 'Auftragsdaten werden geladen…' })}
                                    </div>
                                )
                            ) : (
                                /* 'report' tab */
                                <div className="sidebar-embedded flex-1 flex flex-col overflow-y-auto custom-scrollbar h-full">
                                    <ReportFormPage />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showGallery && !isGuest && (
                <div className="flex-none h-32 bg-dark-800 border-t border-gray-700 flex flex-col">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Images size={16} />
                            {t('videoCall.gallery')}
                            <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {Object.keys(savedScreenshots).length}
                            </span>
                        </h3>
                        <button onClick={() => setShowGallery(false)} className="text-gray-400 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-2 flex gap-2">
                        {Object.keys(savedScreenshots).length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm italic">
                                {t('videoCall.noImages')}
                            </div>
                        ) : (
                            Object.entries(savedScreenshots).map(([partKey, filename]) => {
                                const partId = getPartIdFromKey(partKey);
                                return (
                                    <div
                                        key={partKey}
                                        className="relative flex-none h-full aspect-[4/3] rounded-lg overflow-hidden border border-gray-600 hover:border-primary transition-all group animate-fade-in"
                                    >
                                        <img
                                            onClick={() => setViewingScreenshot(filename)}
                                            src={`${API_BASE_URL}/screenshots/${roomId}/${filename}`}
                                            alt={partId}
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate text-center pointer-events-none font-medium">
                                            {t(`carParts.${partId}`, { defaultValue: partId.split('_').join(' ') })}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteScreenshot(filename)}
                                            className="absolute top-1 right-1 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-md transform scale-90 group-hover:scale-100 z-10"
                                            title={t('common.delete', 'Delete')}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {viewingScreenshot && (() => {
                const partId = getPartIdFromKey(viewingScreenshot);
                const partName = t(`carParts.${partId}`, { defaultValue: partId.split('_').join(' ') });
                return (
                    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
                        <div className="relative bg-dark-900 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-dark-950 shadow-sm z-20">
                                <h3 className="text-sm sm:text-base font-bold text-white truncate pr-4 flex items-center gap-2">
                                    <Camera size={18} className="text-[var(--color-primary-orange)]" />
                                    <span>{partName}</span>
                                </h3>
                                <div className="flex items-center space-x-2">
                                    {/* Download button */}
                                    <button
                                        onClick={() => window.open(`${API_BASE_URL}/screenshots/${roomId}/${viewingScreenshot}`, '_blank')}
                                        className="p-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                                        title={t('common.downloadImage', { defaultValue: 'Download Image' })}
                                    >
                                        <Download size={16} />
                                        <span className="hidden sm:inline">{t('common.download', { defaultValue: 'Download' })}</span>
                                    </button>

                                    {/* Remove / Delete button */}
                                    <button
                                        onClick={() => {
                                            handleDeleteScreenshot(viewingScreenshot);
                                            setViewingScreenshot(null);
                                        }}
                                        className="p-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                                        title={t('common.delete', { defaultValue: 'Delete' })}
                                    >
                                        <Trash2 size={16} />
                                        <span>{t('common.remove', { defaultValue: 'Remove' })}</span>
                                    </button>

                                    {/* Close button */}
                                    <button
                                        onClick={() => setViewingScreenshot(null)}
                                        className="p-1.5 bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                                        title={t('common.close', { defaultValue: 'Close' })}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Image View */}
                            <div className="flex-1 bg-black rounded-b-2xl overflow-auto flex items-center justify-center p-4 relative min-h-[300px]">
                                <img
                                    src={`${API_BASE_URL}/screenshots/${roomId}/${viewingScreenshot}`}
                                    alt={partName}
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                                />
                            </div>
                        </div>
                    </div>
                );
            })()}

            {pendingCapturePart && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-dark-800 p-6 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{t('videoCall.selectUserToCapture')}</h3>
                            <button
                                onClick={() => setPendingCapturePart(null)}
                                className="p-2 bg-dark-700 rounded-full hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {Array.from(remoteStreams.keys()).map((userId) => (
                                <button
                                    key={userId}
                                    onClick={() => {
                                        sendMessage('part-update', { partId: pendingCapturePart, action: 'add' });
                                        setSelectedParts(prev => [...prev, pendingCapturePart]);

                                        const videoEl = document.getElementById(`video-${userId}`) as HTMLVideoElement;
                                        if (videoEl) {
                                            captureScreenshot(videoEl, pendingCapturePart, userId);
                                        } else {
                                            handleCaptureFailure(pendingCapturePart, t('videoCall.videoNotFound'));
                                        }
                                        setPendingCapturePart(null);
                                    }}
                                    className="flex items-center p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-left group"
                                >
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                                        {userId.slice(0, 2)}
                                    </div>
                                    <div>
                                        <div className="font-medium text-white group-hover:text-primary transition-colors">
                                            {t('videoCall.user')} {userId.slice(0, 4)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {t('videoCall.clickToCaptureThisUser')}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isSavingScreenshot && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <CarInspectionLoader text={t('videoCall.savingScreenshot')} size="lg" />
                </div>
            )}

            {/* Participant Info Overlay (Host Only) */}
            {!isGuest && (pName || pEmail || pMobile) && (
                <div className="absolute top-4 left-4 z-50 flex flex-col gap-1 pointer-events-none">
                    {pName && (
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 shadow-xl animate-fade-in">
                            <User size={14} className="text-primary" />
                            <span className="text-white text-sm font-bold tracking-tight">{pName}</span>
                        </div>
                    )}
                    {(pEmail || pMobile) && (
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex flex-col gap-0.5 shadow-xl animate-fade-in delay-100">
                            {pEmail && (
                                <div className="flex items-center gap-2">
                                    <Mail size={12} className="text-gray-400" />
                                    <span className="text-gray-200 text-[11px] font-medium">{pEmail}</span>
                                </div>
                            )}
                            {pMobile && (
                                <div className="flex items-center gap-2">
                                    <Smartphone size={12} className="text-gray-400" />
                                    <span className="text-gray-200 text-[11px] font-medium">{pMobile}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="sticky bottom-0 h-auto pb-2 lg:pb-0 lg:h-20 py-2 bg-dark-900/90 backdrop-blur-md border-t border-gray-800 flex flex-col md:flex-row items-center justify-between px-2 lg:px-8 gap-2 z-40">
                <div className="flex-1 flex items-center justify-center md:justify-start gap-4 min-w-0 w-full md:w-auto">
                    {!isGuest && (
                        <div className="text-white font-medium flex items-center gap-2 min-w-0">
                            <span className="truncate">{roomId}</span>
                            <button onClick={copyLink} className="flex-shrink-0 p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors" title={t('videoCall.copyInfo')}>
                                <Copy size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-auto flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center justify-center gap-3 lg:gap-4 flex-wrap">
                        {!isGuest && organiserControlUid && (
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                {remoteUserFlashlightCapabilities[organiserControlUid]?.hasFlashlight && (
                                    <button
                                        onClick={() => handleRemoteFlashlightToggle(organiserControlUid)}
                                        className={clsx(
                                            "px-3 py-2 rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-2 border border-white/10",
                                            remoteUserFlashlightCapabilities[organiserControlUid]?.isOn
                                                ? "bg-amber-500 text-white shadow-md"
                                                : "bg-dark-700 text-gray-200 hover:bg-amber-500/80"
                                        )}
                                        title={remoteUserFlashlightCapabilities[organiserControlUid]?.isOn ? t('videoCall.turnOffFlashlight') : t('videoCall.turnOnFlashlight')}
                                    >
                                        {remoteUserFlashlightCapabilities[organiserControlUid]?.isOn ? (
                                            <Zap size={16} className="fill-current" />
                                        ) : (
                                            <ZapOff size={16} />
                                        )}
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        const next = placeholderIndex === -1 ? 0 : -1;
                                        setPlaceholderIndex(next);
                                        sendMessage('sync-overlay', { placeholderIndex: next });
                                    }}
                                    className={clsx(
                                        "px-3 py-2 rounded-full text-[12px] font-semibold transition-all flex items-center justify-center gap-2 border border-white/10",
                                        placeholderIndex !== -1
                                            ? "bg-primary text-white shadow-md"
                                            : "bg-dark-700 text-gray-200 hover:bg-primary/80"
                                    )}
                                    title={placeholderIndex !== -1 ? t('videoCall.hideGuides') : t('videoCall.showGuides')}
                                >
                                    <CarFront size={16} />
                                </button>

                                {(() => {
                                    const uid = organiserControlUid;
                                    const caps = remoteUserCapabilities[uid];
                                    const hasCaps = !!(caps && typeof caps.min === 'number' && typeof caps.max === 'number' && caps.max > caps.min);
                                    const min = caps?.min ?? 1;
                                    const max = caps?.max ?? 1;

                                    const cameraFacing = remoteUserCameraFacing[uid];
                                    const f1Label = cameraFacing === 'user' ? 'B' : 'F';

                                    const presets = [
                                        { label: f1Label, value: 0.5, title: t('videoCall.cameraFlip'), isCameraFlip: true },
                                        { label: 'P', value: 1, title: t('videoCall.zoomPresetP') },
                                        { label: 'S1', value: 2, title: t('videoCall.zoomPresetS1') },
                                        { label: 'S2', value: 3, title: t('videoCall.zoomPresetS2') },
                                        { label: 'S3', value: 4, title: t('videoCall.zoomPresetS3') },
                                        { label: 'S4', value: 5, title: t('videoCall.zoomPresetS4') },
                                        { label: 'S5', value: 6, title: t('videoCall.zoomPresetS5') },
                                        { label: 'S6', value: 7, title: t('videoCall.zoomPresetS6') },
                                    ];

                                    return presets.map(({ label, value, title, isCameraFlip }) => {
                                        const isEnabled = isCameraFlip ? true : (hasCaps && value >= min && value <= max);
                                        const isActive = isCameraFlip
                                            ? (cameraFacing === 'user')
                                            : Math.abs((caps?.current ?? min) - value) < 0.1;

                                        return (
                                            <button
                                                key={label}
                                                disabled={!isEnabled}
                                                onClick={() => {
                                                    if (!isEnabled) return;
                                                    if (isCameraFlip) {
                                                        const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
                                                        sendMessage('camera-flip-control', { facingMode: newFacing }, uid);
                                                        setRemoteUserCameraFacing(prev => ({
                                                            ...prev,
                                                            [uid]: newFacing
                                                        }));
                                                    } else {
                                                        sendMessage('zoom-control', { zoom: value }, uid);
                                                        setRemoteUserCapabilities(prev => ({
                                                            ...prev,
                                                            [uid]: { ...prev[uid], current: value }
                                                        }));
                                                    }
                                                }}
                                                className={clsx(
                                                    "w-10 h-10 flex items-center justify-center rounded-full text-[11px] font-bold transition-all border border-white/10",
                                                    isEnabled
                                                        ? isActive
                                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                            : "bg-dark-700 text-gray-200 hover:bg-dark-600 hover:text-white"
                                                        : "bg-black/20 text-white/20 cursor-not-allowed border-transparent"
                                                )}
                                                title={isEnabled
                                                    ? isCameraFlip
                                                        ? t('videoCall.cameraFlip')
                                                        : `${title} (${value.toFixed(1)}x)`
                                                    : t('videoCall.zoomNotSupportedDevice')
                                                }
                                            >
                                                {label}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        )}

                        <button onClick={handleToggleMic} className={clsx("p-3 lg:p-4 rounded-full transition-all duration-200", isMuted ? "bg-red-500 text-white" : "bg-dark-700 text-gray-200")}>
                            {isMuted ? <MicOff size={20} className="lg:w-6 lg:h-6" /> : <Mic size={20} className="lg:w-6 lg:h-6" />}
                        </button>

                        {isGuest && (
                            <>
                                <button onClick={handleToggleVideo} className={clsx("p-3 lg:p-4 rounded-full transition-all duration-200", !isVideoEnabled ? "bg-red-500 text-white" : "bg-dark-700 text-gray-200")}>
                                    {!isVideoEnabled ? <VideoOff size={20} className="lg:w-6 lg:h-6" /> : <Video size={20} className="lg:w-6 lg:h-6" />}
                                </button>

                                {isMobile && (
                                    <button
                                        onClick={async () => {
                                            if (isSwitchingLocalCamera) return;
                                            setIsSwitchingLocalCamera(true);
                                            try { await switchCamera(); }
                                            finally { setIsSwitchingLocalCamera(false); }
                                        }}
                                        disabled={isSwitchingLocalCamera}
                                        className={clsx(
                                            "p-3 lg:p-4 rounded-full transition-all duration-200",
                                            isSwitchingLocalCamera
                                                ? "bg-dark-700 text-gray-500 opacity-50 cursor-not-allowed"
                                                : "bg-dark-700 text-gray-200 hover:bg-gray-600"
                                        )}
                                    >
                                        <SwitchCamera size={20} className={isSwitchingLocalCamera ? 'animate-spin' : ''} />
                                    </button>
                                )}
                            </>
                        )}

                        {isMobile && !isGuest && (
                            <button onClick={() => setShowMobileCarOverlay(true)} className="p-3 lg:p-4 rounded-full bg-dark-700 text-gray-200 hover:bg-gray-600 transition-all duration-200">
                                <CarFront size={20} />
                            </button>
                        )}

                        {!isGuest && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-dark-700 text-gray-200 border border-white/5 max-w-[95vw]" title={t('videoCall.deviceInfo')}>
                                <Gauge size={18} className="text-gray-300" />
                                <div className="flex flex-col leading-tight">
                                    <div
                                        className="text-[11px] text-gray-300"
                                        title={`${t('videoCall.browser')}: ${localDeviceInfo?.browser || '-'}\n${t('videoCall.os')}: ${localDeviceInfo?.os || '-'}\n${t('videoCall.device')}: ${localDeviceInfo?.deviceName || '-'}`}
                                    >
                                        {localDeviceInfo ? `${localDeviceInfo.browser} • ${localDeviceInfo.os} • ${localDeviceInfo.deviceName}` : '-'}
                                    </div>
                                    <div className="text-[12px] font-semibold text-white" title={t('videoCall.speed')}>
                                        {localSpeedMbps.toFixed(2)} Mbps
                                    </div>
                                </div>
                            </div>
                        )}

                        <button onClick={handleEndCall} className="p-3 lg:p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 w-14 lg:w-16 flex items-center justify-center ml-2">
                            <Phone size={20} className="rotate-[135deg] lg:w-6 lg:h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 hidden md:flex items-center justify-end gap-3 w-full md:w-auto">
                    {!isGuest && (
                        <button
                            onClick={() => setShowGallery(!showGallery)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-3 rounded-full transition-colors font-medium",
                                showGallery
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "bg-dark-700 text-gray-300 hover:bg-dark-600 hover:text-white"
                            )}
                        >
                            <Images size={20} />
                            <span>{t('videoCall.gallery', { defaultValue: 'Gallery' })}</span>
                        </button>
                    )}
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {order?.claimType === 'Digital UVV' && !isGuest && order && (
                <UvvChecklistPanel
                    order={order}
                    roomId={roomId}
                    isOpen={showUvvModal}
                    onClose={() => setShowUvvModal(false)}
                    onComplete={() => {
                        sendMessage('end-meeting', {});
                        stopRecordingAndUpload().then(() => {
                            cleanup();
                            setIsJoined(false);
                            navigate('/video');
                        });
                    }}
                />
            )}
        </div>
    );
};
