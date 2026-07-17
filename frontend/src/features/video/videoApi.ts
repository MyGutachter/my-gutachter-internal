// Video-call API, ported from VideoExpert and mapped onto the MERGED backend.
// Uses the app's shared axios instance (src/utils/api.ts) which sets the JWT and
// handles 401. Endpoints are keyed by `caseNumber` (meetingId == caseNumber).
//
// Endpoint mapping vs VideoExpert:
//   getOrder(id)          -> GET  /reports/my-report?caseNumber={id}  (was GET /orders/{id})
//   getScreenshots(id)    -> GET  /screenshots/{id}                    (same)
//   uploadScreenshot      -> POST /screenshots                         (same)
//   deleteScreenshot      -> DELETE /screenshots/{id}/{file}           (same)
//   uploadRecording       -> POST /recordings/{id}                     (same)
//   getRecordingUrls(id)  -> GET  /recordings/{id}  ({urls:[...]})     (same)
//   completeUvv(id,...)   -> PATCH /orders/{id}/uvv                    (same, T4.2)
import api from '../../utils/api';
import type { Order } from './videoTypes';

export const uploadScreenshot = async (blob: Blob, partName: string, meetingId: string, userId: string) => {
    const formData = new FormData();
    formData.append('file', blob, 'screenshot.png');
    formData.append('partName', partName);
    formData.append('meetingId', meetingId);
    formData.append('userId', userId);

    const response = await api.post('/screenshots', formData, { responseType: 'text' });
    return response.data;
};

export const deleteScreenshot = async (meetingId: string, filename: string) => {
    try {
        await api.delete(`/screenshots/${meetingId}/${filename}`);
        return true;
    } catch (error) {
        console.error('Failed to delete screenshot:', error);
        throw error;
    }
};

export const getScreenshots = async (meetingId: string): Promise<string[]> => {
    try {
        const response = await api.get(`/screenshots/${meetingId}`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Failed to fetch screenshots:', error);
        return [];
    }
};

// The merged backend has no GET /orders/{id}; the unified order doc is read via
// the report endpoint keyed by caseNumber. Guests (no token) must NOT call this —
// the shared 401 interceptor would redirect them to /login (guarded in VideoCall).
export const getOrder = async (id: string): Promise<Order> => {
    const response = await api.get('/reports/my-report', { params: { caseNumber: id } });
    return response.data as Order;
};

export const completeUvv = async (
    id: string,
    uvvResult: 'PASSED' | 'FAILED',
    inspectorName: string,
    checklistItems?: Record<number, string | null>
) => {
    await api.patch(`/orders/${id}/uvv`, { uvvResult, inspectorName, checklistItems });
};

export const uploadRecording = async (blob: Blob, meetingId: string) => {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');

    const response = await api.post(`/recordings/${meetingId}`, formData, { responseType: 'text' });
    return response.data;
};

export const getRecordingUrls = async (meetingId: string): Promise<string[]> => {
    try {
        const response = await api.get(`/recordings/${meetingId}`);
        return Array.isArray(response.data?.urls) ? response.data.urls : [];
    } catch (error) {
        console.error('Failed to fetch recording URLs:', error);
        return [];
    }
};
