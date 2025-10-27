

import React, { useState, useEffect, useCallback } from 'react';
import type { VoterRecord } from '../types';
import { Modal } from './Modal';
import { MicrophoneIcon, GeminiIcon } from './icons';
import { useGemini } from '../hooks/useGemini';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseVoiceInputWithGemini } from '../utils/geminiParser';

interface VoterFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Partial<VoterRecord>) => void;
    headers: string[];
    apiKey?: string;
}

export const VoterFormModal: React.FC<VoterFormModalProps> = ({ isOpen, onClose, onSave, headers, apiKey }) => {
    const [newRecord, setNewRecord] = useState<Partial<VoterRecord>>({});
    const { text: voiceInputText, isListening, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition();
    const ai = useGemini(apiKey);
    const [writtenCommand, setWrittenCommand] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setNewRecord({});
            setWrittenCommand('');
        }
    }, [isOpen]);

    const handleVoiceUpdate = useCallback(async (transcript: string) => {
        if (!ai) return;
        const updates = await parseVoiceInputWithGemini(transcript, headers, ai);
        if (Object.keys(updates).length > 0) {
            setNewRecord(prev => ({...prev, ...updates}));
            alert(`Added data via AI for: ${Object.keys(updates).join(', ')}`);
        }
    }, [ai, headers]);

    const handleWrittenCommand = useCallback(async () => {
        if (!writtenCommand.trim() || !ai) return;
        await handleVoiceUpdate(writtenCommand);
        setWrittenCommand('');
    }, [ai, handleVoiceUpdate, writtenCommand]);

    useEffect(() => {
        if (voiceInputText && !isListening) {
            handleVoiceUpdate(voiceInputText);
        }
    }, [voiceInputText, isListening, handleVoiceUpdate]);

    const handleChange = (key: string, value: string) => {
        setNewRecord(prev => ({...prev, [key]: value}));
    };

    const handleSave = () => {
        onSave(newRecord);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New/Missing Voter">
            <div className="flex items-center gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Type command: 'set name to John...'"
                    value={writtenCommand}
                    onChange={(e) => setWrittenCommand(e.target.value)}
                    className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                />
                {ai && (
                    <button
                        type="button"
                        onClick={handleWrittenCommand}
                        className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-md transition-colors"
                        title="Parse command with AI"
                    >
                        <GeminiIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                {headers.map(header => (
                    <div key={header}>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{header}</label>
                        <input
                            type="text"
                            value={(newRecord[header] as string) || ''}
                            onChange={(e) => handleChange(header, e.target.value)}
                            className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center gap-4 pt-6 mt-4 border-t border-slate-700">
                <div className="flex items-center gap-4">
                     <button
                        type="button"
                        onClick={handleSave}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                        title="Save this new voter record"
                    >
                        Save Voter
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
                        title="Close this form without saving"
                    >
                        Cancel
                    </button>
                </div>
                 {hasRecognitionSupport && ai && (
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-400'} text-white`}
                        title={isListening ? 'Stop listening' : 'Fill form with your voice'}
                    >
                        <MicrophoneIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </Modal>
    );
};