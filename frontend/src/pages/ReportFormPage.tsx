import React, { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReportStore } from '../store/reportStore';
import type { ReportData } from '../types/report.types';
import api from '../utils/api';
import { formatDate, formatMonthYear, normalizeDate, normalizeTime } from '../utils/dateFormatter';
import { scrollToElement } from '../utils/scroll';

import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppFooter from '../components/layout/AppFooter';
import AppHeader from '../components/layout/AppHeader';
import MobileNav from '../components/layout/MobileNav';
import SidebarStatus from '../components/layout/SidebarStatus';
import StepIndicator from '../components/layout/StepIndicator';
import Step1_OrderInfo from '../components/steps/Step1_OrderInfo';
import Step2_VehicleID from '../components/steps/Step2_VehicleID';
import Step3_Condition from '../components/steps/Step3_Condition';
import Step4_Damages from '../components/steps/Step4_Damages';
import Step5_Summary from '../components/steps/Step5_Summary';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

// ───── Helper: extract step‑specific fields from the store ─────
const ORDER_INFO_FIELDS: (keyof ReportData)[] = [
    'caseNumber', 'licensePlate', 'customerNumber', 'contractNumber',
    'claimType', 'concernType', 'concernCompany',
    'clientName', 'contactPersonName', 'clientAddress', 'clientStreet', 'clientHouseNumber', 'clientZip', 'clientCity',
    'orderDate', 'inspectionDate', 'inspectionTime', 'inspectionLocation',
    'inspectorName', 'valuationDate', 'userEmail',
];

const VEHICLE_DATA_FIELDS: (keyof ReportData)[] = [
    'vin', 'manufacturer', 'baseModel', 'subModel', 'datECode',
    'kbaNumbers', 'firstRegistration', 'lastRegistration', 'bodyType',
    'doors', 'seats', 'keyNumber', 'mileage', 'nextHU', 'fuelType',
    'cylinders', 'powerKw', 'displacement', 'emissionClass', 'driveType',
    'transmission', 'wheels', 'colorDescription', 'upholsteryDescription',
    'standardEquipment', 'optionalEquipment',
    'lastRegistrationImages', 'mileageImages', 'nextHUImages', 'identificationImages',
    'targetKeysCount', 'actualKeysCount', 'workshopKeysCount', 'remoteControlsCount',
    'caseNumber', 'userEmail', 'minderwertRows', 'damages', 'excludedFromPdfImages',
];

const CONDITION_AND_DAMAGES_FIELDS: (keyof ReportData)[] = [
    'karosseriestundensatz', 'lackstundensatz', 'lackberechnungsart',
    'vehicleCategory', 'audatexHaupttyp', 'testDriveDone', 'liftingPlatformStatus',
    'errorMemoryRead', 'hybridBatteryChecked', 'keysPresent',
    'documentsPresent', 'additionalNotes', 'noPaintIssuesDetected', 'paintMeasurements', 'tires',
    'spareTire', 'breakdownKit', 'firstAidKit', 'safetyVest', 'warningTriangle',
    'nextMaintenanceDate', 'nextMaintenanceMileage', 'nextMaintenanceType', 'nextMaintenanceIntervalValue',
    'maintenanceStatus', 'maintenancePrice',
    'signatures', 'signatureNames', 'photos', 'expertAssessmentStatus', 'bodyPartDamages', 'minderwertRows',
    'serviceheftImages', 'bordliteraturImages', 'keysImages', 'maintenanceImages',
    'chargingCable', 'chargingCableImages',
    'fzScheinImages', 'errorMemoryReadImages', 'hybridBatteryCheckedImages',
    'registrationCertificateStatus', 'registrationCertificateSubmittedLater',
    'serviceBookletStatus', 'serviceBookletSubmittedLater',
    'operatingManualStatus', 'operatingManualSubmittedLater',
    'environmentalBadgeStatus', 'environmentalBadgeSubmittedLater', 'environmentalBadgeImages',
    'tireConfiguration', 'systemMinderwertRows',
    'inspectionFromAbove', 'inspectionFromBelow',
    'vehicleConditionStatus', 'equipmentListAvailable', 'deliveryConfirmationAvailable',
    'inspectionFromAboveImages', 'inspectionFromBelowImages',
    'vehicleConditionImages', 'equipmentListAvailableImages', 'deliveryConfirmationAvailableImages',
    'damages',
    'mileageImages', 'identificationImages',
    'photos',
    'isAuthorizedPerson', 'authorizedPersonName', 'authorizedPersonPhoto', 'customerPresent',
    'caseNumber', 'userEmail', 'excludedFromPdfImages',
];

const SUMMARY_FIELDS: (keyof ReportData)[] = [
    'signatures', 'signatureNames', 'photos', 'expertAssessmentStatus',
    'mileageImages', 'identificationImages',
    'isAuthorizedPerson', 'authorizedPersonName', 'authorizedPersonPhoto', 'customerPresent',
    'caseNumber', 'userEmail', 'excludedFromPdfImages',
];

function pick(obj: Record<string, unknown>, keys: (keyof ReportData)[]): Partial<ReportData> {
    const result: Record<string, unknown> = {};
    for (const k of keys) {
        if (k in obj) result[k] = obj[k];
    }
    return result as Partial<ReportData>;
}

interface DebouncedFunction<T extends (...args: any[]) => void> {
    (...args: Parameters<T>): void;
    cancel: () => void;
}

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): DebouncedFunction<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const debounced = (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
        }
    };
    return debounced;
}

const ReportFormPage: React.FC = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const caseNumberParam = searchParams.get('caseNumber') || searchParams.get('roomId');
    const { currentStep, setCurrentStep, _hasHydrated: uiHydrated, setShowValidationErrors } = useUIStore();
    const role = useAuthStore(state => state.role);
    const { setAllData, getStepValidationErrors, fetchFieldConfigs, _hasHydrated: reportHydrated } = useReportStore();
    const loadedCaseNumberRef = useRef<string | null>(null);
    const prevStepRef = useRef(currentStep);
    const debouncedSaveRef = useRef<DebouncedFunction<(step: number) => void> | null>(null);
    const lastFieldsStateRef = useRef<Record<string, any>>({});
    const [initializedCaseNumber, setInitializedCaseNumber] = React.useState<string | null>(null);

    // Fetch the latest config from backend and recalculate valuation
    const fetchLatestConfig = useCallback(async () => {
        const store = useReportStore.getState();
        const customerNumber = store.customerNumber;
        try {
            if (customerNumber) {
                await store.fetchAndApplyCustomerRates(customerNumber);
                await store.fetchFieldConfigs(customerNumber);
            } else {
                await store.fetchGlobalConfig();
                await store.fetchFieldConfigs();
            }
            store.recalculateVehicleValue();
        } catch (err) {
            console.error('Failed to fetch latest config', err);
        }
    }, []);

    // ───── Save current step data — ALL through /api/reports ─────
    const saveStepData = useCallback((step: number, isBackground = false) => {
        const state = useReportStore.getState() as unknown as Record<string, unknown>;

        let payload: Partial<ReportData>;
        switch (step) {
            case 1:
                payload = pick(state, ORDER_INFO_FIELDS);
                break;
            case 2:
                payload = pick(state, VEHICLE_DATA_FIELDS);
                break;
            case 3:
            case 4:
                payload = pick(state, CONDITION_AND_DAMAGES_FIELDS);
                break;
            case 5:
                payload = pick(state, SUMMARY_FIELDS);
                break;
            default:
                return;
        }

        api.post('/reports', payload)
            .then(res => {
                if (res.data && !isBackground) {
                    setAllData(res.data);
                }
            })
            .catch(err => {
                console.error(`Failed to save step ${step} data`, err);
                if (!isBackground) {
                    toast.error(t('common.saveError') || 'Failed to auto-save data');
                }
            });
    }, [setAllData, t]);

    // ───── Save ALL data at once (for explicit save button) ─────
    const saveAllData = useCallback(async () => {
        const { getStepValidationErrors } = useReportStore.getState();
        const errors = getStepValidationErrors(currentStep);
        const hasErrors = Object.keys(errors).length > 0;

        if (hasErrors) {
            setShowValidationErrors(true);
            toast.error(t('common.validationError'));

            setTimeout(() => {
                const firstErrorKey = Object.keys(errors)[0];
                const element = document.querySelector(`[data-fieldname="${firstErrorKey}"]`);
                if (element) {
                    scrollToElement(element as HTMLElement);
                    const focusable = element.querySelector('input, select, textarea, [tabindex]');
                    if (focusable) {
                        (focusable as HTMLElement).focus();
                    }
                }
            }, 100);
            return;
        }

        const stateObj = useReportStore.getState() as unknown as Record<string, unknown>;
        const allFields = [
            ...ORDER_INFO_FIELDS,
            ...VEHICLE_DATA_FIELDS,
            ...CONDITION_AND_DAMAGES_FIELDS,
            ...SUMMARY_FIELDS,
        ];
        // Deduplicate
        const uniqueFields = [...new Set(allFields)];
        const payload = pick(stateObj, uniqueFields);

        try {
            const res = await api.post('/reports', payload);
            if (res.data) {
                setAllData(res.data);
            }
            toast.success(t('common.saveSuccess') || 'Report saved successfully');
        } catch (err) {
            console.error('Failed to save all data', err);
            toast.error(t('common.saveError') || 'Failed to save report');
            throw err;
        }
    }, [currentStep, setAllData, setShowValidationErrors, t]);

    // Initialize debounced save function
    if (!debouncedSaveRef.current) {
        debouncedSaveRef.current = debounce((step: number) => {
            saveStepData(step, true);
        }, 1000);
    }

    // Update prevStepRef ONCE when hydration finishes to avoid unwanted auto-save of step 1
    // or missing auto-save of the first step the user is on.
    React.useEffect(() => {
        if (uiHydrated) {
            prevStepRef.current = currentStep;
        }
    }, [uiHydrated]); // Only run when hydration state changes

    const refetchReport = useCallback(() => {
        if (!caseNumberParam) return;
        const userEmailParam = searchParams.get('userEmail');
        const url = userEmailParam
            ? `/reports/my-report?caseNumber=${caseNumberParam}&userEmail=${userEmailParam}`
            : `/reports/my-report?caseNumber=${caseNumberParam}`;

        api.get(url)
            .then(async res => {
                if (res.data) {
                    const data = { ...res.data };

                    // Fetch and apply the config first!
                    if (data.customerNumber) {
                        await useReportStore.getState().fetchAndApplyCustomerRates(data.customerNumber);
                        await useReportStore.getState().fetchFieldConfigs(data.customerNumber);
                    } else {
                        await useReportStore.getState().fetchGlobalConfig();
                        await useReportStore.getState().fetchFieldConfigs();
                    }

                    // Normalize date inputs (HTML5 inputs expect YYYY-MM-DD)
                    const dateInputs: (keyof ReportData)[] = [
                        'orderDate', 'inspectionDate', 'valuationDate', 'nextMaintenanceDate',
                    ];
                    for (const field of dateInputs) {
                        if (data[field] && typeof data[field] === 'string') {
                            data[field] = normalizeDate(data[field] as string);
                        }
                    }

                    // Format German text date fields as DD.MM.YYYY
                    const germanTextDates: (keyof ReportData)[] = [
                        'firstRegistration', 'lastRegistration',
                    ];
                    for (const field of germanTextDates) {
                        if (data[field] && typeof data[field] === 'string') {
                            data[field] = formatDate(data[field] as string);
                        }
                    }

                    if (data.nextHU && typeof data.nextHU === 'string') {
                        data.nextHU = formatMonthYear(data.nextHU);
                    }

                    // Normalize time fields
                    if (data.inspectionTime && typeof data.inspectionTime === 'string') {
                        data.inspectionTime = normalizeTime(data.inspectionTime);
                    }

                    // Split address into street and house number for the UI if they are not already present
                    if (data.clientAddress && !data.clientStreet && !data.clientHouseNumber) {
                        const match = (data.clientAddress as string).match(/^(.*?)\s*(\d+.*)?$/);
                        data.clientStreet = match ? match[1].trim() : data.clientAddress;
                        data.clientHouseNumber = match && match[2] ? match[2].trim() : '';
                    }

                    // Ensure VIN is not pre-filled from OMT data (Requirement: Manual entry on site)
                    // If VIN is present but manufacturer is empty, it's likely a fresh OMT import.
                    if (data.vin && !data.manufacturer) {
                        data.vin = '';
                    }

                    const activeStep = useUIStore.getState().currentStep;
                    setAllData(data);
                    if (activeStep) {
                        setCurrentStep(activeStep);
                    }
                }
            })
            .catch(err => {
                console.error('Failed to load existing report', err);
            });
    }, [setAllData, caseNumberParam, searchParams, setCurrentStep]);

    // ───── Real-time Synchronization between tabs ─────
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const channel = new BroadcastChannel('my-gutachter-sync');

            channel.onmessage = (event) => {
                const { type, payload } = event.data;
                if (type === 'SCREENSHOT_TAKEN' || type === 'SCREENSHOT_DELETED') {
                    refetchReport();
                } else if (type === 'UVV_COMPLETED') {
                    const { uvvResult } = payload;
                    useReportStore.setState({ uvvResult, uvvInspectionDate: new Date().toISOString() });
                    saveStepData(3, true);
                }
            };

            return () => {
                channel.close();
            };
        }
    }, [saveStepData, refetchReport]);

    // ───── Handle next step click with validation check and scroll/focus ─────
    const handleNext = useCallback(() => {
        const errors = getStepValidationErrors(currentStep);
        const hasErrors = Object.keys(errors).length > 0;

        if (hasErrors) {
            setShowValidationErrors(true);
            toast.error(t('common.validationError'));

            setTimeout(() => {
                const firstErrorKey = Object.keys(errors)[0];
                const element = document.querySelector(`[data-fieldname="${firstErrorKey}"]`);
                if (element) {
                    scrollToElement(element as HTMLElement);
                    const focusable = element.querySelector('input, select, textarea, [tabindex]');
                    if (focusable) {
                        (focusable as HTMLElement).focus();
                    }
                }
            }, 100);
            return;
        }

        setCurrentStep(currentStep + 1);
    }, [currentStep, getStepValidationErrors, setCurrentStep, setShowValidationErrors, t]);

    // ───── Initial load: check for existing report (duplicate prevention) ─────
    React.useEffect(() => {
        if (!caseNumberParam) {
            toast.error(t('orders.importRequired') || 'Orders must be imported from OMT.');
            navigate('/report', { replace: true });
            return;
        }

        // Fetch global field configurations (mandatory requirements etc)
        fetchFieldConfigs();

        if (loadedCaseNumberRef.current === caseNumberParam) return;
        loadedCaseNumberRef.current = caseNumberParam;

        // If the report in the store is different from the one in the URL, reset it first!
        const currentStoreCase = useReportStore.getState().caseNumber;
        if (currentStoreCase !== caseNumberParam) {
            useReportStore.getState().resetAll();
            useReportStore.getState().updateField('caseNumber', caseNumberParam);
            useUIStore.getState().setCurrentStep(1);
        }

        refetchReport();
    }, [caseNumberParam, refetchReport, navigate, t]);

    // Reset currentStep to 1 synchronously when opening/switching orders to prevent visual flash
    React.useLayoutEffect(() => {
        if (!uiHydrated) return;
        setCurrentStep(1);
        setInitializedCaseNumber(caseNumberParam);
    }, [caseNumberParam, uiHydrated, setCurrentStep]);

    // ───── Scroll to top when step changes ─────
    React.useEffect(() => {
        const scrollToTop = () => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };

        scrollToTop();
        // Small delay to ensure DOM has updated and height is set (especially critical for mobile)
        const timer = setTimeout(scrollToTop, 150);
        return () => clearTimeout(timer);
    }, [currentStep]);

    // ───── Auto-save previous step when step changes (from ANY source) ─────
    React.useEffect(() => {
        if (prevStepRef.current !== currentStep) {
            debouncedSaveRef.current?.cancel();
            saveStepData(prevStepRef.current, false);
            prevStepRef.current = currentStep;

            if (currentStep === 4 || currentStep === 5) {
                fetchLatestConfig();
            }
        }
    }, [currentStep, saveStepData, fetchLatestConfig]);

    // ───── Refresh config on window focus ─────
    React.useEffect(() => {
        const handleFocus = () => {
            if (currentStep === 4 || currentStep === 5) {
                fetchLatestConfig();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [currentStep, fetchLatestConfig]);

    // ───── Initialize last fields state for the debounced watcher ─────
    React.useEffect(() => {
        if (!uiHydrated || !reportHydrated) return;

        const state = useReportStore.getState();
        let fieldsToWatch: (keyof ReportData)[];
        switch (currentStep) {
            case 1: fieldsToWatch = ORDER_INFO_FIELDS; break;
            case 2: fieldsToWatch = VEHICLE_DATA_FIELDS; break;
            case 3: case 4: fieldsToWatch = CONDITION_AND_DAMAGES_FIELDS; break;
            case 5: fieldsToWatch = SUMMARY_FIELDS; break;
            default: return;
        }

        const initialFieldsState: Record<string, any> = {};
        fieldsToWatch.forEach(field => {
            initialFieldsState[field] = state[field];
        });
        lastFieldsStateRef.current = initialFieldsState;
    }, [currentStep, uiHydrated, reportHydrated]);

    // ───── Immediate/Debounced save when input fields are updated ─────
    React.useEffect(() => {
        if (!uiHydrated || !reportHydrated) return;

        const unsubscribe = useReportStore.subscribe((state) => {
            let fieldsToWatch: (keyof ReportData)[];
            switch (currentStep) {
                case 1: fieldsToWatch = ORDER_INFO_FIELDS; break;
                case 2: fieldsToWatch = VEHICLE_DATA_FIELDS; break;
                case 3: case 4: fieldsToWatch = CONDITION_AND_DAMAGES_FIELDS; break;
                case 5: fieldsToWatch = SUMMARY_FIELDS; break;
                default: return;
            }

            const hasChanged = fieldsToWatch.some(field => state[field] !== lastFieldsStateRef.current[field]);
            if (hasChanged) {
                const newFieldsState: Record<string, any> = {};
                fieldsToWatch.forEach(field => {
                    newFieldsState[field] = state[field];
                });
                lastFieldsStateRef.current = newFieldsState;

                debouncedSaveRef.current?.(currentStep);

                // Broadcast the updated fields to other tabs in real-time!
                if (typeof window !== 'undefined') {
                    const channel = new BroadcastChannel('my-gutachter-sync');
                    channel.postMessage({
                        type: 'REPORT_STORE_UPDATE',
                        payload: newFieldsState
                    });
                    channel.close();
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [currentStep, uiHydrated, reportHydrated]);

    // ───── Auto-save on page unload (catches step 5 and browser close) ─────
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            // Use sendBeacon for reliable save on page close
            const state = useReportStore.getState() as unknown as Record<string, unknown>;
            const step = useUIStore.getState().currentStep;

            let fields: (keyof ReportData)[];
            switch (step) {
                case 1: fields = ORDER_INFO_FIELDS; break;
                case 2: fields = VEHICLE_DATA_FIELDS; break;
                case 3: case 4: fields = CONDITION_AND_DAMAGES_FIELDS; break;
                case 5: fields = SUMMARY_FIELDS; break;
                default: return;
            }

            const payload = pick(state, fields);
            const token = localStorage.getItem('token');
            const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api') + '/reports';

            // Use fetch with keepalive for reliable save on page close
            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => { });
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // ───── Navigation ─────
    const goToStep = useCallback((targetStep: number) => {
        setCurrentStep(targetStep);
    }, [setCurrentStep]);

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <Step1_OrderInfo />;
            case 2: return <Step2_VehicleID />;
            case 3: return <Step3_Condition />;
            case 4: return <Step4_Damages />;
            case 5: return <Step5_Summary onSave={saveAllData} />;
            default: return <Step1_OrderInfo />;
        }
    };

    if (!uiHydrated || !reportHydrated || initializedCaseNumber !== caseNumberParam) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light-gray">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-light-gray @container">
            <AppHeader />
            <StepIndicator />

            <main className="flex-1 container mx-auto px-4 @7xl:px-6 @5xl:px-8 py-4">
                <div className="flex gap-4">
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        {/* Config Panel is hidden for now. */}
                        {/* {role === 'ADMIN' && <ConfigPanel />} */}
                        {renderStep()}

                        {/* Navigation buttons */}
                        <div className="flex justify-between mt-4 mb-16 @5xl:mb-4">
                            {currentStep > 1 ? (
                                <button onClick={() => goToStep(currentStep - 1)} className="btn-outline flex items-center gap-1">
                                    <ChevronLeft className="w-4 h-4" /> {t('nav.back')}
                                </button>
                            ) : <div />}

                            {currentStep < 5 ? (
                                <button
                                    onClick={handleNext}
                                    className="btn-primary flex items-center gap-1"
                                >
                                    {t('nav.next')} <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={saveAllData}
                                    className="btn-primary flex items-center gap-1"
                                >
                                    <Save className="w-4 h-4" /> {t('common.saveReport')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Desktop sidebar */}
                    <SidebarStatus />
                </div>
            </main>

            <MobileNav />
            <AppFooter />
        </div>
    );
};

export default ReportFormPage;
