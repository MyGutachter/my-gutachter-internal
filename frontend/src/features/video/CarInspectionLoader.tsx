import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CarInspectionLoaderProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg' | 'full';
}

const CarInspectionLoader: React.FC<CarInspectionLoaderProps> = ({ text, size = 'md' }) => {
    const { t } = useTranslation();
    const [statusText, setStatusText] = useState(text || t('inspectionLoader.initializing'));

    // Size configurations
    const sizeConfig = {
        sm: {
            containerWidth: 'w-60',      // 240px
            containerHeight: 'h-36',     // 144px
            svgWidth: 'w-48',           // 192px
            svgHeight: 'h-24',          // 96px
            padding: 'p-4',
            textSize: 'text-xs',
            progressBarWidth: 'w-36',
            dotSize: 'w-1.5 h-1.5'
        },
        md: {
            containerWidth: 'w-80',      // 320px
            containerHeight: 'h-48',     // 192px
            svgWidth: 'w-64',           // 256px
            svgHeight: 'h-32',          // 128px
            padding: 'p-8',
            textSize: 'text-sm',
            progressBarWidth: 'w-48',
            dotSize: 'w-2 h-2'
        },
        lg: {
            containerWidth: 'w-96',      // 384px
            containerHeight: 'h-56',     // 224px
            svgWidth: 'w-80',           // 320px
            svgHeight: 'h-40',          // 160px
            padding: 'p-10',
            textSize: 'text-base',
            progressBarWidth: 'w-56',
            dotSize: 'w-2.5 h-2.5'
        },
        full: {
            containerWidth: 'w-full max-w-md',
            containerHeight: 'h-64',     // 256px
            svgWidth: 'w-full max-w-sm',
            svgHeight: 'h-48',          // 192px
            padding: 'p-8',
            textSize: 'text-base',
            progressBarWidth: 'w-64',
            dotSize: 'w-2 h-2'
        }
    };

    const config = sizeConfig[size];

    useEffect(() => {
        if (text) return;

        const statuses = [
            t('inspectionLoader.analyzingGeometry'),
            t('inspectionLoader.detectingAnomalies'),
            t('inspectionLoader.verifyingVin'),
            t('inspectionLoader.checkingIntegrity'),
            t('inspectionLoader.compilingData')
        ];
        let i = 0;
        const interval = setInterval(() => {
            setStatusText(statuses[i]);
            i = (i + 1) % statuses.length;
        }, 1500);
        return () => clearInterval(interval);
    }, [text]);

    return (
        <div className={`flex flex-col items-center justify-center ${config.padding} bg-transparent`}>
            {/* Main Inspection Stage */}
            <div className={`relative ${config.containerWidth} ${config.containerHeight} flex items-center justify-center overflow-hidden`}>

                {/* 1. Underlying Grid (Tech Vibe) */}
                <div className="absolute inset-0 grid-background opacity-20 transform perspective-500 rotate-x-60"></div>

                {/* 2. Car Wireframe SVG - More Realistic Sedan Side Profile */}
                <svg viewBox="0 0 300 120" className={`${config.svgWidth} ${config.svgHeight} stroke-[var(--color-primary-orange)] fill-transparent z-10 drop-shadow-glow`}>
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Main Body Outline */}
                    {/* Front Bumper -> Hood -> Windshield -> Roof -> Rear Window -> Trunk -> Rear Bumper -> Side Skirt -> Wheel Wells */}
                    <path
                        d="M270,75 L270,60 Q270,50 250,48 L200,45 L170,20 L110,20 L70,45 L30,48 Q10,50 10,65 L10,75 L25,75 Q40,75 40,60 Q40,45 55,45 L85,45 Q100,45 100,60 Q100,75 115,75 L180,75 Q195,75 195,60 Q195,45 210,45 L240,45 Q255,45 255,60 Q255,75 270,75 Z"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-draw"
                    />

                    {/* Window Area */}
                    <path
                        d="M75,45 L105,25 L175,25 L195,45"
                        strokeWidth="1"
                        className="opacity-70"
                    />

                    {/* Door Lines */}
                    <path d="M110,48 L110,72" strokeWidth="0.5" className="opacity-50" />
                    <path d="M170,48 L170,72" strokeWidth="0.5" className="opacity-50" />

                    {/* Door Handles */}
                    <line x1="115" y1="52" x2="125" y2="52" strokeWidth="1.5" className="opacity-80" />
                    <line x1="175" y1="52" x2="185" y2="52" strokeWidth="1.5" className="opacity-80" />

                    {/* Wheels */}
                    {/* Front Wheel */}
                    <g className="animate-spin-slow origin-[70px_75px]" style={{ transformBox: 'fill-box', transformOrigin: '70px 75px' }}>
                        <circle cx="70" cy="75" r="14" strokeWidth="1.5" />
                        <circle cx="70" cy="75" r="5" strokeWidth="1" />
                        <line x1="70" y1="61" x2="70" y2="89" strokeWidth="1" />
                        <line x1="56" y1="75" x2="84" y2="75" strokeWidth="1" />
                    </g>

                    {/* Rear Wheel */}
                    <g className="animate-spin-slow origin-[225px_75px]" style={{ transformBox: 'fill-box', transformOrigin: '225px 75px' }}>
                        <circle cx="225" cy="75" r="14" strokeWidth="1.5" />
                        <circle cx="225" cy="75" r="5" strokeWidth="1" />
                        <line x1="225" y1="61" x2="225" y2="89" strokeWidth="1" />
                        <line x1="211" y1="75" x2="239" y2="75" strokeWidth="1" />
                    </g>
                </svg>

                {/* 3. Laser Scan Effect */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                    <div className="w-[2px] h-full bg-[var(--color-primary-orange)] shadow-[0_0_15px_rgba(var(--color-primary-orange-rgb),0.8)] absolute left-0 animate-scan-horizontal opacity-80 backdrop-blur-sm"></div>
                </div>

                {/* 4. Detection Points (Hotspots) */}
                {/* Adjusted positions for new SVG size */}
                <div className="absolute top-[45%] left-[25%] w-2 h-2 bg-[var(--color-primary-orange)] rounded-full animate-ping-rapid z-30" style={{ animationDelay: '0.8s' }} /> {/* Hood */}
                <div className="absolute top-[35%] left-[55%] w-2 h-2 bg-[var(--color-primary-orange)] rounded-full animate-ping-rapid z-30" style={{ animationDelay: '1.5s' }} /> {/* Root/Door */}
                <div className="absolute top-[50%] left-[80%] w-2 h-2 bg-[var(--color-primary-orange)] rounded-full animate-ping-rapid z-30" style={{ animationDelay: '2.5s' }} /> {/* Trunk */}

            </div>

            {/* Status Feed */}
            <div className="flex flex-col items-center mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                    <div className={`${config.dotSize} bg-[var(--color-primary-orange)] rounded-full animate-pulse`} />
                    <span className={`text-[var(--color-text-primary)] font-mono ${config.textSize} tracking-wider font-bold`}>
                        {statusText}
                    </span>
                </div>
                {/* Tech bar decoration */}
                <div className={`${config.progressBarWidth} h-1 bg-[var(--color-border-secondary)] rounded-full overflow-hidden`}>
                    <div className="h-full bg-[var(--color-primary-orange)] animate-progress-indeterminate"></div>
                </div>
            </div>

            <style>{`
                .perspective-500 { perspective: 500px; }
                .rotate-x-60 { transform: rotateX(60deg); }
                .grid-background {
                    background-image: 
                        linear-gradient(rgba(253, 126, 20, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(253, 126, 20, 0.1) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
                .drop-shadow-glow {
                    filter: drop-shadow(0 0 5px rgba(253, 126, 20, 0.5));
                }
                
                @keyframes scan-horizontal {
                    0% { left: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { left: 100%; opacity: 0; }
                }
                .animate-scan-horizontal {
                    animation: scan-horizontal 2s ease-in-out infinite;
                }

                @keyframes draw {
                    0% { stroke-dasharray: 0 1000; }
                    100% { stroke-dasharray: 1000 0; }
                }
                .animate-draw {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: dash 3s linear forwards infinite;
                }
                
                @keyframes dash {
                   0% { stroke-dashoffset: 1000; }
                   50% { stroke-dashoffset: 0; }
                   100% { stroke-dashoffset: 0; } 
                }

                @keyframes ping-rapid {
                    0% { transform: scale(1); opacity: 1; }
                    75%, 100% { transform: scale(3); opacity: 0; }
                }
                .animate-ping-rapid {
                    animation: ping-rapid 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                }

                @keyframes progress-indeterminate {
                    0% { width: 0%; margin-left: 0%; }
                    50% { width: 70%; margin-left: 30%; }
                    100% { width: 0%; margin-left: 100%; }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 1.5s ease-in-out infinite;
                }
                
                .animate-spin-slow {
                    animation: spin 4s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); transform-origin: center; }
                    to { transform: rotate(360deg); transform-origin: center; }
                }
            `}</style>
        </div>
    );
};

export default CarInspectionLoader;
