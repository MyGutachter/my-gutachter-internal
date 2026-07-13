import { Car, CheckSquare, Download, FileText, Image as ImageIcon, MessageSquare, Video as VideoIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL, getOrderImages, getOrderParts, getRecordingUrls } from '../../services/orderService';
import type { Order } from '../../types';
import { CarOverlay, getPartIdFromKey } from '../../CarOverlay';
import CarInspectionLoader from '../../CarInspectionLoader';
import ImagePopup from '../modals/ImagePopup';
import { UvvCertificateViewer } from './UvvCertificateViewer';

/**
 * Video Expert order details panel (T7.8) — faithful port. Tabs Details/2D/Images/Video.
 * Rewired to the merged order service (parts/images/recordings) and screenshot serve URLs.
 */
interface OrderDetailsPanelProps {
    order: Order;
    onUpdateStatus: (orderId: string, status: 'DONE' | 'PENDING') => void;
}

const OrderDetailsPanel = ({ order, onUpdateStatus }: OrderDetailsPanelProps) => {
    const [activeTab, setActiveTab] = useState('details');
    const [popupState, setPopupState] = useState<{ isOpen: boolean; imageUrl: string; title?: string }>({
        isOpen: false,
        imageUrl: '',
        title: '',
    });

    const { t } = useTranslation();

    const [partKeys, setPartKeys] = useState<string[]>([]);
    const [meetingImages, setMeetingImages] = useState<Record<string, string>>({});
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [partsLoaded, setPartsLoaded] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [videosLoaded, setVideosLoaded] = useState(false);

    useEffect(() => {
        setPartKeys([]);
        setMeetingImages({});
        setVideoUrls([]);
        setPartsLoaded(false);
        setImagesLoaded(false);
        setVideosLoaded(false);
    }, [order.id]);

    useEffect(() => {
        if (activeTab === '2d' && !partsLoaded && order.id) {
            const fetchParts = async () => {
                setIsLoading(true);
                try {
                    const parts = await getOrderParts(order.id);
                    setPartKeys(parts || []);
                } catch (error) {
                    console.error('Failed to fetch order parts:', error);
                } finally {
                    setIsLoading(false);
                    setPartsLoaded(true);
                }
            };
            fetchParts();
        }
    }, [activeTab, order.id, partsLoaded]);

    useEffect(() => {
        if (activeTab === 'images' && !imagesLoaded && order.id) {
            const fetchImages = async () => {
                setIsLoading(true);
                try {
                    const images = await getOrderImages(order.id);
                    setMeetingImages(images || {});
                } catch (error) {
                    console.error('Failed to fetch order images:', error);
                } finally {
                    setIsLoading(false);
                    setImagesLoaded(true);
                }
            };
            fetchImages();
        }
    }, [activeTab, order.id, imagesLoaded]);

    useEffect(() => {
        if (activeTab === 'video' && !videosLoaded && order.id) {
            const fetchVideos = async () => {
                setIsLoading(true);
                try {
                    const urls = await getRecordingUrls(order.id);
                    setVideoUrls(urls || []);
                } catch (error) {
                    console.error('Failed to fetch order videos:', error);
                } finally {
                    setIsLoading(false);
                    setVideosLoaded(true);
                }
            };
            fetchVideos();
        }
    }, [activeTab, order.id, videosLoaded]);

    const selectedParts = partKeys;
    const hasMeetingData = selectedParts.length > 0;

    const savedScreenshots = useMemo(() => meetingImages, [meetingImages]);
    const hasImages = Object.keys(savedScreenshots).length > 0;

    const handlePartClick = async (partId: string | null) => {
        if (partId) {
            let matchingKeys = Object.keys(meetingImages).filter((key) => key === partId || key.startsWith(partId + '_'));

            if (matchingKeys.length === 0 && order.id) {
                try {
                    const images = await getOrderImages(order.id);
                    setMeetingImages(images || {});
                    matchingKeys = Object.keys(images || {}).filter((key) => key === partId || key.startsWith(partId + '_'));
                } catch (e) {
                    console.error(e);
                }
            }

            if (matchingKeys.length > 0) {
                const firstKey = matchingKeys[0];
                const imgSrc = meetingImages[firstKey];
                if (imgSrc) {
                    setPopupState({
                        isOpen: true,
                        imageUrl: getImageUrl(firstKey, imgSrc),
                        title: t(`carParts.${partId}`, { defaultValue: partId.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }),
                    });
                }
            }
        }
    };

    const handleClosePopup = () => setPopupState((prev) => ({ ...prev, isOpen: false }));

    const getPartImageSrc = (imgData: string) => {
        if (!imgData) return '';
        const cleanData = imgData.trim();
        const isUrlOrPath =
            cleanData.startsWith('http') ||
            cleanData.startsWith('/') ||
            cleanData.startsWith('screenshots/') ||
            cleanData.startsWith('uploads/') ||
            /\.(png|jpg|jpeg|gif|webp)$/i.test(cleanData);
        if (isUrlOrPath) return cleanData;
        if (cleanData.startsWith('data:image')) return cleanData;
        return `data:image/jpeg;base64,${cleanData}`;
    };

    const getImageUrl = (partId: string, imgData: string) => {
        if (!imgData) return '';
        const cleanData = imgData.trim();
        if (cleanData.startsWith('screenshots/') || cleanData.startsWith('uploads/')) {
            return `${API_BASE_URL}/screenshots/${order.id}/${partId}`;
        }
        return getPartImageSrc(imgData);
    };

    const getImageSizeInMB = (imgData: string) => {
        if (!imgData) return '0.00 MB';
        const cleanData = imgData.trim();
        const isUrlOrPath =
            cleanData.startsWith('http') ||
            cleanData.startsWith('/') ||
            cleanData.startsWith('screenshots/') ||
            cleanData.startsWith('uploads/') ||
            /\.(png|jpg|jpeg|gif|webp)$/i.test(cleanData);
        if (isUrlOrPath) return '';
        const base64 = cleanData.startsWith('data:image') && cleanData.includes(',') ? cleanData.split(',')[1] : cleanData;
        if (!base64) return '0.00 MB';
        const padding = (base64.match(/={1,2}$/) || [''])[0].length;
        const sizeInBytes = (base64.length * 3) / 4 - padding;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        return `${sizeInMB.toFixed(2)} MB`;
    };

    const isDigitalUvv = order?.claimType === 'Digital UVV';

    const tabs = [
        { id: 'details', label: t('order.tabs.details', { defaultValue: 'Details' }), icon: FileText },
        { id: '2d', label: t('order.tabs.2dView', { defaultValue: '2D View' }), icon: Car },
        ...(isDigitalUvv ? [{ id: 'uvv', label: t('order.tabs.uvvCertificate', { defaultValue: 'UVV' }), icon: CheckSquare }] : []),
        { id: 'images', label: t('order.tabs.images', { defaultValue: 'Images' }), icon: ImageIcon },
        { id: 'video', label: t('order.tabs.video', { defaultValue: 'Video' }), icon: VideoIcon },
    ];

    const renderRow = (label: string, value: string | number | boolean | undefined | null, isEmail = false, icon?: React.ReactNode) => {
        let displayValue: string | number = '-';
        if (value !== undefined && value !== null && value !== '') {
            if (typeof value === 'boolean') {
                displayValue = value ? t('common.yes', { defaultValue: 'Yes' }) : t('common.no', { defaultValue: 'No' });
            } else {
                displayValue = value;
            }
        }
        return (
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start border-b border-[var(--color-border-primary)]/60 pb-2 last:border-0 group hover:border-[var(--color-border-secondary)] transition-colors gap-1 xl:gap-0">
                <dt className="text-[var(--color-text-muted)] w-full xl:w-[40%] text-[10px] font-bold uppercase tracking-wider mt-0.5 pr-2 leading-tight break-words">{label}</dt>
                <dd className={`text-[var(--color-text-primary)] w-full xl:w-[60%] text-[11px] font-semibold flex items-center justify-between overflow-hidden ${isEmail ? 'text-[var(--color-primary-orange)] cursor-pointer hover:underline' : ''}`}>
                    <span className="truncate mr-2 block w-full" title={String(displayValue)}>{displayValue}</span>
                    {icon && (
                        <button className="text-[var(--color-text-muted)] hover:text-[var(--color-primary-orange)] hover:bg-[var(--color-bg-primary)] p-1 rounded-md transition-all shadow-sm shrink-0">
                            {icon}
                        </button>
                    )}
                </dd>
            </div>
        );
    };

    return (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-primary)] flex flex-col h-full shadow-card z-10 w-full overflow-hidden">
            <div className="px-3 sm:px-4 pt-3 pb-0 border-b border-[var(--color-border-primary)] flex flex-wrap justify-between items-center bg-[var(--color-bg-card)] gap-y-2 gap-x-4">
                <div className="flex space-x-3 sm:space-x-4 overflow-x-auto scrollbar-hide pb-2 sm:pb-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 text-[10px] sm:text-[11px] font-bold flex items-center transition-all duration-300 relative whitespace-nowrap cursor-pointer ${activeTab === tab.id
                                ? 'text-[var(--color-primary-orange)] border-b-2 border-[var(--color-primary-orange)]'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                                }`}
                        >
                            <tab.icon size={15} className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110 mr-1.5 sm:mr-2' : 'mr-0 sm:mr-2'}`} />
                            <span className={activeTab === tab.id ? 'inline' : 'hidden sm:inline'}>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-[var(--color-primary-orange)] rounded-t-full shadow-[0_-2px_6px_rgba(255,107,53,0.3)]"></div>
                            )}
                        </button>
                    ))}
                </div>
                <label className="flex items-center space-x-2 cursor-pointer pb-2 sm:pb-3 group shrink-0 ml-auto sm:ml-0">
                    <div className="relative flex items-center justify-center">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={order.status === 'DONE'}
                            onChange={(e) => onUpdateStatus(order.id, e.target.checked ? 'DONE' : 'PENDING')}
                        />
                        <div className="h-3.5 w-3.5 border-2 border-[var(--color-border-secondary)] rounded peer-checked:bg-[var(--color-primary-orange)] peer-checked:border-[var(--color-primary-orange)] transition-colors"></div>
                        <CheckSquare size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-orange)] transition-colors whitespace-nowrap">{t('order.markCompleted', { defaultValue: 'Mark Completed' })}</span>
                </label>
            </div>

            <div className={`flex-1 overflow-y-auto custom-scrollbar bg-[var(--color-bg-card)] ${activeTab === '2d' ? 'overflow-hidden p-0' : 'p-4'}`}>

                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-3 border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] transition-colors h-full">
                            <h3 className="text-[var(--color-text-primary)] font-bold text-[13px] mb-3 flex items-center border-b border-[var(--color-border-primary)] pb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-orange)] mr-2.5"></span>
                                {t('order.tabs.details', { defaultValue: 'Details' })}
                            </h3>
                            <dl className="space-y-2 text-[11px]">
                                {renderRow(t('order.dispatchOrderNo', { defaultValue: 'Dispatch/Order No.' }), order.dispatchOrOrderNo)}
                                {renderRow(t('order.claimType', { defaultValue: 'Claim Type' }), order.claimType)}
                                {renderRow(t('order.numberOfPhotos', { defaultValue: 'Number of Photos' }), order.numberOfPhotos)}
                            </dl>
                        </div>

                        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-3 border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] transition-colors h-full">
                            <h3 className="text-[var(--color-text-primary)] font-bold text-[13px] mb-3 flex items-center border-b border-[var(--color-border-primary)] pb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-orange)] mr-2.5"></span>
                                {t('order.contactDetails', { defaultValue: 'Contact Details' })}
                            </h3>
                            <dl className="space-y-2 text-[11px]">
                                {renderRow(t('order.fields.repairer', { defaultValue: 'Repairer' }), order.clientName)}
                                {renderRow(t('order.fields.contactPerson', { defaultValue: 'Contact Person' }), order.contactPersonName)}
                                {renderRow(t('order.fields.mobile', { defaultValue: 'Mobile' }), order.contactPersonMobile, false, <MessageSquare size={14} />)}
                                {renderRow(t('order.fields.email', { defaultValue: 'Email' }), order.contactPersonEmail, true)}
                                {renderRow(t('order.fields.expert', { defaultValue: 'Expert' }), order.vehicleExpertName)}
                            </dl>
                        </div>

                        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-3 border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] transition-colors h-full xl:col-span-2">
                            <h3 className="text-[var(--color-text-primary)] font-bold text-[13px] mb-3 flex items-center border-b border-[var(--color-border-primary)] pb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-orange)] mr-2.5"></span>
                                {t('order.vehicleDetails', { defaultValue: 'Vehicle Details' })}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                <div className="space-y-2">
                                    {renderRow(t('order.fields.makeModel', { defaultValue: 'Make/Model' }), `${order.vehicleMake || ''} ${order.vehicleModel || ''}`.trim())}
                                    {renderRow(t('order.fields.licensePlate', { defaultValue: 'License Plate' }), order.licensePlateNumber)}
                                    {renderRow(t('order.fields.vin', { defaultValue: 'VIN' }), order.vinNumber)}
                                </div>
                                <div className="space-y-2">
                                    {renderRow(t('order.fields.stammnummer', { defaultValue: 'Registration No.' }), order.registrationNumber)}
                                    {renderRow(t('order.fields.odometer', { defaultValue: 'Mileage' }), order.mileage)}
                                    {renderRow(t('order.fields.lastMfk', { defaultValue: 'Last Inspection' }), order.lastVehicleInspectionDate)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === '2d' && (
                    <div className="h-full w-full flex flex-col items-center justify-center relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-[var(--color-bg-card)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
                                <CarInspectionLoader size="md" />
                            </div>
                        )}
                        {hasMeetingData && (
                            <div className="absolute top-4 left-4 z-10 bg-[var(--color-bg-card)]/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-[var(--color-border-primary)]">
                                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                                    {t('order.selectedParts', { count: selectedParts.length, defaultValue: `${selectedParts.length} parts selected` })}
                                </span>
                            </div>
                        )}
                        <CarOverlay
                            onPartSelected={handlePartClick}
                            selectedParts={selectedParts}
                            savedScreenshots={savedScreenshots}
                            onViewScreenshot={(filename) => {
                                const partId = Object.keys(meetingImages).find((key) => meetingImages[key] === filename);
                                if (partId) {
                                    const cleanPartId = getPartIdFromKey(partId);
                                    setPopupState({
                                        isOpen: true,
                                        imageUrl: getImageUrl(partId, filename),
                                        title: t(`carParts.${cleanPartId}`, { defaultValue: cleanPartId.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }),
                                    });
                                } else if (filename) {
                                    setPopupState({
                                        isOpen: true,
                                        imageUrl: getPartImageSrc(filename),
                                        title: t('common.screenshot', { defaultValue: 'Screenshot' }),
                                    });
                                }
                            }}
                            hideSelectedList={true}
                            readOnly={!hasMeetingData}
                        />
                    </div>
                )}

                {activeTab === 'uvv' && (
                    <div className="h-full w-full p-4 overflow-y-auto custom-scrollbar flex flex-col items-center">
                        <div className="w-full max-w-2xl space-y-4 text-left pb-10">
                            <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${order.uvvResult === 'PASSED'
                                ? 'bg-green-950/40 border-green-700 text-green-400'
                                : 'bg-red-950/40 border-red-700 text-red-400'
                                }`}>
                                <div>
                                    <h2 className="text-sm font-bold tracking-wide">
                                        UVV-FAHRZEUGPRÜFUNG: {order.uvvResult === 'PASSED' ? 'BESTANDEN' : 'NICHT BESTANDEN'}
                                    </h2>
                                    <p className="text-[10px] opacity-90">
                                        {order.uvvResult === 'PASSED'
                                            ? 'Das Prüfzertifikat wurde automatisch generiert und an den Halter gesendet.'
                                            : 'Aufgrund festgestellter Mängel wurde kein Zertifikat ausgestellt.'}
                                    </p>
                                </div>
                                <div className="text-xl font-extrabold uppercase px-2 py-1 border rounded-lg rotate-[-3deg] select-none">
                                    {order.uvvResult === 'PASSED' ? 'Bestanden' : 'Mängel'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-[11px]">
                                <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Prüfer</span>
                                    <span className="font-semibold text-[var(--color-text-primary)]">{order.vehicleExpertName || '-'}</span>
                                </div>
                                <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Prüfdatum</span>
                                    <span className="font-semibold text-[var(--color-text-primary)]">
                                        {order.uvvInspectionDate ? new Date(order.uvvInspectionDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </span>
                                </div>
                            </div>

                            {order.uvvResult === 'PASSED' && (
                                <UvvCertificateViewer order={order} compact />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'images' && (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-[var(--color-bg-card)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
                                <CarInspectionLoader size="md" />
                            </div>
                        )}
                        {hasImages ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {Object.entries(savedScreenshots).map(([partKey, imageUrl]) => {
                                    const partId = getPartIdFromKey(partKey);
                                    return (
                                        <div
                                            key={partKey}
                                            onClick={() => {
                                                setPopupState({
                                                    isOpen: true,
                                                    imageUrl: getImageUrl(partKey, imageUrl),
                                                    title: t(`carParts.${partId}`, { defaultValue: partId.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }),
                                                });
                                            }}
                                            className="group relative aspect-video bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden cursor-pointer border border-[var(--color-border-primary)] hover:border-[var(--color-primary-orange)] transition-all shadow-sm hover:shadow-md"
                                        >
                                            <img
                                                src={getImageUrl(partKey, imageUrl)}
                                                alt={partId}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="text-white">
                                                    <p className="text-xs font-medium capitalize truncate">
                                                        {t(`carParts.${partId}`, { defaultValue: partId.split('-').join(' ') })}
                                                    </p>
                                                    <p className="text-[10px] font-medium opacity-90 mt-0.5">
                                                        {getImageSizeInMB(imageUrl)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                <ImageIcon size={14} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                                <div className="bg-[var(--color-bg-secondary)] p-4 rounded-full mb-3">
                                    <ImageIcon size={32} className="opacity-50" />
                                </div>
                                <p className="text-sm font-medium">{t('order.noImages', { defaultValue: 'No images available' })}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'video' && (
                    <div className="h-full w-full flex flex-col items-center p-4 bg-[var(--color-bg-card)] overflow-y-auto custom-scrollbar">
                        {isLoading && (
                            <div className="absolute inset-0 bg-[var(--color-bg-card)]/80 backdrop-blur-sm z-50 flex items-center justify-center">
                                <CarInspectionLoader size="md" />
                            </div>
                        )}
                        {videoUrls.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                {videoUrls.map((url, index) => (
                                    <div key={index} className="flex flex-col items-center gap-3 bg-[var(--color-bg-secondary)] p-3 rounded-xl border border-[var(--color-border-primary)]">
                                        <div className="w-full flex items-center gap-2 mb-1">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary-orange)] text-white text-[10px] font-bold">
                                                {index + 1}
                                            </div>
                                            <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
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
                                            className="w-full aspect-video rounded-lg border border-[var(--color-border-primary)] shadow-md bg-black"
                                            onError={(e) => { console.error('[Video Player] Error loading video:', e); }}
                                        />
                                        <a
                                            href={url}
                                            download={`recording-${index + 1}.webm`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 bg-[var(--color-primary-orange)] hover:bg-[var(--color-primary-orange)]/90 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all text-[10px]"
                                        >
                                            <Download size={12} />
                                            {t('common.downloadVideo', { defaultValue: 'Download Video' })} #{index + 1}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] min-h-[300px]">
                                <div className="bg-[var(--color-bg-secondary)] p-4 rounded-full mb-3">
                                    <VideoIcon size={32} className="opacity-50" />
                                </div>
                                <p className="text-sm font-medium">{t('meetingSummary.noVideoTitle', { defaultValue: 'No recordings available' })}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <ImagePopup
                isOpen={popupState.isOpen}
                onClose={handleClosePopup}
                imageUrl={popupState.imageUrl}
                title={popupState.title}
            />
        </div>
    );
};

export default OrderDetailsPanel;
