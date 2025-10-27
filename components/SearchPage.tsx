
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { VoterRecord } from '../types';
import { Modal } from './Modal';
import { SearchIcon, HomeIcon, ChevronDownIcon, ChevronUpIcon, MicrophoneIcon, TrashIcon, EditIcon, GeminiIcon, PhoneIcon } from './icons';
import { useGemini } from '../hooks/useGemini';
import { GoogleGenAI } from '@google/genai';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseVoiceInputWithGemini } from '../utils/geminiParser';
import { VoterFormModal } from './VoterFormModal';

interface SearchPageProps {
    data: VoterRecord[];
    headers: string[];
    onGoHome: () => void;
    onDataUpdate: (data: VoterRecord[]) => void;
    totalRecords: number;
    apiKey?: string;
}

export const SearchPage: React.FC<SearchPageProps> = ({ data, headers, onGoHome, onDataUpdate, totalRecords, apiKey }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<VoterRecord[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<VoterRecord | null>(null);
    const [selectedSearchColumns, setSelectedSearchColumns] = useState<Set<string>>(new Set(headers));
    const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);

    const { text: voiceSearchText, isListening: isVoiceSearching, startListening: startVoiceSearch, stopListening: stopVoiceSearch, hasRecognitionSupport } = useSpeechRecognition();
    const ai = useGemini(apiKey);
    
    useEffect(() => {
        const processVoiceSearch = async () => {
            if (voiceSearchText && !isVoiceSearching && ai) {
                const prompt = `From the following voice command, extract only the main search query as a plain string. For example, from "search for John Smith" return "John Smith". From "find voters in ward 5", return "ward 5". The voice command is: "${voiceSearchText}"`;
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                    });
                    const extractedTerm = response.text.trim();
                    setSearchTerm(extractedTerm);
                } catch (error) {
                    console.error("Error processing voice search with Gemini:", error);
                    setSearchTerm(voiceSearchText); // Fallback to raw transcript
                }
            } else if (voiceSearchText && !isVoiceSearching) {
                 setSearchTerm(voiceSearchText); // Fallback if AI not available
            }
        };
        processVoiceSearch();
    }, [voiceSearchText, isVoiceSearching, ai]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        if (selectedSearchColumns.size === 0) {
            alert('Please select at least one column to search in.');
            return;
        }

        const lowercasedQuery = searchTerm.toLowerCase().trim();
        const results = data.filter(row => 
            Array.from(selectedSearchColumns).some((key: string) => 
                String(row[key] ?? '').toLowerCase().includes(lowercasedQuery)
            )
        );
        
        setSearchResults(results);
        setSelectedRecord(null);
        if (results.length > 0) {
            setIsModalOpen(true);
            if(results.length === 1) {
                setSelectedRecord(results[0]);
            }
        } else {
            alert('No results found.');
        }
    };
    
    const handleUpdateRecord = (updatedRecord: VoterRecord) => {
        const newData = data.map(row => row.__id === updatedRecord.__id ? updatedRecord : row);
        onDataUpdate(newData);

        setSearchResults(prevResults => prevResults.map(row => row.__id === updatedRecord.__id ? updatedRecord : row));
        if(selectedRecord && selectedRecord.__id === updatedRecord.__id) {
            setSelectedRecord(updatedRecord);
        }
    }

    const handleBulkDataChange = (newData: VoterRecord[]) => {
        onDataUpdate(newData);
        if (searchTerm.trim()) {
            const lowercasedQuery = searchTerm.toLowerCase().trim();
            const results = newData.filter(row => 
                Array.from(selectedSearchColumns).some((key: string) => 
                    String(row[key] ?? '').toLowerCase().includes(lowercasedQuery)
                )
            );
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const handleColumnSelectionChange = (header: string) => {
        setSelectedSearchColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(header)) {
                newSet.delete(header);
            } else {
                newSet.add(header);
            }
            return newSet;
        });
    };

    const handleSelectAllColumns = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedSearchColumns(new Set(headers));
        } else {
            setSelectedSearchColumns(new Set());
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-4xl font-bold text-yellow-400 font-copperplate-gothic tracking-wider">Search Voters</h1>
                 <button
                    onClick={onGoHome}
                    title="Return to the main menu"
                    className="flex items-center gap-2 bg-slate-800 text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-yellow-400/20"
                >
                    <HomeIcon className="w-5 h-5" />
                    <span className="font-semibold">Back to Home</span>
                </button>
            </header>
             <p className="text-center text-xl text-slate-300 -mt-4">
                Total Voters: <span className="font-bold text-yellow-300 font-teko text-2xl tracking-wider">{totalRecords.toLocaleString()}</span>
            </p>
            
            <div className="flex flex-col items-center justify-center py-8">
                <form onSubmit={handleSearch} className="w-full max-w-2xl">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-blue-500 rounded-full blur-md opacity-50 group-hover:opacity-75 group-focus-within:opacity-100 transition duration-300"></div>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, serial no., or any other detail..."
                            className="relative w-full bg-slate-900 border-2 border-slate-700 rounded-full py-3 pl-12 pr-14 text-base sm:text-lg sm:py-4 sm:pl-14 sm:pr-16 focus:outline-none focus:border-transparent focus:ring-0 text-white transition-all"
                        />
                        <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                            <SearchIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        </div>
                         {hasRecognitionSupport && (
                            <button
                                type="button"
                                onClick={isVoiceSearching ? stopVoiceSearch : startVoiceSearch}
                                className={`absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center focus:outline-none ${isVoiceSearching ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                                title={isVoiceSearching ? 'Stop listening' : !ai ? 'Please set your Gemini API Key in Settings' : 'Search with voice'}
                                disabled={!ai}
                            >
                                <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        )}
                    </div>

                    <div className="mt-4">
                        <button type="button" onClick={() => setShowColumnSelector(!showColumnSelector)} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300" title="Toggle search column options">
                            <span>Search Options</span>
                            {showColumnSelector ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                        </button>
                        {showColumnSelector && (
                             <div className="mt-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg animate-fadeIn">
                                <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.5s ease-out; }`}</style>
                                <h3 className="text-md font-semibold text-slate-300 mb-3">Search in columns:</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                                    <div className="flex items-center col-span-full sm:col-span-1">
                                        <input
                                            type="checkbox"
                                            id="select-all-columns"
                                            className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-500"
                                            checked={selectedSearchColumns.size === headers.length}
                                            onChange={handleSelectAllColumns}
                                        />
                                        <label htmlFor="select-all-columns" className="ml-2 font-bold text-slate-200">Select All</label>
                                    </div>
                                    {headers.map(header => (
                                        <div key={header} className="flex items-center truncate">
                                            <input
                                                type="checkbox"
                                                id={`col-${header}`}
                                                className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-500"
                                                checked={selectedSearchColumns.has(header)}
                                                onChange={() => handleColumnSelectionChange(header)}
                                            />
                                            <label htmlFor={`col-${header}`} title={header} className="ml-2 text-slate-300 truncate">{header}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                     <button 
                        type="submit" 
                        className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold py-3 px-6 rounded-full hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 text-lg flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-400/30 disabled:from-slate-600 disabled:to-slate-500 disabled:text-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                        disabled={selectedSearchColumns.size === 0}
                        title={selectedSearchColumns.size === 0 ? "Please select at least one column to search" : "Start Search"}
                     >
                        <SearchIcon className="w-6 h-6" />
                        <span>Search</span>
                    </button>
                </form>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Search Results">
                <SearchResultContent
                    data={data}
                    results={searchResults}
                    headers={headers}
                    selectedRecord={selectedRecord}
                    onSelectRecord={setSelectedRecord}
                    onBulkDataChange={handleBulkDataChange}
                    apiKey={apiKey}
                />
            </Modal>
        </div>
    );
};


interface SearchResultContentProps {
    data: VoterRecord[];
    results: VoterRecord[];
    headers: string[];
    selectedRecord: VoterRecord | null;
    onSelectRecord: (record: VoterRecord | null) => void;
    onBulkDataChange: (data: VoterRecord[]) => void;
    apiKey?: string;
}

const SearchResultContent: React.FC<SearchResultContentProps> = ({ data, results, headers, selectedRecord, onSelectRecord, onBulkDataChange, apiKey }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableRecord, setEditableRecord] = useState<VoterRecord | null>(null);
    const { text: voiceEditText, isListening: isVoiceEditing, startListening: startVoiceEdit, stopListening: stopVoiceEdit, hasRecognitionSupport } = useSpeechRecognition();
    const ai = useGemini(apiKey);
    
    const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [bulkUpdateConfig, setBulkUpdateConfig] = useState({ column: headers.find(h => h.toLowerCase() !== 'serial no') ?? headers[0] ?? '', value: '' });
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const [writtenCommand, setWrittenCommand] = useState('');

    useEffect(() => {
        if (selectedRecord) {
            setEditableRecord({ ...selectedRecord });
        } else {
            setEditableRecord(null);
            setIsEditing(false);
        }
    }, [selectedRecord]);

    useEffect(() => {
        setSelectedForBulk(new Set());
    }, [results]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numVisibleRows = results.length;
            const numSelectedVisibleRows = results.filter(r => selectedForBulk.has(r.__id)).length;
            selectAllCheckboxRef.current.indeterminate = numSelectedVisibleRows > 0 && numSelectedVisibleRows < numVisibleRows;
        }
    }, [selectedForBulk, results]);
    
    const handleVoiceUpdate = useCallback(async (transcript: string) => {
        if (!ai || !editableRecord) return;
        const updates = await parseVoiceInputWithGemini(transcript, headers, ai);
        if (Object.keys(updates).length > 0) {
            setEditableRecord(prev => ({ ...prev!, ...updates }));
            alert(`Updated fields via AI: ${Object.keys(updates).join(', ')}`);
        }
    }, [ai, editableRecord, headers]);

    const handleWrittenCommand = useCallback(async () => {
        if (!writtenCommand.trim() || !ai) return;
        await handleVoiceUpdate(writtenCommand);
        setWrittenCommand('');
    }, [ai, handleVoiceUpdate, writtenCommand]);
    
    useEffect(() => {
        if (voiceEditText && !isVoiceEditing) {
            handleVoiceUpdate(voiceEditText);
        }
    }, [voiceEditText, isVoiceEditing, handleVoiceUpdate]);
    
    const handleEditChange = (key: string, value: string) => {
        if(editableRecord) {
            setEditableRecord({...editableRecord, [key]: value});
        }
    }
    
    const handleSave = () => {
        if(editableRecord) {
            const newData = data.map(row => row.__id === editableRecord.__id ? editableRecord : row);
            onBulkDataChange(newData); // Use onBulkDataChange to update main data source
            setIsEditing(false);
        }
    }

    const handleSelectAllForBulk = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedForBulk(new Set(results.map(r => r.__id)));
        } else {
            setSelectedForBulk(new Set());
        }
    };

    const handleRowSelectForBulk = (rowId: string) => {
        setSelectedForBulk(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            } else {
                newSet.add(rowId);
            }
            return newSet;
        });
    };

    const handleBulkDeleteClick = () => {
        if (selectedForBulk.size > 0) {
            setIsDeleteConfirmOpen(true);
        }
    };

    const confirmBulkDelete = () => {
        const newData = data.filter(row => !selectedForBulk.has(row.__id));
        onBulkDataChange(newData);
        setSelectedForBulk(new Set());
        setIsDeleteConfirmOpen(false);
    };

    const applyBulkUpdate = () => {
        if (!bulkUpdateConfig.column || selectedForBulk.size === 0) return;
        const newData = data.map(row => {
            if (selectedForBulk.has(row.__id)) {
                return { ...row, [bulkUpdateConfig.column]: bulkUpdateConfig.value };
            }
            return row;
        });
        onBulkDataChange(newData);
        setIsBulkUpdateOpen(false);
        setSelectedForBulk(new Set());
    };
    
    const handleCall = (phoneNumber: any) => {
        if (phoneNumber) {
            const sanitizedNumber = String(phoneNumber).replace(/[^0-9+]/g, '');
            if (sanitizedNumber) {
                window.location.href = `tel:${sanitizedNumber}`;
            } else {
                alert('Invalid contact number format.');
            }
        } else {
            alert('No contact number available for this voter.');
        }
    };

    if (selectedRecord && editableRecord) {
        return (
            <div>
                <button onClick={() => { onSelectRecord(null); setIsEditing(false); }} title="Go back to the search results list" className="text-yellow-400 hover:underline mb-4">&larr; Back to list</button>
                {isEditing && (
                    <div className="flex items-center gap-2 my-4">
                        <input
                            type="text"
                            placeholder="Type command: 'change name to...'"
                            value={writtenCommand}
                            onChange={(e) => setWrittenCommand(e.target.value)}
                            className="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        />
                        <button
                            type="button"
                            onClick={handleWrittenCommand}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-md transition-colors"
                            title="Parse command with AI"
                            disabled={!ai}
                        >
                            <GeminiIcon className="w-6 h-6" />
                        </button>
                    </div>
                )}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {headers.map(header => {
                        const isContactField = header.toLowerCase() === 'contact no';
                        return (
                            <div key={header} className="py-2 border-b border-slate-700 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
                                <strong className="block text-sm font-medium text-slate-300 sm:col-span-1">{header}:</strong>
                                <div className="mt-1 sm:mt-0 sm:col-span-2">
                                    {isEditing && !header.toLowerCase().includes('serial no') ? (
                                        <input
                                          type="text"
                                          value={editableRecord[header] || ''}
                                          onChange={(e) => handleEditChange(header, e.target.value)}
                                          className="block w-full bg-slate-800 border border-slate-600 rounded p-1 text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span className="text-white break-words">{selectedRecord[header]}</span>
                                            {isContactField && selectedRecord[header] && (
                                                <button
                                                    onClick={() => handleCall(selectedRecord[header])}
                                                    className="ml-4 p-2 text-green-400 hover:text-green-300 rounded-full hover:bg-green-800/50 transition-colors"
                                                    title={`Call ${selectedRecord[header]}`}
                                                >
                                                    <PhoneIcon className="w-5 h-5"/>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-6 flex gap-4 items-center">
                    {isEditing ? (
                        <>
                           <button onClick={handleSave} title="Save all changes made to this record" className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors">Save Changes</button>
                           <button onClick={() => setIsEditing(false)} title="Discard changes and exit edit mode" className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        </>
                    ) : (
                         <button onClick={() => setIsEditing(true)} title="Enable editing for this record" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors">Edit this Record</button>
                    )}
                     {isEditing && hasRecognitionSupport && (
                        <button
                            onClick={isVoiceEditing ? stopVoiceEdit : startVoiceEdit}
                            className={`p-2 rounded-full transition-colors ${isVoiceEditing ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-400'} text-white`}
                            title={isVoiceEditing ? 'Stop listening' : 'Update fields with your voice'}
                            disabled={!ai}
                        >
                            <MicrophoneIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-h-[70vh] flex flex-col">
            <p className="text-slate-300 mb-4 flex-shrink-0">{results.length} matching record{results.length !== 1 && 's'} found.</p>
            
            {results.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
                    <button
                        onClick={handleBulkDeleteClick}
                        disabled={selectedForBulk.size === 0}
                        title="Delete all selected records from the list"
                        className="flex items-center gap-2 bg-red-800 text-red-200 border border-red-500/50 px-3 py-2 rounded-md hover:bg-red-600 hover:text-white transition-colors duration-200 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        <TrashIcon className="w-5 h-5" />
                        <span>Delete Selected ({selectedForBulk.size})</span>
                    </button>
                    <button
                        onClick={() => setIsBulkUpdateOpen(true)}
                        disabled={selectedForBulk.size === 0}
                        title="Update a field for all selected records at once"
                        className="flex items-center gap-2 bg-blue-800 text-blue-200 border border-blue-500/50 px-3 py-2 rounded-md hover:bg-blue-600 hover:text-white transition-colors duration-200 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        <EditIcon className="w-5 h-5" />
                        <span>Update Selected ({selectedForBulk.size})</span>
                    </button>
                </div>
            )}

            <div className="overflow-y-auto flex-grow border border-slate-700 rounded-lg">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-800 sticky top-0">
                        <tr>
                            <th scope="col" className="p-2 md:p-4">
                                <input
                                    ref={selectAllCheckboxRef}
                                    type="checkbox"
                                    className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-500"
                                    checked={results.length > 0 && selectedForBulk.size === results.length}
                                    onChange={handleSelectAllForBulk}
                                />
                            </th>
                            <th scope="col" className="px-2 md:px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Voter Info</th>
                            <th scope="col" className="px-2 md:px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Serial No.</th>
                        </tr>
                    </thead>
                    <tbody className="bg-slate-900 divide-y divide-slate-800">
                        {results.map(record => {
                            const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
                            const displayName = (nameHeader && record[nameHeader]) || (headers.length > 1 && record[headers[1]]) || 'N/A';
                            return (
                                <tr key={record.__id} className={selectedForBulk.has(record.__id) ? 'bg-yellow-900/40' : 'hover:bg-blue-900/50'}>
                                    <td className="p-2 md:p-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-500"
                                            checked={selectedForBulk.has(record.__id)}
                                            onChange={() => handleRowSelectForBulk(record.__id)}
                                        />
                                    </td>
                                    <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => onSelectRecord(record)} className="text-left w-full" title="View/Edit full details">
                                            <p className="font-semibold text-yellow-400 hover:underline">{String(displayName)}</p>
                                        </button>
                                    </td>
                                    <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {record[headers[0]] || 'N/A'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isBulkUpdateOpen} onClose={() => setIsBulkUpdateOpen(false)} title={`Bulk Update ${selectedForBulk.size} Rows`}>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="batch-column" className="block text-sm font-medium text-slate-300 mb-1">
                            Column to Update
                        </label>
                        <select
                            id="batch-column"
                            value={bulkUpdateConfig.column}
                            onChange={(e) => setBulkUpdateConfig({ ...bulkUpdateConfig, column: e.target.value })}
                             className="block w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        >
                            {headers.filter(h => !h.toLowerCase().includes('serial no')).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="batch-value" className="block text-sm font-medium text-slate-300 mb-1">
                            New Value
                        </label>
                        <input
                            type="text"
                            id="batch-value"
                            value={bulkUpdateConfig.value}
                            onChange={(e) => setBulkUpdateConfig({ ...bulkUpdateConfig, value: e.target.value })}
                            className="block w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={() => setIsBulkUpdateOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        <button type="button" onClick={applyBulkUpdate} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors">Apply Update</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
                <div className="space-y-4">
                    <p className="text-slate-300">
                        Are you sure you want to delete the selected {selectedForBulk.size} row{selectedForBulk.size > 1 ? 's' : ''}? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        <button type="button" onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors">Confirm Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}