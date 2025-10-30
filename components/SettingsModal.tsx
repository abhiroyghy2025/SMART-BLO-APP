import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import type { GeminiConfig } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveGemini: (config: GeminiConfig) => void;
    currentGeminiConfig: GeminiConfig | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose, onSaveGemini, currentGeminiConfig
}) => {
    const [geminiConfig, setGeminiConfig] = useState<GeminiConfig>({ apiKey: '' });

    useEffect(() => {
        if (currentGeminiConfig) {
            setGeminiConfig(currentGeminiConfig);
        } else {
            setGeminiConfig({ apiKey: '' });
        }
    }, [currentGeminiConfig, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'apiKey') {
            setGeminiConfig(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        onSaveGemini(geminiConfig);
        onClose();
    };

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