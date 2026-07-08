import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    fullScreen?: boolean;
    showTitle?: boolean;
    noPadding?: boolean;
    className?: string;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    fullScreen, 
    showTitle = true, 
    noPadding = false,
    className = ''
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!mounted) return null;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className={`bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 w-full border border-white/20 ${fullScreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-2xl max-h-[90vh]'} ${className}`}
                    >
                        {showTitle && (
                            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
                                <button 
                                    onClick={onClose} 
                                    className="p-2.5 bg-white hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-all shadow-sm border border-gray-100 active:scale-90"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        <div className={`flex-1 overflow-y-auto bg-white custom-scrollbar ${noPadding ? 'p-0' : 'p-6 sm:p-8'}`}>
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default ModalWrapper;
