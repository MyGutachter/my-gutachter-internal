import api from "../utils/api";

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

export const toSafeDataUrl = async (url: string): Promise<string> => {
    if (url.startsWith("data:")) {
        return url;
    }

    // Blob URLs (blob:https://...) — fetch directly, same origin, no auth needed.
    if (url.startsWith("blob:")) {
        const res = await fetch(url);
        return blobToDataUrl(await res.blob());
    }

    // Fallback to axios if the endpoint actually requires authentication.
    let requestUrl = url.includes("/api/")
        ? url.substring(url.indexOf("/api/") + 4)
        : url;

    // For screenshots and report photos, request with follow=false to return direct bytes/blob
    if (requestUrl.includes("screenshots/") || requestUrl.includes("reports/photos/")) {
        const separator = requestUrl.includes("?") ? "&" : "?";
        requestUrl = `${requestUrl}${separator}follow=false`;
    }

    const response = await api.get(requestUrl, {
        responseType: "blob",
    });

    return blobToDataUrl(response.data);
};

/**
 * Crops an image based on provided pixel coordinates and sizes.
 */
export const cropImage = async (
    urlOrData: string,
    crop: { x: number; y: number; width: number; height: number }
): Promise<string> => {
    const dataUrl = await toSafeDataUrl(urlOrData);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            canvas.width = crop.width;
            canvas.height = crop.height;

            ctx.drawImage(
                img,
                crop.x,
                crop.y,
                crop.width,
                crop.height,
                0,
                0,
                crop.width,
                crop.height
            );

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = (error) => reject(error);
        img.src = dataUrl;
    });
};

/**
 * Resizes an image to a specific width/height while maintaining aspect ratio or forcing it.
 */
export const resizeImage = async (
    urlOrData: string,
    width: number,
    height: number
): Promise<string> => {
    const dataUrl = await toSafeDataUrl(urlOrData);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = (error) => reject(error);
        img.src = dataUrl;
    });
};
