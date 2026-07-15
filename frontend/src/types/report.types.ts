export type ClaimType = string;

export type ConcernType = 'Leasingrückläufer' | 'Unfallschaden' | 'Wertermittlung' | 'Händlerauftrag';


export type AnrechnungType = 'voll' | 'anteilig' | 'kein' | 'keine' | 'informational' | 'pro-rata';

export type RepairMethodType = 'lackieren' | 'reparieren' | 'ersetzen' | 'polieren' | 'Lackvorbereitung' | 'ausbeulen' | 'Smart Repair' | 'erneuern' | 'instandsetzen' | 'prüfen' | 'reinigen';

export type DamageType = string;

export type MinderwertType = 1 | 2 | 3;

export type LackberechnungsartType = 'AZT' | 'Hersteller';
export type VehicleCategoryType = 'Subcompact' | 'Compact' | 'Mid-size' | 'Full-size' | 'Luxury' | 'Super Luxury / Sports';

export interface DamageTypeOption {
    value: string;
    labelDe: string;
    labelEn: string;
}

export interface RepairPosition {
    id: string;
    name: string;
    active: boolean;
}

export interface RepairType {
    id: string;
    name: string;
    active: boolean;
}

export interface RepairTableEntry {
    id: string;
    vehicleCategory: string;
    positionId: string;
    typeId: string;
    defaultAmount: number;
    calculationRule: string; // "fixed", "percentage", "formula", etc.
    active: boolean;
}

// ── New simplified Estimate Config ──────────────────────────────────────────
/** One of the predefined repair action types */
export type EstimateRepairCodeId =
    | 'Paint'
    | 'Repair and Paint'
    | 'Replace'
    | 'SMART Repair'
    | 'Polish'
    | 'Gentle Repair'
    | 'Inspect'
    | string;

/** Flat price for one repair code on one component, per vehicle category */
export interface EstimateRepairCodePrice {
    repairCodeId: EstimateRepairCodeId;
    /** key = VehicleCategoryType, value = flat price in € */
    priceByCategory: Record<string, number>;
}

/** Estimate config for one body-part component */
export interface EstimateComponentConfig {
    componentId: string;   // maps to bodyPart id
    description: string;   // human-readable name / notes
    repairCodes: EstimateRepairCodePrice[];
}

export interface CustomRepairCode {
    id: string;
    labelDe: string;
    labelEn: string;
}

/** Full estimate configuration stored in GlobalConfig */
export interface EstimateConfig {
    components: EstimateComponentConfig[];
    customRepairCodes?: CustomRepairCode[];
}

export interface DepreciationEntry {
    vehicleType: string;
    ageFrom: number;
    ageTo: number;
    mileageFrom: number;
    mileageTo: number;
    factor: number;
}

export type CalculationType = 'proportional' | 'hundred_percent' | 'text_only';

export interface PriceCategoryEntry {
    key: string;    // e.g. "1", "2", "3" or any label
    label: string;  // Display name e.g. "Category 1"
    factor: number; // e.g. 0.10 = 10%
}

export interface GlobalConfig {
    allowedRolesToViewAllOrders?: string[];
    karosseriestundensatz: number;
    lackstundensatz: number;
    lackberechnungsart: LackberechnungsartType;
    vehicleCategories: string[];
    minderwertFactors: Record<string, number>;
    karosserieFactors: Record<string, number[]>;
    kunststoffFactors: Record<string, number[]>;
    equipmentPrices: Record<string, number>;
    maintenanceRules: Record<string, number>;
    componentMinderwertTables: Record<string, Record<string, { min: number; max: number; value: number }[]>>;
    repairSurcharges: Record<string, number>;
    percentageTables: Record<string, { label: string; value: number }[]>;
    systemSettings?: Record<string, number>;
    repairPositions?: RepairPosition[];
    repairTypes?: RepairType[];
    repairTable?: RepairTableEntry[];
    depreciationMatrix?: DepreciationEntry[];
    priceCategoryFactors?: Record<string, number>;
    priceCategoryEntries?: PriceCategoryEntry[];  // New structured list
    calculationType?: CalculationType;             // Type 1/2/3
    calculationTypeText?: string;                  // Text for Type 3
    type?: 'global' | 'customer';
    isActive?: boolean;
    customerNumber?: string;
    customerName?: string;
    damageTypes?: DamageTypeOption[];
    estimateConfig?: EstimateConfig;   // New simplified flat-price repair config
}

// Moved to GlobalConfig

export interface DamageItem {
    id: string;
    type: 'exterior' | 'interior' | 'manual';
    description: string;
    repairMethod: RepairMethodType | '';
    repairCostBrutto: number;
    anrechnung: AnrechnungType;
    minderwertBrutto: number;
    minderwertNetto: number;
    spareParts: number;
    imageRef: string;
    images?: string[]; // Direct images list
    bodyPart: string;
    reparaturweg: 'Karosserie' | 'Kunststoff' | 'Glas';
    repairCodeIndex: number;
    estimateRepairCodeId?: EstimateRepairCodeId | ''; // New flat-price repair code
    presetType?: MinderwertType; // For depreciation calculation
    percentageRule?: string; // Key in percentageTables (e.g., 'minderwert_damage')
    repairType?: 'L' | 'LI' | 'IL' | '';
    isManualMinderwert?: boolean;
    sparePartsBrutto?: number;
}

export interface Signatures {
    driver: string;
    inspector: string;
    receiver: string;
}

export interface SignatureNames {
    driver: string;
    inspector: string;
    receiver: string;
}


export interface ReportPhoto {
    id: string;
    data: string; // base64
    label: string;
    caption?: string;
    fileName: string;
    damageId?: string;
    mandatoryPhotoId?: string;
    isExternal?: boolean;
    fromVideoExpert?: boolean;
}

export interface EquipmentItem {
    status: 'Available' | 'Not available' | '';
    expirationDate?: string;
    images?: string[]; // base64 images
    price?: number;
}

export interface PaintMeasurement {
    id: string;
    bodyPart: string;
    measuredMicrons: number;
    damageKnown: boolean;
    damageUnknown: boolean;
    repairDamage: string;
    depreciationValue: number;
    images: string[]; // base64 images
}

export interface BodyPartDamage {
    damage: DamageType | '';
    repair: RepairMethodType | '';
}

export interface MinderwertRow {
    id: string;
    bodyPart: string;
    damage: DamageType | '';
    repairMethod: RepairMethodType | '';
    repairCost: number;
    repairCostBrutto?: number;
    presetType: MinderwertType;
    isCustom: boolean;
    repairCodeIndex: number;  // index into KAROSSERIE/KUNSTSTOFF/GLAS_REPAIR_CODES
    images?: string[];
    reparaturweg?: 'Karosserie' | 'Kunststoff' | 'Glas';
    minderwertBrutto?: number;
    minderwertNetto?: number;
    spareParts?: number;
    sparePartsBrutto?: number;
    anrechnung?: AnrechnungType;
    percentageRule?: string; // Key in percentageTables
    repairType?: 'L' | 'LI' | 'IL' | '';
    isManualMinderwert?: boolean;
    estimateRepairCodeId?: EstimateRepairCodeId | ''; // New flat-price repair code
}

export interface TireInfo {
    axle: number;
    side: 'links' | 'rechts';
    designation: string;
    manufacturer: string;
    tireModel: string;
    type: 'A' | 'S' | 'W';
    treadDepth: string;
    dotNumber: string;
    depreciationValue?: number;
    rimType?: 'Steel' | 'Alloy' | '';
    rimDamage?: string[];
    rimDamageDescription?: string;
    hubCapDepreciation?: number; // Depreciation for hub cap damage (Steel rims only)
    images?: string[]; // base64 images
    damaged?: boolean;
}

export interface SpareTireInfo {
    present: boolean;
    designation: string;
    manufacturer: string;
    tireModel: string;
    type: 'A' | 'S' | 'W';
    treadDepth: string;
    dotNumber: string;
    depreciationValue?: number;
    rimType?: 'Steel' | 'Alloy' | '';
    rimDamage?: string[];
    rimDamageDescription?: string;
    hubCapDepreciation?: number; // Depreciation for hub cap damage (Steel rims only)
    images?: string[]; // base64 images
    damaged?: boolean;
}

export interface SendLog {
    sentAt: string;
    recipient: string;
    sender: string;
}

export type TestDriveStatus = 'carried_out' | 'not_occurred' | 'not_possible' | '';
export type LiftingPlatformStatus = 'available_used' | 'not_available' | 'not_possible' | '';
export type VehicleConditionStatus = 'dirty' | 'wet' | 'restricted' | 'normal' | 'ausreichend' | 'other' | '';
export type EngineRunStatus = 'carried_out' | 'not_occurred' | 'not_possible' | 'not_specified' | '';



export interface ReportData {
    // Step 1 - Order Info
    userEmail?: string;
    caseNumber: string;
    auftragsnummer?: string;
    source?: string;
    licensePlate: string;
    customerNumber: string;
    customerEmail: string;
    contractNumber: string;
    claimType: ClaimType | '';
    concernType: ConcernType | '';
    concernCompany: string;
    clientName: string;
    clientAddress: string;
    clientStreet: string;
    clientHouseNumber: string;
    clientZip: string;
    clientCity: string;
    orderDate: string;
    inspectionDate: string;
    inspectionTime: string;
    inspectionLocation: string;
    inspectorName: string;
    valuationDate: string;
    intranetCustomerId?: string;

    // Step 2 - Vehicle Identification
    vin: string;
    manufacturer: string;
    baseModel: string;
    subModel: string;
    datECode: string;
    kbaNumbers: string;
    firstRegistration: string;
    lastRegistration: string;
    bodyType: string;
    doors: number | null;
    seats: number | null;
    keyNumber: string;
    mileage: number;
    nextHU: string;
    fuelType: string;
    cylinders: number | null;
    powerKw: number;
    displacement: number;
    emissionClass: string;
    driveType: string;
    transmission: string;
    wheels: string;
    colorDescription: string;
    upholsteryDescription: string;
    standardEquipment: string[];
    optionalEquipment: string[];

    lastRegistrationImages?: string[];
    mileageImages?: string[];
    nextHUImages?: string[];
    identificationImages?: string[];

    // Config / Page 0
    karosseriestundensatz: number;
    lackstundensatz: number;
    lackberechnungsart: LackberechnungsartType;
    vehicleCategory: VehicleCategoryType | null;
    audatexHaupttyp: string;

    // Step 3 - Condition
    testDriveDone: TestDriveStatus;
    liftingPlatformStatus: LiftingPlatformStatus;
    errorMemoryRead: boolean | null;
    hybridBatteryChecked: boolean | null;
    keysPresent: number;
    targetKeysCount: number;    // System-set: expected number of keys
    actualKeysCount: number;    // User-input: actual keys found on site
    workshopKeysCount: number;
    remoteControlsCount: number;
    documentsPresent: string[];
    registrationCertificateStatus: 'Original' | 'Copy' | 'Not Available' | '';
    registrationCertificateSubmittedLater: boolean;
    serviceBookletStatus: 'Original' | 'Digital' | 'In-Vehicle' | 'Not Available' | '';
    serviceBookletSubmittedLater: boolean;
    operatingManualStatus: 'Original' | 'Digital' | 'In-Vehicle' | 'Not Available' | '';
    operatingManualSubmittedLater: boolean;
    environmentalBadgeStatus: 'Green' | 'Yellow' | 'Red' | 'Not Available' | '';
    environmentalBadgeSubmittedLater: boolean;
    additionalNotes: string;
    noPaintIssuesDetected: boolean;
    paintMeasurements: PaintMeasurement[];
    tires: TireInfo[];
    spareTire: SpareTireInfo;
    breakdownKit: EquipmentItem;
    firstAidKit: EquipmentItem;
    safetyVest: EquipmentItem;
    warningTriangle: EquipmentItem;
    nextMaintenanceDate: string;
    nextMaintenanceMileage: number;
    nextMaintenanceType: 'date' | 'days' | 'months' | 'mileage' | '';
    nextMaintenanceIntervalValue: number | null;
    maintenanceStatus: string;
    maintenancePrice: number;
    tireConfiguration: '2-axle' | '3-axle' | '2-axle-twin' | '3-axle-twin';

    // Additional Inspection Fields
    inspectionFromAbove: boolean | null;
    inspectionFromBelow: boolean | null;
    vehicleConditionStatus: VehicleConditionStatus;
    vehicleConditionOther?: string;
    engineRunPerformed: 'carried_out' | 'not_occurred' | 'not_possible' | 'not_specified' | '';
    engineRunStatus?: 'no_issues' | 'issues' | '';
    engineRunNoise?: 'knocking' | 'rattling' | 'whistling' | 'squeaking' | 'grinding' | 'vibrations' | 'irregular' | 'none' | '';
    engineRunRoughRunning?: 'normal' | 'rough' | '';
    engineRunWarningLightsActive?: 'yes' | 'no' | '';
    engineRunWarningLightsDetails?: string;
    engineRunOtherIssues?: string;
    equipmentListAvailable: boolean | 'dat' | null;
    deliveryConfirmationAvailable: boolean | null;

    // UI Photo attachments for general inspection fields
    serviceheftImages?: string[];
    bordliteraturImages?: string[];
    keysImages?: string[];
    maintenanceImages?: string[];
    fzScheinImages?: string[];
    errorMemoryReadImages?: string[];
    hybridBatteryCheckedImages?: string[];
    inspectionFromAboveImages?: string[];
    inspectionFromBelowImages?: string[];
    vehicleConditionImages?: string[];
    equipmentListAvailableImages?: string[];
    deliveryConfirmationAvailableImages?: string[];
    engineRunPerformedImages?: string[];
    environmentalBadgeImages?: string[];


    // Step 3b - Body Diagram
    bodyPartDamages: Record<string, BodyPartDamage>;

    // Step 3c - Minderwert
    minderwertRows: MinderwertRow[];
    systemMinderwertRows?: MinderwertRow[];

    // Step 4 - Damages
    damages: DamageItem[];
    photos: ReportPhoto[];

    // Signatures
    signatures: Signatures;
    signatureNames: SignatureNames;
    expertAssessmentStatus: 'accepted' | 'not_accepted' | null;
    chargingCable: 'YES' | 'NO' | 'NOT_AVAILABLE' | '';
    chargingCableImages?: string[]; // base64 images
    sendLogs: SendLog[];

    // New Signature metadata fields
    isAuthorizedPerson: boolean;
    authorizedPersonName: string;
    authorizedPersonPhoto: string; // base64
    customerPresent: boolean;
    selectedParts?: string[];

    // Status & Sync
    status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    omtSyncStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
    omtSyncError?: string;
    pdfPath?: string;
    versions: ReportVersion[];
    hasSecondTireSet: boolean;
    secondTires: TireInfo[];
    secondTireSetSelection?: 'Only Tires' | 'Only Rims' | 'Both' | '';
    fieldConfigs: any[];
    globalConfig?: GlobalConfig | null;
    initialData?: Partial<ReportData> | null;
    vehicleBaseValue?: number;
    priceCategory?: 'Premium' | 'Standard' | 'Economy' | '';
    mileageBucket?: string;
    depreciationMatrixFactor?: number;
    finalVehicleValue?: number;
    videoExpertImages?: string[];
    meetingData?: Record<string, string>;
    uvvResult?: 'PASSED' | 'FAILED' | '';
    uvvInspectionDate?: string;
}

export interface ReportVersion {
    version: number;
    pdfPath: string;
    createdAt: string;
    createdBy: string;
}
