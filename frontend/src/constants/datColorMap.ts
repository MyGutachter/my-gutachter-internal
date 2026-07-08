export interface DatColor {
    code: string;
    de: string;
    en: string;
}

export const DAT_COLOR_MAP: Record<string, DatColor> = {
    '0': { code: '0', de: 'Schwarz', en: 'Black' },
    '1': { code: '1', de: 'Blau', en: 'Blue' },
    '2': { code: '2', de: 'Braun', en: 'Brown' },
    '3': { code: '3', de: 'Gelb', en: 'Yellow' },
    '4': { code: '4', de: 'Grau', en: 'Grey' },
    '5': { code: '5', de: 'Grün', en: 'Green' },
    '6': { code: '6', de: 'Grün', en: 'Green' },
    '7': { code: '7', de: 'Rot', en: 'Red' },
    '8': { code: '8', de: 'Silber', en: 'Silver' },
    '9': { code: '9', de: 'Weiß', en: 'White' },
};

export function getColorName(code: string, lang: 'de' | 'en' = 'de'): string {
    const color = DAT_COLOR_MAP[code];
    return color ? color[lang] : code;
}
