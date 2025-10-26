

import React, { useState, useEffect } from 'react';

interface OnboardingTourProps {
    isOpen: boolean;
    onClose: () => void;
}

const steps = [
    {
        title: 'Welcome to Smart B.L.O.!',
        text: "Let's take a quick tour of the main features.",
        selector: null,
    },
    {
        title: 'Add a New Voter',
        text: 'Click here to open a form and add a new voter record to your database.',
        selector: '[title="Open a form to add a new voter"]',
    },
    {
        title: 'Search Your Database',
        text: 'Use this option to quickly find any voter by name, serial number, or other details.',
        selector: '[title="Search the voter database"]',
    },
    {
        title: 'Edit & Upload Data',
        text: "This is where the magic happens! View your data in a powerful spreadsheet, edit records, and upload new Excel files.",
        selector: '[title="View, edit, or upload your voter database"]',
    },
    {
        title: "You're All Set!",
        text: 'Enjoy using the app. You can find more info and contact details in the "About" section.',
        selector: null,
    }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [spotlightStyle, setSpotlightStyle] = useState({});

    useEffect(() => {
        if (!isOpen) return;

        const step = steps[currentStep];
        if (step.selector) {
            const element = document.querySelector(step.selector);
            if (element) {
                const rect = element.getBoundingClientRect();
                setSpotlightStyle({
                    width: `${rect.width + 20}px`,
                    height: `${rect.height + 20}px`,
                    top: `${rect.top - 10}px`,
                    left: `${rect.left - 10}px`,
                    borderRadius: '8px',
                    transition: 'all 0.3s ease-in-out',
                });
            }
        } else {
            setSpotlightStyle({
                width: '0px',
                height: '0px',
                top: '50%',
                left: '50%',
                borderRadius: '50%',
            });
        }
    }, [currentStep, isOpen]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };
    
    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isOpen) return null;

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>

            {/* Spotlight */}
            <div 
                className="absolute border-4 border-yellow-400 shadow-2xl shadow-yellow-400/50"
                style={spotlightStyle}
            ></div>

            {/* Content Box */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 bg-slate-800 border border-yellow-500/50 rounded-lg shadow-lg text-center">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 font-copperplate-gothic">{step.title}</h3>
                <p className="text-slate-300 mb-6">{step.text}</p>
                <div className="flex justify-between items-center">
                    {currentStep > 0 && (
                         <button 
                            onClick={handlePrev} 
                            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Previous
                        </button>
                    )}
                     <div className="flex-grow text-center text-sm text-gray-400">
                        {currentStep + 1} / {steps.length}
                    </div>
                    <button 
                        onClick={handleNext} 
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                    >
                        {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};