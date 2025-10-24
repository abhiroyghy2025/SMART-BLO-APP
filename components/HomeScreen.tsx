import React from 'react';
import { SearchIcon, EditIcon } from './icons';
import type { AppView } from '../App';

interface HomeScreenProps {
    onNavigate: (view: Exclude<AppView, 'home'>) => void;
    voterCount: number;
    sheet2Data: any[][];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, voterCount, sheet2Data }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fadeIn">
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
            `}</style>
             {voterCount > 0 ? (
                <p className="text-gray-300 text-xl mb-12">
                    Total Voter in P.S. : <span className="font-bold text-yellow-400">{voterCount.toLocaleString()}</span>.
                    <br/>
                    Please choose an option to continue.
                </p>
            ) : (
                <p className="text-gray-300 text-xl mb-12">
                    Welcome. Please choose an option to start.
                </p>
            )}
            <div className="flex flex-col md:flex-row gap-8">
                <button
                    onClick={() => onNavigate('search')}
                    className="group flex flex-col items-center justify-center w-64 h-64 bg-gray-900 border-2 border-yellow-500/50 rounded-lg shadow-lg hover:bg-yellow-900/40 hover:border-yellow-400 transition-all duration-300 transform hover:-translate-y-2"
                >
                    <SearchIcon className="w-20 h-20 text-yellow-400 group-hover:text-yellow-300 transition-colors duration-300" />
                    <span className="mt-4 text-2xl font-bold text-yellow-400 group-hover:text-yellow-300 tracking-wider">
                        SEARCH
                    </span>
                </button>
                <button
                    onClick={() => onNavigate('editor')}
                    className="group flex flex-col items-center justify-center w-64 h-64 bg-gray-900 border-2 border-yellow-500/50 rounded-lg shadow-lg hover:bg-yellow-900/40 hover:border-yellow-400 transition-all duration-300 transform hover:-translate-y-2"
                >
                    <EditIcon className="w-20 h-20 text-yellow-400 group-hover:text-yellow-300 transition-colors duration-300" />
                    <span className="mt-4 text-2xl font-bold text-yellow-400 group-hover:text-yellow-300 tracking-wider">
                        EDIT/CORRECTION
                    </span>
                </button>
            </div>
            {sheet2Data && sheet2Data.length > 0 && (
                <div className="mt-12 pt-8 border-t border-yellow-500/30 w-full max-w-4xl">
                    {sheet2Data.map((row, index) => {
                        if (!row || row.every(cell => cell === null || String(cell).trim() === '')) {
                            return null;
                        }
                        
                        const key = String(row[0] ?? '').trim();
                        const value = row.slice(1).map(cell => String(cell ?? '').trim()).join(' ').trim();
                        
                        if (!key && !value) {
                            return null;
                        }

                        if (!value) {
                             return (
                                <p key={index} className="text-lg font-cambria mb-2 text-center font-bold text-yellow-400">
                                   {key}
                                </p>
                            );
                        }

                        if (!key) {
                             return (
                                <p key={index} className="text-lg font-cambria mb-2 text-center text-white">
                                   {value}
                                </p>
                            );
                        }

                        return (
                            <p key={index} className="text-lg font-cambria mb-2 text-center">
                                <span className="text-white">{key}: </span>
                                <span className="font-bold text-yellow-400">{value}</span>
                            </p>
                        );
                    })}
                </div>
            )}
        </div>
    );
};