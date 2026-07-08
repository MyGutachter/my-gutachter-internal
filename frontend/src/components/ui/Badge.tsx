import React from 'react';

const Badge: React.FC<{ text: string; color?: string }> = ({ text, color = 'bg-primary-light text-primary' }) => (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${color}`}>{text}</span>
);

export default Badge;
