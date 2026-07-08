import React from 'react';
import { X } from 'lucide-react';

const ErrorBanner: React.FC<{ message: string; onClose?: () => void }> = ({ message, onClose }) => (
    <div className="bg-red-50 border-l-4 border-error-red p-3 mb-3 animate-slide-down flex justify-between items-start">
        <p className="text-error-red text-xs font-medium">{message}</p>
        {onClose && <button onClick={onClose} className="text-error-red hover:text-red-800 ml-4"><X className="w-4 h-4" /></button>}
    </div>
);

export default ErrorBanner;
