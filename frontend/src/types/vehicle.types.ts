export interface EquipmentItem {
    id: string;
    description: string;
    type: 'standard' | 'optional';
}

export interface TireInfo {
    axle: number; // 1 or 2
    side: 'links' | 'rechts'; // left or right  
    designation: string; // e.g. "235/55 R18 104V"
    manufacturer: string; // e.g. "Dunlop / All Season 2"
    type: 'A' | 'S' | 'W'; // Ganzjahres / Sommer / Winter
    treadDepth: string; // e.g. "6mm"
}

export interface VehicleData {
    manufacturer: string;
    baseModel: string;
    subModel: string;
    datECode: string;
    constructionTime: string;
    kbaNumbers: string;
    standardEquipment: string[];
    optionalEquipment: string[];
    colorData: {
        A1: string; // exterior color code
        A1_desc?: string;
        A1_paint?: string;
        I1: string; // interior
        I1_desc?: string;
        PF: string; // upholstery color (ID)
        PF_desc?: string; // upholstery color description
        PM: string; // upholstery material (ID)
        PM_desc?: string; // upholstery material description
    };
    standardColor: string; // 0-9

    // Technical Data (explicitly mapped from backend)
    powerKw?: number;
    displacement?: number;
    cylinders?: number;
    fuelType?: string;
    transmission?: string;
    driveType?: string;
    emissionClass?: string;
    bodyType?: string;
    doors?: number;
    seats?: number;
}
