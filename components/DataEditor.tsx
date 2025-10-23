import React, { useState, useMemo, useCallback } from 'react';
import type { VoterRecord } from '../types';
import { DataTable } from './DataTable';
import { Modal } from './Modal';
import { DownloadIcon, TrashIcon, CopyIcon, HighlightIcon, ResetIcon, HomeIcon, PlusIcon, EditIcon, ColumnsIcon, UndoIcon, RedoIcon, GeminiIcon } from './icons';
import { useGemini } from '../hooks/useGemini';

declare const XLSX: any;

interface DataEditorProps {
    initialData: VoterRecord[];
    initialHeaders: string[];
    onReset: () => void;
    fileName: string;
    onGoHome: () => void;
}

const SERIAL_NUMBER_HEADER = 'SERIAL NO IN THE VOTER LIST';

type EditorState = {
    data: VoterRecord[];
    headers: string[];
};

const useHistory = (initialState: EditorState) => {
    const [history, setHistory] = useState<EditorState[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((value: EditorState | ((prevState: EditorState) => EditorState)) => {
        const newState = typeof value === 'function' ? (value as (prevState: EditorState) => EditorState)(history[currentIndex]) : value;
        if (JSON.stringify(newState) === JSON.stringify(history[currentIndex])) {
            return;
        }
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
    }, [history, currentIndex]);
    
    const undo = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    }, [currentIndex, history.length]);

    return {
        state: history[currentIndex],
        setState,
        undo,
        redo,
        canUndo: currentIndex > 0,
        canRedo: currentIndex < history.length - 1,
    };
};

export const DataEditor: React.FC<DataEditorProps> = ({ initialData, initialHeaders, onReset, fileName, onGoHome }) => {
    const { state, setState, undo, redo, canUndo, canRedo } = useHistory({ data: initialData, headers: initialHeaders });
    const { data, headers } = state;
    const ai = useGemini();
    
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [addColumnError, setAddColumnError] = useState<string | null>(null);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
    const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
    const [batchUpdateConfig, setBatchUpdateConfig] = useState({ column: headers.filter(h => h !== SERIAL_NUMBER_HEADER)[0] ?? '', value: '' });
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyzeSelection = async () => {
        if (selectedRows.size === 0 || !ai) return;
    
        setIsAnalyzing(true);
        setAnalysisResult('');
        setIsAnalysisModalOpen(true);
    
        const selectedData = data.filter(row => selectedRows.has(row.__id));
        const cleanData = selectedData.map(({ __id, __highlighted, ...rest }) => rest);
        
        const dataString = JSON.stringify(cleanData, null, 2);
    
        const prompt = `You are a helpful data analyst. Analyze the following JSON data which contains a list of voter records. Provide a concise summary of the key insights. Focus on:
    1.  Demographic summary (e.g., age distribution if available, gender distribution).
    2.  Any potential data quality issues like missing values or inconsistencies.
    3.  Any interesting patterns or groupings you observe.
    Do not just repeat the data. Provide actionable insights. Format your response using markdown.
    
    Data:
    ${dataString}`;
    
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });
            setAnalysisResult(response.text);
        } catch (error) {
            console.error("Error analyzing data with Gemini:", error);
            setAnalysisResult("An error occurred while analyzing the data. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const resequenceData = (dataToSequence: VoterRecord[]) => {
        return dataToSequence.map((row, index) => ({
            ...row,
            [SERIAL_NUMBER_HEADER]: index + 1,
        }));
    };

    const deleteSelectedRows = () => {
        if (selectedRows.size > 0) {
            setIsDeleteConfirmModalOpen(true);
        }
    };

    const handleConfirmDelete = () => {
        setState(currentState => {
            const newData = currentState.data.filter(row => !selectedRows.has(row.__id));
            return { ...currentState, data: resequenceData(newData) };
        });
        setSelectedRows(new Set());
        setIsDeleteConfirmModalOpen(false);
    };

    const duplicateSelectedRows = () => {
        if (selectedRows.size === 0) return;
        setState(currentState => {
            const newData = [...currentState.data];
            const selectedIndices = Array.from(selectedRows).map(id => newData.findIndex(r => r.__id === id));
            const lastSelectedIndex = Math.max(...selectedIndices);
    
            const rowsToDuplicate = newData.filter(row => selectedRows.has(row.__id));
            const duplicatedRows = rowsToDuplicate.map((row, index) => {
                const newRow = {...row};
                delete newRow[SERIAL_NUMBER_HEADER];
                return {
                    ...newRow,
                    __id: `row_dup_${Date.now()}_${index}`
                };
            });
    
            newData.splice(lastSelectedIndex + 1, 0, ...duplicatedRows);
            return { ...currentState, data: resequenceData(newData) };
        });
        setSelectedRows(new Set());
    };
    
    const highlightSelectedRows = () => {
        if (selectedRows.size === 0) return;
        setState(currentState => ({
            ...currentState,
            data: currentState.data.map(row => 
                selectedRows.has(row.__id) 
                ? { ...row, __highlighted: !row.__highlighted } 
                : row
            )
        }));
        setSelectedRows(new Set());
    };

    const handleAddNewRow = () => {
        setState(currentState => {
            const newRow: VoterRecord = { __id: `row_new_${Date.now()}` };
            currentState.headers.forEach(h => {
                if (h !== SERIAL_NUMBER_HEADER) newRow[h] = '';
            });
            const newData = [...currentState.data, newRow];
            return { ...currentState, data: resequenceData(newData) };
        });
    };

    const downloadExcel = useCallback(() => {
        const dataToExport = data.map(row => {
            const newRow: Record<string, any> = {};
            headers.forEach(header => {
                newRow[header] = row[header];
            });
            return newRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "VotersData");
        XLSX.writeFile(workbook, fileName);
    }, [data, headers, fileName]);
    
    const handleAddNewColumn = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newColumnName.trim();
        if (!trimmedName) {
            setAddColumnError('Column name cannot be empty.');
            return;
        }
        if (headers.some(h => h.toLowerCase() === trimmedName.toLowerCase())) {
            setAddColumnError('A column with this name already exists.');
            return;
        }

        setState(currentState => {
            const newHeaders = [...currentState.headers, trimmedName];
            const newData = currentState.data.map(row => ({
                ...row,
                [trimmedName]: ''
            }));
            return { headers: newHeaders, data: newData };
        });

        setIsAddColumnModalOpen(false);
        setNewColumnName('');
        setAddColumnError(null);
    };

    const openAddColumnModal = () => {
        setNewColumnName('');
        setAddColumnError(null);
        setIsAddColumnModalOpen(true);
    };

    const handleColumnVisibilityToggle = (header: string) => {
        setHiddenColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(header)) {
                newSet.delete(header);
            } else {
                newSet.add(header);
            }
            return newSet;
        });
    };

    const handleBatchUpdate = () => {
        if (!batchUpdateConfig.column || selectedRows.size === 0) return;
        setState(currentState => ({
            ...currentState,
            data: currentState.data.map(row => {
                if (selectedRows.has(row.__id)) {
                    return { ...row, [batchUpdateConfig.column]: batchUpdateConfig.value };
                }
                return row;
            })
        }));
        setIsBatchUpdateOpen(false);
        setSelectedRows(new Set());
    };

    const onCellChange = useCallback((rowId: string, header: string, value: any) => {
        setState(currentState => ({
            ...currentState,
            data: currentState.data.map(row => (row.__id === rowId) ? { ...row, [header]: value } : row)
        }));
    }, [setState]);

    const onColumnDelete = useCallback((headerToDelete: string) => {
        setState(currentState => {
            const newHeaders = currentState.headers.filter(h => h !== headerToDelete);
            const newData = currentState.data.map(row => {
                const { [headerToDelete]: _, ...rest } = row;
                return rest as VoterRecord;
            });
            return { headers: newHeaders, data: newData };
        });
    }, [setState]);

    const onColumnRename = useCallback((oldName: string, newName: string) => {
        setState(currentState => {
            const newHeaders = currentState.headers.map(h => (h === oldName ? newName : h));
            const newData = currentState.data.map(row => {
                const { [oldName]: value, ...rest } = row;
                return { ...rest, [newName]: value };
            });
            return { headers: newHeaders, data: newData };
        });
    }, [setState]);

    const onColumnReorder = useCallback((newHeaders: string[]) => {
        setState(currentState => ({ ...currentState, headers: newHeaders }));
    }, [setState]);

    const actionButtons = useMemo(() => [
        { label: 'Undo', icon: UndoIcon, action: undo, disabled: !canUndo },
        { label: 'Redo', icon: RedoIcon, action: redo, disabled: !canRedo },
        { label: 'Add Row', icon: PlusIcon, action: handleAddNewRow, disabled: false },
        { label: 'Add Column', icon: PlusIcon, action: openAddColumnModal, disabled: false },
        { label: 'Delete Selected', icon: TrashIcon, action: deleteSelectedRows, disabled: selectedRows.size === 0 },
        { label: 'Duplicate Selected', icon: CopyIcon, action: duplicateSelectedRows, disabled: selectedRows.size === 0 },
        { label: 'Highlight Selected', icon: HighlightIcon, action: highlightSelectedRows, disabled: selectedRows.size === 0 },
        { label: 'Batch Update', icon: EditIcon, action: () => setIsBatchUpdateOpen(true), disabled: selectedRows.size === 0 },
        { label: 'Analyze with AI', icon: GeminiIcon, action: handleAnalyzeSelection, disabled: selectedRows.size === 0 || !ai },
        { label: 'Manage Columns', icon: ColumnsIcon, action: () => setIsColumnManagerOpen(true), disabled: false },
        { label: 'Download Excel', icon: DownloadIcon, action: downloadExcel, disabled: false },
        { label: 'Upload New File', icon: ResetIcon, action: onReset, disabled: false },
    ], [selectedRows.size, downloadExcel, onReset, headers, data, undo, redo, canUndo, canRedo, ai]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-yellow-400">Data Editor</h1>
                <button
                    onClick={onGoHome}
                    className="flex items-center gap-2 bg-gray-800 text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-md hover:bg-yellow-400 hover:text-black transition-colors duration-200"
                >
                    <HomeIcon className="w-5 h-5" />
                    <span>Back to Home</span>
                </button>
            </header>

            <p className="text-sm text-gray-400 italic">Tip: Double-click a cell to edit. Right-click a column header for options. Click a header to sort.</p>

            <div className="flex flex-wrap items-center gap-2">
                {actionButtons.map(({ label, icon: Icon, action, disabled }) => (
                    <button
                        key={label}
                        onClick={action}
                        disabled={disabled}
                        className="flex items-center gap-2 bg-gray-800 text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-md hover:bg-yellow-400 hover:text-black transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-yellow-400/50"
                    >
                        <Icon className="w-5 h-5" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            <DataTable 
                data={data}
                headers={headers}
                onCellChange={onCellChange}
                onColumnDelete={onColumnDelete}
                onColumnRename={onColumnRename}
                onColumnReorder={onColumnReorder}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                hiddenColumns={hiddenColumns}
                setHiddenColumns={setHiddenColumns}
                readOnlyColumns={[SERIAL_NUMBER_HEADER]}
            />

            <Modal isOpen={isAddColumnModalOpen} onClose={() => setIsAddColumnModalOpen(false)} title="Add New Column">
                <form onSubmit={handleAddNewColumn}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="column-name" className="block text-sm font-medium text-gray-300 mb-1">
                                New Column Name
                            </label>
                            <input
                                type="text"
                                id="column-name"
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                                autoFocus
                            />
                        </div>
                        {addColumnError && (
                            <p className="text-sm text-red-400">{addColumnError}</p>
                        )}
                        <div className="flex justify-end gap-4 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsAddColumnModalOpen(false)}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                            >
                                Add Column
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} title="AI Data Analysis">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {isAnalyzing ? (
                        <div className="flex items-center justify-center gap-3">
                            <GeminiIcon className="w-8 h-8 text-yellow-400 animate-spin" />
                            <p className="text-lg text-gray-300">Analyzing data, please wait...</p>
                        </div>
                    ) : (
                        <pre className="whitespace-pre-wrap text-gray-300 font-sans">{analysisResult}</pre>
                    )}
                </div>
                 <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-700">
                    <button
                        type="button"
                        onClick={() => setIsAnalysisModalOpen(false)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isColumnManagerOpen} onClose={() => setIsColumnManagerOpen(false)} title="Manage Columns">
                <div className="space-y-3">
                    <p className="text-gray-400">Select columns to display in the table.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border border-gray-700 rounded-md">
                        {headers.map(header => (
                            <div key={header} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`vis-${header}`}
                                    className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    checked={!hiddenColumns.has(header)}
                                    onChange={() => handleColumnVisibilityToggle(header)}
                                    disabled={header === SERIAL_NUMBER_HEADER}
                                />
                                <label htmlFor={`vis-${header}`} className={`ml-2 text-gray-300 truncate ${header === SERIAL_NUMBER_HEADER ? 'opacity-50' : ''}`} title={header}>{header}</label>
                            </div>
                        ))}
                    </div>
                     <div className="flex justify-end gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsColumnManagerOpen(false)}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isBatchUpdateOpen} onClose={() => setIsBatchUpdateOpen(false)} title={`Batch Update ${selectedRows.size} Rows`}>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="batch-column" className="block text-sm font-medium text-gray-300 mb-1">
                            Column to Update
                        </label>
                        <select
                            id="batch-column"
                            value={batchUpdateConfig.column}
                            onChange={(e) => setBatchUpdateConfig({ ...batchUpdateConfig, column: e.target.value })}
                             className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        >
                            {headers.filter(h => h !== SERIAL_NUMBER_HEADER).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="batch-value" className="block text-sm font-medium text-gray-300 mb-1">
                            New Value
                        </label>
                        <input
                            type="text"
                            id="batch-value"
                            value={batchUpdateConfig.value}
                            onChange={(e) => setBatchUpdateConfig({ ...batchUpdateConfig, value: e.target.value })}
                            className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsBatchUpdateOpen(false)}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleBatchUpdate}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                        >
                            Apply Update
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmModalOpen} onClose={() => setIsDeleteConfirmModalOpen(false)} title="Confirm Deletion">
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Are you sure you want to delete the selected {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''}?
                    </p>
                    <div className="flex justify-end gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsDeleteConfirmModalOpen(false)}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};