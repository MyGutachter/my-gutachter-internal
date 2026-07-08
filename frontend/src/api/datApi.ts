import api from '../utils/api';
import type { VehicleData } from '../types/vehicle.types';
import { fetchVehicleByVINMock } from './datApiMock';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export async function fetchVehicleByVIN(vin: string): Promise<VehicleData> {
    if (USE_MOCK) return fetchVehicleByVINMock(vin);
    const response = await api.post<VehicleData>('/dat/vin-lookup', { vin });
    return response.data;
}
