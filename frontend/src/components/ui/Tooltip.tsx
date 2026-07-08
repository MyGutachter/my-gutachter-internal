import React, { useState } from 'react';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
    const [active, setActive] = useState(false);

    let positionClasses = '';
    switch (position) {
        case 'top':
            positionClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
            break;
        case 'bottom':
            positionClasses = 'top-full left-1/2 -translate-x-1/2 mt-2';
            break;
        case 'left':
            positionClasses = 'right-full top-1/2 -translate-y-1/2 mr-2';
            break;
        case 'right':
            positionClasses = 'left-full top-1/2 -translate-y-1/2 ml-2';
            break;
    }

    return (
        <div 
            className="relative flex items-center inline-block"
            onMouseEnter={() => setActive(true)}
            onMouseLeave={() => setActive(false)}
            onFocus={() => setActive(true)}
            onBlur={() => setActive(false)}
        >
            {children}
            {active && (
                <div className={`absolute z-[999] px-2.5 py-1.5 text-[10px] font-bold text-white bg-slate-900 rounded-xl shadow-xl pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 duration-100 ${positionClasses}`}>
                    <div className="relative z-10 whitespace-nowrap">
                        {content}
                    </div>
                    {/* Tooltip arrow */}
                    <div className={`absolute w-1.5 h-1.5 bg-slate-900 rotate-45 ${
                        position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' :
                        position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' :
                        position === 'left' ? 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2' :
                        'right-full top-1/2 -translate-x-1/2 -translate-y-1/2'
                    }`} />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
