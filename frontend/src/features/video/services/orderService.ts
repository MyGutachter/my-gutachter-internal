import api from '../../../utils/api';
import type { Order } from '../types';

/**
 * Video-order service (T7.8) — backs the faithfully-ported VideoExpert dashboard.
 * Calls the merged `VideoOrderController` (/api/orders/**) and the reused
 * meeting/recording/screenshot endpoints, all via the shared axios instance
 * (which attaches the Bearer token). Paths are relative to the `/api` baseURL.
 */

/** Absolute API base (e.g. http://localhost:8080/api) — for building <img>/download URLs. */
export const API_BASE_URL: string =
    (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080/api';

interface DashboardResponse {
    content: Order[];
    totalElements: number;
}

/** GET /orders/dashboard?search=&showArchive= → { content, totalElements }. */
export const getDashboardOrders = async (
    search: string,
    showArchive: boolean,
    signal?: AbortSignal
): Promise<Order[]> => {
    const res = await api.get<DashboardResponse>('/orders/dashboard', {
        params: { search, showArchive },
        signal,
    });
    const data = res.data;
    if (data && Array.isArray(data.content)) return data.content;
    if (Array.isArray(data)) return data as unknown as Order[];
    return [];
};

/**
 * PATCH /orders/{id}/status — sends a BARE JSON string body ("DONE"/"PENDING"),
 * matching the VideoExpert contract (not { status }). The backend accepts both.
 */
export const updateOrderStatus = async (id: string, status: 'DONE' | 'PENDING') => {
    await api.patch(`/orders/${id}/status`, JSON.stringify(status), {
        headers: { 'Content-Type': 'application/json' },
    });
};

interface AllRecordsResponse {
    content: Order[];
    totalElements: number;
    totalPages: number;
}

export interface AllRecordsParams {
    page: number;
    size: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    showArchive?: boolean;
}

/** GET /orders/all-records — paginated records table (AllScanRecordsPage). */
export const getAllRecords = async (params: AllRecordsParams): Promise<AllRecordsResponse> => {
    const res = await api.get<AllRecordsResponse>('/orders/all-records', { params });
    return {
        content: Array.isArray(res.data?.content) ? res.data.content : [],
        totalElements: res.data?.totalElements ?? 0,
        totalPages: res.data?.totalPages ?? 0,
    };
};

export interface ExpertOption {
    id: string;
    email: string;
    fullName: string;
}

/** GET /orders/experts — distinct experts for the records filter. */
export const getExperts = async (): Promise<ExpertOption[]> => {
    try {
        const res = await api.get<ExpertOption[]>('/orders/experts');
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return [];
    }
};

/** POST /orders — create a manual order (CreateOrderModal). */
export const createOrder = async (payload: Record<string, unknown>) => {
    const res = await api.post('/orders', payload);
    return res.data;
};

/** GET /orders/{id} → the video Order shape. */
export const getOrder = async (id: string): Promise<Order> => {
    const res = await api.get<Order>(`/orders/${id}`);
    return res.data;
};

/** GET /orders/{id}/parts → screenshot db-keys. */
export const getOrderParts = async (id: string): Promise<string[]> => {
    const res = await api.get<string[]>(`/orders/${id}/parts`);
    return Array.isArray(res.data) ? res.data : [];
};

/** GET /orders/{id}/images → { dbKey → S3 key | base64 } (OrderDetailsPanel resolves to URLs). */
export const getOrderImages = async (id: string): Promise<Record<string, string>> => {
    const res = await api.get<Record<string, string>>(`/orders/${id}/images`);
    return res.data || {};
};

/** GET /screenshots/{meetingId} — same as parts, kept for MeetingSummary parity. */
export const getScreenshots = async (meetingId: string): Promise<string[]> => {
    try {
        const res = await api.get(`/screenshots/${meetingId}`);
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return [];
    }
};

/** GET /recordings/{meetingId} → { urls: [...] }. */
export const getRecordingUrls = async (meetingId: string): Promise<string[]> => {
    try {
        const res = await api.get(`/recordings/${meetingId}`);
        return Array.isArray(res.data?.urls) ? res.data.urls : [];
    } catch (err) {
        console.error('Failed to fetch recording URLs:', err);
        return [];
    }
};

/** POST /meeting/invite — email/SMS the guest join link. */
export const sendMeetingInvite = async (
    email: string,
    mobile: string,
    meetingLink: string,
    name?: string,
    date?: string,
    time?: string
) => {
    const res = await api.post('/meeting/invite', { email, mobile, meetingLink, name, date, time });
    return res.data;
};

/** GET /orders/{id}/uvv-certificate (PDF blob). */
export const fetchUvvCertificateBlob = async (orderId: string): Promise<Blob> => {
    const res = await api.get(`/orders/${orderId}/uvv-certificate`, { responseType: 'blob' });
    return res.data;
};

export const getUvvCertificateUrl = (orderId: string) => `${API_BASE_URL}/orders/${orderId}/uvv-certificate`;
