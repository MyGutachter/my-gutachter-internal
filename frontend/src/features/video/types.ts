/** Video-order shape (T7.8), ported from VideoExpert `src/types.ts`. Served by
 * the merged `VideoOrderController` from the unified `orders` collection. */
export interface Order {
    id: string;
    auftragsnummer?: string;     // OMT InternalId — human-readable Auftragsnummer
    dispatchOrOrderNo?: string;
    numberOfPhotos?: number;
    // Contact
    clientName?: string;
    /** OMT Firmenname (Intranet Name1 / contractor Alias / FullName). */
    companyName?: string;
    contactPersonName?: string;
    contactPersonMobile?: string;
    contactPersonEmail?: string;
    // Expert
    vehicleExpertName?: string;
    // Vehicle
    vehicleMake?: string;
    vehicleModel?: string;
    licensePlateNumber?: string;
    vinNumber?: string;
    registrationNumber?: string;
    mileage?: number;
    lastVehicleInspectionDate?: string;
    status?: 'PENDING' | 'DONE' | 'CANCEL' | 'ARCHIVE';
    source?: 'OMT' | 'OMT-DEV' | 'MANUAL';
    additionalUserIds?: string[];
    meetingData?: Record<string, string>;
    claimType?: string;
    uvvResult?: 'PASSED' | 'FAILED' | null;
    uvvInspectionDate?: string;
    uvvCertificateAvailable?: boolean;
}

export interface CarPart {
    id: string;
    name: string;
}

export interface DamageItem {
    id: string;
    damageId: number;
    severity: 'minor' | 'moderate' | 'severe';
}
