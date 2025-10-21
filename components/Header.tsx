import React from 'react';

interface HeaderProps {
    onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome }) => {
    return (
        <header className="bg-gray-900 py-4 px-8 border-b border-yellow-500/30 text-center sticky top-0 z-20">
            <h1 
                className="font-algerian text-[32px] md:text-[38px] font-bold text-yellow-400 mb-2 tracking-wider cursor-pointer"
                onClick={onGoHome}
                title="Go to Home"
            >
                VOTERS' DBMS
            </h1>
            <p className="font-monotype-corsiva text-lg text-green-400 tracking-widest capitalize">For Quicker & Better Data Management</p>
            <p className="font-cambria text-lg text-white mt-1 uppercase">MADE BY SUKAMAL ROY</p>
        </header>
    );
};