import React, { useState } from 'react';
import type { VoterRecord } from '../types';
import { Modal } from './Modal';
import { SearchIcon, HomeIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

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
        // FIX: A row value can be of any type (e.g., a number). It must be converted to a string
        // before calling .toLowerCase() to prevent a runtime error.
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
            
            <div className="flex justify-center py-8">
                <form onSubmit={handleSearch} className="w-full max-w-2xl">
                    <div className="relative">
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name, serial no., or any other detail..."
                            className="w-full bg-gray-900 border-2 border-yellow-500/60 rounded-full py-4 pl-14 pr-6 text-lg focus:outline-none focus:bg-gray-800 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-white transition-all shadow-md shadow-yellow-500/10"
                        />
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <SearchIcon className="w-6 h-6 text-gray-400" />
                        </div>
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
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Search Results">
                <SearchResultContent
                    results={searchResults}
                    headers={headers}
                    selectedRecord={selectedRecord}
                    onSelectRecord={setSelectedRecord}
                    onUpdateRecord={handleUpdateRecord}
                />
            </Modal>
        </div>
    );
};


interface SearchResultContentProps {
    results: VoterRecord[];
    headers: string[];
    selectedRecord: VoterRecord | null;
    onSelectRecord: (record: VoterRecord | null) => void;
    onUpdateRecord: (record: VoterRecord) => void;
}

const SearchResultContent: React.FC<SearchResultContentProps> = ({ results, headers, selectedRecord, onSelectRecord, onUpdateRecord }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableRecord, setEditableRecord] = useState<VoterRecord | null>(null);

    React.useEffect(() => {
        if (selectedRecord) {
            setEditableRecord({ ...selectedRecord });
        } else {
            setEditableRecord(null);
            setIsEditing(false);
        }
    }, [selectedRecord]);
    
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
    
    if (selectedRecord && editableRecord) {
        return (
            <div>
                <button onClick={() => onSelectRecord(null)} className="text-yellow-400 hover:underline mb-4">&larr; Back to list</button>
                <div className="space-y-2">
                    {headers.map(header => (
                        <div key={header} className="grid grid-cols-3 gap-4 border-b border-gray-700 py-2">
                            <strong className="text-gray-400 col-span-1">{header}:</strong>
                            {isEditing && header !== 'SERIAL NO IN THE VOTER LIST' ? (
                                <input
                                  type="text"
                                  value={editableRecord[header] || ''}
                                  onChange={(e) => handleEditChange(header, e.target.value)}
                                  className="col-span-2 bg-gray-700 border border-gray-600 rounded p-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                />
                            ) : (
                                <span className="text-white col-span-2">{selectedRecord[header]}</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex gap-4">
                    {isEditing ? (
                        <>
                           <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors">Save Changes</button>
                           <button onClick={() => setIsEditing(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        </>
                    ) : (
                         <button onClick={() => setIsEditing(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors">Edit this Record</button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-h-[60vh] overflow-y-auto">
            <p className="text-gray-400 mb-4">{results.length} matching records found.</p>
            <ul className="space-y-2">
                {results.map(record => (
                    <li key={record.__id}>
                        <button
                            onClick={() => onSelectRecord(record)}
                            className="w-full text-left bg-gray-800 hover:bg-gray-700 p-3 rounded-md transition-colors"
                        >
                            <p className="font-semibold text-yellow-400">{record[headers[1]] || 'N/A'}</p>
                            <p className="text-sm text-gray-300">Serial No: {record[headers[0]] || 'N/A'}</p>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}