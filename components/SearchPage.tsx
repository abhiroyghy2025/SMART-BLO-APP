import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { VoterRecord } from '../types';
import { Modal } from './Modal';
import { SearchIcon, HomeIcon, ChevronDownIcon, ChevronUpIcon, MicrophoneIcon, PlusIcon, TrashIcon, EditIcon } from './icons';
import { useGemini } from '../hooks/useGemini';
import { GoogleGenAI, Type } from '@google/genai';

// --- Speech Recognition Hook ---
interface SpeechRecognitionHook {
    text: string;
    isListening: boolean;
    startListening: () => void;
    stopListening: () => void;
    hasRecognitionSupport: boolean;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const useSpeechRecognition = (): SpeechRecognitionHook => {
    const [text, setText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (!SpeechRecognition) {
            console.error("Speech Recognition API not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setText(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                console.error('Speech recognition error', event.error);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
             setIsListening(false);
        };
        
        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setText('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    return {
        text,
        isListening,
        startListening,
        stopListening,
        hasRecognitionSupport: !!SpeechRecognition,
    };
};
// --- End Speech Recognition Hook ---

const parseVoiceInputWithGemini = async (transcript: string, headers: string[], ai: GoogleGenAI): Promise<Partial<VoterRecord>> => {
    if (!transcript.trim() || headers.length === 0) {
        return {};
    }

    const properties: { [key: string]: { type: Type.STRING, description: string } } = {};
    headers.forEach(header => {
        if (header.toLowerCase() !== 'serial no in the voter list') {
            properties[header] = {
                type: Type.STRING,
                description: `The value for the '${header}' field.`
            };
        }
    });

    const schema = {
        type: Type.OBJECT,
        properties: properties,
    };
    
    const prompt = `Analyze the following text and extract the information into a JSON object matching the provided schema. The user is filling out a form with the following fields: ${headers.join(', ')}. The text is: "${transcript}". Handle natural language like "set the name to..." or "the age is...". Only return fields mentioned in the text.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        // FIX: Access the generated text directly from the `text` property of the response object.
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as Partial<VoterRecord>;

    } catch (error) {
        console.error("Error parsing voice input with Gemini:", error);
        return {};
    }
};


interface SearchPageProps {
    data: VoterRecord[];
    headers: string[];
    onGoHome: () => void;
    onDataUpdate: (data: VoterRecord[]) => void;
    totalRecords: number;
}

export const SearchPage: React.FC<SearchPageProps> = ({ data, headers, onGoHome, onDataUpdate, totalRecords }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<VoterRecord[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<VoterRecord | null>(null);
    const [selectedSearchColumns, setSelectedSearchColumns] = useState<Set<string>>(new Set(headers));
    const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
    const [isAddVoterModalOpen, setIsAddVoterModalOpen] = useState(false);

    const { text: voiceSearchText, isListening: isVoiceSearching, startListening: startVoiceSearch, stopListening: stopVoiceSearch, hasRecognitionSupport } = useSpeechRecognition();
    
    useEffect(() => {
        if (voiceSearchText) {
            setSearchTerm(voiceSearchText);
        }
    }, [voiceSearchText]);

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
            Array.from(selectedSearchColumns).some(key => 
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
                Array.from(selectedSearchColumns).some(key => 
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

    const handleSaveNewVoter = (newRecordData: Partial<VoterRecord>) => {
        const serialHeader = 'SERIAL NO IN THE VOTER LIST';
        const lastSerial = Math.max(0, ...data.map(r => typeof r[serialHeader] === 'number' ? r[serialHeader] : 0));
        
        const newVoter: VoterRecord = {
            __id: `row_new_${Date.now()}`,
            ...newRecordData,
            [serialHeader]: lastSerial + 1,
        };

        headers.forEach(h => {
            if (!(h in newVoter)) {
                // FIX: Ensure properties for all headers exist on the new voter record.
                // The VoterRecord type has an index signature that allows this assignment.
                newVoter[h] = '';
            }
        });

        onDataUpdate([...data, newVoter]);
        setIsAddVoterModalOpen(false);
        alert('New voter added successfully!');
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-yellow-400">Search Voters</h1>
                 <button
                    onClick={onGoHome}
                    className="flex items-center gap-2 bg-gray-800 text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-md hover:bg-yellow-400 hover:text-black transition-colors duration-200"
                >
                    <HomeIcon className="w-5 h-5" />
                    <span>Back to Home</span>
                </button>
            </header>
             <p className="text-center text-lg text-gray-400 -mt-4">
                Total Number of Voters: <span className="font-bold text-yellow-300">{totalRecords.toLocaleString()}</span>
            </p>
            
            <div className="flex flex-col items-center justify-center py-8">
                <form onSubmit={handleSearch} className="w-full max-w-2xl">
                    <div className="relative">
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, serial no., or any other detail..."
                            className="w-full bg-gray-900 border-2 border-yellow-500/60 rounded-full py-4 pl-14 pr-16 text-lg focus:outline-none focus:bg-gray-800 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-white transition-all shadow-md shadow-yellow-500/10"
                        />
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <SearchIcon className="w-6 h-6 text-gray-400" />
                        </div>
                         {hasRecognitionSupport && (
                            <button
                                type="button"
                                onClick={isVoiceSearching ? stopVoiceSearch : startVoiceSearch}
                                className={`absolute inset-y-0 right-0 pr-5 flex items-center focus:outline-none ${isVoiceSearching ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                                title={isVoiceSearching ? 'Stop listening' : 'Search with voice'}
                            >
                                <MicrophoneIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    <div className="mt-4">
                        <button type="button" onClick={() => setShowColumnSelector(!showColumnSelector)} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
                            <span>Search Options</span>
                            {showColumnSelector ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                        </button>
                        {showColumnSelector && (
                             <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg animate-fadeIn">
                                <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.5s ease-out; }`}</style>
                                <h3 className="text-md font-semibold text-gray-300 mb-3">Search in columns:</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                                    <div className="flex items-center col-span-full sm:col-span-1">
                                        <input
                                            type="checkbox"
                                            id="select-all-columns"
                                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-400"
                                            checked={selectedSearchColumns.size === headers.length}
                                            onChange={handleSelectAllColumns}
                                        />
                                        <label htmlFor="select-all-columns" className="ml-2 font-bold text-gray-200">Select All</label>
                                    </div>
                                    {headers.map(header => (
                                        <div key={header} className="flex items-center truncate">
                                            <input
                                                type="checkbox"
                                                id={`col-${header}`}
                                                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-400"
                                                checked={selectedSearchColumns.has(header)}
                                                onChange={() => handleColumnSelectionChange(header)}
                                            />
                                            <label htmlFor={`col-${header}`} title={header} className="ml-2 text-gray-300 truncate">{header}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                     <button 
                        type="submit" 
                        className="w-full mt-4 bg-yellow-500 text-black font-bold py-3 px-6 rounded-full hover:bg-yellow-400 transition-colors text-lg flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-400/30 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none"
                        disabled={selectedSearchColumns.size === 0}
                        title={selectedSearchColumns.size === 0 ? "Please select at least one column to search" : ""}
                     >
                        <SearchIcon className="w-6 h-6" />
                        <span>Search</span>
                    </button>
                </form>

                 <button 
                    onClick={() => setIsAddVoterModalOpen(true)}
                    className="w-full max-w-2xl mt-4 bg-green-600 text-white font-bold py-3 px-6 rounded-full hover:bg-green-500 transition-colors text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-400/30"
                 >
                    <PlusIcon className="w-6 h-6" />
                    <span>Add New/Missing Voter</span>
                </button>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Search Results">
                <SearchResultContent
                    data={data}
                    results={searchResults}
                    headers={headers}
                    selectedRecord={selectedRecord}
                    onSelectRecord={setSelectedRecord}
                    onUpdateRecord={handleUpdateRecord}
                    onBulkDataChange={handleBulkDataChange}
                />
            </Modal>
            
            <VoterFormModal 
                isOpen={isAddVoterModalOpen}
                onClose={() => setIsAddVoterModalOpen(false)}
                onSave={handleSaveNewVoter}
                headers={headers.filter(h => h !== 'SERIAL NO IN THE VOTER LIST')}
            />
        </div>
    );
};


interface SearchResultContentProps {
    data: VoterRecord[];
    results: VoterRecord[];
    headers: string[];
    selectedRecord: VoterRecord | null;
    onSelectRecord: (record: VoterRecord | null) => void;
    onUpdateRecord: (record: VoterRecord) => void;
    onBulkDataChange: (data: VoterRecord[]) => void;
}

const SearchResultContent: React.FC<SearchResultContentProps> = ({ data, results, headers, selectedRecord, onSelectRecord, onUpdateRecord, onBulkDataChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableRecord, setEditableRecord] = useState<VoterRecord | null>(null);
    const { text: voiceEditText, isListening: isVoiceEditing, startListening: startVoiceEdit, stopListening: stopVoiceEdit, hasRecognitionSupport } = useSpeechRecognition();
    const ai = useGemini();
    
    const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
    const [bulkUpdateConfig, setBulkUpdateConfig] = useState({ column: headers.filter(h => h !== 'SERIAL NO IN THE VOTER LIST')[0] ?? '', value: '' });
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

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
            alert(`Updated fields via voice: ${Object.keys(updates).join(', ')}`);
        }
    }, [ai, editableRecord, headers]);
    
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
            onUpdateRecord(editableRecord);
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
    
    if (selectedRecord && editableRecord) {
        return (
            <div>
                <button onClick={() => { onSelectRecord(null); setIsEditing(false); }} className="text-yellow-400 hover:underline mb-4">&larr; Back to list</button>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {headers.map(header => (
                        <div key={header} className="grid grid-cols-3 gap-4 border-b border-gray-700 py-2">
                            <strong className="text-gray-400 col-span-1">{header}:</strong>
                            {isEditing && header !== 'SERIAL NO IN THE VOTER LIST' ? (
                                <input
                                  type="text"
                                  value={editableRecord[header] || ''}
                                  onChange={(e) => handleEditChange(header, e.target.value)}
                                  className="col-span-2 bg-gray-800 border border-gray-600 rounded p-1 text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                />
                            ) : (
                                <span className="text-white col-span-2">{selectedRecord[header]}</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex gap-4 items-center">
                    {isEditing ? (
                        <>
                           <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors">Save Changes</button>
                           <button onClick={() => setIsEditing(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        </>
                    ) : (
                         <button onClick={() => setIsEditing(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors">Edit this Record</button>
                    )}
                     {isEditing && hasRecognitionSupport && (
                        <button
                            onClick={isVoiceEditing ? stopVoiceEdit : startVoiceEdit}
                            className={`p-2 rounded-full transition-colors ${isVoiceEditing ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-400'} text-white`}
                            title={isVoiceEditing ? 'Stop listening' : 'Update fields with voice'}
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
            <p className="text-gray-400 mb-4 flex-shrink-0">{results.length} matching record{results.length !== 1 && 's'} found.</p>
            
            {results.length > 0 && (
                <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                    <button
                        onClick={handleBulkDeleteClick}
                        disabled={selectedForBulk.size === 0}
                        className="flex items-center gap-2 bg-red-800 text-red-200 border border-red-500/50 px-3 py-2 rounded-md hover:bg-red-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-400/50 disabled:border-gray-500/50"
                    >
                        <TrashIcon className="w-5 h-5" />
                        <span>Delete Selected ({selectedForBulk.size})</span>
                    </button>
                    <button
                        onClick={() => setIsBulkUpdateOpen(true)}
                        disabled={selectedForBulk.size === 0}
                        className="flex items-center gap-2 bg-blue-800 text-blue-200 border border-blue-500/50 px-3 py-2 rounded-md hover:bg-blue-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-400/50 disabled:border-gray-500/50"
                    >
                        <EditIcon className="w-5 h-5" />
                        <span>Update Selected ({selectedForBulk.size})</span>
                    </button>
                </div>
            )}

            <div className="overflow-y-auto flex-grow border border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800 sticky top-0">
                        <tr>
                            <th scope="col" className="p-4">
                                <input
                                    ref={selectAllCheckboxRef}
                                    type="checkbox"
                                    className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-400"
                                    checked={results.length > 0 && selectedForBulk.size === results.length}
                                    onChange={handleSelectAllForBulk}
                                />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Voter Info</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Serial No.</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-800">
                        {results.map(record => {
                            const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
                            const displayName = (nameHeader && record[nameHeader]) || (headers.length > 1 && record[headers[1]]) || 'N/A';
                            return (
                                <tr key={record.__id} className={selectedForBulk.has(record.__id) ? 'bg-yellow-900/40' : 'hover:bg-gray-700/50'}>
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-400"
                                            checked={selectedForBulk.has(record.__id)}
                                            onChange={() => handleRowSelectForBulk(record.__id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => onSelectRecord(record)} className="text-left w-full">
                                            <p className="font-semibold text-yellow-400 hover:underline">{String(displayName)}</p>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
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
                        <label htmlFor="batch-column" className="block text-sm font-medium text-gray-300 mb-1">
                            Column to Update
                        </label>
                        <select
                            id="batch-column"
                            value={bulkUpdateConfig.column}
                            onChange={(e) => setBulkUpdateConfig({ ...bulkUpdateConfig, column: e.target.value })}
                             className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        >
                            {headers.filter(h => h !== 'SERIAL NO IN THE VOTER LIST').map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="batch-value" className="block text-sm font-medium text-gray-300 mb-1">
                            New Value
                        </label>
                        <input
                            type="text"
                            id="batch-value"
                            value={bulkUpdateConfig.value}
                            onChange={(e) => setBulkUpdateConfig({ ...bulkUpdateConfig, value: e.target.value })}
                            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={() => setIsBulkUpdateOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        <button type="button" onClick={applyBulkUpdate} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors">Apply Update</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Deletion">
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Are you sure you want to delete the selected {selectedForBulk.size} row{selectedForBulk.size > 1 ? 's' : ''}? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        <button type="button" onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors">Confirm Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

interface VoterFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Partial<VoterRecord>) => void;
    headers: string[];
}

const VoterFormModal: React.FC<VoterFormModalProps> = ({ isOpen, onClose, onSave, headers }) => {
    const [newRecord, setNewRecord] = useState<Partial<VoterRecord>>({});
    const { text: voiceInputText, isListening, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition();
    const ai = useGemini();

    useEffect(() => {
        if (!isOpen) {
            setNewRecord({});
        }
    }, [isOpen]);

    const handleVoiceUpdate = useCallback(async (transcript: string) => {
        if (!ai) return;
        const updates = await parseVoiceInputWithGemini(transcript, headers, ai);
        if (Object.keys(updates).length > 0) {
            setNewRecord(prev => ({...prev, ...updates}));
            alert(`Added data via voice for: ${Object.keys(updates).join(', ')}`);
        }
    }, [ai, headers]);

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
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {headers.map(header => (
                    <div key={header}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{header}</label>
                        <input
                            type="text"
                            value={(newRecord[header] as string) || ''}
                            onChange={(e) => handleChange(header, e.target.value)}
                            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center gap-4 pt-6 mt-4 border-t border-gray-700">
                <div className="flex items-center gap-4">
                     <button
                        type="button"
                        onClick={handleSave}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                    >
                        Save Voter
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Cancel
                    </button>
                </div>
                 {hasRecognitionSupport && ai && (
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-400'} text-white`}
                        title={isListening ? 'Stop listening' : 'Fill form with voice'}
                    >
                        <MicrophoneIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </Modal>
    );
};