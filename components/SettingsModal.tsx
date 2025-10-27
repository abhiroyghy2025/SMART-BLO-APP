import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { AdsenseConfig, GeminiConfig } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveAdsense: (config: AdsenseConfig) => void;
    currentAdsenseConfig: AdsenseConfig | null;
    onSaveGemini: (config: GeminiConfig) => void;
    currentGeminiConfig: GeminiConfig | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose, onSaveAdsense, currentAdsenseConfig, onSaveGemini, currentGeminiConfig
}) => {
    const [adsenseConfig, setAdsenseConfig] = useState<AdsenseConfig>({ publisherId: '', adSlotId: '' });
    const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>({ apiKey: '' });

    useEffect(() => {
        if (currentAdsenseConfig) {
            setAdsenseConfig(currentAdsenseConfig);
        } else {
            setAdsenseConfig({ publisherId: '', adSlotId: '' });
        }
        if (currentGeminiConfig) {
            setGeminiConfig(currentGeminiConfig);
        } else {
            setGeminiConfig({ apiKey: '' });
        }
    }, [currentAdsenseConfig, currentGeminiConfig, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'publisherId' || name === 'adSlotId') {
            setAdsenseConfig(prev => ({ ...prev, [name]: value }));
        } else if (name === 'apiKey') {
            setGeminiConfig(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        // Basic validation for AdSense
        if (adsenseConfig.publisherId.trim() || adsenseConfig.adSlotId.trim()) {
            if (!adsenseConfig.publisherId.trim().startsWith('ca-pub-') || !adsenseConfig.adSlotId.trim()) {
                alert('Please enter a valid Publisher ID (starting with ca-pub-) and Ad Slot ID, or leave both AdSense fields blank.');
                return;
            }
        }
        onSaveAdsense(adsenseConfig);
        onSaveGemini(geminiConfig);
        onClose();
    };
    
    const handleDisconnect = () => {
        onSaveAdsense({ publisherId: '', adSlotId: '' }); // Save empty config to clear it
        setAdsenseConfig({ publisherId: '', adSlotId: '' });
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="App Settings">
            <div className="space-y-6 text-slate-300">
                <section className="space-y-3">
                    <h3 className="text-lg font-semibold text-yellow-400 font-copperplate-gothic">Google Gemini AI</h3>
                    <p>Enter your Gemini API Key to enable AI-powered features like voice commands and data analysis. Get a key from Google AI Studio.</p>
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium mb-1">Gemini API Key</label>
                        <input
                            type="password"
                            id="apiKey"
                            name="apiKey"
                            value={geminiConfig.apiKey}
                            onChange={handleChange}
                            placeholder="Enter your API Key"
                            className="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                        />
                    </div>
                </section>

                <section className="space-y-3 pt-6 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-yellow-400 font-copperplate-gothic">Google AdSense</h3>
                    <p>Enter your AdSense details here to display ads. You can find these IDs in your AdSense account.</p>
                    <div>
                        <label htmlFor="publisherId" className="block text-sm font-medium mb-1">Publisher ID</label>
                        <input
                            type="text"
                            id="publisherId"
                            name="publisherId"
                            value={adsenseConfig.publisherId}
                            onChange={handleChange}
                            placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                            className="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="adSlotId" className="block text-sm font-medium mb-1">Ad Slot ID</label>
                        <input
                            type="text"
                            id="adSlotId"
                            name="adSlotId"
                            value={adsenseConfig.adSlotId}
                            onChange={handleChange}
                            placeholder="YYYYYYYYYY"
                            className="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                        />
                    </div>
                     <button
                        onClick={handleDisconnect}
                        className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm mt-2"
                        title="Clear AdSense settings"
                    >
                        Disconnect AdSense
                    </button>
                </section>

                <div className="flex justify-end items-center gap-4 pt-4 mt-4 border-t border-slate-700">
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};