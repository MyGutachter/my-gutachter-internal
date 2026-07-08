import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ className, label, error, ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    "w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-md shadow-sm placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-orange)] focus:border-[var(--color-primary-orange)] sm:text-sm",
                    {
                        'border-red-500': error,
                    },
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};
