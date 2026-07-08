import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => (
    <div className="flex items-center gap-2 p-3">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        {text && <span className="text-xs text-dark-gray">{text}</span>}
    </div>
);

export default LoadingSpinner;
