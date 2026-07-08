// Video-call config, adapted to the merged app. The rest of the app derives its
// API base from VITE_API_URL (default http://localhost:8080/api). The WebRTC
// signaling endpoint is /signal on the same host (NOT under /api).

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// API_BASE_URL already includes the /api suffix — used to build absolute
// screenshot <img> URLs (e.g. `${API_BASE_URL}/screenshots/{id}/{file}`).
export const API_BASE_URL = apiUrl;

export const getWebSocketUrl = (): string => {
    try {
        const url = new URL(apiUrl);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${url.host}/signal`;
    } catch {
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}/signal`;
        }
        return 'ws://localhost:8080/signal';
    }
};

export const WS_URL = getWebSocketUrl();
