import React from 'react';
import { SettingsIcon, HomeIcon } from './icons';
import type { User } from '../types';

interface HeaderProps {
    onGoHome: () => void;
    onOpenSettings?: () => void;
    currentUser: User | null;
    onLogout: () => void;
    onNavigate: (view: 'admin' | 'home') => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome, onOpenSettings, currentUser, onLogout, onNavigate }) => {
    return (
        <header className="bg-slate-900/50 py-4 px-4 sm:px-8 border-b border-transparent text-center sticky top-0 z-20 backdrop-blur-sm relative"
            style={{ borderImage: 'linear-gradient(to right, #fbbf24, #4338ca) 1' }}
        >
            <div className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-6 flex items-center gap-4">
                 <button
                    onClick={onGoHome}
                    title="Go to Home"
                    className="text-slate-300 hover:text-yellow-400 transition-colors"
                >
                    <HomeIcon className="w-8 h-8" />
                </button>
                 {onOpenSettings && currentUser?.isAdmin && (
                     <button
                        onClick={onOpenSettings}
                        title="App Settings"
                        className="text-slate-400 hover:text-yellow-400 transition-colors"
                    >
                        <SettingsIcon className="w-8 h-8" />
                    </button>
                )}
            </div>
            
            <div className="max-w-xl mx-auto">
                <h1 
                    className="font-copperplate-gothic text-[32px] md:text-[42px] font-bold text-yellow-400 mb-2 tracking-wider cursor-pointer"
                    onClick={onGoHome}
                    title="Go to Home"
                    style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.4)' }}
                >
                    Smart B.L.O.
                </h1>
                <p className="font-copperplate-gothic text-base text-lime-400 tracking-widest">An App for Voter Data Management</p>
                <p className="text-sm mt-1">
                    <span className="text-white">Developed By: </span>
                    <span className="text-pink-500 font-semibold">Sukamal Roy</span>
                </p>
            </div>

            {currentUser && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
                    <div className="text-right">
                        <span className="text-xs text-slate-300 block">Welcome,</span>
                        <span className="font-semibold text-yellow-300 text-sm truncate">{currentUser.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentUser.isAdmin && (
                            <button onClick={() => onNavigate('admin')} className="text-sm bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-500 transition-colors">Admin</button>
                        )}
                        <button onClick={onLogout} className="text-sm bg-red-600 text-white px-2 py-1 rounded hover:bg-red-500 transition-colors">Logout</button>
                    </div>
                </div>
            )}
        </header>
    );
};