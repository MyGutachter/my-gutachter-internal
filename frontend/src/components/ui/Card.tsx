import React from 'react';

const Card = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>>(({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`card animate-fade-in ${className}`} {...props}>{children}</div>
));

Card.displayName = 'Card';

export default Card;
