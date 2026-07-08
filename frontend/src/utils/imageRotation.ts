import { toSafeDataUrl } from "./imageEdit";

/**
 * Rotates a base64/blob/http image by 90 degrees in the specified direction.
 *
 * @param urlOrData The image URL (blob:, http:) or base64 data URL
 * @param direction 'left' (-90deg) or 'right' (+90deg)
 * @returns A promise that resolves to the rotated base64 data URL string
 */
export const rotateImage = async (
    urlOrData: string,
    direction: 'left' | 'right'
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

            // Swap width and height for 90deg rotation
            canvas.width = img.height;
            canvas.height = img.width;

            // Rotate
            if (direction === 'right') {
                ctx.translate(canvas.width, 0);
                ctx.rotate(Math.PI / 2);
            } else {
                ctx.translate(0, canvas.height);
                ctx.rotate(-Math.PI / 2);
            }

            ctx.drawImage(img, 0, 0);

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (error) => reject(error);
        img.src = dataUrl;
    });
};

/**
 * Checks if a base64/blob/http image is in portrait orientation.
 *
 * @param urlOrData The image URL or base64 data URL
 * @returns A promise that resolves to true if portrait, false otherwise
 */
export const isPortraitImage = async (urlOrData: string): Promise<boolean> => {
    const dataUrl = await toSafeDataUrl(urlOrData).catch(() => urlOrData);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve(img.height > img.width);
        };
        img.onerror = () => resolve(false);
        img.src = dataUrl;
    });
};
