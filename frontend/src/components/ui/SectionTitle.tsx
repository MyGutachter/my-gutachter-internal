import React from 'react';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="section-title">{children}</h2>
);

export default SectionTitle;
