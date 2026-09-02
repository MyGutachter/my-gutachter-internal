import { ArrowLeft, Calendar, Car, ChevronDown, ChevronUp, Download, Eye, FileText, Image as ImageIcon, Maximize2, RotateCcw, RotateCw, Video as VideoIcon, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { API_BASE_URL, getOrder, getRecordingUrls, getScreenshots } from '../../services/orderService';
import axiosInstance from '../../../../utils/api';
import type { Order } from '../../types';
import { CarOverlay } from '../../CarOverlay';
import CarInspectionLoader from '../../CarInspectionLoader';
import MeetingPhotoBar from './MeetingPhotoBar';
import { UvvCertificateViewer } from './UvvCertificateViewer';

/**
 * Post-meeting summary (T7.8) — faithful port of VideoExpert MeetingSummary.
 * Rewired to the merged order service + shared axios; behavior unchanged.
 */
const ALL_PARTS = [
    // Identification (1-5)
    { id: 'vehicle_registration_document', name: 'Vehicle registration document', category: 'Identification', number: 1 },
    { id: 'vin_number', name: 'VIN Number / Type plate', category: 'Identification', number: 2 },
    { id: 'Meter_reading', name: 'Meter reading', category: 'Identification', number: 3 },
    { id: 'Front', name: 'Front', category: 'Identification', number: 4 },
    { id: 'vehicle_view_front', name: 'Vehicle view front', category: 'Identification', number: 5 },

    // Overview images (6-11)
    { id: 'Overview_diagonal_front_left', name: 'Overview diagonal front left', category: 'Overview images', number: 6 },
    { id: 'Overview_diagonal_front_right', name: 'Overview diagonal front right', category: 'Overview images', number: 7 },
    { id: 'Overview_diagonal_rear_left', name: 'Overview diagonal rear left', category: 'Overview images', number: 8 },
    { id: 'Overview_diagonal_rear_right', name: 'Overview diagonal rear right', category: 'Overview images', number: 9 },
    { id: 'vehicle_photo_right_side', name: 'Vehicle photo, right side', category: 'Overview images', number: 10 },
    { id: 'vehicle_photo_left_side', name: 'Vehicle photo, left side', category: 'Overview images', number: 11 },

    // Light (12-15)
    { id: 'Headlight_on_the_left', name: 'Headlight on the left', category: 'Light', number: 12 },
    { id: 'Headlight_on_the_right', name: 'Headlight on the right', category: 'Light', number: 13 },
    { id: 'Left_rear_light', name: 'Left rear light', category: 'Light', number: 14 },
    { id: 'Taillights_right', name: 'Taillights right', category: 'Light', number: 15 },

    // Doors (16-19)
    { id: 'Front_left_door', name: 'Front left door', category: 'Doors', number: 16 },
    { id: 'Front_right_door', name: 'Front right door', category: 'Doors', number: 17 },
    { id: 'Rear_left_door', name: 'Rear left door', category: 'Doors', number: 18 },
    { id: 'Rear_right_door', name: 'Rear right door', category: 'Doors', number: 19 },

    // Panes, mirrors and glass (20-27)
    { id: 'windshield', name: 'Windshield', category: 'Panes, mirrors and glass', number: 20 },
    { id: 'rear_window', name: 'Rear window', category: 'Panes, mirrors and glass', number: 21 },
    { id: 'Front_left_door_window', name: 'Front left door window', category: 'Panes, mirrors and glass', number: 22 },
    { id: 'Front_right_door_window', name: 'Front right door window', category: 'Panes, mirrors and glass', number: 23 },
    { id: 'Rear_left_door_window', name: 'Rear left door window', category: 'Panes, mirrors and glass', number: 24 },
    { id: 'rear_right_door_window', name: 'Rear right door window', category: 'Panes, mirrors and glass', number: 25 },
    { id: 'Left_wing_mirror', name: 'Left wing mirror', category: 'Panes, mirrors and glass', number: 26 },
    { id: 'Right-hand_exterior_mirror', name: 'Right-hand exterior mirror', category: 'Panes, mirrors and glass', number: 27 },

    // Body and bumper (28-32)
    { id: 'Front_left_fender', name: 'Front left fender', category: 'Body and bumper', number: 28 },
    { id: 'front_right_fender', name: 'Front right fender', category: 'Body and bumper', number: 29 },
    { id: 'left_sill', name: 'Left side wall', category: 'Body and bumper', number: 30 },
    { id: 'Right_sill', name: 'Right side wall', category: 'Body and bumper', number: 31 },
    { id: 'bonnet', name: 'Bonnet', category: 'Body and bumper', number: 32 },

    // Roof (33-35)
    { id: 'Roof', name: 'Roof', category: 'Roof', number: 33 },
    { id: 'Dachrahmen_links', name: 'Dachrahmen links', category: 'Roof', number: 34 },
    { id: 'Roof_frame_right', name: 'Roof frame right', category: 'Roof', number: 35 },

    // Tailgate / Rear (36-39)
    { id: 'Tailgate', name: 'Tailgate / tailgate / rear door', category: 'Tailgate', number: 36 },
    { id: 'Heck', name: 'Heck', category: 'Tailgate', number: 37 },
    { id: 'Vehicle_view_from_the_rear', name: 'Vehicle view from the rear', category: 'Tailgate', number: 38 },
    { id: 'rear_bumper', name: 'Rear bumper', category: 'Tailgate', number: 39 },

    // Front bumper (40-42)
    { id: 'front_bumper', name: 'Front bumper', category: 'Front bumper', number: 40 },
    { id: 'Fuel_cap', name: 'Fuel cap', category: 'Front bumper', number: 41 },
    { id: 'EV_charging_cover', name: 'EV charging cover', category: 'Front bumper', number: 42 },

    // Wheels (43-46)
    { id: 'front_left_wheel', name: 'Front left wheel', category: 'Wheels', number: 43 },
    { id: 'front_right_wheel', name: 'Front right wheel', category: 'Wheels', number: 44 },
    { id: 'rear_left_wheel', name: 'Rear left wheel', category: 'Wheels', number: 45 },
    { id: 'rear_right_wheel', name: 'Rear right wheel', category: 'Wheels', number: 46 },

    // Sills (47-48)
    { id: 'left_sill_2', name: 'Left sill', category: 'Sills', number: 47 },
    { id: 'Right_sill_2', name: 'Right sill', category: 'Sills', number: 48 },

    // Other (49)
    { id: 'additional_images', name: 'Additional images', category: 'Other', number: 49 },
];

const getScreenshotUrl = (roomId: string, fileData: string) => {
    if (!fileData) return '';
    const clean = fileData.trim();
    if (clean.startsWith('http')) return clean;

    if (clean.startsWith('screenshots/') || clean.startsWith('uploads/')) {
        return `${API_BASE_URL}/${clean}`;
    }

    return `${API_BASE_URL}/screenshots/${roomId}/${clean}`;
};

// Regex matches underscore followed by 13 digits (millis) occurring near the end of string
const formatDateFromFilename = (filename: string) => {
    try {
        if (!filename) return '';
        const match = filename.match(/_(\d{13})(?:\.\w+)?$/);
        if (match && match[1]) {
            const timestamp = parseInt(match[1]);
            const date = new Date(timestamp);
            if (date.getFullYear() > 2020) {
                return date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }
        }
    } catch (e) {
        console.error('Error parsing date from filename:', filename, e);
    }
    return '';
};

const MeetingSummary = () => {
    const { t } = useTranslation();
    const { roomId } = useParams<{ roomId: string }>();
    const [loading, setLoading] = useState(true);
    const [selectedParts, setSelectedParts] = useState<string[]>([]);
    const [hoveredPart, setHoveredPart] = useState<{ id: string; name: string } | null>(null);
    const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'2d' | 'gallery' | 'video' | 'certificate'>('2d');
    const [imageSize, setImageSize] = useState<string | null>(null);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [mobileView, setMobileView] = useState<'car' | 'parts'>('car');
    const [rotation, setRotation] = useState(0);   // degrees: 0 | 90 | 180 | 270
    const [zoom, setZoom] = useState(1);            // 0.5 – 4.0
    const [showModalThumbnails, setShowModalThumbnails] = useState(false);
    const pinchStartDistRef = useRef<number | null>(null);
    const [order, setOrder] = useState<Order | null>(null);

    const [screenshotMap, setScreenshotMap] = useState<Record<string, string>>({});

    useEffect(() => {
        if (viewingScreenshot && roomId) {
            const url = getScreenshotUrl(roomId, viewingScreenshot);
            setImageSize(null);

            axiosInstance.head(url)
                .then((res) => {
                    const bytes = res.headers['content-length'];
                    if (bytes) {
                        const mb = (parseInt(String(bytes)) / (1024 * 1024)).toFixed(2);
                        setImageSize(`${mb} MB`);
                    }
                })
                .catch((err) => console.error('Failed to fetch image size for:', url, err));
        }
    }, [viewingScreenshot, roomId]);

    // Reset transforms when image changes
    useEffect(() => {
        setRotation(0);
        setZoom(1);
    }, [viewingScreenshot]);

    useEffect(() => {
        if (roomId) {
            getOrder(roomId).then((o) => {
                setOrder(o);
            }).catch((err) => {
                console.error('Failed to load order:', err);
            });

            getScreenshots(roomId).then((files) => {
                const map: Record<string, string> = {};
                const partsWithScreenshots: string[] = [];

                if (Array.isArray(files)) {
                    const sortedParts = [...ALL_PARTS].sort((a, b) => b.id.length - a.id.length);

                    files.forEach((file) => {
                        const part = sortedParts.find((p) => file === p.id || file.startsWith(p.id + '_'));
                        if (part) {
                            map[file] = file;
                            partsWithScreenshots.push(file);
                        }
                    });
                } else {
                    console.warn('getScreenshots returned non-array:', files);
                }

                setScreenshotMap(map);
                setSelectedParts(partsWithScreenshots);
                setLoading(false);
            });

            getRecordingUrls(roomId).then((urls) => {
                if (urls.length > 0) setVideoUrls(urls);
            });
        }
    }, [roomId]);

    const handlePartClick = (partId: string | null) => {
        if (partId) {
            const matchingKeys = Object.keys(screenshotMap).filter((k) => k === partId || k.startsWith(partId + '_'));
            if (matchingKeys.length > 0) {
                setViewingScreenshot(screenshotMap[matchingKeys[0]]);
            }
        }
    };

    const isDigitalUvv = order?.claimType === 'Digital UVV';

    const tabs = [
        { id: '2d' as const, label: t('common.2dView', { defaultValue: '2D View' }), icon: Car },
        ...(isDigitalUvv ? [{ id: 'certificate' as const, label: t('meetingSummary.uvvCertificate', { defaultValue: 'UVV-Zertifikat' }), icon: FileText }] : []),
        { id: 'gallery' as const, label: t('common.gallery', { defaultValue: 'Gallery' }), icon: ImageIcon },
        { id: 'video' as const, label: t('common.video', { defaultValue: 'Video' }), icon: VideoIcon },
    ];

    const orderedPhotos = ALL_PARTS.flatMap((p) => {
        const keys = Object.keys(screenshotMap).filter((k) => k === p.id || k.startsWith(p.id + '_'));
        return keys.map((k) => ({
            id: k,
            name: t(`carParts.${p.id}`, { defaultValue: p.name }),
            filename: screenshotMap[k],
        }));
    });

    const currentPhotoIndex = orderedPhotos.findIndex((p) => p.filename === viewingScreenshot);

    // Keyboard shortcuts for the viewer (placed here so orderedPhotos & currentPhotoIndex are in scope)
    useEffect(() => {
        if (!viewingScreenshot) return;
        const handleKey = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp': {
                    e.preventDefault();
                    const prev = (currentPhotoIndex - 1 + orderedPhotos.length) % orderedPhotos.length;
                    setViewingScreenshot(orderedPhotos[prev].filename);
                    break;
                }
                case 'ArrowRight':
                case 'ArrowDown': {
                    e.preventDefault();
                    const next = (currentPhotoIndex + 1) % orderedPhotos.length;
                    setViewingScreenshot(orderedPhotos[next].filename);
                    break;
                }
                case '[': setRotation(r => (r - 90 + 360) % 360); break;
                case ']': setRotation(r => (r + 90) % 360); break;
                case '+': case '=': setZoom(z => Math.min(4, +(z + 0.25).toFixed(2))); break;
                case '-': setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2))); break;
                case '0': setRotation(0); setZoom(1); break;
                case 'Escape': setViewingScreenshot(null); break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingScreenshot, currentPhotoIndex, orderedPhotos]);

    const [hoveredTablePart, setHoveredTablePart] = useState<{ id: string; name: string; x: number; y: number } | null>(null);

    const renderCategorySection = (category: string, startNum: number, endNum: number, noHeader = false) => {
        const partsInCategory = ALL_PARTS.filter((p) => p.category === category && p.number >= startNum && p.number <= endNum);
        if (partsInCategory.length === 0) return null;

        const categoryKey = category
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

        return (
            <div key={`${category}-${startNum}`} className="bg-[var(--color-bg-card)] rounded-lg overflow-hidden shadow-sm border border-[var(--color-border-primary)]">
                {!noHeader && (
                    <div className="bg-[var(--color-primary-orange)] text-white px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
                        {t(`meetingSummary.categories.${categoryKey}`, { defaultValue: category })}
                    </div>
                )}
                <div className="grid grid-cols-[30px_1fr_30px] gap-1 px-2 py-1 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{t('meetingSummary.table.no', { defaultValue: 'No.' })}</span>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{t('meetingSummary.table.component', { defaultValue: 'Component' })}</span>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] text-right">{t('meetingSummary.table.action', { defaultValue: 'Action' })}</span>
                </div>
                {partsInCategory.map((part) => {
                    const matchingKeys = Object.keys(screenshotMap).filter((k) => k === part.id || k.startsWith(part.id + '_'));
                    const hasScreenshot = matchingKeys.length > 0;
                    return (
                        <div
                            key={part.id}
                            className={`grid grid-cols-[30px_1fr_30px] gap-1 px-2 py-1.5 items-center border-b border-[var(--color-border-subtle)] last:border-b-0 transition-colors ${hasScreenshot ? 'hover:bg-[var(--color-primary-orange)]/5 cursor-pointer' : 'opacity-50'}`}
                            onClick={() => handlePartClick(part.id)}
                            onMouseEnter={(e) => setHoveredTablePart({
                                id: part.id,
                                name: t(`carParts.${part.id}`, { defaultValue: part.name }),
                                x: e.clientX,
                                y: e.clientY - 30,
                            })}
                            onMouseLeave={() => setHoveredTablePart(null)}
                            onMouseMove={(e) => setHoveredTablePart((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY - 30 } : null))}
                        >
                            <span className="text-[10px] text-[var(--color-text-secondary)]">{part.number}</span>
                            <span className={`text-[10px] truncate ${hasScreenshot ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-muted)]'}`}>
                                {t(`carParts.${part.id}`, { defaultValue: part.name })}
                                {matchingKeys.length > 1 && ` (${matchingKeys.length})`}
                            </span>
                            <div className="flex justify-end">
                                {hasScreenshot ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingScreenshot(screenshotMap[matchingKeys[0]]);
                                        }}
                                        className="p-1 rounded hover:bg-[var(--color-primary-orange)]/10 text-[var(--color-primary-orange)] transition-colors"
                                        title={t('common.viewScreenshot', { defaultValue: 'View Screenshot' })}
                                    >
                                        <Eye size={12} />
                                    </button>
                                ) : (
                                    <span className="w-4" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-[var(--color-bg-secondary)] overflow-hidden min-w-0 relative">
            <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border-primary)] p-2 sm:p-4 shrink-0">
                <div className="flex space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 text-sm font-bold flex items-center transition-all duration-300 relative whitespace-nowrap cursor-pointer ${activeTab === tab.id
                                ? 'text-[var(--color-primary-orange)]'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
                        >
                            <tab.icon size={18} className={`mr-2 transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-orange)] rounded-t-full shadow-[0_-2px_6px_rgba(255,107,53,0.3)]"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <CarInspectionLoader text={t('meetingSummary.loadingSummary', { defaultValue: 'Loading summary…' })} />
                </div>
            ) : (
                <div className="flex-1 overflow-hidden relative bg-[var(--color-bg-secondary)]">
                    {activeTab === '2d' && (
                        <div className="h-full w-full flex flex-col relative overflow-hidden">
                            <div className="lg:hidden flex p-2 bg-[var(--color-bg-card)] border-b border-[var(--color-border-primary)] shrink-0">
                                <div className="flex w-full bg-[var(--color-bg-secondary)] rounded-xl p-1 border border-[var(--color-border-primary)]">
                                    <button
                                        onClick={() => setMobileView('car')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${mobileView === 'car'
                                            ? 'bg-[var(--color-primary-orange)] text-white shadow-md'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                                    >
                                        <Car size={14} />
                                        {t('meetingSummary.carView', { defaultValue: 'Car View' })}
                                    </button>
                                    <button
                                        onClick={() => setMobileView('parts')}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mobileView === 'parts'
                                            ? 'bg-[var(--color-primary-orange)] text-white shadow-md'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                                    >
                                        <FileText size={14} />
                                        {t('meetingSummary.partsList', { defaultValue: 'Parts List' })}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative overflow-hidden">
                                <div className={`${mobileView === 'car' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[40%] h-full relative bg-[var(--color-bg-primary)] flex-col shrink-0 overflow-y-auto lg:overflow-hidden custom-scrollbar`}>
                                    <div className="absolute top-4 left-4 z-10 bg-[var(--color-bg-card)]/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-[var(--color-border-primary)] flex items-center gap-3">
                                        <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
                                            {t('meetingSummary.partsCaptured', { count: selectedParts.length, defaultValue: `${selectedParts.length} parts captured` })}
                                        </span>
                                        {hoveredPart && (
                                            <span className="hidden sm:inline-block text-sm font-medium text-[var(--color-primary-orange)] bg-[var(--color-primary-orange)]/10 px-2 py-0.5 rounded">
                                                {t(`carParts.${hoveredPart.id}`, { defaultValue: hoveredPart.name })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 flex items-center justify-center p-4 min-h-[500px] lg:min-h-0">
                                        <div className="w-full h-full max-w-[600px] flex items-center justify-center">
                                            <CarOverlay
                                                selectedParts={selectedParts}
                                                savedScreenshots={screenshotMap}
                                                onPartSelected={handlePartClick}
                                                onPartHover={setHoveredPart}
                                                onViewScreenshot={(filename) => setViewingScreenshot(filename)}
                                                hideSelectedList={true}
                                            />
                                        </div>
                                    </div>
                                    {hoveredPart && (
                                        <div className="sm:hidden absolute bottom-4 left-0 right-0 px-4">
                                            <div className="bg-[var(--color-bg-card)]/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-[var(--color-primary-orange)]/30 text-center text-xs font-bold text-[var(--color-primary-orange)] shadow-lg">
                                                {t(`carParts.${hoveredPart.id}`, { defaultValue: hoveredPart.name })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`${mobileView === 'parts' ? 'block' : 'hidden'} lg:block w-full lg:w-[60%] h-full bg-[var(--color-bg-secondary)] overflow-y-auto custom-scrollbar p-3 lg:p-4`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4 pb-20 lg:pb-0">
                                        <div className="space-y-3">
                                            {renderCategorySection('Identification', 1, 5)}
                                            {renderCategorySection('Overview images', 6, 11)}
                                            {renderCategorySection('Light', 12, 15)}
                                            {renderCategorySection('Doors', 16, 19)}
                                        </div>
                                        <div className="space-y-3">
                                            {renderCategorySection('Panes, mirrors and glass', 20, 27)}
                                            {renderCategorySection('Body and bumper', 28, 32)}
                                            {renderCategorySection('Engine compartment', 33, 35)}
                                        </div>
                                        <div className="space-y-3">
                                            {renderCategorySection('Tailgate', 36, 39)}
                                            {renderCategorySection('Front bumper', 40, 42)}
                                            {renderCategorySection('Wheels', 43, 46)}
                                            {renderCategorySection('Sills', 47, 48)}
                                            {renderCategorySection('Other', 49, 49)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'certificate' && isDigitalUvv && order && (
                        <div className="h-full w-full p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col items-center">
                            <div className="w-full max-w-5xl space-y-4">
                                <div className={`p-6 rounded-2xl border flex items-center justify-between gap-4 shadow-sm ${order.uvvResult === 'PASSED'
                                    ? 'bg-green-100 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-700 dark:text-green-400'
                                    : 'bg-red-100 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-700 dark:text-red-400'}`}>
                                    <div className="min-w-0 space-y-1">
                                        <h2 className="text-xl font-bold tracking-wide">
                                            {t('uvv.summary.header', { result: order.uvvResult === 'PASSED' ? t('uvv.summary.passed', { defaultValue: 'PASSED' }) : t('uvv.summary.failed', { defaultValue: 'FAILED' }), defaultValue: 'UVV Inspection' })}
                                        </h2>
                                        <p className="text-sm opacity-90">
                                            {order.uvvResult === 'PASSED'
                                                ? t('uvv.summary.passedDesc', { defaultValue: 'The certificate was generated automatically.' })
                                                : t('uvv.summary.failedDesc', { defaultValue: 'No certificate was issued due to defects.' })}
                                        </p>
                                    </div>
                                    <div className="text-4xl font-extrabold uppercase px-4 py-2 border-2 rounded-xl rotate-[-3deg] select-none shrink-0">
                                        {order.uvvResult === 'PASSED' ? t('uvv.summary.passedStamp', { defaultValue: 'Passed' }) : t('uvv.summary.failedStamp', { defaultValue: 'Defects' })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-xl space-y-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{t('uvv.summary.owner', { defaultValue: 'Owner' })}</h4>
                                        <p className="font-semibold text-[var(--color-text-primary)]">{order.contactPersonName || t('uvv.summary.unknown', { defaultValue: 'Unknown' })}</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">{order.contactPersonEmail || '-'}</p>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-xl space-y-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{t('uvv.summary.vehicle', { defaultValue: 'Vehicle' })}</h4>
                                        <p className="font-semibold text-[var(--color-text-primary)]">{order.vehicleMake} {order.vehicleModel}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">{t('uvv.summary.licensePlate', { plate: order.licensePlateNumber || '-', defaultValue: `Plate: ${order.licensePlateNumber || '-'}` })}</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">VIN: {order.vinNumber || '-'}</p>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-xl space-y-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{t('uvv.summary.details', { defaultValue: 'Details' })}</h4>
                                        <p className="font-semibold text-[var(--color-text-primary)]">{t('uvv.summary.inspector', { name: order.vehicleExpertName || t('uvv.summary.unknown', { defaultValue: 'Unknown' }), defaultValue: `Inspector: ${order.vehicleExpertName || 'Unknown'}` })}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">
                                            {t('uvv.summary.date', { date: order.uvvInspectionDate ? new Date(order.uvvInspectionDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-', defaultValue: order.uvvInspectionDate || '-' })}
                                        </p>
                                    </div>
                                </div>

                                {order.uvvResult === 'PASSED' ? (
                                    <UvvCertificateViewer order={order} />
                                ) : (
                                    <div className="p-8 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-center space-y-3">
                                        <FileText size={40} className="mx-auto text-[var(--color-text-muted)] opacity-50" />
                                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{t('uvv.summary.noCertificateTitle', { defaultValue: 'No certificate available' })}</h3>
                                        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
                                            {t('uvv.summary.noCertificateDesc', { defaultValue: 'A certificate is only issued when the inspection passes.' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'gallery' && (
                        <div className="h-full w-full overflow-y-auto custom-scrollbar p-6 pb-32">
                            {orderedPhotos.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                    {orderedPhotos.map((photo) => (
                                        <div
                                            key={photo.id}
                                            onClick={() => setViewingScreenshot(photo.filename)}
                                            className="group relative aspect-video bg-[var(--color-bg-card)] rounded-xl overflow-hidden cursor-pointer border border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)] transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"
                                        >
                                            <img
                                                src={getScreenshotUrl(roomId || '', photo.filename)}
                                                alt={photo.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                                                <div className="text-white">
                                                    <p className="text-sm font-bold capitalize truncate drop-shadow-md">
                                                        {photo.name}
                                                    </p>
                                                    {formatDateFromFilename(photo.filename) && (
                                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-300 font-medium">
                                                            <Calendar size={12} className="text-[var(--color-primary-orange)]" />
                                                            <span>{formatDateFromFilename(photo.filename)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="absolute top-3 right-3 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md transform translate-y-2 group-hover:translate-y-0 duration-300">
                                                <Eye size={16} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                                    <div className="bg-[var(--color-bg-secondary)] p-6 rounded-full mb-4">
                                        <ImageIcon size={48} className="opacity-40" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[var(--color-text-secondary)]">{t('meetingSummary.noImagesTitle', { defaultValue: 'No images captured' })}</h3>
                                    <p className="text-sm mt-1">{t('meetingSummary.noImagesSubtitle', { defaultValue: 'Screenshots taken during the call will appear here.' })}</p>
                                </div>
                            )}
                            <MeetingPhotoBar
                                photos={orderedPhotos}
                                roomId={roomId}
                                onPhotoClick={setViewingScreenshot}
                                getScreenshotUrl={getScreenshotUrl}
                            />
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="h-full w-full flex flex-col items-center p-6 bg-[var(--color-bg-secondary)] overflow-y-auto">
                            {videoUrls.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl pb-6">
                                    {videoUrls.map((url, index) => (
                                        <div key={index} className="flex flex-col items-center gap-3">
                                            <div className="w-full flex items-center gap-3 mb-1">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary-orange)] text-white text-sm font-bold">
                                                    {index + 1}
                                                </div>
                                                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                                                    {t('meetingSummary.sessionRecording', { defaultValue: 'Session Recording' })} #{index + 1}
                                                </h3>
                                            </div>
                                            <video
                                                ref={(el) => {
                                                    if (!el) return;
                                                    const handleMetadata = () => {
                                                        if (el.duration === Infinity || isNaN(el.duration)) {
                                                            el.currentTime = 1e101;
                                                            const handleSeek = () => {
                                                                el.removeEventListener('timeupdate', handleSeek);
                                                                el.currentTime = 0;
                                                            };
                                                            el.addEventListener('timeupdate', handleSeek);
                                                        }
                                                    };
                                                    el.addEventListener('loadedmetadata', handleMetadata);
                                                }}
                                                src={url}
                                                controls
                                                preload="auto"
                                                playsInline
                                                className="w-full max-h-[60vh] rounded-2xl border border-[var(--color-border-primary)] shadow-2xl bg-black"
                                                onError={(e) => { console.error('[Video Player] Error loading video:', e); }}
                                            />
                                            <a
                                                href={url}
                                                download={`recording-${index + 1}.webm`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/90 text-white px-5 py-2 rounded-xl font-bold shadow-lg transition-all text-sm"
                                            >
                                                <Download size={16} />
                                                {t('common.downloadVideo', { defaultValue: 'Download Video' })} #{index + 1}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                                    <div className="bg-[var(--color-bg-secondary)] p-6 rounded-full mb-4">
                                        <VideoIcon size={48} className="opacity-40" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[var(--color-text-secondary)]">
                                        {t('meetingSummary.noVideoTitle', { defaultValue: 'No recordings available' })}
                                    </h3>
                                    <p className="text-sm mt-1">
                                        {t('meetingSummary.noVideoSubtitle', { defaultValue: 'Recorded sessions will appear here.' })}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {viewingScreenshot && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/90 backdrop-blur-md select-none overflow-hidden animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setViewingScreenshot(null);
                    }}
                >
                    {/* ── 1. Framed Full-Screen Canvas with minor space on every side ── */}
                    <div
                        className="w-full h-full max-w-[99vw] max-h-[98vh] bg-neutral-950/90 rounded-2xl border border-white/15 shadow-2xl relative flex items-center justify-center overflow-hidden group"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => {
                            e.preventDefault();
                            setZoom(z => Math.min(4, Math.max(0.5, +(z - e.deltaY * 0.001).toFixed(3))));
                        }}
                        onTouchStart={(e) => {
                            if (e.touches.length === 2) {
                                const dx = e.touches[0].clientX - e.touches[1].clientX;
                                const dy = e.touches[0].clientY - e.touches[1].clientY;
                                pinchStartDistRef.current = Math.hypot(dx, dy);
                            }
                        }}
                        onTouchMove={(e) => {
                            if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
                                e.preventDefault();
                                const dx = e.touches[0].clientX - e.touches[1].clientX;
                                const dy = e.touches[0].clientY - e.touches[1].clientY;
                                const dist = Math.hypot(dx, dy);
                                const delta = dist - pinchStartDistRef.current;
                                pinchStartDistRef.current = dist;
                                setZoom(z => Math.min(4, Math.max(0.5, +(z + delta * 0.005).toFixed(3))));
                            }
                        }}
                        onTouchEnd={() => { pinchStartDistRef.current = null; }}
                    >
                        <img
                            src={getScreenshotUrl(roomId || '', viewingScreenshot)}
                            alt={orderedPhotos[currentPhotoIndex]?.name || t('common.screenshot', { defaultValue: 'Screenshot' })}
                            className="w-full h-full max-w-full max-h-full object-contain select-none"
                            style={{
                                transform: `rotate(${rotation}deg) scale(${zoom})`,
                                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                transformOrigin: 'center center',
                            }}
                            draggable={false}
                        />

                        {/* ── 2. Top Header Overlay (Title & Counter on Left, Close on Right) ── */}
                        <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between pointer-events-none z-30">
                            {/* Left: Title Card + Counter Badge */}
                            <div className="pointer-events-auto flex items-center gap-2 min-w-0">
                                <div className="flex items-center gap-2.5 bg-neutral-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shadow-xl min-w-0">
                                    <div className="p-1.5 rounded-lg bg-[var(--color-primary-orange)]/20 text-[var(--color-primary-orange)] shrink-0">
                                        <ImageIcon size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm sm:text-base text-white truncate leading-tight">
                                            {orderedPhotos[currentPhotoIndex]?.name || t('meetingSummary.screenshotViewer', { defaultValue: 'Screenshot Viewer' })}
                                        </h3>
                                        <p className="text-[10px] text-neutral-400 hidden sm:block truncate">
                                            {t('meetingSummary.screenshotViewer', { defaultValue: 'Screenshot Viewer' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Counter Badge on Left */}
                                {orderedPhotos.length > 1 && (
                                    <div className="bg-neutral-900/85 backdrop-blur-md text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/15 tabular-nums shadow-xl shrink-0">
                                        {currentPhotoIndex + 1} / {orderedPhotos.length}
                                    </div>
                                )}
                            </div>

                            {/* Right Close Button */}
                            <button
                                type="button"
                                onClick={() => setViewingScreenshot(null)}
                                className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900/85 hover:bg-red-500 text-white px-3 py-2 rounded-xl border border-white/15 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xl text-xs font-semibold shrink-0"
                                aria-label={t('common.cancel', { defaultValue: 'Close' })}
                                title="Close (Esc)"
                            >
                                <X size={18} strokeWidth={2.5} />
                                <span className="hidden xs:inline">{t('common.cancel', { defaultValue: 'Close' })}</span>
                            </button>
                        </div>

                        {/* ── 3. Floating Controls Toolbar (Centered Near Top, Shows on Hover) ── */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                            <button
                                title={`${t('common.rotateCCW', { defaultValue: 'Rotate Left' })} ([)`}
                                onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                title={`${t('common.rotateCW', { defaultValue: 'Rotate Right' })} (])`}
                                onClick={() => setRotation(r => (r + 90) % 360)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                            >
                                <RotateCw size={16} />
                            </button>

                            <div className="w-px h-4 bg-white/20 mx-1" />

                            <button
                                title={`${t('common.zoomOut', { defaultValue: 'Zoom Out' })} (-)`}
                                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-white/80 text-[11px] font-mono w-10 text-center tabular-nums font-semibold select-none">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                title={`${t('common.zoomIn', { defaultValue: 'Zoom In' })} (+)`}
                                onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                            >
                                <ZoomIn size={16} />
                            </button>

                            <div className="w-px h-4 bg-white/20 mx-1" />

                            <button
                                title={`${t('common.reset', { defaultValue: 'Reset' })} (0)`}
                                onClick={() => { setRotation(0); setZoom(1); }}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all cursor-pointer"
                            >
                                <Maximize2 size={16} />
                            </button>
                        </div>

                        {/* ── 4. Navigation Arrows (Left/Right) ── */}
                        {orderedPhotos.length > 1 && (
                            <>
                                <button
                                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3.5 bg-black/65 hover:bg-[var(--color-primary-orange)] text-white rounded-full opacity-90 hover:opacity-100 hover:scale-110 transition-all duration-200 backdrop-blur-md shadow-2xl z-30 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const prevIndex = (currentPhotoIndex - 1 + orderedPhotos.length) % orderedPhotos.length;
                                        setViewingScreenshot(orderedPhotos[prevIndex].filename);
                                    }}
                                    aria-label="Previous photo"
                                >
                                    <ArrowLeft size={22} />
                                </button>
                                <button
                                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3.5 bg-black/65 hover:bg-[var(--color-primary-orange)] text-white rounded-full opacity-90 hover:opacity-100 hover:scale-110 transition-all duration-200 backdrop-blur-md shadow-2xl rotate-180 z-30 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const nextIndex = (currentPhotoIndex + 1) % orderedPhotos.length;
                                        setViewingScreenshot(orderedPhotos[nextIndex].filename);
                                    }}
                                    aria-label="Next photo"
                                >
                                    <ArrowLeft size={22} />
                                </button>
                            </>
                        )}

                        {/* ── 5. Bottom Metadata & Download Overlay ── */}
                        <div className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/50 to-transparent pt-12 sm:pt-20 pointer-events-none flex flex-col sm:flex-row sm:items-end justify-between gap-3 z-20 transition-all duration-300 ${showModalThumbnails ? 'pb-28' : 'pb-14'}`}>
                            <div className="min-w-0 max-w-full sm:max-w-[70%]">
                                <h2 className="text-white text-base sm:text-xl font-bold truncate drop-shadow-md">
                                    {orderedPhotos[currentPhotoIndex]?.name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-neutral-300 text-[10px] sm:text-xs mt-1.5">
                                    {formatDateFromFilename(viewingScreenshot) && (
                                        <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10">
                                            <Calendar size={12} className="text-[var(--color-primary-orange)]" />
                                            <span>{formatDateFromFilename(viewingScreenshot)}</span>
                                        </div>
                                    )}
                                    {imageSize && (
                                        <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10">
                                            <FileText size={12} className="text-[var(--color-primary-orange)]" />
                                            <span>{imageSize}</span>
                                        </div>
                                    )}
                                    <div className="hidden md:flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10 text-neutral-300">
                                        <span>↕ scroll</span>
                                        <span>·</span>
                                        <span>[ ] rotate</span>
                                        <span>·</span>
                                        <span>+/- zoom</span>
                                    </div>
                                </div>
                            </div>

                            {/* Download Button */}
                            <a
                                href={getScreenshotUrl(roomId || '', viewingScreenshot)}
                                download
                                className="pointer-events-auto shrink-0 inline-flex items-center gap-1.5 bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/90 text-white px-4 py-2 rounded-xl font-bold shadow-xl text-xs sm:text-sm transition-all cursor-pointer"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Download size={16} />
                                <span>{t('common.downloadImage', { defaultValue: 'Download Image' })}</span>
                            </a>
                        </div>

                        {/* ── 6. Bottom Collapsible Thumbnail Strip Overlay ── */}
                        <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 flex flex-col items-center z-30 pointer-events-none">
                            {/* Toggle Tab Button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModalThumbnails((prev) => !prev);
                                }}
                                className="pointer-events-auto bg-neutral-900/90 border border-white/20 border-b-0 rounded-t-xl px-4 py-1 flex items-center gap-1.5 shadow-xl text-neutral-300 hover:text-[var(--color-primary-orange)] transition-all cursor-pointer text-[11px] font-bold tracking-wider -mb-px z-10 hover:bg-neutral-800 backdrop-blur-md"
                            >
                                {showModalThumbnails ? (
                                    <>
                                        <ChevronDown size={14} className="text-[var(--color-primary-orange)]" />
                                        <span>{t('common.hide', { defaultValue: 'AUSBLENDEN' })}</span>
                                    </>
                                ) : (
                                    <>
                                        <ChevronUp size={14} className="text-[var(--color-primary-orange)]" />
                                        <span>{t('common.show', { defaultValue: 'EINBLENDEN' })}</span>
                                        <span className="bg-white/15 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                                            {orderedPhotos.length}
                                        </span>
                                    </>
                                )}
                            </button>

                            {/* Thumbnail Carousel */}
                            {showModalThumbnails && (
                                <div className="pointer-events-auto w-full h-[76px] bg-neutral-900/90 border border-white/15 rounded-xl px-2 py-1.5 flex items-center gap-2 overflow-x-auto custom-scrollbar backdrop-blur-md shadow-2xl animate-fade-in">
                                    {orderedPhotos.map((photo, idx) => {
                                        const isSelected = viewingScreenshot === photo.filename;
                                        return (
                                            <div key={photo.id} id={`thumb-${photo.id}`} className="relative group/thumb h-full aspect-square shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingScreenshot(photo.filename);
                                                    }}
                                                    className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all duration-300 cursor-pointer ${isSelected
                                                            ? 'border-[var(--color-primary-orange)] ring-2 ring-[var(--color-primary-orange)]/40 scale-105 shadow-lg shadow-orange-500/30'
                                                            : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-400'
                                                        }`}
                                                >
                                                    <img
                                                        src={getScreenshotUrl(roomId || '', photo.filename)}
                                                        alt={photo.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute top-0.5 left-0.5 bg-black/80 text-white text-[9px] font-bold px-1 rounded leading-tight">
                                                        {idx + 1}
                                                    </div>
                                                </button>
                                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover/thumb:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/15 z-30 shadow-lg">
                                                    {photo.name}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {hoveredTablePart && (
                <div
                    className="fixed z-[100] px-3 py-1.5 bg-dark-900/90 backdrop-blur-md text-white text-xs font-medium rounded-lg shadow-lg border border-gray-700 pointer-events-none whitespace-nowrap"
                    style={{ left: hoveredTablePart.x, top: hoveredTablePart.y, transform: 'translateX(-50%)' }}
                >
                    {hoveredTablePart.name}
                </div>
            )}
        </div>
    );
};

export default MeetingSummary;
