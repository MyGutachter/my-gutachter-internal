// Types for the video-call feature, ported from VideoExpert. The unified order
// is read via the merged backend (GET /reports/my-report), which returns a flat
// document; only the video-relevant fields are typed here.

export interface Order {
    id: string;
    auftragsnummer?: string;     // OMT InternalId — human-readable Auftragsnummer
    dispatchOrOrderNo?: string;
    numberOfPhotos?: number;
    // Contact
    clientName?: string;
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
    // Merged lifecycle: order status lives in `orderStatus`; report `status` is separate.
    status?: string;
    orderStatus?: 'PENDING' | 'DONE' | 'CANCEL' | 'ARCHIVE';
    source?: 'OMT' | 'OMT_DEV' | 'MANUAL';
    caseNumber?: string;
    omtOrderId?: string;
    additionalUserIds?: string[];
    meetingData?: Record<string, string>;
    videoRecordingKeys?: string[];
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
