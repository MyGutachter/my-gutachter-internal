import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, SwitchCamera, ZapOff, CheckCircle, AlertTriangle, Type, Barcode as BarcodeIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModalWrapper from './ModalWrapper';

interface VINScannerModalProps {
    expectedVin?: string;
    onValidated: (isValid: boolean, scannedVin: string) => void;
    onApply?: (scannedVin: string) => void;
    children: React.ReactNode;
}

declare global {
    interface Window {
        Html5QrcodeScanner: any;
        Html5Qrcode: any;
        Html5QrcodeSupportedFormats: any;
        Tesseract: any;
    }
}

const VINScannerModal: React.FC<VINScannerModalProps> = ({
    expectedVin = '',
    onValidated,
    onApply,
    children,
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [scannerReady, setScannerReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<any[]>([]);
    const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        isValid: boolean;
        scannedVin: string;
        isNew: boolean;
    } | null>(null);
    const [scanMode, setScanMode] = useState<'barcode' | 'text'>('barcode');
    const [isOCRProcessing, setIsOCRProcessing] = useState(false);
    const ocrIntervalRef = useRef<any>(null);

    const scannerRef = useRef<any>(null);
    const scannerId = 'vin-reader';

    // Load libraries from CDN
    useEffect(() => {
        if (open) {
            if (!window.Html5Qrcode) {
                const script = document.createElement('script');
                script.src = "https://unpkg.com/html5-qrcode";
                script.async = true;
                script.onload = () => {
                    setScannerReady(true);
                    window.Html5Qrcode.getCameras().then((devices: any[]) => {
                        setCameras(devices);
                        if (devices.length > 0 && !currentCameraId) {
                            setCurrentCameraId(devices[0].id);
                        }
                    }).catch((err: any) => console.error("Error getting cameras:", err));
                };
                document.body.appendChild(script);
            } else {
                setScannerReady(true);
                window.Html5Qrcode.getCameras().then(setCameras)
                    .catch((err: any) => console.error("Error getting cameras:", err));
            }

            if (!window.Tesseract) {
                const script = document.createElement('script');
                script.src = "https://unpkg.com/tesseract.js@v5.1.0/dist/tesseract.min.js";
                script.async = true;
                document.body.appendChild(script);
            }
        }
    }, [open, currentCameraId]);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
            } catch (err) {
                console.error('Failed to stop scanner:', err);
            }
            scannerRef.current = null;
        }
        if (ocrIntervalRef.current) {
            clearTimeout(ocrIntervalRef.current);
            ocrIntervalRef.current = null;
        }
        setIsTorchOn(false);
        setIsOCRProcessing(false);
    }, []);

    const handleDecodedText = useCallback((decodedText: string) => {
        const vin = decodedText.trim().toUpperCase();
        
        let cleanVin = '';
        const vinRegex = /[A-HJ-NPR-Z0-9]{17}/;
        const match = vin.match(vinRegex);
        
        if (match) {
            cleanVin = match[0];
        } else if (vin.length >= 17) {
            const last17 = vin.slice(-17);
            if (vinRegex.test(last17)) cleanVin = last17;
        }

        if (cleanVin.length === 17) {
            setValidationResult({ isValid: true, scannedVin: cleanVin, isNew: true });
            onValidated(true, cleanVin);
            
            if (onApply) {
                onApply(cleanVin);
            }
            
            setTimeout(() => {
                setOpen(false);
            }, 1000);
        }
    }, [onApply, onValidated]);

    const processOCRFrame = useCallback(async () => {
        if (!open || scanMode !== 'text' || !window.Tesseract) return;
        if (isOCRProcessing) {
             ocrIntervalRef.current = setTimeout(processOCRFrame, 500);
             return;
        }
        
        const video = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
        if (!video || video.readyState !== 4 || video.paused || video.ended) {
            ocrIntervalRef.current = setTimeout(processOCRFrame, 1000);
            return;
        }

        setIsOCRProcessing(true);

        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return;

            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            
            // Crop to the center viewfinder area for speed and accuracy
            const cropWidth = videoWidth * 0.8;
            const cropHeight = videoHeight * 0.35;
            const startX = (videoWidth - cropWidth) / 2;
            const startY = (videoHeight - cropHeight) / 2;

            canvas.width = cropWidth;
            canvas.height = cropHeight;
            
            // Enhanced image for OCR - contrast and grayscale help with stamped metal VINs
            context.filter = 'contrast(1.7) grayscale(1) brightness(1.1)';
            context.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            const result = await window.Tesseract.recognize(canvas, 'eng');
            const rawText = result.data.text.trim().toUpperCase();
            
            // 1. Remove symbols like * and spaces
            const cleanText = rawText.replace(/[^A-Z0-9]/g, '');
            
            if (cleanText) {
                const vinRegex = /[A-HJ-NPR-Z0-9]{17}/;
                
                // 2. Try direct match
                let vinMatch = cleanText.match(vinRegex);
                
                // 3. If no match, try fuzzy correction for common VIN OCR errors (No I, O, Q allowed in VINs)
                if (!vinMatch) {
                    const fuzzyText = cleanText
                        .replace(/O/g, '0')
                        .replace(/Q/g, '0')
                        .replace(/I/g, '1');
                    vinMatch = fuzzyText.match(vinRegex);
                }
                
                if (vinMatch) {
                    handleDecodedText(vinMatch[0]);
                }
            }
        } catch (err) {
            console.error("OCR Frame Error:", err);
        } finally {
            setIsOCRProcessing(false);
            // Schedule next frame only after current one is done to prevent overlapping
            if (open && scanMode === 'text') {
                ocrIntervalRef.current = setTimeout(processOCRFrame, 1000);
            }
        }
    }, [open, scanMode, isOCRProcessing, handleDecodedText]);

    const startScanner = useCallback(async (cameraId?: string) => {
        if (!window.Html5Qrcode) return;

        await stopScanner();

        const html5QrCode = new window.Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = {
            fps: 25,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const boxWidth = Math.min(viewfinderWidth * 0.95, 600);
                const boxHeight = 140;
                return { width: boxWidth, height: boxHeight };
            },
            formatsToSupport: [
                window.Html5QrcodeSupportedFormats.QR_CODE,
                window.Html5QrcodeSupportedFormats.CODE_128,
                window.Html5QrcodeSupportedFormats.CODE_39,
                window.Html5QrcodeSupportedFormats.CODE_93,
                window.Html5QrcodeSupportedFormats.CODABAR,
                window.Html5QrcodeSupportedFormats.ITF,
                window.Html5QrcodeSupportedFormats.EAN_13,
                window.Html5QrcodeSupportedFormats.EAN_8,
                window.Html5QrcodeSupportedFormats.DATA_MATRIX,
                window.Html5QrcodeSupportedFormats.PDF_417,
            ],
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        try {
            const cameraConfig = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" };
            
            await html5QrCode.start(
                cameraConfig,
                config,
                handleDecodedText,
                () => {}
            );

            // If we are in text mode, start the OCR loop
            if (scanMode === 'text') {
                if (ocrIntervalRef.current) clearTimeout(ocrIntervalRef.current);
                ocrIntervalRef.current = setTimeout(processOCRFrame, 1500);
            }
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setCameraError(t('step2.lookupError'));
        }
    }, [handleDecodedText, processOCRFrame, scanMode, stopScanner, t]);

    const toggleTorch = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                const newState = !isTorchOn;
                await scannerRef.current.applyVideoConstraints({
                    advanced: [{ torch: newState } as any]
                });
                setIsTorchOn(newState);
            } catch (err) {
                console.error("Torch not supported:", err);
            }
        }
    };

    const switchCamera = () => {
        if (cameras.length > 1) {
            const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
            const nextIndex = (currentIndex + 1) % cameras.length;
            const nextCameraId = cameras[nextIndex].id;
            setCurrentCameraId(nextCameraId);
            startScanner(nextCameraId);
        }
    };

    useEffect(() => {
        if (open && scannerReady) {
            startScanner();
        } else if (!open) {
            stopScanner();
            setValidationResult(null);
            setCameraError(null);
        }
    }, [open, scannerReady, startScanner, stopScanner]);

    return (
        <>
            <div onClick={() => setOpen(true)} className="contents">
                {children}
            </div>

            <ModalWrapper
                isOpen={open}
                onClose={() => setOpen(false)}
                title={t('step2.scanVin')}
                fullScreen
                showTitle={false}
                noPadding
                className="!bg-black"
            >
                <div className="flex flex-col h-full bg-black">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10">
                        <div className="flex flex-col">
                            <span className="text-white font-bold text-sm">{t('step2.scanVin')}</span>
                            <span className="text-white/60 text-[10px]">{t('step2.scannerDescription')}</span>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-2 rounded-full bg-white/10 text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scanner Area */}
                    <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-black">
                        <div id={scannerId} className="w-full h-full" />
                        
                        {/* Camera Controls Overlay */}
                        {!validationResult && !cameraError && (
                            <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
                                {cameras.length > 1 && (
                                    <button 
                                        onClick={switchCamera}
                                        className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 active:scale-95"
                                    >
                                        <SwitchCamera className="w-6 h-6" />
                                    </button>
                                )}
                                <button 
                                    onClick={toggleTorch}
                                    className={`p-3 rounded-full backdrop-blur-md border border-white/20 active:scale-95 ${
                                        isTorchOn ? 'bg-primary/80 text-white' : 'bg-black/40 text-white/70'
                                    }`}
                                >
                                    <Camera className="w-6 h-6" />
                                </button>
                                
                                <button 
                                    onClick={() => {
                                        const newMode = scanMode === 'barcode' ? 'text' : 'barcode';
                                        setScanMode(newMode);
                                        // Restart scanner to apply logic
                                        startScanner(currentCameraId || undefined);
                                    }}
                                    className={`p-3 rounded-full backdrop-blur-md border border-white/20 active:scale-95 transition-all ${
                                        scanMode === 'text' ? 'bg-primary text-white shadow-[0_0_15px_rgba(255,102,0,0.4)]' : 'bg-black/40 text-white/70'
                                    }`}
                                    title={scanMode === 'text' ? "Switch to Barcode" : "Switch to Text OCR"}
                                >
                                    {scanMode === 'text' ? <BarcodeIcon className="w-6 h-6" /> : <Type className="w-6 h-6" />}
                                </button>
                            </div>
                        )}

                        {/* Overlay with target box */}
                        {!validationResult && (
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                                <div className="w-full max-w-[550px] h-32 border-2 border-white/30 rounded-2xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                                    <div className="absolute inset-0 border-[3px] border-primary/40 rounded-2xl" />
                                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                    
                                    {/* Corner Accents */}
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />

                                    <div className="absolute -top-8 left-0 right-0 text-center text-white text-[11px] font-bold uppercase tracking-[0.2em] drop-shadow-md flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        {scanMode === 'text' ? 'Auto-Scanning OCR...' : 'Auto-Scanning Barcode...'}
                                    </div>
                                    
                                    {/* Scan line animation */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(255,102,0,0.8)] animate-scan-line" />
                                    
                                    {/* Processing indicator for OCR */}
                                    {isOCRProcessing && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 px-6 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
                                    <p className="text-white/80 text-[10px] font-medium text-center">
                                        {scanMode === 'text' 
                                            ? "Point camera at VIN text (Auto-captures)" 
                                            : "Point camera at VIN barcode (Auto-captures)"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Validation Feedback Overlay */}
                        {validationResult && validationResult.isValid && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
                                <div className="p-8 rounded-3xl flex flex-col items-center gap-5 max-w-[85%] text-center shadow-2xl bg-green-500/10 border border-green-500/30">
                                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <CheckCircle className="w-12 h-12 text-green-500 animate-bounce" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-white font-bold text-xl">
                                            {t('step2.scanSuccess')}
                                        </h4>
                                        <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                            <p className="text-green-400 text-sm font-mono tracking-wider break-all">{validationResult.scannedVin}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {cameraError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-8 text-center">
                                <ZapOff className="w-12 h-12 text-red-400" />
                                <p className="text-white/80 text-sm leading-relaxed">{cameraError}</p>
                                <button
                                    onClick={() => startScanner()}
                                    className="mt-2 px-6 py-2.5 rounded-full bg-white/10 text-white text-sm border border-white/20"
                                >
                                    {t('cameraOverlay.retry')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bottom Instructions */}
                    <div className="p-6 bg-black text-center space-y-2">
                        <p className="text-white/60 text-xs">
                            {t('step2.scannerDescription')}
                        </p>
                        <button
                            onClick={() => setOpen(false)}
                            className="w-full py-3 rounded-xl bg-white/5 text-white/80 font-medium hover:bg-white/10 transition-colors"
                        >
                            {t('step2.scanCancel')}
                        </button>
                    </div>
                </div>
            </ModalWrapper>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan-line {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 3;
                }
            `}} />
        </>
    );
};

export default VINScannerModal;
