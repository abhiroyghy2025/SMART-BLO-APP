

import React from 'react';
import { HomeIcon, EmailIcon, FacebookIcon, InstagramIcon, GlobeIcon } from './icons';

interface AboutPageProps {
    onGoHome: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onGoHome }) => {
    const features = [
        "In-Browser Excel Editing: No need for external software. Upload, edit, and manage voter data directly in your browser.",
        "Advanced Search & Filter: Quickly find any voter record with multi-column search and powerful table filtering.",
        "AI-Powered Data Entry: Use voice or text commands to fill out new voter forms quickly and accurately with Gemini AI.",
        "Comprehensive Data Management: Add, delete, duplicate, and batch-update records with ease. Manage columns, sort data, and highlight important rows.",
        "Offline Functionality: The app is a Progressive Web App (PWA) and works offline after the first visit.",
        "Export Options: Download your entire database as an Excel (.xlsx) or PDF file for easy sharing and printing.",
        "Responsive Design: Works seamlessly across desktops, tablets, and mobile phones.",
    ];

    const contactDetails = [
        {
            icon: EmailIcon,
            label: "E-mail",
            value: "smartbloapp2025@gmail.com",
            href: "mailto:smartbloapp2025@gmail.com",
        },
        {
            icon: GlobeIcon,
            label: "Official Blog",
            value: "smartbloapp.blogspot.com",
            href: "https://smartbloapp.blogspot.com",
        },
        {
            icon: FacebookIcon,
            label: "Facebook",
            value: "facebook.com/sukamal.roy",
            href: "https://facebook.com/sukamal.roy",
        },
        {
            icon: InstagramIcon,
            label: "Instagram",
            value: "instagram.com/sukamalroy",
            href: "https://instagram.com/sukamalroy",
        },
    ];

    return (
        <div className="space-y-8 animate-fadeIn">
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.5s ease-out; }`}</style>
            
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-4xl font-bold text-yellow-400 font-copperplate-gothic tracking-wider">About Smart B.L.O.</h1>
                <button
                    onClick={onGoHome}
                    className="flex items-center gap-2 bg-slate-800 text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-yellow-400/20"
                >
                    <HomeIcon className="w-5 h-5" />
                    <span className="font-semibold">Back to Home</span>
                </button>
            </header>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-yellow-300 font-teko tracking-widest border-b border-slate-700 pb-2">Key Features</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                    {features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                    ))}
                </ul>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-yellow-300 font-teko tracking-widest border-b border-slate-700 pb-2">Contact the Developer</h2>
                <div className="space-y-4">
                    {contactDetails.map(({ icon: Icon, label, value, href }) => (
                        <div key={label} className="flex items-center gap-4">
                            <Icon className={`w-8 h-8 ${label === 'Facebook' ? 'text-blue-500' : 'text-blue-400'}`} />
                            <div className="flex-grow">
                                <p className="font-semibold text-slate-200">{label}</p>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-yellow-400 hover:text-yellow-300 hover:underline break-all"
                                >
                                    {value}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};