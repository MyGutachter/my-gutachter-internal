/**
 * Validates that an image file is in landscape orientation with a 4:3 aspect ratio.
 * 
 * @param file The image file to validate
 * @returns A promise that resolves to an object with valid: boolean and error: string (if invalid)
 */
export const validateImageAspectRatio = (file: File): Promise<{ valid: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.width;
      const height = img.height;
      
      // Check orientation (Landscape)
      if (width <= height) {
        resolve({ 
          valid: false, 
          error: 'common.imageValidation.landscapeOnly' 
        });
        return;
      }
      
      // Check Aspect Ratio (4:3 = 1.333...)
      const aspectRatio = width / height;
      const targetRatio = 4 / 3;
      const tolerance = 0.05; // 5% tolerance for slight variations
      
      if (Math.abs(aspectRatio - targetRatio) > tolerance) {
        resolve({ 
          valid: false, 
          error: 'common.imageValidation.aspectRatio43' 
        });
        return;
      }
      
      resolve({ valid: true });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ 
        valid: false, 
        error: 'common.imageValidation.loadError' 
      });
    };
    
    img.src = objectUrl;
  });
};
