import { getBodyPartLabel, sortPaintMeasurements } from '../constants/bodyParts';
import { COMPANY_INFO } from '../constants/companyInfo';
import { ESTIMATE_REPAIR_CODE_IDS, ESTIMATE_REPAIR_CODE_LABELS } from '../constants/estimateRepairCodes';
import type { DamageItem, EstimateRepairCodeId, MinderwertRow, ReportData } from '../types/report.types';
import { getAutomaticDevaluations } from './automaticDevaluationService';
import { formatCurrency } from './currency';
import { formatDate, formatDateTime, formatMonthYear } from './dateFormatter';
import { FULL_LOGO_BASE64 } from './fullLogoBase64';
import { getCarSvgHtml } from './pdfCarDiagram';
import { calcBrutto, calcNetto } from './vatCalculator';

interface PDFReportData {
  caseNumber: string; licensePlate: string; vin: string; claimType: string;
  customerNumber: string; contractNumber: string; concernType: string;
  concernCompany: string; clientName: string;
  clientAddress: string; clientStreet: string; clientHouseNumber: string;
  clientZip: string; clientCity: string;
  orderDate: string; inspectionDate: string; inspectionTime: string;
  inspectionLocation: string; inspectorName: string; valuationDate: string;
  manufacturer: string; baseModel: string; subModel: string;
  datECode: string; kbaNumbers: string; firstRegistration: string;
  lastRegistration: string; bodyType: string; doors: number | null; seats: number | null;
  keyNumber: string; mileage: number; nextHU: string; fuelType: string;
  cylinders: number | null; powerKw: number; displacement: number;
  emissionClass: string; driveType: string; transmission: string;
  wheels: string; colorDescription: string; upholsteryDescription: string;
  standardEquipment: string[];
  optionalEquipment?: string[];

  lastRegistrationImages?: string[];
  mileageImages?: string[];
  nextHUImages?: string[];
  identificationImages?: string[];
  testDriveDone: string;
  liftingPlatformStatus: string;
  errorMemoryRead: boolean | null;
  hybridBatteryChecked: boolean | null; keysPresent: number; targetKeysCount?: number; actualKeysCount?: number;
  documentsPresent: string[];
  registrationCertificateStatus?: string;
  registrationCertificateSubmittedLater?: boolean;
  serviceBookletStatus?: string;
  serviceBookletSubmittedLater?: boolean;
  operatingManualStatus?: string;
  operatingManualSubmittedLater?: boolean;
  environmentalBadgeStatus?: string;
  environmentalBadgeSubmittedLater?: boolean;
  environmentalBadgeImages?: string[];
  additionalNotes: string;
  breakdownKit: { status: string; images?: string[]; price?: number; expirationDate?: string };
  firstAidKit: { status: string; images?: string[]; price?: number; expirationDate?: string };
  safetyVest: { status: string; images?: string[]; price?: number; expirationDate?: string };
  warningTriangle: { status: string; images?: string[]; price?: number; expirationDate?: string };
  maintenanceStatus: string;
  maintenancePrice: number;
  nextMaintenanceDate: string;
  nextMaintenanceMileage: number;
  nextMaintenanceType?: string;
  nextMaintenanceIntervalValue?: number | null;
  paintMeasurements: Array<{
    bodyPart: string;
    measuredMicrons: number;
    damageKnown: boolean;
    damageUnknown: boolean;
    repairDamage: string;
    depreciationValue: number;
    images: string[];
  }>;
  chargingCable: 'YES' | 'NO' | 'NOT_AVAILABLE' | '';
  chargingCableImages?: string[];
  tires: Array<{ axle: number; side: string; designation: string; manufacturer: string; tireModel?: string; type: string; treadDepth: string; rimType?: string; rimDamage?: string[]; rimDamageDescription?: string; images?: string[]; damaged?: boolean }>;
  spareTire?: {
    present: boolean;
    designation: string;
    manufacturer: string;
    tireModel?: string;
    type: string;
    treadDepth: string;
    rimType?: string;
    rimDamage?: string[];
    rimDamageDescription?: string;
    images?: string[];
    damaged?: boolean;
  };
  hasSecondTireSet?: boolean;
  secondTires?: Array<{ axle: number; side: string; designation: string; manufacturer: string; tireModel?: string; type: string; treadDepth: string; rimType?: string; rimDamage?: string[]; rimDamageDescription?: string; images?: string[]; depreciationValue?: number; damaged?: boolean }>;
  secondTireSetSelection?: string;
  damages: DamageItem[];
  serviceheftImages?: string[];
  bordliteraturImages?: string[];
  keysImages?: string[];
  maintenanceImages?: string[];
  fzScheinImages?: string[];
  errorMemoryReadImages?: string[];
  hybridBatteryCheckedImages?: string[];
  inspectionFromAbove: boolean | null;
  inspectionFromBelow: boolean | null;
  vehicleConditionStatus: string;
  vehicleConditionOther?: string;
  engineRunPerformed: string;
  engineRunStatus?: 'no_issues' | 'issues' | '';
  engineRunNoise?: 'knocking' | 'rattling' | 'whistling' | 'squeaking' | 'grinding' | 'vibrations' | 'irregular' | 'none' | '';
  engineRunRoughRunning?: 'normal' | 'rough' | '';
  engineRunWarningLightsActive?: 'yes' | 'no' | '';
  engineRunWarningLightsDetails?: string;
  engineRunOtherIssues?: string;
  equipmentListAvailable: boolean | 'dat' | null;
  deliveryConfirmationAvailable: boolean | null;
  inspectionFromAboveImages?: string[];
  inspectionFromBelowImages?: string[];
  vehicleConditionImages?: string[];
  engineRunPerformedImages?: string[];
  equipmentListAvailableImages?: string[];
  deliveryConfirmationAvailableImages?: string[];
  photos: Array<{ data: string; label: string; caption?: string; mandatoryPhotoId?: string; damageId?: string }>;
  selectedParts: string[];
  signatures: { driver: string; inspector: string; receiver: string };
  signatureNames: { driver: string; inspector: string; receiver: string };
  expertAssessmentStatus: 'accepted' | 'not_accepted' | null;
  bodyPartDamages: Record<string, { damage: string; repair: string }>;
  minderwertRows: MinderwertRow[];
  totalRepairCostBrutto: () => number;
  totalMinderwertBrutto: () => number;
  totalMinderwertNetto: () => number;
  systemMinderwertRows?: MinderwertRow[];
  isAuthorizedPerson?: boolean;
  authorizedPersonName?: string;
  authorizedPersonPhoto?: string;
  customerPresent?: boolean;
  vehicleCategory?: string | null;
  globalConfig?: any;
}

const PDF_LABELS = {
  de: {
    reportTitle: 'Gutachten',
    licensePlateLabel: 'Kennzeichen',
    vinLabel: 'Fahrgestellnummer (FIN)',
    caseSection: 'Vorgang',
    orderNo: 'Auftragsnummer',
    customerNo: 'Kunden-Nr.',
    client: 'Auftraggeber',
    orderFrom: 'Ihr Auftrag vom',
    electronically: 'elektronisch',
    inspection: 'Besichtigung',
    clock: 'Uhr',
    byMr: 'durch Herrn',
    at: 'bei',
    inPresenceOf: 'im Beisein von',
    valuedOn: 'Bewertet am',
    concerns: 'Betrifft',
    contractNo: 'Vertragsnummer',
    summary: 'Zusammenfassung',
    repairCostsLabel: 'Reparaturkosten (brutto)',
    dimValueLabel: 'Minderwerte (brutto)',
    withVat: 'mit MwSt.',
    withoutVat: 'ohne MwSt.',
    phone: 'Telefon',
    fax: 'Fax',
    email: 'E-Mail',
    court: 'Amtsgericht',
    vatId: 'USt-IdNr.',
    taxNo: 'Steuer-Nr.',
    directors: 'Geschäftsführer',
    contactPerson: 'Ansprechpartner',
    directPhone: 'Tel. direkt',
    remarks: 'Bemerkungen',
    eventType: 'Betreff',
    reportTypeLabel: 'Gutachten',
    pageLabel: 'Seite',
    remarksBlock1: 'Diese Dienstleistung wurde entsprechend den Vorgaben (Richtlinien) des Auftraggebers erstellt. Im Einzelfall können Abweichungen zum MyGutachter Standard vorliegen.',
    remarksBlock2Prefix: 'Bei der Lackschichtdickenmessung wurden bei mindestens drei Messungen pro Bauteil Lackschichtdicken von',
    remarksBlock2Suffix: 'µm festgestellt.',
    repaintsFound: 'Nachlackierungen an folgenden Karosserieteilen festgestellt',
    noRepaintsFound: 'Es wurden keine Nachlackierungen festgestellt.',
    remarksBlock4: 'Ohne weitergehende Untersuchungen wurde kein merkantiler Minderwert angesetzt.',
    remarksBlock5: 'Die Besichtigung erfolgte von oben und unten.',
    testDriveYes: 'Eine Probefahrt wurde durchgeführt.',
    testDriveNo: 'Eine Probefahrt wurde nicht durchgeführt.',
    liftInspected: 'Das Fahrzeug wurde auf der Hebebühne besichtigt.',
    liftNotAvailable: 'Eine Hebebühne war nicht vorhanden.',
    liftNotPossible: 'Die Nutzung einer Hebebühne war nicht möglich.',
    errorMemory: 'Fehlerspeicher',
    errorMemoryYes: 'ausgelesen',
    errorMemoryNo: 'nicht ausgelesen',
    hybridCheckedNo: 'Die Hochvoltbatterie wurde nicht gesondert geprüft.',
    hybridLabel: 'Hochvoltbatterie',
    documentsPresent: 'Für die Bearbeitung standen folgende Unterlagen zur Verfügung',
    noDocuments: 'keine',
    keysPresented: 'Hauptschlüssel vorgelegt',
    vehicleCategory: 'Fahrzeugklasse',
    vehicleData: 'Fahrzeugdaten',
    firstRegistration: 'Erstzulassung',
    lastRegistration: 'Letzte Zulassung',
    manufacturer: 'Hersteller',
    typeSales: 'Basismodell / Sub Modell',
    bodyType: 'Aufbauart',
    doors: 'Türen',
    seats: 'Sitzplätze',
    vinFull: 'Fahrgestellnummer (FIN)',
    hsnTsn: 'HSN / TSN',
    keyNo: 'Schlüssel-Nr.',
    mileageLabel: 'Kilometerstand',
    mileageRead: 'Kilometerstand',
    nextInspection: 'Nächste HU §29 StVZO',
    fuel: 'Energiequelle / Kraftstoff',
    cylinders: 'Zylinderanzahl',
    power: 'Leistung (kW)',
    displacement: 'Hubraum (ccm)',
    emissionClass: 'Schadstoffklasse',
    driveType: 'Antriebsart',
    transmission: 'Getriebe / Gänge',
    wheels: 'Felgen',
    color: 'Farbe',
    upholstery: 'Polster / Farbe',
    breakdownKit: 'Pannenset',
    mileageDisclaimer: 'Es wird unterstellt, dass die Gesamtlaufleistung dem abgelesenen Kilometerstand entspricht.',
    tiresWheels: 'Räder / Reifen',
    axle: 'Achse',
    tireDesignation: 'Reifenbezeichnung',
    tireManufacturer: 'Hersteller/Typ',
    tireType: 'Art',
    treadDepth: 'Profiltiefe',
    tireSpareTire: 'Notrad / Reserverad',
    damaged: 'Reifen beschädigt',
    tireLegend: 'A/ Ganzjahres; /O Original; /F Runflat;',
    standardEquipment: 'Serienausstattung',
    generalCondition: 'Allgemeinzustand und Wartung',
    generalConditionText: 'Abgesehen von den beschriebenen Schäden/Mängeln weist das Fahrzeug/Objekt einen, bezogen auf Alter und Nutzung, üblichen Gesamtzustand auf.',
    maintenanceRecord: 'Wartungsnachweis',
    nonAccepted: 'Nicht akzeptierter Zustand / Ausstehende Reparaturen',
    damageDescCol: 'Schaden',
    repairCostCol: 'Reparatur (brutto)',
    repairCostNetCol: 'Reparatur (netto)',
    allocationCol: 'Anrechnung',
    dimValueGrossCol: 'Minderwert (brutto)',
    dimValueNetCol: 'Minderwert (netto)',
    totalRow: 'Gesamtbetrag / Minderwert',
    anrechnungVoll: 'voll',
    anrechnungAnteilig: 'anteilig',
    anrechnungKein: 'kein',
    anrechnungKeine: 'Keine Kosten',
    tireSideLinks: 'links',
    tireSideRechts: 'rechts',
    docFzSchein: 'Fahrzeugschein / Zulassungsbescheinigung Teil I',
    docServiceheft: 'Serviceheft',
    docBedienungsanleitung: 'Bedienungsanleitung',
    docServiceBook: 'Serviceheft',
    docBadge: 'Umweltplakette',
    willBeSubmittedLater: 'Wird nachgereicht',
    docStatusOriginal: 'Original',
    docStatusDigital: 'Digital',
    'docStatusIn-Vehicle': 'Im Fahrzeug',
    'docStatusNot Available': 'Nicht vorhanden',
    'docStatusNot available': 'Nicht vorhanden',
    docStatusGreen: 'Grün',
    docStatusYellow: 'Gelb',
    docStatusRed: 'Rot',
    notes: 'Hinweise',
    notesText: 'Alle Beträge (ausgenommen eines evtl. aufgeführten merkantilen Minderwertes) beinhalten die gesetzliche Mehrwertsteuer. Minderwerte sind brutto und netto ausgewiesen.',
    notesText2: 'Alle systemseitig ermittelten Werte können Auf- oder Abrundungen enthalten.',
    theInspector: 'Der Sachverständige',
    privacyNote: 'Im Rahmen einer Weitergabe oder Veröffentlichung dieses Dokuments, sind die allgemein gültigen datenschutzrechtlichen Grundsätze, insbesondere hinsichtlich der Anonymisierung personenbezogener Daten, zwingend einzuhalten.',
    electronicDoc: 'Dieses Dokument wurde elektronisch gefertigt und ist ohne Unterschrift gültig.',
    sigIntro: 'Die ausgeführte Fahrzeugdokumentation sowie der dokumentierte Fahrzeugzustand wurden von folgenden Personen geprüft und bestätigt.',
    sigDriver: 'Fahrer, der das Fahrzeug abstellt / übergibt / abliefert',
    sigDate: 'Datum',
    sigName: 'Name in Druckbuchstaben',
    sigSignature: 'Unterschrift',
    sigInspector: 'Sachverständiger',
    sigReceiver: 'Empfänger / Spediteur / Abholer / Bevollmächtigter des Autohauses',
    photoAnnex: 'Fotoanlage',
    photoVehicle: 'zum Fahrzeug / Objekt',
    photoRef: 'MyGutachter GmbH Nr.',
    photoFrom: 'vom',
    photoDisclaimer: 'Diese Fotoanlage besteht aus',
    photoDisclaimerEnd: 'digital gefertigten Bildern und ist auch ohne Unterschrift und Stempel gültig.',
    photoLabel: 'Bild',
    page: 'Seite',
    of: 'von',
    vehicleDiagram: 'Fahrzeugdiagramm',
    optionalEquipment: 'Sonderausstattung',
    einigung: 'Einigung',
    keineEinigung: 'Keine Einigung',
    bodyCondition: 'Fahrzeugzustand',
    repairMethod: 'Reparaturweg',
    inspectedBy: 'Besichtigt durch',
    gaAccepted: 'GA akzeptiert',
    gaNotAccepted: 'GA nicht akzeptiert',
    toLabel: 'bis',
    repairMethods: {
      lackieren: 'Lackieren',
      reparieren: 'Reparieren',
      ersetzen: 'Ersetzen',
      polieren: 'Polieren',
      Lackvorbereitung: 'Lackvorbereitung',
      ausbeulen: 'Ausbeulen',
      'Smart Repair': 'Smart Repair',
      erneuern: 'Erneuern',
      instandsetzen: 'Instandsetzen',
      reinigen: 'Reinigen',
      Wertminderung: 'Wertminderung'
    },
    chargingCable: 'Ladekabel vorhanden',
    firstAidKitLabel: 'Erste-Hilfe-Set',
    safetyVestLabel: 'Warnweste',
    warningTriangleLabel: 'Warndreieck',
    yes: 'Ja',
    no: 'Nein',
    available: 'Vorhanden',
    notAvailable: 'Nicht vorhanden',
    paintMeasurementsLabel: 'Lackschichtdickenmessung',
    measuredMicrons: 'Messwert',
    photosLabel: 'Foto(s)',
    noLiftingPlatformAvailable: 'Hebebühne nicht verfügbar',
    inspectionFromAbove: 'Besichtigung von unten nicht möglich',
    inspectionFromBelow: 'Besichtigung von oben nicht möglich',
    vehicleWetLabel: 'Fahrzeug nass',
    vehicleDirtyLabel: 'Fahrzeug verschmutzt',
    vehicleCondition: 'Fahrzeugzustand (Sichtprüfung)',
    engineRun: 'Motorlauf',

    equipmentListAvailable: 'Ausstattungsliste vorhanden',
    deliveryConfirmationAvailable: 'Übergabebestätigung vorhanden',
    engineRunYes: 'Ein Motorlauf wurde durchgeführt.',
    engineRunNoIssues: 'Ein Motorlauf wurde durchgeführt. Es wurden keine Auffälligkeiten festgestellt.',
    engineRunIssues: 'Ein Motorlauf wurde durchgeführt. Folgende Auffälligkeiten wurden festgestellt:',
    engineRunNoiseKnocking: 'Klopfen',
    engineRunNoiseRattling: 'Rasseln',
    engineRunNoiseWhistling: 'Pfeifen',
    engineRunNoiseSqueaking: 'Quietschen',
    engineRunNoiseGrinding: 'Schleifen',
    engineRunNoiseVibrations: 'Vibrationen / Dröhnen',
    engineRunNoiseIrregular: 'Unregelmäßige Geräusche',
    engineRunNoiseNone: 'Kein Geräusch',
    engineRunRoughRunningLabel: 'Unruhiger Motorlauf',
    engineRunRoughRunningNormal: 'Normaler Lauf',
    engineRunRoughRunningRough: 'Unruhiger Lauf',
    engineRunWarningLightsLabel: 'Warnleuchten aktiv',
    engineRunWarningLightsDetails: 'Spezifikation Warnleuchten',
    engineRunOtherIssuesLabel: 'Sonstige Mängel',
    engineRunNo: 'Ein Motorlauf wurde nicht durchgeführt.',
    engineRunNotPossible: 'Ein Motorlauf war nicht möglich.',
    engineRunNotSpecified: 'Keine Angabe zum Motorlauf.',
    additionalNotes: 'Zusätzliche Bemerkungen',
    authorizedPerson: 'Bevollmächtigte Person',
    authorizedPersonName: 'Name der bevollmächtigten Person',
    authorizedPersonPhoto: 'Foto der bevollmächtigten Person',
    customerPresent: 'Kunde war bei der Unterzeichnung anwesend',
    testDriveNotPossible: 'Eine Fahrprobe war nicht möglich.',
    hybridCheckedYes: 'Die Hochvoltbatterie wurde geprüft.',
    vehicleDirtyRemark: 'Das Fahrzeug war stark verschmutzt.',
    vehicleWetRemark: 'Das Fahrzeug war nass.',
    vehicleRestricted: 'Die Sichtprüfung war eingeschränkt.',
    tireAxleSummary: 'Räder / Reifen (Achse {{axle}} {{side}})',
    secondTireSetSummary: 'Räder / Reifen (2. Satz - Achse {{axle}} {{side}})',
    continued: '(Fortsetzung)',
    rimAlloy: 'Leichtmetallfelge',
    rimSteel: 'Stahlfelge',
    Scratched: 'Verkratzt',
    'Curb Damage': 'Bordsteinschaden',
    'Curb': 'Bordsteinschaden',
    Other: 'Sonstiges',
    'Only Tires': 'Nur Reifen',
    'Only Rims': 'Nur Felgen',
    'Both': 'Beides (Reifen & Felgen)',
    'Hub Cap': 'Radkappe',
    Light: 'Leicht',
    Medium: 'Mittel',
    Severe: 'Schwer',
    'Door Edge Damage': 'Türkantenschaden',
    'Signs of use': 'Gebrauchsspuren',
    damageKnown: 'Schaden bekannt',
    damageUnknown: 'Schaden unbekannt',
    docStatusCopy: 'Kopie',
    docStatusInVehicle: 'Im Fahrzeug',
    docStatusNotAvailable: 'Nicht vorhanden',
    secondTireSet: 'Zweiter Rädersatz',
    keys: 'Schlüssel',
    registrationPaper: 'Zulassungsbescheinigung Teil I (Fahrzeugschein)',
    huLabel: 'Hauptuntersuchungs-Bericht (HU)'
  },
  en: {
    reportTitle: 'Condition Report / Diminished Value Assessment',
    licensePlateLabel: 'License Plate',
    vinLabel: 'VIN',
    caseSection: 'Case',
    orderNo: 'Order Number',
    customerNo: 'Customer No.',
    client: 'Client',
    orderFrom: 'Your Order from',
    electronically: 'electronically',
    inspection: 'Inspection',
    clock: '',
    byMr: 'by Mr.',
    at: 'at',
    inPresenceOf: 'in the presence of',
    valuedOn: 'Valued on',
    concerns: 'Concerns',
    contractNo: 'Contract No.',
    summary: 'Summary',
    repairCostsLabel: 'Total Repair Costs (gross)',
    dimValueLabel: 'Diminished Values (gross)',
    withVat: 'incl. VAT',
    withoutVat: 'excl. VAT',
    phone: 'Phone',
    fax: 'Fax',
    email: 'E-mail',
    court: 'District Court',
    vatId: 'VAT ID',
    taxNo: 'Tax No.',
    directors: 'Managing Directors',
    contactPerson: 'Contact person',
    directPhone: 'Direct phone',
    remarks: 'Remarks',
    eventType: 'Event Type',
    reportTypeLabel: 'Report',
    pageLabel: 'Page',
    remarksBlock1: 'This service was prepared in accordance with the specifications (guidelines) of the client. In individual cases, deviations from the MyGutachter standard may apply.',
    remarksBlock2Prefix: 'During paint layer thickness measurement, at least three measurements per component revealed paint layer thicknesses from',
    remarksBlock2Suffix: 'µm.',
    repaintsFound: 'Repainting detected on the following body parts',
    noRepaintsFound: 'No repainting was detected.',
    remarksBlock4: 'Without further investigation, no mercantile diminished value was applied.',
    remarksBlock5: 'The inspection was performed from above and below.',
    testDriveYes: 'A test drive was performed.',
    testDriveNo: 'A test drive was not performed.',
    liftInspected: 'The vehicle was inspected on a vehicle lift.',
    liftNotAvailable: 'A lifting platform was not available.',
    liftNotPossible: 'The use of a lifting platform was not possible.',
    errorMemory: 'Error memory',
    errorMemoryYes: 'read',
    errorMemoryNo: 'not read',
    hybridCheckedNo: 'The high-voltage battery was not separately inspected.',
    hybridLabel: 'High-voltage battery',
    documentsPresent: 'The following documents were available for processing',
    noDocuments: 'none',
    keysPresented: 'main key(s) presented',
    vehicleCategory: 'Vehicle Category',
    vehicleData: 'Vehicle Data',
    firstRegistration: 'First Registration',
    lastRegistration: 'Last Registration',
    manufacturer: 'Manufacturer',
    typeSales: 'Basismodell / Sub Modell',
    bodyType: 'Body Type',
    doors: 'Doors',
    seats: 'Seats',
    vinFull: 'Vehicle Ident. No.',
    hsnTsn: 'HSN / TSN',
    keyNo: 'Key No.',
    mileageRead: 'Mileage (read)',
    nextInspection: 'Next Inspection (HU)',
    fuel: 'Fuel',
    cylinders: 'Cylinders',
    power: 'Power (kW)',
    displacement: 'Displacement (ccm)',
    emissionClass: 'Emission Class',
    driveType: 'Drive Type',
    transmission: 'Transmission / Gears',
    wheels: 'Wheels',
    color: 'Color',
    upholstery: 'Upholstery / Color',
    breakdownKit: 'Breakdown Kit',
    mileageDisclaimer: 'It is assumed that the total mileage corresponds to the reading on the odometer.',
    tiresWheels: 'Wheels / Tires',
    axle: 'Axle',
    tireDesignation: 'Tire Designation',
    tireManufacturer: 'Manufacturer/Type',
    tireType: 'Type',
    treadDepth: 'Tread Depth',
    tireSpareTire: 'Spare Tire',
    damaged: 'Tire Damaged',
    tireLegend: 'A/ All-Season; /O Original; /F Runflat;',
    standardEquipment: 'Standard Equipment',
    generalCondition: 'General Condition & Maintenance',
    generalConditionText: 'Apart from the described damages/defects, the vehicle/object shows a general condition typical for its age and use.',
    maintenanceRecord: 'Maintenance Record',
    nonAccepted: 'Non-Accepted Condition / Pending Repairs',
    damageDescCol: 'Damage Description',
    repairCostCol: 'Repair (gross)',
    repairCostNetCol: 'Repair (net)',
    allocationCol: 'Allocation',
    dimValueGrossCol: 'Dim. Value (gross)',
    dimValueNetCol: 'Dim. Value (net)',
    totalRow: 'Total Amount / Diminished Value',
    anrechnungVoll: 'full',
    anrechnungAnteilig: 'partial',
    anrechnungKein: 'none',
    anrechnungKeine: 'No costs',
    tireSideLinks: 'left',
    tireSideRechts: 'right',
    docFzSchein: 'Vehicle Registration Part I',
    docServiceheft: 'Service Book',
    docBedienungsanleitung: "Owner's Manual",
    docServiceBook: 'Service Book',
    docBadge: 'Environmental Badge',
    willBeSubmittedLater: 'Will be submitted later',
    docStatusOriginal: 'Original',
    docStatusDigital: 'Digital',
    'docStatusIn-Vehicle': 'In Vehicle',
    'docStatusNot Available': 'Not Available',
    'docStatusNot available': 'Not available',
    docStatusGreen: 'Green',
    docStatusYellow: 'Yellow',
    docStatusRed: 'Red',
    notes: 'Notes',
    notesText: 'All amounts (except any listed mercantile diminished value) include the statutory value-added tax. Diminished values are shown gross and net.',
    notesText2: 'All system-calculated values may contain rounding.',
    theInspector: 'The Inspector',
    privacyNote: 'When forwarding or publishing this document, the generally applicable data protection principles, particularly regarding the anonymization of personal data, must be strictly observed.',
    electronicDoc: 'This document was generated electronically and is valid without a signature.',
    sigIntro: 'The vehicle documentation and the documented vehicle condition have been reviewed and confirmed by the following persons.',
    sigDriver: 'Driver delivering / handing over the vehicle',
    sigDate: 'Date',
    sigName: 'Name (print)',
    sigSignature: 'Signature',
    sigInspector: 'Inspector',
    sigReceiver: 'Recipient / Carrier / Collector / Authorized Dealer Representative',
    photoAnnex: 'Picture Annex',
    photoVehicle: 'for Vehicle / Object',
    photoRef: 'MyGutachter No.',
    photoFrom: 'from',
    photoDisclaimer: 'This picture annex consists of',
    photoDisclaimerEnd: 'digitally produced picture(s) and is valid without signature or stamp.',
    photoLabel: 'Picture',
    page: 'Page',
    of: 'of',
    vehicleDiagram: 'Vehicle Diagram',
    optionalEquipment: 'Optional Equipment',
    einigung: 'Agreement',
    keineEinigung: 'No Agreement',
    bodyCondition: 'Vehicle Condition',
    repairMethod: 'Repair Method',
    inspectedBy: 'Inspected by',
    gaAccepted: 'Expert assessment accepted',
    gaNotAccepted: 'Expert assessment not accepted',
    toLabel: 'to',
    repairMethods: {
      lackieren: 'repaint',
      reparieren: 'repair',
      ersetzen: 'replace',
      polieren: 'polish',
      Lackvorbereitung: 'paint preparation',
      ausbeulen: 'dent removal',
      'Smart Repair': 'Smart Repair',
      erneuern: 'replace/renew',
      instandsetzen: 'restore',
      prüfen: 'inspect and assess',
      reinigen: 'clean',
      Wertminderung: 'depreciation'
    },
    chargingCable: 'Charging cable available',
    firstAidKitLabel: 'First Aid Kit',
    safetyVestLabel: 'Safety Vest',
    warningTriangleLabel: 'Warning Triangle',
    yes: 'Yes',
    no: 'No',
    available: 'Available',
    notAvailable: 'Not available',
    paintMeasurementsLabel: 'Paint Layer Thickness Measurement',
    measuredMicrons: 'Measured Value',
    photosLabel: 'Photo(s)',
    noLiftingPlatformAvailable: 'Lifting platform not available',
    inspectionFromAbove: 'Inspection from below not possible',
    inspectionFromBelow: 'Inspection from above not possible',
    vehicleWetLabel: 'Vehicle wet',
    vehicleDirtyLabel: 'Vehicle dirty',
    vehicleCondition: 'Vehicle Condition (Visual Inspection)',
    engineRun: 'Engine run',
    equipmentListAvailable: 'Equipment list available',
    deliveryConfirmationAvailable: 'Delivery confirmation available',
    engineRunYes: 'Engine run was performed.',
    engineRunNoIssues: 'Engine run was performed. No abnormalities were detected.',
    engineRunIssues: 'Engine run was performed. The following abnormalities were detected:',
    engineRunNoiseKnocking: 'Knocking',
    engineRunNoiseRattling: 'Rattling',
    engineRunNoiseWhistling: 'Whistling',
    engineRunNoiseSqueaking: 'Squeaking',
    engineRunNoiseGrinding: 'Grinding',
    engineRunNoiseVibrations: 'Vibrations / Droning',
    engineRunNoiseIrregular: 'Irregular noises',
    engineRunNoiseNone: 'No noise',
    engineRunRoughRunningLabel: 'Engine behavior',
    engineRunRoughRunningNormal: 'Normal running',
    engineRunRoughRunningRough: 'Rough running',
    engineRunWarningLightsLabel: 'Warning lights active',
    engineRunWarningLightsDetails: 'Warning lights specification',
    engineRunOtherIssuesLabel: 'Other issues',
    engineRunNo: 'An engine run was not performed.',
    engineRunNotPossible: 'An engine run was not possible.',
    engineRunNotSpecified: 'No indication regarding engine run.',
    additionalNotes: 'Additional Remarks',
    authorizedPerson: 'Authorized Person',
    authorizedPersonName: "Authorized Person's Name",
    authorizedPersonPhoto: "Authorized Person's Photo",
    customerPresent: 'Customer was present during signing',
    testDriveNotPossible: 'A test drive was not possible.',
    hybridCheckedYes: 'The high-voltage battery was checked.',
    vehicleDirtyRemark: 'The vehicle was heavily soiled.',
    vehicleWetRemark: 'The vehicle was wet.',
    vehicleRestricted: 'The visual inspection was restricted.',
    tireAxleSummary: 'Wheels / Tires (Axle {{axle}} {{side}})',
    secondTireSetSummary: 'Wheels / Tires (2nd Set - Axle {{axle}} {{side}})',
    continued: '(continued)',
    'Hub Cap': 'Hub Cap',
    rimAlloy: 'Alloy Rim',
    rimSteel: 'Steel Rim',
    Scratched: 'Scratched',
    'Curb Damage': 'Curb Damage',
    'Curb': 'Curb Damage',
    Other: 'Other',
    'Only Tires': 'Only Tires',
    'Only Rims': 'Only Rims',
    'Both': 'Both',
    damageKnown: 'Known damage',
    damageUnknown: 'Unknown damage',
    docStatusCopy: 'Copy',
    docStatusInVehicle: 'In Vehicle',
    docStatusNotAvailable: 'Not available',
    secondTireSet: 'Second Tire Set',
    keys: 'Keys',
    registrationPaper: 'Registration Certificate Part I',
    huLabel: 'Inspection Report (HU)'
  }
};

interface LabelSet {
  [key: string]: any;
}
const LabelsTyped = PDF_LABELS as Record<'de' | 'en', LabelSet>;

export function getRepairMethodLabel(method: string | undefined, lang: 'de' | 'en' = 'de'): string {
  if (!method) return '';
  const safeLang = lang === 'en' ? 'en' : 'de';
  const L = LabelsTyped[safeLang];

  // Try matching with normalized estimate repair codes
  const cleanMethod = method.trim().toLowerCase();
  const matchedEstimateCode = ESTIMATE_REPAIR_CODE_IDS.find(
    (code) => code.toLowerCase() === cleanMethod
  );
  if (matchedEstimateCode) {
    return ESTIMATE_REPAIR_CODE_LABELS[matchedEstimateCode as EstimateRepairCodeId][safeLang];
  }

  // Mappings for synonyms/casing to L.repairMethods keys
  const methodMapping: Record<string, string> = {
    'renew': 'erneuern',
    'remove': 'erneuern',
    'replace': 'erneuern',
    'paint': 'lackieren',
    'repair': 'reparieren',
    'polish': 'polieren',
    'clean': 'reinigen',
    'inspect': 'prüfen',
    'restore': 'instandsetzen',
    'dent': 'ausbeulen',
    'dent removal': 'ausbeulen',
    'smart': 'Smart Repair',
    'smart repair': 'Smart Repair',
    'lackieren': 'lackieren',
    'reparieren': 'reparieren',
    'ersetzen': 'ersetzen',
    'polieren': 'polieren',
    'lackvorbereitung': 'Lackvorbereitung',
    'ausbeulen': 'ausbeulen',
    'erneuern': 'erneuern',
    'instandsetzen': 'instandsetzen',
    'reinigen': 'reinigen',
    'wertminderung': 'Wertminderung'
  };

  const mappedKey = methodMapping[cleanMethod];
  if (mappedKey && L.repairMethods?.[mappedKey]) {
    return L.repairMethods[mappedKey];
  }

  // Fallback lookups in L.repairMethods
  return L.repairMethods?.[method] || L.repairMethods?.[cleanMethod] || method;
}

export function generatePDFHTML(r: PDFReportData, lang: 'de' | 'en' = 'de'): string {
  const C = COMPANY_INFO;
  const safeLang = lang?.startsWith('en') ? 'en' : 'de';
  const L = LabelsTyped[safeLang];

  // Sort paint measurements in a logical "around the vehicle" order
  if (r.paintMeasurements) {
    r.paintMeasurements = sortPaintMeasurements(r.paintMeasurements);
  }


  // OCR Cleanup Utility
  const cleanup = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '';
    const text = String(val);
    const isDe = safeLang === 'de';
    return text
      .replace(/Vehicie ldent/gi, isDe ? 'Fahrgestellnummer (FIN)' : 'VIN')
      .replace(/Vehicle Ident/gi, isDe ? 'Fahrgestellnummer (FIN)' : 'VIN')
      .replace(/Vehicle Ident Nr\.?/gi, isDe ? 'Fahrgestellnummer (FIN)' : 'VIN')
      .replace(/Mileage/gi, isDe ? 'Kilometerstand' : 'Mileage')
      .replace(/km[ \-]*Stand/gi, isDe ? 'Kilometerstand' : 'Mileage')
      .replace(/Ident\.-Nr\.?/gi, isDe ? 'Fahrgestellnummer (FIN)' : 'VIN')
      .replace(/Rep\. Costs/gi, isDe ? 'Reparaturkosten' : 'Repair costs')
      .replace(/Repair costs/gi, isDe ? 'Reparaturkosten' : 'Repair costs')
      .replace(/\bFIN\b/g, isDe ? 'FIN' : 'VIN')
      .replace(/\bVIN\b/g, isDe ? 'Fahrgestellnummer (FIN)' : 'VIN')
      // Common OCR character misreads
      .replace(/\|/g, 'I') // Pipe to I
      .replace(/0(?=[A-Z])/g, 'O') // 0 to O in some contexts if needed, but risky. Let's stick to obvious ones.
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getAxleSideLabel = (axle: number, side: string) => {
    const sideLower = (side || '').trim().toLowerCase();
    const isLeft = sideLower === 'links' || sideLower === 'left';
    const isRight = sideLower === 'rechts' || sideLower === 'right';
    const sideLabel = isLeft ? L.tireSideLinks : isRight ? L.tireSideRechts : side;
    const axleLabel = safeLang === 'de' ? 'Achse' : 'Axle';
    return `${axleLabel} ${axle} ${sideLabel}`;
  };

  // ─────────────────────────────────────────────────────────────────────
  // THEME COLORS
  // ─────────────────────────────────────────────────────────────────────
  const BLUE = '#003594';
  const ORANGE = '#EE7700';
  const THEME = '#2d3748'; // Darker, more professional slate
  const THEME_BG = '#f8fafc'; // Modern light blue-gray background
  const BORDER_COLOR = '#e2e8f0'; // Subtle borders

  // Get expert name from localStorage if available
  let expertName = '';
  try {
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    expertName = authData?.state?.expertName || '';
  } catch (e) {
    // Silently fail if localStorage is not accessible
  }

  const formatNameSpacing = (name: string): string => {
    if (!name) return '';
    if (!name.includes(' ')) {
      return name.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    return name;
  };

  const finalInspectorName = formatNameSpacing(r.inspectorName || expertName);

  const totalRepair = r.totalRepairCostBrutto();
  const totalMinderwert = r.totalMinderwertBrutto();
  const fmtDate = (d: string) => formatDate(d);
  const fmtDateTime = (d: string) => formatDateTime(d);
  const fmtCur = (n: number) => formatCurrency(n);
  const p3ShowStd = !!(r.standardEquipment && r.standardEquipment.length > 0);
  const p3ShowOpt = !!(r.optionalEquipment && r.optionalEquipment.length > 0);
  const p3ShowTires = !!(r.tires && r.tires.length > 0);

  // Paint analysis helpers

  const translateAnrechnung = (a: string) => {
    const clean = (a || '').trim().toLowerCase();
    if (clean === 'voll' || clean === 'full') return L.anrechnungVoll;
    if (clean === 'anteilig' || clean === 'pro-rata' || clean === 'proportional' || clean === 'partial') return L.anrechnungAnteilig;
    if (clean === 'kein' || clean === 'none') return L.anrechnungKein;
    if (clean === 'keine' || clean === 'no costs' || clean === 'no_costs') return L.anrechnungKeine;
    return a;
  };

  const translateRimType = (rim: string | undefined) => {
    if (!rim) return '';
    const rTrimmed = rim.trim();
    const rLower = rTrimmed.toLowerCase();
    if (rLower === 'alloy' || rLower === 'alufelge' || rLower === 'leichtmetallfelge') {
      return safeLang === 'de' ? 'Alufelge' : 'Alloy Rim';
    }
    if (rLower === 'steel' || rLower === 'stahlfelge') {
      return safeLang === 'de' ? 'Stahlfelge' : 'Steel Rim';
    }
    return L[rTrimmed] || L[rLower] || rTrimmed;
  };

  const translateRimDamage = (damage: string) => {
    if (!damage) return '';
    const dTrimmed = damage.trim();
    const dLower = dTrimmed.toLowerCase();

    const damageMappingDe: Record<string, string> = {
      'scratched': 'Verkratzt',
      'curb damage': 'Bordsteinschaden',
      'curb': 'Bordsteinschaden',
      'other': 'Sonstiges',
      'hub cap': 'Radkappe',
      'only tires': 'Nur Reifen',
      'only rims': 'Nur Felgen',
      'both': 'Beides (Reifen & Felgen)'
    };

    const damageMappingEn: Record<string, string> = {
      'scratched': 'Scratched',
      'curb damage': 'Curb Damage',
      'curb': 'Curb Damage',
      'other': 'Other',
      'hub cap': 'Hub Cap',
      'only tires': 'Only Tires',
      'only rims': 'Only Rims',
      'both': 'Both'
    };

    if (safeLang === 'de') {
      return damageMappingDe[dLower] || L[dTrimmed] || L[dLower] || dTrimmed;
    } else {
      return damageMappingEn[dLower] || L[dTrimmed] || L[dLower] || dTrimmed;
    }
  };

  const translateDamage = (desc: string) => {
    if (!desc) return '';
    const descTrimmed = desc.trim();
    const match = r.globalConfig?.damageTypes?.find(
      (dt: any) => dt.value === descTrimmed || dt.labelDe === descTrimmed || dt.labelEn === descTrimmed
    );
    if (match) {
      return safeLang === 'de' ? match.labelDe : match.labelEn;
    }

    const lowerDesc = descTrimmed.toLowerCase();
    const damageMappingDe: Record<string, string> = {
      'scratched': 'zerkratzt',
      'dented': 'verbeult',
      'paint': 'lackieren',
      'replace': 'erneuern',
      'renew': 'erneuern',
      'repair': 'instandsetzen',
      'smart repair': 'Smart Repair',
      'no damage': 'Kein Schaden',
      'inspect': 'prüfen',
      'clean': 'reinigen',
      'signs of use': 'Gebrauchsspuren',
      'signs of wear': 'Gebrauchsspuren',
      'door edge damage': 'Türkantenschaden',
      'curb damage': 'Bordsteinschaden',
      'curb': 'Bordsteinschaden',
      'other': 'Sonstiges',
      'known damage': 'Schaden bekannt',
      'unknown damage': 'Schaden unbekannt'
    };

    const damageMappingEn: Record<string, string> = {
      'zerkratzt': 'scratched',
      'verbeult': 'dented',
      'lackieren': 'paint',
      'erneuern': 'replace',
      'instandsetzen': 'repair',
      'smart repair': 'Smart Repair',
      'kein schaden': 'no damage',
      'prüfen': 'inspect',
      'reinigen': 'clean',
      'gebrauchsspuren': 'signs of use',
      'türkantenschaden': 'door edge damage',
      'bordsteinschaden': 'curb damage',
      'sonstiges': 'other',
      'schaden bekannt': 'known damage',
      'schaden unbekannt': 'unknown damage'
    };

    if (safeLang === 'de') {
      return damageMappingDe[lowerDesc] || descTrimmed;
    } else {
      return damageMappingEn[lowerDesc] || descTrimmed;
    }
  };

  const translateSecondTireSetSelection = (sel: string | undefined) => {
    if (!sel) return '';
    const sLower = sel.trim().toLowerCase();
    if (sLower === 'both') return safeLang === 'de' ? 'Beides (Reifen & Felgen)' : 'Both';
    if (sLower === 'only tires' || sLower === 'only_tires') return safeLang === 'de' ? 'Nur Reifen' : 'Only Tires';
    if (sLower === 'only rims' || sLower === 'only_rims') return safeLang === 'de' ? 'Nur Felgen' : 'Only Rims';
    return L[sel] || sel;
  };

  const translateDocs = () => {
    const docs = [];
    if (r.registrationCertificateStatus) {
      const statusKey = 'docStatus' + r.registrationCertificateStatus.replace(/\s+/g, '');
      docs.push(`${L.docFzSchein}: ${L[statusKey] || L['docStatus' + r.registrationCertificateStatus] || r.registrationCertificateStatus}${r.registrationCertificateSubmittedLater ? ' (' + L.willBeSubmittedLater + ')' : ''}`);
    }
    if (r.serviceBookletStatus) {
      const statusKey = 'docStatus' + r.serviceBookletStatus.replace(/\s+/g, '');
      docs.push(`${L.docServiceBook}: ${L[statusKey] || L['docStatus' + r.serviceBookletStatus] || r.serviceBookletStatus}${r.serviceBookletSubmittedLater ? ' (' + L.willBeSubmittedLater + ')' : ''}`);
    }
    if (r.operatingManualStatus) {
      const statusKey = 'docStatus' + r.operatingManualStatus.replace(/\s+/g, '');
      docs.push(`${L.docBedienungsanleitung}: ${L[statusKey] || L['docStatus' + r.operatingManualStatus] || r.operatingManualStatus}${r.operatingManualSubmittedLater ? ' (' + L.willBeSubmittedLater + ')' : ''}`);
    }
    if (r.environmentalBadgeStatus) {
      const statusKey = 'docStatus' + r.environmentalBadgeStatus.replace(/\s+/g, '');
      docs.push(`${L.docBadge}: ${L[statusKey] || L['docStatus' + r.environmentalBadgeStatus] || r.environmentalBadgeStatus}${r.environmentalBadgeSubmittedLater ? ' (' + L.willBeSubmittedLater + ')' : ''}`);
    }
    return docs.join(', ');
  };

  const constructBemerkungenParagraph = () => {
    const sentences: string[] = [];
    let infoText = '';

    // 1. Basic Remarks
    sentences.push(L.remarksBlock1);

    // 1.5 Informational Damages (Altschaden/Known damages)
    const infoRows = [...(r.minderwertRows || []), ...(r.damages || [])].filter(x => x && x.anrechnung === 'informational');
    if (infoRows.length > 0) {
      const showPrice = r.globalConfig?.calculationType !== 'text_only';
      const infoParts = infoRows.map(row => {
        const part = row.bodyPart ? getBodyPartLabel(row.bodyPart, safeLang) : '';
        const damageDesc = (row as any).damage || (row as any).description || '';
        const translatedDamage = translateDamage(damageDesc);
        const cost = (row as any).repairCost || (row as any).repairCostBrutto || (row as any).minderwertBrutto || 0;
        const costStr = showPrice ? ` (${fmtCur(Number(cost) || 0)})` : '';
        return `${part}${translatedDamage ? (part ? ' - ' : '') + translatedDamage : ''}${costStr}`;
      }).filter(Boolean).join(', ');

      if (infoParts) {
        infoText = `${L.damageKnown || 'Bekannte Schäden'} (Info): ${infoParts}.`;
      }
    }

    // 2. Paint Measurements
    const paintWithValues = r.paintMeasurements.filter(p => p.measuredMicrons > 0 || p.damageKnown || p.damageUnknown);
    if (paintWithValues.length > 0) {
      const paintParts = paintWithValues.map(p => {
        const partLabel = getBodyPartLabel(p.bodyPart, safeLang);
        const details = [];
        if (p.measuredMicrons > 0) details.push(`${p.measuredMicrons} µm`);
        if (p.damageKnown) {
          if (p.depreciationValue && p.depreciationValue > 0) {
            details.push(safeLang === 'de'
              ? `Bekannter Vorschaden: ${fmtCur(p.depreciationValue)} (Nur Information)`
              : `Previous known damage: ${fmtCur(p.depreciationValue)} (Informational only)`
            );
          } else {
            details.push(L.damageKnown);
          }
        }
        if (p.damageUnknown) details.push(L.damageUnknown);
        if (p.repairDamage) details.push(p.repairDamage);

        return `${partLabel} (${details.join(', ')})`;
      }).join(', ');
      sentences.push(`${L.paintMeasurementsLabel}: ${paintParts}.`);
    } else if (r.paintMeasurements && r.paintMeasurements.length > 0) {
      sentences.push(L.noRepaintsFound);
    }

    // 3. Diminished Value Note
    sentences.push(L.remarksBlock4);

    // 4. Technical Checks & Inspection Details (Conflict Resolution)
    // Inspection scope coverage (Priority: Performed > Not Possible)
    if (!r.inspectionFromAbove && !r.inspectionFromBelow) {
      sentences.push(L.remarksBlock5);
    } else {
      if (r.inspectionFromAbove) sentences.push(`${L.inspectionFromAbove}.`);
      if (r.inspectionFromBelow && r.liftingPlatformStatus !== 'available_used') {
        sentences.push(`${L.inspectionFromBelow}.`);
      }
    }

    // Test Drive (Deduplicate)
    if (r.testDriveDone === 'carried_out') {
      sentences.push(L.testDriveYes);
    } else if (r.testDriveDone === 'not_occurred') {
      sentences.push(L.testDriveNo);
    } else if (r.testDriveDone === 'not_possible') {
      sentences.push(L.testDriveNotPossible);
    }

    // Engine Run
    if (r.engineRunPerformed === 'carried_out') {
      if (r.engineRunStatus === 'no_issues') {
        sentences.push(L.engineRunNoIssues);
      } else if (r.engineRunStatus === 'issues') {
        const issuesList: string[] = [];
        if (r.engineRunNoise && r.engineRunNoise !== 'none') {
          const noiseLbl = r.engineRunNoise === 'knocking' ? (L.engineRunNoiseKnocking || 'Klopfen')
                          : r.engineRunNoise === 'rattling' ? (L.engineRunNoiseRattling || 'Rasseln')
                          : r.engineRunNoise === 'whistling' ? (L.engineRunNoiseWhistling || 'Pfeifen')
                          : r.engineRunNoise === 'squeaking' ? (L.engineRunNoiseSqueaking || 'Quietschen')
                          : r.engineRunNoise === 'grinding' ? (L.engineRunNoiseGrinding || 'Schleifen')
                          : r.engineRunNoise === 'vibrations' ? (L.engineRunNoiseVibrations || 'Vibrationen / Dröhnen')
                          : r.engineRunNoise === 'irregular' ? (L.engineRunNoiseIrregular || 'Unregelmäßige Geräusche')
                          : r.engineRunNoise;
          issuesList.push(`${safeLang === 'de' ? 'Geräusche' : 'Noise'}: ${noiseLbl}`);
        }
        if (r.engineRunRoughRunning && r.engineRunRoughRunning !== 'normal') {
          const roughRunningLbl = r.engineRunRoughRunning === 'rough' ? (L.engineRunRoughRunningRough || 'Unruhiger Lauf') : r.engineRunRoughRunning;
          issuesList.push(`${safeLang === 'de' ? 'Motorlauf' : 'Engine behavior'}: ${roughRunningLbl}`);
        }
        if (r.engineRunWarningLightsActive && r.engineRunWarningLightsActive !== 'no') {
          const warningLightsLbl = safeLang === 'de' ? 'aktiv' : 'active';
          const warningDetails = r.engineRunWarningLightsDetails && r.engineRunWarningLightsDetails.trim()
                                 ? ` (${r.engineRunWarningLightsDetails.trim()})` : '';
          issuesList.push(`${safeLang === 'de' ? 'Warnleuchten' : 'Warning lights'}: ${warningLightsLbl}${warningDetails}`);
        }
        if (r.engineRunOtherIssues && r.engineRunOtherIssues.trim()) {
          issuesList.push(`${safeLang === 'de' ? 'Sonstiges' : 'Other'}: ${r.engineRunOtherIssues.trim()}`);
        }

        if (issuesList.length > 0) {
          const intro = L.engineRunIssues || (safeLang === 'de' ? 'Ein Motorlauf wurde durchgeführt. Folgende Auffälligkeiten wurden festgestellt:' : 'Engine run was performed. The following abnormalities were detected:');
          const joinedIssues = issuesList.join(', ');
          sentences.push(`${intro} ${joinedIssues}.`);
        } else {
          sentences.push(L.engineRunYes);
        }
      } else {
        sentences.push(L.engineRunYes);
      }
    } else if (r.engineRunPerformed === 'not_occurred') {
      sentences.push(L.engineRunNo);
    } else if (r.engineRunPerformed === 'not_possible') {
      sentences.push(L.engineRunNotPossible);
    } else if (r.engineRunPerformed === 'not_specified') {
      sentences.push(L.engineRunNotSpecified || 'Keine Angabe zum Motorlauf.');
    }

    // Lift
    if (r.liftingPlatformStatus === 'available_used') {
      sentences.push(L.liftInspected);
    } else if (r.liftingPlatformStatus === 'not_available') {
      sentences.push(L.liftNotAvailable);
    } else if (r.liftingPlatformStatus === 'not_possible') {
      sentences.push(L.liftNotPossible);
    }

    // Hybrid Battery
    if (r.hybridBatteryChecked) {
      sentences.push(L.hybridCheckedYes);
    } else {
      sentences.push(L.hybridCheckedNo);
    }

    // Vehicle Condition
    if (r.vehicleConditionStatus === 'dirty') {
      sentences.push(L.vehicleDirtyRemark);
    } else if (r.vehicleConditionStatus === 'wet') {
      sentences.push(L.vehicleWetRemark);
    } else if (r.vehicleConditionStatus === 'restricted') {
      sentences.push(L.vehicleRestricted);
    } else if (r.vehicleConditionStatus === 'ausreichend') {
      sentences.push(L.vehicleConditionAusreichend || (safeLang === 'de' ? 'Sichtprüfung: ausreichend.' : 'Visual inspection: sufficient.'));
    } else if (r.vehicleConditionStatus === 'other') {
      sentences.push(`${L.vehicleConditionOther || (safeLang === 'de' ? 'Sonstiger Fahrzeugzustand' : 'Other vehicle condition')}: ${r.vehicleConditionOther || ''}.`);
    }

    // Misc Flags
    if (r.equipmentListAvailable === true) {
      sentences.push(`${L.equipmentListAvailable}.`);
    } else if (r.equipmentListAvailable === 'dat') {
      const datSuffix = safeLang === 'de' ? ' (laut DAT)' : ' (according to DAT)';
      sentences.push(`${L.equipmentListAvailable}${datSuffix}.`);
    }
    if (r.deliveryConfirmationAvailable) sentences.push(`${L.deliveryConfirmationAvailable}.`);

    // 5. Documents
    const docs = translateDocs();
    sentences.push(`${L.documentsPresent}: ${docs || L.noDocuments}.`);

    // 6. Keys
    sentences.push(`${r.keysPresent} ${L.keysPresented}.`);

    // 7. Additional Notes
    if (r.additionalNotes) {
      const notesLabel = L.additionalNotes.endsWith(':') ? L.additionalNotes : `${L.additionalNotes}:`;
      sentences.push(`${notesLabel} ${r.additionalNotes}`);
    }

    // 8. Authorized Person & Presence
    if (r.isAuthorizedPerson) {
      sentences.push(`${L.authorizedPerson}: ${r.authorizedPersonName || '-'}.`);
    }
    if (r.customerPresent) {
      sentences.push(L.customerPresent + '.');
    }

    // Final Deduplication of exact sentences and cleanup
    const remarksText = sentences
      .map(s => s.trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i) // Unique statements
      .join(' ');

    return { remarksText, infoText };
  };



  // ─────────────────────────────────────────────────────────────────────
  // DAMAGE ROWS
  // ─────────────────────────────────────────────────────────────────────
  // Create a map of diagram data by part ID for easy lookup
  const diagramDataMap: Record<string, { damage: string; repair: string }> = {};
  Object.entries(r.bodyPartDamages || {}).forEach(([id, data]) => {
    if (!data.damage && !data.repair) return;
    diagramDataMap[id] = {
      damage: data.damage ? (L[data.damage] || data.damage) : '',
      repair: data.repair ? (L[data.repair] || data.repair) : ''
    };
  });

  // Augment existing manual damages with diagram info, but don't add new rows
  const augmentedDamages = r.damages.map(d => {
    const diag = diagramDataMap[d.bodyPart];
    if (diag) {
      // De-duplicate if manual entry already contains diagram text
      const diagDesc = diag.damage;
      const diagRepair = diag.repair;

      const newDesc = [d.description, diagDesc]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v as string) === i)
        .join(', ');

      const newRepair = [d.repairMethod, diagRepair]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v as string) === i)
        .join(', ');

      return { ...d, description: newDesc, repairMethod: newRepair };
    }
    return d;
  });

  // Combine manual damages and active minderwertRows for the PDF table
  const activeMinderwertRows = (r.minderwertRows || []).filter(row => row.repairCost > 0 || (row.minderwertBrutto && row.minderwertBrutto > 0));
  const systemDevalRows = getAutomaticDevaluations(r as unknown as ReportData);

  // 1. Combine all damage sources into a single consolidated array
  const rawDamages = [
    ...augmentedDamages.filter(d => d.anrechnung !== 'informational').map(d => ({
      ...d,
      repairCostBrutto: (d.repairCostBrutto || 0) + (
        d.sparePartsBrutto != null ? d.sparePartsBrutto : (d.spareParts ? Math.round(calcBrutto(d.spareParts) * 100) / 100 : 0)
      )
    })),
    ...(r.minderwertRows || []).filter(row => row.anrechnung !== 'informational' && (row.repairCost > 0 || (row.minderwertBrutto && row.minderwertBrutto > 0))).map(row => ({
      description: row.damage || '',
      repairCostBrutto: (
        row.repairCostBrutto != null ? row.repairCostBrutto : Math.round(calcBrutto(row.repairCost) * 100) / 100
      ) + (
        row.sparePartsBrutto != null ? row.sparePartsBrutto : Math.round(calcBrutto(row.spareParts || 0) * 100) / 100
      ),
      anrechnung: row.anrechnung || 'kein',
      minderwertBrutto: row.minderwertBrutto || 0,
      imageRef: '',
      bodyPart: row.bodyPart,
      repairMethod: row.repairMethod,
      reparaturweg: row.reparaturweg,
      spareParts: row.spareParts || 0
    })),
    ...getAutomaticDevaluations(r as unknown as ReportData).map(row => ({
      description: row.damage || '',
      repairCostBrutto: row.repairCostBrutto != null ? row.repairCostBrutto : Math.round(calcBrutto(row.repairCost) * 100) / 100,
      anrechnung: row.anrechnung || 'kein',
      minderwertBrutto: row.minderwertBrutto || 0,
      imageRef: '',
      bodyPart: row.bodyPart,
      repairMethod: row.repairMethod,
      reparaturweg: row.reparaturweg
    })),
    ...(r.systemMinderwertRows || [])
      .filter(row => !row.id?.startsWith('sys-equip-'))
      .map(row => {
      const rcBrutto = (
          row.repairCostBrutto != null ? row.repairCostBrutto : (row.repairCost ? Math.round(calcBrutto(row.repairCost) * 100) / 100 : 0)
      ) + (
          row.sparePartsBrutto != null ? row.sparePartsBrutto : (row.spareParts ? Math.round(calcBrutto(row.spareParts) * 100) / 100 : 0)
      );
      return {
        description: row.damage || '',
        repairCostBrutto: rcBrutto > 0 ? rcBrutto : (row.minderwertBrutto || 0),
        anrechnung: 'voll',
        minderwertBrutto: row.minderwertBrutto || 0,
        imageRef: '',
        bodyPart: row.bodyPart,
        repairMethod: 'erneuern',
        reparaturweg: row.reparaturweg || ''
      };
    }),
    ...(r.tires || []).filter(t => (t as any).depreciationValue > 0).map(t => ({
      description: L.tireAxleSummary.replace('{{axle}}', t.axle.toString()).replace('{{side}}', t.side === 'links' ? L.tireSideLinks : L.tireSideRechts),
      repairCostBrutto: (t as any).depreciationValue || 0,
      anrechnung: 'voll',
      minderwertBrutto: (t as any).depreciationValue || 0,
      imageRef: '',
      bodyPart: getAxleSideLabel(t.axle, t.side),
      repairMethod: L.repairMethods.Wertminderung || 'Wertminderung',
      reparaturweg: ''
    })),
    ...(r.spareTire && (r.spareTire as any).depreciationValue > 0 ? [{
      description: L.tireSpareTire || 'Notrad / Reserverad',
      repairCostBrutto: (r.spareTire as any).depreciationValue || 0,
      anrechnung: 'voll',
      minderwertBrutto: (r.spareTire as any).depreciationValue || 0,
      imageRef: '',
      bodyPart: L.tireSpareTire || 'Notrad / Reserverad',
      repairMethod: L.repairMethods.Wertminderung || 'Wertminderung',
      reparaturweg: ''
    }] : []),
    ...(r.secondTires || []).filter((t: any) => t.depreciationValue > 0).map((t: any) => ({
      description: L.secondTireSetSummary.replace('{{axle}}', t.axle.toString()).replace('{{side}}', t.side === 'links' ? L.tireSideLinks : L.tireSideRechts),
      repairCostBrutto: t.depreciationValue || 0,
      anrechnung: 'voll',
      minderwertBrutto: t.depreciationValue || 0,
      imageRef: '',
      bodyPart: `2. Satz ${getAxleSideLabel(t.axle, t.side)}`,
      repairMethod: L.repairMethods.Wertminderung || 'Wertminderung',
      reparaturweg: ''
    })),
    ...(r.paintMeasurements || []).filter(pm => pm.damageUnknown && (pm.depreciationValue || 0) > 0).map(pm => ({
      description: `${L.paintMeasurementsLabel || 'Lackschichtdickenmessung'}: ${L.damageUnknown || 'Schaden unbekannt'}`,
      repairCostBrutto: pm.depreciationValue || 0,
      anrechnung: 'voll',
      minderwertBrutto: pm.depreciationValue || 0,
      imageRef: '',
      bodyPart: getBodyPartLabel(pm.bodyPart, safeLang),
      repairMethod: L.repairMethods.Wertminderung || 'Wertminderung',
      reparaturweg: ''
    }))
  ];

  // 2. Incorporate Equipment Costs (formerly extraRows)
  const isNotAvailable = (status: string | undefined) => status?.toLowerCase() === 'not available';
  const isAvailable = (status: string | undefined) => status?.toLowerCase() === 'available';
  const ep = r.globalConfig?.equipmentPrices || {};

  // Breakdown Kit
  const isBreakdownKitMissing = isNotAvailable(r.breakdownKit?.status);
  const isBreakdownKitExpired = isAvailable(r.breakdownKit?.status) && r.breakdownKit?.expirationDate && new Date(r.breakdownKit.expirationDate) < new Date();
  if (isBreakdownKitMissing || isBreakdownKitExpired) {
    const cost = r.breakdownKit.price || (isBreakdownKitMissing ? (ep['breakdown_kit_missing'] ?? ep['breakdownKit_missing'] ?? 50) : (ep['breakdown_kit_expired'] ?? ep['breakdownKit_expired'] ?? 30));
    rawDamages.push({
      description: isBreakdownKitMissing
        ? `${L.breakdownKit} – ${L.notAvailable}`
        : `${L.breakdownKit} – ${safeLang === 'de' ? 'Abgelaufen' : 'Expired'} (${r.breakdownKit.expirationDate})`,
      repairCostBrutto: cost,
      anrechnung: 'voll',
      minderwertBrutto: cost,
      imageRef: '',
      bodyPart: '', repairMethod: '', reparaturweg: ''
    });
  }

  // First Aid Kit
  const isFirstAidKitMissing = isNotAvailable(r.firstAidKit?.status);
  const isFirstAidKitExpired = isAvailable(r.firstAidKit?.status) && r.firstAidKit?.expirationDate && new Date(r.firstAidKit.expirationDate) < new Date();
  if (isFirstAidKitMissing || isFirstAidKitExpired) {
    const cost = r.firstAidKit.price || (isFirstAidKitMissing ? (ep['first_aid_kit_missing'] ?? ep['firstAidKit_missing'] ?? 25) : (ep['first_aid_kit_expired'] ?? ep['firstAidKit_expired'] ?? 20));
    rawDamages.push({
      description: isFirstAidKitMissing
        ? `${L.firstAidKitLabel || 'Erste-Hilfe-Set'} – ${L.notAvailable}`
        : `${L.firstAidKitLabel || 'Erste-Hilfe-Set'} – ${safeLang === 'de' ? 'Abgelaufen' : 'Expired'} (${r.firstAidKit.expirationDate})`,
      repairCostBrutto: cost,
      anrechnung: 'voll',
      minderwertBrutto: cost,
      imageRef: '',
      bodyPart: '', repairMethod: '', reparaturweg: ''
    });
  }

  // Safety Vest
  const isSafetyVestMissing = isNotAvailable(r.safetyVest?.status);
  if (isSafetyVestMissing) {
    const cost = r.safetyVest.price || (ep['safety_vest_missing'] ?? ep['safetyVest_missing'] ?? 10);
    rawDamages.push({
      description: `${L.safetyVestLabel || 'Warnweste'} – ${L.notAvailable}`,
      repairCostBrutto: cost,
      anrechnung: 'voll',
      minderwertBrutto: cost,
      imageRef: '',
      bodyPart: '', repairMethod: '', reparaturweg: ''
    });
  }

  // Warning Triangle
  const isWarningTriangleMissing = isNotAvailable(r.warningTriangle?.status);
  if (isWarningTriangleMissing) {
    const cost = r.warningTriangle.price || (ep['warning_triangle_missing'] ?? ep['warningTriangle_missing'] ?? 15);
    rawDamages.push({
      description: `${L.warningTriangleLabel || 'Warndreieck'} – ${L.notAvailable}`,
      repairCostBrutto: cost,
      anrechnung: 'voll',
      minderwertBrutto: cost,
      imageRef: '',
      bodyPart: '', repairMethod: '', reparaturweg: ''
    });
  }
  // Maintenance price — always add if set
  const hasSysMaint = (r.systemMinderwertRows || []).some(row => row.id === 'sys-maint');
  if (!hasSysMaint) {
    if (r.maintenancePrice > 0) {
      // Build a description that includes the duration if available
      let maintenanceDesc = L.maintenanceRecord as string;
      const mType = (r as any).nextMaintenanceType;
      const mVal = (r as any).nextMaintenanceIntervalValue;
      if (mType === 'days' && mVal != null) {
        const dLabel = safeLang === 'de' ? 'Tage' : 'days';
        maintenanceDesc = `${L.maintenanceRecord} (${Math.abs(mVal)} ${dLabel})`;
      } else if (mType === 'months' && mVal != null) {
        const mLabel = safeLang === 'de' ? 'Monate' : 'months';
        maintenanceDesc = `${L.maintenanceRecord} (${Math.abs(mVal)} ${mLabel})`;
      } else if (mType === 'mileage' && mVal != null) {
        maintenanceDesc = `${L.maintenanceRecord} (${Math.abs(mVal)} km)`;
      }
      rawDamages.push({ description: maintenanceDesc, repairCostBrutto: r.maintenancePrice, anrechnung: 'keine', minderwertBrutto: r.maintenancePrice, imageRef: '', bodyPart: '', repairMethod: '', reparaturweg: '' });
    }
    // Legacy: overdue by mileage (only when no explicit price entered)
    if (!r.maintenancePrice && r.nextMaintenanceMileage && r.mileage && r.nextMaintenanceMileage < r.mileage) {
      const maintenanceCost = (r.mileage - r.nextMaintenanceMileage) * 0.05;
      rawDamages.push({ description: `${L.maintenanceRecord} (Fälligkeit nach km)`, repairCostBrutto: maintenanceCost, anrechnung: 'keine', minderwertBrutto: maintenanceCost, imageRef: '', bodyPart: '', repairMethod: '', reparaturweg: '' });
    }
    // Legacy: overdue by date (only when no explicit price entered)
    if (!r.maintenancePrice && r.nextMaintenanceDate && new Date(r.nextMaintenanceDate) < new Date()) {
      const daysOverdue = Math.floor((new Date().getTime() - new Date(r.nextMaintenanceDate).getTime()) / (1000 * 3600 * 24));
      rawDamages.push({ description: `${L.maintenanceRecord} (Fälligkeit nach Datum)`, repairCostBrutto: daysOverdue, anrechnung: 'keine', minderwertBrutto: daysOverdue, imageRef: '', bodyPart: '', repairMethod: '', reparaturweg: '' });
    }
  }

  // 3. Filter and Deduplicate
  const allRelevantDamages = rawDamages.filter(d => {
    const hasDesc = (d.description && d.description.trim()) || (d.bodyPart && d.bodyPart.trim());
    const hasValues = (d.minderwertBrutto && d.minderwertBrutto !== 0) || (d.repairCostBrutto && d.repairCostBrutto !== 0);
    return !!(hasDesc || hasValues);
  }).filter((d, i, self) => {
    // Deduplicate by content
    const key = `${d.bodyPart}|${d.description}|${d.repairMethod}|${d.repairCostBrutto}|${d.minderwertBrutto}`;
    return self.findIndex(inner => `${inner.bodyPart}|${inner.description}|${inner.repairMethod}|${inner.repairCostBrutto}|${inner.minderwertBrutto}` === key) === i;
  });



  // ─────────────────────────────────────────────────────────────────────
  // LEFT STRIPE — precisely mapped to DEKRA constraints (12mm offset, 4.6mm width)
  // ─────────────────────────────────────────────────────────────────────
  const leftStripe = (isCover: boolean) => `
    <div style="position:absolute;left:12mm;top:9.7mm;width:4.6mm;height:29.4mm;background:${BLUE}"></div>
    <div style="position:absolute;left:12mm;top:40mm;height:247mm;width:4.6mm;background:${ORANGE}"></div>`;

  // ─────────────────────────────────────────────────────────────────────
  // PHOTO REGISTRY & PAGINATION
  // ─────────────────────────────────────────────────────────────────────
  // Priority map for photos based on ID or label keywords
  const getPhotoPriority = (p: any) => {
    const id = p.mandatoryPhotoId;
    const label = (p.label || '').toLowerCase();

    // 1. Mandatory Overviews (Diagonals) - Priority 1-4 (Top of PDF & Cover)
    if (id === 'diag_fl' || label.includes('diagonal vorne links') || label.includes('front left')) return 1;
    if (id === 'diag_rl' || label.includes('diagonal hinten links') || label.includes('rear left')) return 2;
    if (id === 'diag_rr' || label.includes('diagonal hinten rechts') || label.includes('rear right')) return 3;
    if (id === 'diag_fr' || label.includes('diagonal vorne rechts') || label.includes('front right')) return 4;

    // 2. Mandatory Tech/Interior - Priority 5-9
    if (id === 'mileage_photo' || label.includes('kilometerstand') || label.includes('mileage') || label.includes('tacho')) return 5;
    if (id === 'vin_photo' || label.includes('ident.-nr') || label.includes('vin') || label.includes('typschild') || label.includes('chassis')) return 6;
    if (id === 'interior_door' || label.includes('innenraum') || label.includes('interior')) return 7;
    if (id === 'sill_left' || label.includes('schweller links') || label.includes('left sill')) return 8;
    if (id === 'sill_right' || label.includes('schweller rechts') || label.includes('right sill')) return 9;

    // 3. Additional Uploaded Overviews (Custom) - Priority 10
    if (id?.startsWith('custom_overview_') || label.includes('zusätzliche übersicht') || label.includes('additional overview')) return 10;

    // 4. Everything else in r.photos - Priority 11
    return 11;
  };

  // Combine all photos from the photos gallery for sorting, but filter out damage-specific photos
  // since they are explicitly appended below with localized titles
  const basePhotos = (r.photos || []).filter(p => !p.damageId);

  // Add ALL dedicated images if not already present, ensuring they are sorted together
  r.mileageImages?.forEach((img, i) => {
    if (img && !basePhotos.some(p => p.data === img)) {
      basePhotos.push({
        data: img,
        label: i === 0 ? (L.mileageLabel || 'Kilometerstand') : `${L.mileageRead || 'Kilometerstand'} (${L.photoLabel} ${i + 1})`,
        mandatoryPhotoId: 'mileage_photo'
      });
    }
  });
  r.identificationImages?.forEach((img, i) => {
    if (img && !basePhotos.some(p => p.data === img)) {
      basePhotos.push({
        data: img,
        label: i === 0 ? (L.vinLabel || 'Fahrgestellnummer (FIN)') : `${L.vinLabel || 'Fahrgestellnummer (FIN)'} (${L.photoLabel} ${i + 1})`,
        mandatoryPhotoId: 'vin_photo'
      });
    }
  });

  // Sort photos based on our priority mapping (stable sort by default)
  const sortedPhotos = basePhotos.sort((a, b) => getPhotoPriority(a) - getPhotoPriority(b));

  r.damages?.forEach(d => {
    const partLabel = getBodyPartLabel(d.bodyPart, safeLang);
    d.images?.forEach((img, i) => {
      sortedPhotos.push({
        data: img,
        label: `${partLabel}: ${translateDamage(d.description) || getRepairMethodLabel(d.repairMethod, safeLang)} (${L.photoLabel} ${i + 1})`
      });
    });
  });

  r.minderwertRows?.forEach(row => {
    const partLabel = getBodyPartLabel(row.bodyPart, safeLang);
    row.images?.forEach((img, i) => {
      sortedPhotos.push({
        data: img,
        label: `${partLabel}: ${translateDamage(row.damage) || getRepairMethodLabel(row.repairMethod, safeLang)} (${L.photoLabel} ${i + 1})`
      });
    });
  });

  r.tires?.forEach(t => {
    const sideLbl = getAxleSideLabel(t.axle, t.side);
    t.images?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.tiresWheels} - ${sideLbl} (${L.photoLabel} ${i + 1})` }));
  });
  r.secondTires?.forEach(t => {
    const sideLbl = getAxleSideLabel(t.axle, t.side);
    t.images?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.secondTireSet || 'Zweiter Rädersatz'} - ${sideLbl} (${L.photoLabel} ${i + 1})` }));
  });
  r.spareTire?.images?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.tireSpareTire || 'Notrad / Reserverad'} (${L.photoLabel} ${i + 1})` }));

  // Collect images from paint measurements
  r.paintMeasurements?.forEach(pm => {
    const partLabel = getBodyPartLabel(pm.bodyPart, safeLang);
    pm.images?.forEach((img: string, i: number) => sortedPhotos.push({ data: img, label: `${L.paintMeasurementsLabel || 'Lackschichtdicke'} - ${partLabel} (${L.photoLabel} ${i + 1})` }));
  });

  // Common condition images
  r.lastRegistrationImages?.forEach((img: string, i: number) => sortedPhotos.push({ data: img, label: `${L.registrationPaper || 'Fz-Schein'} (${L.photoLabel} ${i + 1})` }));
  r.nextHUImages?.forEach((img: string, i: number) => sortedPhotos.push({ data: img, label: `${L.huLabel || 'HU-Bericht'} (${L.photoLabel} ${i + 1})` }));

  // Append new general inspection photos
  r.serviceheftImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.docServiceheft || 'Serviceheft'} (${L.photoLabel} ${i + 1})` }));
  r.bordliteraturImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.docBedienungsanleitung || 'Bordliteratur'} (${L.photoLabel} ${i + 1})` }));
  r.keysImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.keys || 'Schlüssel'} (${L.photoLabel} ${i + 1})` }));
  r.maintenanceImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.maintenanceRecord || 'Wartung'} (${L.photoLabel} ${i + 1})` }));
  r.fzScheinImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.docFzSchein || 'Fz-Schein'} (${L.photoLabel} ${i + 1})` }));
  r.errorMemoryReadImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.errorMemory || 'Fehlerspeicher'} (${L.photoLabel} ${i + 1})` }));
  r.hybridBatteryCheckedImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.hybridLabel || 'Hybrid-Batterie'} (${L.photoLabel} ${i + 1})` }));
  r.environmentalBadgeImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.docBadge || 'Umweltplakette'} (${L.photoLabel} ${i + 1})` }));

  r.inspectionFromAboveImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.inspectionFromAbove || 'Besichtigung unten'} (${L.photoLabel} ${i + 1})` }));
  r.inspectionFromBelowImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.inspectionFromBelow || 'Besichtigung oben'} (${L.photoLabel} ${i + 1})` }));
  r.vehicleConditionImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.vehicleCondition || 'Fahrzeugzustand (Sichtprüfung)'} (${L.photoLabel} ${i + 1})` }));
  r.engineRunPerformedImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.engineRun || 'Motorlauf'} (${L.photoLabel} ${i + 1})` }));

  r.equipmentListAvailableImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.equipmentListAvailable} (${i + 1})` }));
  r.deliveryConfirmationAvailableImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.deliveryConfirmationAvailable} (${i + 1})` }));

  [
    { key: 'breakdownKit', lbl: L.breakdownKit },
    { key: 'firstAidKit', lbl: L.firstAidKitLabel || 'Erste-Hilfe-Set' },
    { key: 'safetyVest', lbl: L.safetyVestLabel || 'Warnweste' },
    { key: 'warningTriangle', lbl: L.warningTriangleLabel || 'Warndreieck' }
  ].forEach(({ key, lbl }) => {
    const eq = (r as any)[key];
    if (eq?.images) eq.images.forEach((img: string, i: number) => sortedPhotos.push({ data: img, label: `${lbl} (${L.photoLabel} ${i + 1})` }));
  });
  r.chargingCableImages?.forEach((img, i) => sortedPhotos.push({ data: img, label: `${L.chargingCable} (${L.photoLabel} ${i + 1})` }));

  // ─────────────────────────────────────────────────────────────────────
  // DAMAGE TABLE PAGINATION
  // Page 4 = first damage page (has SVG diagram, so fewer rows fit)
  // Additional damage continuation pages inserted before the signature page
  // ─────────────────────────────────────────────────────────────────────

  // Helper for column widths and styles
  const colStyles = [
    `width:35%;text-align:left`, // Description
    `width:12%;text-align:right;font-family:monospace`, // MW Brutto
    `width:12%;text-align:right;font-family:monospace`, // MW Netto
    `width:13%;text-align:right;font-family:monospace`, // Repair Brutto
    `width:13%;text-align:center`, // Allocation
    `width:15%;text-align:right;font-family:monospace`, // Repair Netto
  ];

  const rowHeightStyle = 'height:auto;min-height:38px;';

  // All data rows (damage + extra equipment rows) as flat array of HTML strings
  const allDamageRowsHTML: string[] = allRelevantDamages.map((d, i) => {
    const translatedPart = getBodyPartLabel(d.bodyPart, safeLang);
    const translatedMethod = getRepairMethodLabel(d.repairMethod, safeLang);
    const translatedDesc = translateDamage(d.description);
    const descParts = [translatedPart, translatedDesc, translatedMethod].filter(Boolean).join(' – ');

    return `<tr style="${rowHeightStyle}">
      <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[0]}">${i + 1}. ${descParts}${d.imageRef ? ` (${isNaN(Number(d.imageRef)) ? d.imageRef : `${L.photoLabel} ${d.imageRef}`})` : ''}</td>
      <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[1]}">${fmtCur(Math.abs(d.minderwertBrutto || 0))}</td>
      <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[2]}">${fmtCur(calcNetto(Math.abs(d.minderwertBrutto || 0)))}</td>
      <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[3]}">${fmtCur(Math.abs(d.repairCostBrutto || 0))}</td>
      <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[4]}">${translateAnrechnung(d.anrechnung || 'kein')}</td>
      <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[5]}">${fmtCur(calcNetto(Math.abs(d.repairCostBrutto || 0)))}</td>
    </tr>`;
  });

  // Rows are now rendered without padding to prevent empty boxes and overflow issues


  const totalRowHTML = `<tr style="font-weight:bold;background:#e6ffe6;${rowHeightStyle}">
    <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[0]}">${L.totalRow}</td>
    <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[1]}">${fmtCur(totalMinderwert)}</td>
    <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[2]}">${fmtCur(calcNetto(totalMinderwert))}</td>
    <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[3]}">${fmtCur(totalRepair)}</td>
    <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[4]}">—</td>
    <td style="padding:6px;border:1px solid ${BORDER_COLOR};${colStyles[5]}">${fmtCur(calcNetto(totalRepair))}</td>
  </tr>`;

  const tableHeaderHTML = `<thead><tr style="${rowHeightStyle}">
    <th style="background:${THEME};color:white;padding:6px;text-align:left;font-weight:600;${colStyles[0]}">${L.damageDescCol}</th>
    <th style="background:${THEME};color:white;padding:6px;text-align:left;font-weight:600;${colStyles[1]}">${L.dimValueGrossCol}</th>
    <th style="background:${THEME};color:white;padding:6px;text-align:left;font-weight:600;${colStyles[2]}">${L.dimValueNetCol}</th>
    <th style="background:${THEME};color:white;padding:6px;text-align:left;font-weight:600;${colStyles[3]}">${L.repairCostCol}</th>
    <th style="background:${THEME};color:white;padding:6px;text-align:left;font-weight:600;${colStyles[4]}">${L.allocationCol}</th>
    <th style="background:${THEME};color:white;padding:6px;text-align:left;font-weight:600;${colStyles[5]}">${L.repairCostNetCol || 'netto'}</th>
  </tr></thead>`;

  // Row limits per page:
  // First page has less space due to SVG car diagram (~100px) + section header
  const ROWS_PAGE_1 = 5;  // reduced to 5 for maximum safety against overflow
  const ROWS_PER_CONT = 14; // reduced to 14 to prevent overflow and duplicate lines while allowing long text

  // Slice rows for page 1 and the rest
  const page4Rows = allDamageRowsHTML.slice(0, ROWS_PAGE_1);
  const continuationRows = allDamageRowsHTML.slice(ROWS_PAGE_1);

  // Build continuation damage pages
  const damageContPages: Array<{ rows: string[] }> = [];
  if (continuationRows.length > 0) {
    for (let i = 0; i < continuationRows.length; i += ROWS_PER_CONT) {
      damageContPages.push({ rows: continuationRows.slice(i, i + ROWS_PER_CONT) });
    }
  }

  // Pages: 1=Cover, 2=Remarks+VehicleData, 3=Equipment/Condition, 4=Damage(first), [extra damage pages], 5=Signatures
  const extraDamagePages = damageContPages.length;
  const mainPages = 5 + extraDamagePages;
  const totalPhotoPages = sortedPhotos.length > 0 ? Math.ceil(sortedPhotos.length / 2) : 0;
  const totalReportPages = mainPages + totalPhotoPages;
  const sigPageNo = 5 + extraDamagePages;

  // ─────────────────────────────────────────────────────────────────────
  // HEADERS
  // ─────────────────────────────────────────────────────────────────────
  const headerInnerPage = (pageNo: number, totalPages: number) => `
    <table style="width:100%;border-collapse:collapse;border-bottom:2px solid ${ORANGE};margin-bottom:15px">
      <tr>
        <td style="vertical-align:middle;padding-bottom:10px;width:50%">
          <table style="border-collapse:collapse">
            <tr>
              <td style="border-left:3px solid ${BLUE};padding-left:10px">
                <div style="font-size:10pt;font-weight:bold;color:${THEME};margin-bottom:2px">${r.caseNumber}</div>
                <div style="font-size:8pt;color:#666">${L.photoFrom} ${fmtDate(r.inspectionDate)} &nbsp;&bull;&nbsp; <span style="color:${ORANGE};font-weight:600">${L.page} ${pageNo} ${L.of} ${totalPages}</span></div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align:right;vertical-align:middle;padding-bottom:10px;width:50%">
          <table style="border-collapse:collapse;margin-left:auto">
            <tr>
              <td style="vertical-align:middle"><img src="${FULL_LOGO_BASE64}" style="height:48px;width:auto;image-rendering:-webkit-optimize-contrast;image-rendering:crisp-edges;" alt="Logo" /></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const headerCoverPage = headerInnerPage(1, totalReportPages);

  // ─────────────────────────────────────────────────────────────────────
  // SECTION HEADER helper
  // ─────────────────────────────────────────────────────────────────────
  const secHead = (title: string, noTopLine: boolean = false) => `
    <div style="margin-top:${noTopLine ? '0' : '12px'}">
      <h3 style="font-size:11pt;color:${THEME};background:rgba(0,0,0,0.04);padding:4px 8px;margin-bottom:8px;font-weight:700">${title}</h3>`;

  // ─────────────────────────────────────────────────────────────────────
  // VEHICLE DATA TABLE ROW helper
  // ─────────────────────────────────────────────────────────────────────
  const vRow = (l1: string, v1: string | number, l2: string, v2: string | number) => `
    <tr>
      <td style="color:#333;background:${THEME_BG};padding:2px 6px;white-space:nowrap;width:20%">${l1}</td>
      <td style="font-weight:500;padding:2px 6px;width:30%">${cleanup(v1)}</td>
      <td style="color:#333;background:${THEME_BG};padding:2px 6px;white-space:nowrap;width:20%">${l2}</td>
      <td style="font-weight:500;padding:2px 6px;width:30%">${cleanup(v2)}</td>
    </tr>`;

  // Single-value row helper (for odd fields)
  const vRowSingle = (l1: string, v1: string | number) => `
    <tr>
      <td style="color:#333;background:${THEME_BG};padding:2px 6px;white-space:nowrap;width:20%">${l1}</td>
      <td colspan="3" style="font-weight:500;padding:2px 6px">${cleanup(v1)}</td>
    </tr>`;

  // ─────────────────────────────────────────────────────────────────────
  // PHOTO PAGES — 2 photos per page, own page numbering
  // ─────────────────────────────────────────────────────────────────────
  // sortedPhotos array is prepared earlier for pagination



  const photoPages = sortedPhotos.length > 0 ? sortedPhotos.reduce((acc: string[][], p, i) => {
    if (i % 2 === 0) acc.push([]);

    // Check if this image should be displayed in a fixed 4:3 format (Schweller links/rechts)
    const isSchweller = p.label.toLowerCase().includes('schweller') || p.label.toLowerCase().includes('sill');

    // For Schweller images, use exact 4:3 ratio and slightly larger size to fix "small size" issue
    // Reduced heights further to prevent overflow/blank page issues
    const containerHeight = isSchweller ? '115mm' : '110mm';
    const containerWidth = isSchweller ? '153.3mm' : '100%'; // 115 * 4/3 = 153.3
    const objectFit = isSchweller ? 'cover' : 'contain';

    acc[acc.length - 1].push(`
      <div style="margin-bottom: ${i % 2 === 0 ? '6mm' : '0'}; page-break-inside: avoid;">
        <div style="width: ${containerWidth}; height: ${containerHeight}; margin: 0 auto; background: #fbfbfb; text-align: center; line-height: ${containerHeight}; overflow: hidden; border: 1px solid ${BORDER_COLOR};">
          <img src="${p.data}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: ${objectFit}; display: inline-block; vertical-align: middle;" />
        </div>
        <div style="margin-top: 2mm; min-height: 8mm; line-height: normal;">
          <p style="font-size: 10pt; text-align: left; line-height: 1.3; margin: 0; color: ${THEME}">
            <strong style="color: ${THEME}">${L.photoLabel} ${i + 1}:</strong> ${p.label}${p.caption ? ` &mdash; <span style="font-style: italic; color: #555;">${p.caption}</span>` : ''}
          </p>
        </div>
      </div>`);
    return acc;
  }, []).map((pair, pi) => `<div style="page-break-before: always; position: relative; padding: 15mm 10mm 5mm 23mm; min-height: 295mm; box-sizing: border-box; overflow: hidden;">
      ${leftStripe(false)}
      ${headerInnerPage(mainPages + pi + 1, totalReportPages)}
      <div style="padding-bottom: 0;">
        ${pair.join('')}
      </div>
    </div>`).join('') : '';

  // ─────────────────────────────────────────────────────────────────────
  // DUAL ADDRESS BLOCK (Page 1 — between header and title)
  // ─────────────────────────────────────────────────────────────────────
  const addressBlock = `
  <table style="width:100%;border-collapse:collapse;font-size:8pt;margin:8px 0 8px 0">
    <tr>
      <td style="vertical-align:top;width:100%">
        <div style="font-size:7.5pt;color:#718096;border-bottom:1px solid #E2E8F0;padding-bottom:3px;margin-bottom:8px;width:fit-content;">${C.name} · ${C.fullAddress}</div>
        <div style="font-size:10pt;line-height:1.5;color:#1A202C">
          <strong>${r.clientName || ''}</strong><br/>
          ${r.clientAddress || ''}<br/>
          ${r.clientZip || ''} ${r.clientCity || ''}
        </div>
      </td>
    </tr>
  </table>`;


  // ═════════════════════════════════════════════════════════════════════
  const contPageLabel = L.nonAccepted + ' ' + L.continued;

  const { remarksText, infoText } = constructBemerkungenParagraph();

  // ═════════════════════════════════════════════════════════════════─
  // NOTE: html2pdf.js uses div.innerHTML to inject this HTML, which strips
  // <!DOCTYPE>, <html>, <head>, <body> tags. The <style> must be inside the
  // content div, and we must use a wrapper class instead of 'body' selector.
  return `<div class="pdf-root" style="font-family:'Inter','Segoe UI',Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:9.5pt;line-height:1.6;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;">
<style>
  .pdf-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .pdf-root { font-family: 'Inter', 'Segoe UI', Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 9.5pt; line-height: 1.6; }
  @page { size: A4; margin: 0; }
  .pdf-root p, .pdf-root td, .pdf-root th, .pdf-root li, .pdf-root div, .pdf-root span { word-wrap: break-word; overflow-wrap: break-word; }
  .pdf-root img { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }

  /* Premium Table Styling */
  .pdf-root table { width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed; }
  .pdf-root th { font-weight: 600; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.05em; border: 1px solid #e5e7eb; word-wrap: break-word; overflow: hidden; }
  .pdf-root td { padding: 6px 8px; border: 1px solid #e5e7eb; overflow: hidden; text-overflow: ellipsis; vertical-align: middle; word-wrap: break-word; }
  .pdf-root .bg-light { background-color: #f9fafb; }
  .pdf-root .font-mono { font-family: 'ui-monospace', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace; }

  /* Damage Table Specifics */
  .pdf-root .damage-table td {
    word-break: break-word;
    line-height: 1.3;
    font-size: 8.5pt;
  }
  .pdf-root .damage-table tr {
    page-break-inside: avoid;
  }
  .pdf-root .premium-table {
    table-layout: fixed;
    width: 100%;
  }
  .pdf-root .premium-table th, .pdf-root .premium-table td {
    word-wrap: break-word;
    word-break: break-word;
  }
</style>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 1 — COVER
════════════════════════════════════════════════════════════ -->
<div style="position:relative;padding:15mm 10mm 15mm 23mm;min-height:295mm;box-sizing:border-box">
  ${leftStripe(true)}
  ${headerCoverPage}

<div style="margin-left:0px;">
  ${addressBlock}

  <div style="background:${ORANGE};color:white;padding:12px 20px;font-size:16pt;font-weight:700;margin:15px 0 10px 0;text-align:center;text-transform:uppercase;letter-spacing:1px">${(r.claimType && r.claimType.trim().length > 0) ? r.claimType : L.reportTitle}</div>

  ${sortedPhotos.length > 0 ? `<table style="border-collapse:collapse;margin:10px auto;width:auto"><tr>${sortedPhotos.slice(0, 4).map(p => `<td style="padding:0 4px 0 0"><div style="width:130px;height:100px;overflow:hidden;border:1px solid ${BORDER_COLOR}; text-align:center; line-height:100px; background: #fbfbfb;"><img src="${p.data}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:cover;display:inline-block;vertical-align:middle" /></div></td>`).join('')}</tr></table>` : ''}

  ${secHead(L.caseSection)}
    <div style="font-size:9.5pt;line-height:1.6;margin-bottom:15px;color:#1A202C">
      <div style="display:flex;flex-wrap:wrap;row-gap:6px;">
        <div style="width:50%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.orderNo}:</span><span style="font-weight:600;">${r.caseNumber}</span></div>
        <div style="width:50%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.customerNo}:</span><span style="font-weight:600;">${r.customerNumber}</span></div>

        <div style="width:100%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.client}:</span><span style="font-weight:600;">${r.clientName}, ${r.clientAddress}, ${r.clientZip} ${r.clientCity}</span></div>

        <div style="width:50%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.orderFrom}:</span><span style="font-weight:600;">${fmtDate(r.orderDate)}</span></div>
        <div style="width:50%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.contactPerson}:</span><span style="font-weight:600;">${finalInspectorName}</span></div>

        <div style="width:100%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.inspection}:</span><span style="font-weight:600;">${fmtDate(r.inspectionDate)}, ${r.inspectionTime}${L.clock ? ` ${L.clock}` : ''}, ${r.inspectionLocation}</span></div>

        <div style="width:50%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.valuedOn}:</span><span style="font-weight:600;">${fmtDate(r.valuationDate)}</span></div>
        <div style="width:50%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.contractNo}:</span><span style="font-weight:600;">${r.contractNumber}</span></div>

        ${r.concernCompany ? `<div style="width:100%;display:flex;"><span style="color:#4A5568;width:125px;flex-shrink:0;">${L.concerns}:</span><span style="font-weight:600;">${r.concernCompany}</span></div>` : ''}
      </div>
    </div>
  </div>

  ${r.claimType !== 'Fahrzeugbewertung' ? `
  ${secHead(L.summary)}
    <div style="font-size:9.5pt;line-height:1.6;margin-bottom:15px;color:#1A202C">
      <div style="display:flex;flex-direction:column;row-gap:6px;">
        <div style="display:flex;justify-content:space-between;padding:2px 0;">
          <span style="color:#4A5568;">${L.repairCostsLabel}</span>
          <span style="font-weight:600;font-family:monospace;">${fmtCur(totalRepair)} <span style="font-size:8.5pt;color:#718096;font-family:sans-serif;font-weight:normal;">(${L.withVat})</span></span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:2px 0;">
          <span style="color:#4A5568;">${L.repairCostsLabel.replace('(brutto)', '(netto)').replace('(gross)', '(net)')}</span>
          <span style="font-weight:600;font-family:monospace;">${fmtCur(calcNetto(totalRepair))} <span style="font-size:8.5pt;color:#718096;font-family:sans-serif;font-weight:normal;">(${L.withoutVat})</span></span>
        </div>
        <div style="height:4px;"></div>
        <div style="display:flex;justify-content:space-between;padding:2px 0;">
          <span style="color:#4A5568;">${L.dimValueLabel}</span>
          <span style="font-weight:600;font-family:monospace;">${fmtCur(totalMinderwert)} <span style="font-size:8.5pt;color:#718096;font-family:sans-serif;font-weight:normal;">(${L.withVat})</span></span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:2px 0;">
          <span style="color:#4A5568;">${L.dimValueLabel.replace('(brutto)', '(netto)').replace('(gross)', '(net)')}</span>
          <span style="font-weight:600;font-family:monospace;">${fmtCur(calcNetto(totalMinderwert))} <span style="font-size:8.5pt;color:#718096;font-family:sans-serif;font-weight:normal;">(${L.withoutVat})</span></span>
        </div>
      </div>
    </div>
  </div>` : ''}
</div>

  <div style="position:absolute;bottom:8mm;left:23mm;right:10mm;text-align:center;font-size:7pt;color:#111;border-top:2px solid ${ORANGE};padding-top:6px;line-height:1.4">
    ${C.name} | ${C.address} | ${C.zip} ${C.city} | Tel. ${C.phone} | ${C.website || 'www.MyGutachter.de'} | ${C.bank} |<br/>
    IBAN: ${C.iban} | BIC: ${C.bic} | Sitz und Amtsgericht: ${C.amtsgericht.replace(', ', ' | ')} | Steuernummer: ${C.steuernummer}<br/>
    Ust-IdNr. ${C.ustIdNr} | Geschäftsführer: ${C.geschaeftsfuehrer.join(', ')}
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 2 — REMARKS + VEHICLE DATA
════════════════════════════════════════════════════════════ -->
<div style="page-break-before:always;position:relative;padding:15mm 10mm 15mm 23mm;min-height:295mm;box-sizing:border-box">
  ${leftStripe(false)}
  ${headerInnerPage(2, totalReportPages)}

  <div style="margin-left:0px;">
  ${secHead(L.remarks, true)}
    <div style="font-size:9pt;line-height:1.6;text-align:justify">
      <p style="margin-bottom: 8px;">${remarksText}</p>
      ${infoText ? `<p style="margin-top: 8px; font-weight: bold;">${infoText}</p>` : ''}
    </div>
  </div>

  ${secHead(L.vehicleData)}
    <table class="premium-table" style="width:100%;border-collapse:collapse;font-size:9pt">
      ${vRow(L.firstRegistration, fmtDate(r.firstRegistration), L.lastRegistration, fmtDate(r.lastRegistration))}
      ${vRow(L.manufacturer, r.manufacturer, L.typeSales, `${r.baseModel} ${r.subModel}`)}
      ${vRow(L.bodyType, r.bodyType, L.doors, r.doors ?? '-')}
      ${vRow(L.seats, r.seats ?? '-', L.vehicleCategory, r.vehicleCategory || '-')}
      ${vRowSingle(L.vinFull, r.vin)}
      ${vRow(L.hsnTsn, r.kbaNumbers, L.keyNo, r.keyNumber)}
      ${vRow(L.mileageRead, `${new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-US').format(r.mileage)} km`, L.nextInspection, formatMonthYear(r.nextHU))}
      ${vRow(L.fuel, r.fuelType, L.cylinders, r.cylinders ?? '-')}
      ${vRow(L.power, r.powerKw, L.displacement, r.displacement)}
      ${vRow(L.emissionClass, r.emissionClass, L.driveType, r.driveType)}
      ${vRow(L.transmission, r.transmission, L.wheels, r.wheels)}
      ${vRow(L.color, r.colorDescription, L.upholstery, r.upholsteryDescription)}
      ${r.breakdownKit ? vRowSingle(L.breakdownKit, (typeof r.breakdownKit === 'string' ? r.breakdownKit : (isAvailable(r.breakdownKit.status) ? L.available : isNotAvailable(r.breakdownKit.status) ? L.notAvailable : r.breakdownKit.status)) + (r.breakdownKit.price ? ` (${fmtCur(r.breakdownKit.price)})` : '')) : ''}
      ${r.firstAidKit?.status ? vRowSingle(L.firstAidKitLabel || 'Erste-Hilfe-Set', isAvailable(r.firstAidKit.status) ? L.available : isNotAvailable(r.firstAidKit.status) ? L.notAvailable : r.firstAidKit.status) : ''}
      ${r.safetyVest?.status ? vRowSingle(L.safetyVestLabel || 'Warnweste', isAvailable(r.safetyVest.status) ? L.available : isNotAvailable(r.safetyVest.status) ? L.notAvailable : r.safetyVest.status) : ''}
      ${r.warningTriangle?.status ? vRowSingle(L.warningTriangleLabel || 'Warndreieck', isAvailable(r.warningTriangle.status) ? L.available : isNotAvailable(r.warningTriangle.status) ? L.notAvailable : r.warningTriangle.status) : ''}
    </table>
    <p style="font-size:8pt;font-style:italic;margin-top:8px;color:#666">${L.mileageDisclaimer}</p>
  </div>

  </div>

</div>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 3 — EQUIPMENT / CONDITION
════════════════════════════════════════════════════════════ -->
<div style="page-break-before:always;position:relative;padding:15mm 10mm 15mm 23mm;min-height:295mm;box-sizing:border-box">
  ${leftStripe(false)}
  ${headerInnerPage(3, totalReportPages)}

  <div style="margin-left:0px;">
  ${p3ShowStd ? `
  ${secHead(L.standardEquipment, true)}
    <p style="font-size:8pt;line-height:1.5">${r.standardEquipment.join(', ')}</p>
  </div>` : ''}

  ${p3ShowOpt ? `
  ${secHead(L.optionalEquipment, !p3ShowStd)}
    <p style="font-size:8pt;line-height:1.5">${r.optionalEquipment?.join(', ')}</p>
  </div>` : ''}

  ${p3ShowTires ? `
  ${secHead(L.tiresWheels, !p3ShowStd && !p3ShowOpt)}
    <table class="premium-table" style="width:100%;border-collapse:collapse;font-size:8pt">
      <thead><tr>
        <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:12%">${L.axle}</th>
        <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:20%">${L.tireDesignation}</th>
        <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:20%">${L.tireManufacturer}</th>
        <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:8%">${L.tireType}</th>
        <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:10%">${L.treadDepth}</th>
        <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:18%">${L.rimType || 'Felge'}</th>
        <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:12%">${L.damaged || 'Beschädigt'}</th>
      </tr></thead>
      <tbody>${r.tires.map(t => {
    const axleLabel = getAxleSideLabel(t.axle, t.side);
    const manufacturerDisplay = t.tireModel ? `${t.manufacturer} / ${t.tireModel}` : t.manufacturer;
    const rimDamageDisplay = (t.rimDamage || []).map(translateRimDamage);
    if (t.rimDamage?.includes('Other') && t.rimDamageDescription) {
      const otherIdx = (t.rimDamage || []).indexOf('Other');
      if (otherIdx !== -1) {
        rimDamageDisplay[otherIdx] = `${L.Other || 'Sonstiges'}: ${t.rimDamageDescription}`;
      }
    }
    const rimDisplay = [translateRimType(t.rimType), rimDamageDisplay.join(', ')].filter(Boolean).join(' – ');
    const damagedHtml = t.damaged
      ? `<span style="color:#e53e3e;font-weight:bold">${L.yes}</span>`
      : L.no;
    return `<tr><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${axleLabel}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${t.designation}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${manufacturerDisplay}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${t.type}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${t.treadDepth}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${rimDisplay || '-'}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${damagedHtml}</td></tr>`;
  }).join('')}
      ${r.spareTire?.present ? `
        <tr>
          <td style="padding:4px;border:1px solid ${BORDER_COLOR};font-weight:600">${L.tireSpareTire || 'Notrad / Reserverad'}</td>
          <td style="padding:4px;border:1px solid ${BORDER_COLOR}">${r.spareTire?.designation}</td>
          <td style="padding:4px;border:1px solid ${BORDER_COLOR}">${r.spareTire?.tireModel ? `${r.spareTire?.manufacturer} / ${r.spareTire?.tireModel}` : r.spareTire?.manufacturer}</td>
          <td style="padding:4px;border:1px solid ${BORDER_COLOR}">${r.spareTire?.type}</td>
          <td style="padding:4px;border:1px solid ${BORDER_COLOR}">${r.spareTire?.treadDepth}</td>
          <td style="padding:4px;border:1px solid ${BORDER_COLOR}">${(() => {
          const rimDamageDisplay = (r.spareTire?.rimDamage || []).map(translateRimDamage);
          if (r.spareTire?.rimDamage?.includes('Other') && (r.spareTire as any).rimDamageDescription) {
            const otherIdx = (r.spareTire.rimDamage).indexOf('Other');
            rimDamageDisplay[otherIdx] = `${L.Other || 'Sonstiges'}: ${(r.spareTire as any).rimDamageDescription}`;
          }
          return [translateRimType(r.spareTire?.rimType), rimDamageDisplay.join(', ')].filter(Boolean).join(' – ') || '-';
        })()}</td>
          <td style="padding:4px;border:1px solid ${BORDER_COLOR}">${r.spareTire?.damaged ? `<span style="color:#e53e3e;font-weight:bold">${L.yes}</span>` : L.no}</td>
        </tr>
      ` : ''}
      </tbody>
    </table>

    ${r.hasSecondTireSet ? `
      <div style="margin-top:10px">
        <h4 style="font-size:9pt;color:${THEME};font-weight:bold;margin-bottom:5px">${L.secondTireSet || 'Zweiter Rädersatz'} ${r.secondTireSetSelection ? `(${translateSecondTireSetSelection(r.secondTireSetSelection)})` : ''}</h4>
        <table class="premium-table" style="width:100%;border-collapse:collapse;font-size:8pt">
          <thead><tr>
            <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:12%">${L.axle}</th>
            <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:20%">${L.tireDesignation}</th>
            <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:20%">${L.tireManufacturer}</th>
            <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:8%">${L.tireType}</th>
            <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:10%">${L.treadDepth}</th>
            <th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:${r.secondTireSetSelection !== 'Only Rims' ? '18%' : '30%'};">${L.rimType || 'Felge'}</th>
            ${r.secondTireSetSelection !== 'Only Rims' ? `<th style="background:${THEME};color:white;padding:4px;text-align:left;font-weight:600;width:12%">${L.damaged || 'Beschädigt'}</th>` : ''}
          </tr></thead>
          <tbody>${(r.secondTires || []).map(t => {
          const axleLabel = getAxleSideLabel(t.axle, t.side);
          const manufacturerDisplay = t.tireModel ? `${t.manufacturer} / ${t.tireModel}` : t.manufacturer;
          const rimDamageDisplay = (t.rimDamage || []).map(translateRimDamage);
          if (t.rimDamage?.includes('Other') && (t as any).rimDamageDescription) {
            const otherIdx = (t.rimDamage || []).indexOf('Other');
            if (otherIdx !== -1) {
              rimDamageDisplay[otherIdx] = `${L.Other || 'Sonstiges'}: ${(t as any).rimDamageDescription}`;
            }
          }
          const rimDisplay = [translateRimType(t.rimType), rimDamageDisplay.join(', ')].filter(Boolean).join(' – ');
          const damagedHtml = t.damaged
            ? `<span style="color:#e53e3e;font-weight:bold">${L.yes}</span>`
            : L.no;
          return `<tr><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${axleLabel}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${t.designation}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${manufacturerDisplay}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${t.type}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${t.treadDepth}</td><td style="padding:4px;border:1px solid ${BORDER_COLOR}">${rimDisplay || '-'}</td>${r.secondTireSetSelection !== 'Only Rims' ? `<td style="padding:4px;border:1px solid ${BORDER_COLOR}">${damagedHtml}</td>` : ''}</tr>`;
        }).join('')}</tbody>
        </table>
      </div>
    ` : ''}
    <p style="font-size:7pt;color:#666;margin-top:4px">${L.tireLegend}</p>
  </div>` : ''}

  ${secHead(L.generalCondition, !p3ShowStd && !p3ShowOpt && !p3ShowTires)}
    <p style="font-size:9pt">${L.generalConditionText}</p>
    ${(() => {
      const mType = (r as any).nextMaintenanceType;
      const mVal = (r as any).nextMaintenanceIntervalValue;
      const mPrice = r.maintenancePrice;
      if (!mType && !mPrice) return '';
      let durationText = '';
      if (mType === 'days' && mVal != null) {
        durationText = safeLang === 'de' ? `${Math.abs(mVal)} Tage` : `${Math.abs(mVal)} days`;
      } else if (mType === 'months' && mVal != null) {
        durationText = safeLang === 'de' ? `${Math.abs(mVal)} Monate` : `${Math.abs(mVal)} months`;
      } else if (mType === 'mileage' && mVal != null) {
        durationText = `${Math.abs(mVal)} km`;
      } else if (mType === 'date' && r.nextMaintenanceDate) {
        durationText = fmtDate(r.nextMaintenanceDate);
      }
      const parts = [];
      if (durationText) parts.push(durationText);
      if (mPrice > 0) parts.push(fmtCur(mPrice));
      return parts.length > 0 ? `<p style="font-size:9pt;margin-top:4px"><strong>${L.maintenanceRecord}:</strong> ${parts.join(' – ')}</p>` : '';
    })()}
    ${r.chargingCable ? `
      <p style="font-size:9pt;margin-top:4px">
        <strong>${L.chargingCable}:</strong>
        ${r.chargingCable === 'YES' ? L.yes : r.chargingCable === 'NO' ? L.no : L.notAvailable}
      </p>` : ''}
  </div>
  </div>

</div>


${r.claimType !== 'Fahrzeugbewertung' ? `
<!-- ═══════════════════════════════════════════════════════════
     PAGE 4 — DAMAGE ASSESSMENT (first damage page)
════════════════════════════════════════════════════════════ -->
<div style="page-break-before:always;position:relative;padding:15mm 10mm 15mm 23mm;min-height:295mm;box-sizing:border-box">
  ${leftStripe(false)}
  ${headerInnerPage(4, totalReportPages)}

  <div style="margin-left:0px;">
  ${secHead(L.nonAccepted, true)}
  <!-- Vehicle Diagram -->
  <div style="text-align:center;margin:8px 0 12px 0;">
    <div style="display:inline-block;width:280px;height:auto;margin:0 auto">
      ${getCarSvgHtml(r.selectedParts || [])}
    </div>
  </div>

    <table class="damage-table" style="width:100%;border-collapse:collapse;font-size:9pt;table-layout:fixed">
      ${tableHeaderHTML}
      <tbody>
        ${page4Rows.join('')}
        ${damageContPages.length === 0 ? totalRowHTML : ''}
      </tbody>
    </table>
  </div>
</div>
</div>

${damageContPages.map((cp, ci) => `<div style="page-break-before:always;position:relative;padding:15mm 10mm 15mm 23mm;min-height:280mm;box-sizing:border-box">
  ${leftStripe(false)}
  ${headerInnerPage(5 + ci, totalReportPages)}
  <div style="margin-left:0px;">
  ${secHead(contPageLabel, true)}
    <table class="damage-table" style="width:100%;border-collapse:collapse;font-size:9pt;table-layout:fixed">
      ${tableHeaderHTML}
      <tbody>
        ${cp.rows.join('')}
        ${ci === damageContPages.length - 1 ? totalRowHTML : ''}
      </tbody>
    </table>
  </div>
</div>
</div>`).join('')}
` : ''}

<!-- ═══════════════════════════════════════════════════════════
     SIGNATURE PAGE
════════════════════════════════════════════════════════════ -->
<div style="page-break-before:always;position:relative;padding:15mm 10mm 15mm 23mm;min-height:280mm;box-sizing:border-box">
  ${leftStripe(false)}
  ${headerInnerPage(sigPageNo, totalReportPages)}

  <div style="margin-left:0px;">

  <div style="margin-bottom:12px">
    <h3 style="font-size:11pt;color:${THEME};background:rgba(0,0,0,0.04);padding:4px 8px;margin-bottom:8px;font-weight:700">${L.notes}</h3>
    <p style="font-size:8pt;line-height:1.5">${L.notesText}<br/>${L.notesText2}</p>
  </div>

  <p style="font-size:10pt;font-weight:600;margin:16px 0 8px 0">${L.sigIntro}</p>
  <div style="font-size:7pt;color:#666;line-height:1.5;margin-bottom:12px">
    <p>${L.privacyNote}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:16px;table-layout:fixed;">
    <tr>
      <td colspan="3" style="background:rgba(238,119,0,0.12);font-weight:600;padding:10px;color:${ORANGE};border:1px solid #333">
        <table style="width:100%;border-collapse:collapse;border:none;"><tr>
          <td style="padding:0;border:none;vertical-align:middle;text-align:left;">${L.sigDriver}</td>
          <td style="padding:0;border:none;vertical-align:middle;text-align:right;">
            <table style="width:auto;border-collapse:collapse;border:none;margin-left:auto;"><tr>
              <td style="padding:0 15px 0 0;border:none;vertical-align:middle;white-space:nowrap;">
                <img src="${r.expertAssessmentStatus === 'accepted'
      ? 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><rect x="0.5" y="0.5" width="13" height="13" rx="1" fill="white" stroke="#333" stroke-width="1"/><polyline points="2.5,7 5.5,10.5 11.5,3.5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>')
      : 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><rect x="0.5" y="0.5" width="13" height="13" rx="1" fill="white" stroke="#333" stroke-width="1"/></svg>')
    }" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;" /><span style="font-size:9pt;font-weight:normal;color:#333;vertical-align:middle;">${L.gaAccepted}</span>
              </td>
              <td style="padding:0;border:none;vertical-align:middle;white-space:nowrap;">
                <img src="${r.expertAssessmentStatus === 'not_accepted'
      ? 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><rect x="0.5" y="0.5" width="13" height="13" rx="1" fill="white" stroke="#333" stroke-width="1"/><polyline points="2.5,7 5.5,10.5 11.5,3.5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>')
      : 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><rect x="0.5" y="0.5" width="13" height="13" rx="1" fill="white" stroke="#333" stroke-width="1"/></svg>')
    }" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;" /><span style="font-size:9pt;font-weight:normal;color:#333;vertical-align:middle;">${L.gaNotAccepted}</span>
              </td>
            </tr></table>
          </td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td style="width:30%;border:1px solid #333;padding:10px;height:80px;vertical-align:bottom;font-size:9pt">${fmtDate(r.inspectionDate)}${r.inspectionTime ? `, ${r.inspectionTime}` : ''}<br/><small>${L.sigDate}</small></td>
      <td style="width:35%;border:1px solid #333;padding:10px;height:80px;vertical-align:bottom;font-size:9pt">${r.signatureNames?.driver || ''}<br/><small>${L.sigName}</small></td>
      <td style="width:35%;border:1px solid #333;padding:4px 10px;height:80px;vertical-align:middle;text-align:center;font-size:9pt;">${r.signatures?.driver ? `<div style="width:100%;height:55px;text-align:center;line-height:55px;overflow:hidden;"><img src="${r.signatures.driver}" style="max-height:55px;max-width:100%;width:auto;height:auto;object-fit:contain;display:inline-block;vertical-align:middle;image-rendering:-webkit-optimize-contrast;" /></div>` : ''}<br/><small>${L.sigSignature}</small></td>
    </tr>
    <tr><td colspan="3" style="background:rgba(255,107,53,0.12);font-weight:600;padding:10px;color:${ORANGE};border:1px solid #333">${L.sigReceiver}</td></tr>
    <tr>
      <td style="width:30%;border:1px solid #333;padding:10px;height:80px;vertical-align:bottom;font-size:9pt">${fmtDate(r.inspectionDate)}${r.inspectionTime ? `, ${r.inspectionTime}` : ''}<br/><small>${L.sigDate}</small></td>
      <td style="width:35%;border:1px solid #333;padding:10px;height:80px;vertical-align:bottom;font-size:9pt">${r.signatureNames?.receiver || ''}<br/><small>${L.sigName}</small></td>
      <td style="width:35%;border:1px solid #333;padding:4px 10px;height:80px;vertical-align:middle;text-align:center;font-size:9pt;">${r.signatures?.receiver ? `<div style="width:100%;height:55px;text-align:center;line-height:55px;overflow:hidden;"><img src="${r.signatures.receiver}" style="max-height:55px;max-width:100%;width:auto;height:auto;object-fit:contain;display:inline-block;vertical-align:middle;image-rendering:-webkit-optimize-contrast;" /></div>` : ''}<br/><small>${L.sigSignature}</small></td>
    </tr>
    <tr><td colspan="3" style="background:rgba(255,107,53,0.12);font-weight:600;padding:10px;color:${ORANGE};border:1px solid #333">${C.name} ${L.sigInspector}</td></tr>
    <tr>
      <td style="width:30%;border:1px solid #333;padding:10px;height:70px;vertical-align:bottom;font-size:9pt">${fmtDate(new Date().toISOString())}<br/><small>${L.sigDate}</small></td>
      <td style="width:35%;border:1px solid #333;padding:10px;height:70px;vertical-align:bottom;font-size:9pt">${finalInspectorName}<br/><small>${L.sigName}</small></td>
      <td style="width:35%;border:1px solid #333;padding:10px;height:70px;vertical-align:middle;text-align:center;font-size:10pt;font-weight:bold;color:#444;font-style:italic;">
        ${L.electronicDoc}
      </td>
    </tr>
  </table>
  </div>

</div>

<!-- ═══════════════════════════════════════════════════════════
     PHOTO PAGES
════════════════════════════════════════════════════════════ -->
${photoPages}

</div>`;
}
