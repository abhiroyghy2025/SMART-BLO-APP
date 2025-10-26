
import React, { useState } from 'react';
import type { BloInfo } from '../types';
import { Header } from './Header';

interface LoginScreenProps {
    onLogin: (info: BloInfo) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [info, setInfo] = useState<BloInfo>({
        "LAC NO & NAME": "",
        "PART NO & NAME": "",
        "NAME OF THE BLO": "",
        "CONTACT NO": ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value as string }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.values(info).some(val => String(val).trim() === '')) {
            alert("Please fill in all fields.");
            return;
        }
        onLogin(info);
    };

    const fields: (keyof BloInfo)[] = [
        "LAC NO & NAME",
        "PART NO & NAME",
        "NAME OF THE BLO",
        "CONTACT NO"
    ];

    return (
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
             <Header onGoHome={() => {}} />
            <div className="w-full max-w-md bg-slate-800/50 border border-yellow-500/30 rounded-lg shadow-2xl shadow-yellow-400/10 p-8 space-y-6 mt-8 backdrop-blur-sm">
                <h2 className="text-3xl font-bold text-yellow-400 text-center font-copperplate-gothic tracking-wider">
                    B.L.O. Information
                </h2>
                <p className="text-center text-slate-300">Please provide your details to continue. This is a one-time setup.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {fields.map(field => (
                        <div key={field}>
                            <label htmlFor={field} className="block text-sm font-medium text-slate-300 mb-1">{field}</label>
                            <input
                                type={field === 'CONTACT NO' ? 'tel' : 'text'}
                                id={field}
                                name={field}
                                value={info[field]}
                                onChange={handleChange}
                                required
                                className="block w-full bg-slate-700 border-2 border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-0 focus:border-yellow-500 transition-colors sm:text-sm"
                            />
                        </div>
                    ))}
                    <button type="submit" className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold py-3 px-6 rounded-md hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 text-lg mt-4 shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-400/30">
                        Save and Continue
                    </button>
                </form>
            </div>
        </div>
    );
};