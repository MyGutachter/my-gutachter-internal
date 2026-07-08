import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * Hook to load an image from a protected API using an authenticated request.
 * Returns a temporary Object URL that can be used as an <img> src.
 */
export const useSecureImage = (imageUrl: string | null | undefined) => {
    const [secureUrl, setSecureUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!imageUrl) {
            setSecureUrl(null);
            return;
        }

        // If it's already a data URL, a non-API URL, a public screenshot redirect,
        // or a presigned-S3-redirect endpoint — load directly via browser img tag.
        // These paths either don't need auth headers or redirect to external storage
        // that the browser handles natively without a CORS preflight.
        if (
            imageUrl.startsWith('data:') ||
            !imageUrl.includes('/api/') ||
            imageUrl.includes('/api/screenshots/') ||
            imageUrl.includes('/api/reports/photos/')
        ) {
            let finalUrl = imageUrl;
            if (imageUrl.startsWith('/api/')) {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
                const baseWithoutApi = apiBase.endsWith('/api') ? apiBase.substring(0, apiBase.length - 4) : apiBase;
                finalUrl = `${baseWithoutApi}${imageUrl}`;
            } else if (imageUrl.startsWith('api/')) {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
                const baseWithoutApi = apiBase.endsWith('/api') ? apiBase.substring(0, apiBase.length - 4) : apiBase;
                finalUrl = `${baseWithoutApi}/${imageUrl}`;
            }
            setSecureUrl(finalUrl);
            return;
        }

        let isMounted = true;
        let blobUrl: string | null = null;

        const loadImage = async () => {
            setLoading(true);
            try {
                // Determine path (strip origin if present to use api instance)
                const path = imageUrl.includes('/api/')
                    ? imageUrl.substring(imageUrl.indexOf('/api/') + 4)
                    : imageUrl;

                console.log("useSecureImage:", path);
                console.log(api.defaults.baseURL);
                const response = await api.get(path, {
                    responseType: 'blob'
                });

                if (isMounted) {
                    blobUrl = URL.createObjectURL(response.data);
                    setSecureUrl(blobUrl);
                }
            } catch (err: any) {
                console.error('Error loading secure image, falling back to direct URL:', err);
                if (isMounted) {
                    // Fall back to direct URL — browser img tag handles redirects without CORS preflight
                    setSecureUrl(imageUrl);
                    setError(err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [imageUrl]);

    return { secureUrl, loading, error };
};
