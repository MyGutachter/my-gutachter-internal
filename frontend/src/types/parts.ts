
export interface CarPart {
    id: string;
    name: string;
}

export interface DamageItem {
    id: string;
    damageId: number;
    severity: 'minor' | 'moderate' | 'severe';
}