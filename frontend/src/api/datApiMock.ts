import type { VehicleData } from '../types/vehicle.types';

const MOCK_VEHICLE: VehicleData = {
    manufacturer: 'KIA',
    baseModel: 'Sportage',
    subModel: '1.6T-GDI Hybrid 2WD Aut. Spirit',
    datECode: 'KIA-SP-HEV',
    constructionTime: '2024',
    kbaNumbers: '2234 / ABN',
    standardEquipment: [
        'Adaptive Dual-LED-Scheinwerfer',
        'Airbag: 2 Frontairbags',
        'Airbag: 2 Seitenairbags vorn',
        'Airbag: Vorhangairbags',
        'Antiblockiersystem (ABS)',
        'Berganfahrassistent',
        'Bluetooth-Freisprecheinrichtung',
        'Bordcomputer',
        'Einparkhilfe hinten',
        'Einparkhilfe vorn',
        'Elektrische Fensterheber vorn + hinten',
        'Elektronisches Stabilitätsprogramm (ESP)',
        'Isofix-Kindersitzhalterung',
        'Klimaautomatik',
        'Lederlenkrad',
        'Lenkradheizung',
        'Lichtsensor',
        'Navigation: Kia-Kartennavigation mit 31,2 cm Bildschirmdiagonale',
        'Regensensor',
        'Reifendruckkontrollsystem (RDKS)',
        'Rückfahrkamera',
        'Sitzheizung vorn',
        'Spurhalteassistent',
        'Tempomat mit Abstandsregelung',
        'Totwinkelassistent',
        'Zentralverriegelung mit Fernbedienung',
    ],
    optionalEquipment: [],
    colorData: { A1: 'EXG', I1: '', PF: 'Schwarz', PM: 'Teilleder' },
    standardColor: '6',
};

export async function fetchVehicleByVINMock(_vin: string): Promise<VehicleData> {
    return new Promise((resolve) => {
        setTimeout(() => resolve({ ...MOCK_VEHICLE }), 1200);
    });
}
