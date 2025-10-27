import React from 'react';
import { SettingsIcon } from './icons';

interface HeaderProps {
    onGoHome: () => void;
    onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome, onOpenSettings }) => {
    return (
        <header className="bg-slate-900/50 py-4 px-8 border-b border-transparent text-center sticky top-0 z-20 backdrop-blur-sm relative"
            style={{ borderImage: 'linear-gradient(to right, #fbbf24, #4338ca) 1' }}
        >
            <h1 
                className="font-copperplate-gothic text-[32px] md:text-[42px] font-bold text-yellow-400 mb-2 tracking-wider cursor-pointer"
                onClick={onGoHome}
                title="Go to Home"
                style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.4)' }}
            >
                Smart B.L.O.
            </h1>
            <p className="font-copperplate-gothic text-base text-green-400 tracking-widest">An App For Voters' Data Management</p>
            <p className="font-cambria text-lg text-white mt-1">Developed by <span className="text-blue-400 font-bold">Sukamal Roy</span></p>

            {onOpenSettings && (
                 <button
                    onClick={onOpenSettings}
                    title="App Settings"
                    className="absolute top-1/2 -translate-y-1/2 right-6 text-slate-400 hover:text-yellow-400 transition-colors"
                >
                    <SettingsIcon className="w-8 h-8" />
                </button>
            )}
        </header>
    );
};
