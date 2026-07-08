import React from 'react';
import { useSecureImage } from '../../hooks/useSecureImage';
import { Loader2, ImageOff } from 'lucide-react';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string | undefined;
    fallback?: React.ReactNode;
}

const SecureImage: React.FC<SecureImageProps> = ({ src, fallback, className, ...props }) => {
    const { secureUrl, loading, error } = useSecureImage(src);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !secureUrl) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 ${className}`}>
                {fallback || <ImageOff className="w-5 h-5" />}
            </div>
        );
    }

    return <img src={secureUrl} className={className} {...props} />;
};

export default SecureImage;
