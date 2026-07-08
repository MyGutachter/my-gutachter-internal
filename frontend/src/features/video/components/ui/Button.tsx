import React from 'react';
import { cn } from '../../utils/cn'; // Assuming you have a cn utility, or I will create one.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    className,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    children,
    ...props
}) => {
    return (
        <button
            className={cn(
                "rounded-md cursor-pointer font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
                {
                    'bg-[var(--color-primary-orange)] text-white hover:bg-[var(--color-primary-orange-dark)] focus:ring-[var(--color-primary-orange)]': variant === 'primary',
                    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]': variant === 'secondary',
                    'border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]': variant === 'outline',
                    'px-3 py-1.5 text-sm': size === 'sm',
                    'px-4 py-2': size === 'md',
                    'px-6 py-3 text-lg': size === 'lg',
                    'w-full': fullWidth,
                },
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
