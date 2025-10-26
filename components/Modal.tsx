

import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-900 bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 border border-transparent rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 max-h-[90vh] flex flex-col transform transition-all duration-300"
                style={{
                  borderImage: 'linear-gradient(to bottom right, #fbbf24, #4338ca) 1',
                  boxShadow: '0 0 40px rgba(251, 191, 36, 0.2)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-2xl font-copperplate-gothic tracking-wider text-yellow-400">{title}</h2>
                    <button onClick={onClose} className="text-gray-200 hover:text-white text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};