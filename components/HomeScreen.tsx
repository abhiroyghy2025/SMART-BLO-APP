
import React from 'react';
import { SearchIcon, EditIcon, PlusIcon, InfoIcon } from './icons';
import type { AppView } from '../App';
import type { BloInfo } from '../types';

interface HomeScreenProps {
    onNavigate: (view: Exclude<AppView, 'home'> | 'about') => void;
    voterCount: number;
    bloInfo: BloInfo;
    onAddVoterClick: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, voterCount, bloInfo, onAddVoterClick }) => {

    const navigationOptions = [
        { 
            title: "SEARCH", 
            description: "Find any voter from the list by name, serial no., or other details.",
            icon: SearchIcon,
            action: () => onNavigate('search'),
            disabled: voterCount === 0,
            tooltip: voterCount === 0 ? 'Upload a file or add voters to enable search' : "Search the voter database"
        },
        {
            title: "ADD NEW/MISSING VOTER",
            description: "Add a new voter record to the current database.",
            icon: PlusIcon,
            action: onAddVoterClick,
            disabled: false,
            tooltip: "Open a form to add a new voter"
        },
        { 
            title: "EDIT/UPLOAD DATABASE", 
            description: "Add, delete, or modify voter data in a spreadsheet-like interface.",
            icon: EditIcon,
            action: () => onNavigate('editor'),
            disabled: false, // Always enabled, shows upload prompt if empty
            tooltip: "View, edit, or upload your voter database"
        },
        { 
            title: "ABOUT", 
            description: "Learn about the app's features and contact the developer.",
            icon: InfoIcon,
            action: () => onNavigate('about'),
            disabled: false,
            tooltip: "Find out more about the app"
        }
    ];

    const BloInfoDisplay: React.FC<{ info: BloInfo }> = ({ info }) => (
        <div className="w-full max-w-2xl bg-slate-800/50 border border-yellow-500/30 rounded-lg p-6 space-y-3 mb-12 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-yellow-400 border-b border-slate-700 pb-2 mb-3 font-copperplate-gothic tracking-wider">B.L.O. Information</h3>
            {Object.entries(info).map(([key, value]) => (
                <div key={key} className="flex flex-col sm:flex-row">
                    <p className="font-semibold text-blue-300 w-full sm:w-1/3">{key}:</p>
                    <p className="text-white w-full sm:w-2/3">{value}</p>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center p-4">
             <div className="text-center mb-8">
                <p className="text-xl text-slate-300">
                    You have <span className="font-bold text-yellow-300 font-teko text-2xl tracking-wider">{voterCount.toLocaleString()}</span> voters loaded.
                </p>
            </div>

            <BloInfoDisplay info={bloInfo} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {navigationOptions.map(opt => (
                     <button 
                        key={opt.title}
                        onClick={opt.action}
                        disabled={opt.disabled}
                        title={opt.tooltip}
                        className="group bg-slate-800/50 border-2 border-transparent rounded-lg p-8 text-center transition-all duration-300 hover:bg-slate-700/70 hover:shadow-2xl hover:shadow-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-slate-800/50 disabled:hover:shadow-none backdrop-blur-sm relative overflow-hidden"
                     >
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                         <div className="relative">
                             <div className="flex justify-center mb-4">
                                 <opt.icon className="w-16 h-16 text-blue-400 transition-all duration-300 group-hover:scale-110 group-hover:text-yellow-400 group-hover:drop-shadow-[0_0_15px_rgba(251,191,36,0.7)]" />
                             </div>
                             <h3 className="text-xl font-semibold text-yellow-400 mb-2 font-teko tracking-widest">{opt.title}</h3>
                             <p className="text-slate-300">{opt.disabled ? opt.tooltip : opt.description}</p>
                         </div>
                     </button>
                ))}
            </div>
        </div>
    );
};