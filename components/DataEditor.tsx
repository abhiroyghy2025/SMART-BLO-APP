
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { VoterRecord, BloInfo } from '../types';
import { DataTable } from './DataTable';
import { Modal } from './Modal';
import { DownloadIcon, TrashIcon, CopyIcon, HighlightIcon, ResetIcon, HomeIcon, PlusIcon, EditIcon, ColumnsIcon, UndoIcon, RedoIcon, GeminiIcon, SearchIcon, PdfIcon, SpinnerIcon, UploadIcon } from './icons';
import { useGemini } from '../hooks/useGemini';
import { FileUpload } from './FileUpload';

declare const XLSX: any;
declare const jspdf: any;

interface DataEditorProps {
    initialData: VoterRecord[];
    initialHeaders: string[];
    onReset: () => void;
    fileName: string;
    onGoHome: () => void;
    bloInfo: BloInfo;
    onFileLoad: (file: File) => void;
    isLoading: boolean;
    error: string | null;
    onSave: (data: VoterRecord[], headers: string[]) => void;
}

const SERIAL_NUMBER_HEADER = 'SERIAL NO';

type EditorState = {
    data: VoterRecord[];
    headers: string[];
};

const useHistory = (initialState: EditorState, onSave: (state: EditorState) => void) => {
    const [history, setHistory] = useState<EditorState[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const isInitialMount = useRef(true);

    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const currentState = history[currentIndex];

    useEffect(() => {
        // Reset history when initial props change
        setHistory([initialState]);
        setCurrentIndex(0);
        isInitialMount.current = true;
    }, [initialState.data, initialState.headers]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (currentState) {
            onSaveRef.current(currentState);
        }
    }, [currentState]);

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
        state: currentState,
        setState,
        undo,
        redo,
        canUndo: currentIndex > 0,
        canRedo: currentIndex < history.length - 1,
    };
};

export const DataEditor: React.FC<DataEditorProps> = ({ initialData, initialHeaders, onReset, fileName, onGoHome, bloInfo, onFileLoad, isLoading, error, onSave }) => {
    
    const handleSave = useCallback((state: EditorState) => {
        onSave(state.data, state.headers);
    }, [onSave]);
    
    const { state, setState, undo, redo, canUndo, canRedo } = useHistory({ data: initialData, headers: initialHeaders }, handleSave);
    const { data, headers } = state;
    const ai = useGemini();
    
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [addColumnError, setAddColumnError] = useState<string | null>(null);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
    const [columnSearchTerm, setColumnSearchTerm] = useState('');
    const [isBatchUpdateOpen, setIsBatchUpdateOpen] = useState(false);
    const [batchUpdateConfig, setBatchUpdateConfig] = useState({ column: headers.filter(h => h !== SERIAL_NUMBER_HEADER)[0] ?? '', value: '' });
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

    const processedData = useMemo(() => {
        let processableData = [...data];
        
        const activeFilters = Object.entries(filters).filter(([, value]) => value);
        if (activeFilters.length > 0) {
            processableData = processableData.filter(row => {
                return activeFilters.every(([header, filterValue]) => {
                    return String(row[header] ?? '').toLowerCase().includes(String(filterValue).toLowerCase());
                });
            });
        }

        if (sortConfig !== null) {
            processableData.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortConfig.direction === 'ascending' ? aVal - bVal : bVal - aVal;
                }

                if (String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) < 0) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (String(aVal).localeCompare(String(bVal), undefined, { numeric: true }) > 0) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return processableData;
    }, [data, filters, sortConfig]);

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
                model: 'gemini-3-pro-preview',
                contents: prompt,
            });
            setAnalysisResult(response.text || "No analysis generated.");
        } catch (error) {
            console.error("Error analyzing data with Gemini:", error);
            setAnalysisResult("An error occurred while analyzing the data. Please check your API key and try again.");
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
        setIsDownloadingExcel(true);
        setTimeout(() => {
            try {
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
                
                const bloInfoForSheet = Object.entries(bloInfo).map(([key, value]) => ({ 'Field': key, 'Value': value }));
                const worksheet2 = XLSX.utils.json_to_sheet(bloInfoForSheet);
                XLSX.utils.book_append_sheet(workbook, worksheet2, "BLO Info");

                XLSX.writeFile(workbook, fileName);
            } catch (error) {
                console.error("Failed to generate Excel file:", error);
                alert("An error occurred while generating the Excel file.");
            } finally {
                setIsDownloadingExcel(false);
            }
        }, 100);
    }, [data, headers, fileName, bloInfo]);

    const exportToPdf = useCallback(() => {
        setIsExportingPdf(true);
        setTimeout(() => {
            try {
                const doc = new jspdf.jsPDF({ orientation: 'landscape' });
                const visibleHeaders = headers.filter(h => !hiddenColumns.has(h));
    
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.text('Voter Data Report', 14, 22);
                doc.setFontSize(11);
                doc.setTextColor(100);
    
                let startY = 32;
                Object.entries(bloInfo).forEach(([key, value]) => {
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${key}:`, 14, startY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(String(value), 60, startY);
                    startY += 7;
                });
    
                const tableData = processedData.map(row => 
                    visibleHeaders.map(header => row[header] ?? '')
                );
    
                doc.autoTable({
                    head: [visibleHeaders],
                    body: tableData,
                    startY: startY + 5,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [255, 255, 224], // Light yellow
                        textColor: [0, 0, 0],
                        fontStyle: 'bold',
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 1.5,
                    },
                });
    
                doc.save(`${fileName.split('.')[0]}.pdf`);
            } catch (error) {
                console.error("Failed to generate PDF:", error);
                alert("An error occurred while generating the PDF. Please check the console for details.");
            } finally {
                setIsExportingPdf(false);
            }
        }, 100);
    }, [processedData, headers, hiddenColumns, fileName, bloInfo]);
    
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

    const handleResetColumns = () => {
        setHiddenColumns(new Set());
        setColumnSearchTerm('');
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
                return { ...rest, [newName]: value } as VoterRecord;
            });
            return { headers: newHeaders, data: newData };
        });
    }, [setState]);

    const onColumnReorder = useCallback((newHeaders: string[]) => {
        setState(currentState => ({ ...currentState, headers: newHeaders }));
    }, [setState]);

    const handleUploadButtonClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = ".xlsx, .xls";
        input.onchange = (e: any) => {
            if (e.target.files && e.target.files.length > 0) {
                onFileLoad(e.target.files[0]);
            }
        };
        input.click();
    };

    const actionButtons = useMemo(() => [
        { label: 'Undo', icon: UndoIcon, action: undo, disabled: !canUndo, color: 'blue', tooltip: 'Undo the last action' },
        { label: 'Redo', icon: RedoIcon, action: redo, disabled: !canRedo, color: 'blue', tooltip: 'Redo the last undone action' },
        { label: 'Add Row', icon: PlusIcon, action: handleAddNewRow, disabled: false, color: 'green', tooltip: 'Add a new empty row to the table' },
        { label: 'Add Column', icon: PlusIcon, action: openAddColumnModal, disabled: false, color: 'green', tooltip: 'Add a new custom column' },
        { label: 'Delete Selected', icon: TrashIcon, action: deleteSelectedRows, disabled: selectedRows.size === 0, color: 'red', tooltip: 'Delete all selected rows' },
        { label: 'Duplicate Selected', icon: CopyIcon, action: duplicateSelectedRows, disabled: selectedRows.size === 0, color: 'yellow', tooltip: 'Create a copy of the selected rows' },
        { label: 'Highlight Selected', icon: HighlightIcon, action: highlightSelectedRows, disabled: selectedRows.size === 0, color: 'yellow', tooltip: 'Toggle a visual highlight on selected rows' },
        { label: 'Batch Update', icon: EditIcon, action: () => setIsBatchUpdateOpen(true), disabled: selectedRows.size === 0, color: 'yellow', tooltip: 'Update a specific column for all selected rows at once' },
        { label: 'Analyze with AI', icon: GeminiIcon, action: handleAnalyzeSelection, disabled: selectedRows.size === 0 || !ai, color: 'purple', tooltip: !ai ? 'Gemini API Key missing' : 'Get an AI-powered summary of the selected data' },
        { label: 'Manage Columns', icon: ColumnsIcon, action: () => setIsColumnManagerOpen(true), disabled: false, color: 'gray', tooltip: 'Show or hide columns from the table view' },
        { label: 'Download Excel', icon: DownloadIcon, action: downloadExcel, disabled: false, color: 'green', tooltip: 'Download the current data as an Excel (.xlsx) file' },
        { label: 'Export to PDF', icon: PdfIcon, action: exportToPdf, disabled: false, color: 'purple', tooltip: 'Export the current view as a PDF document' },
        { label: 'Reset Data', icon: ResetIcon, action: onReset, disabled: false, color: 'red', tooltip: 'Clear all data and start over with a blank sheet' },
    ], [selectedRows.size, downloadExcel, onReset, headers, data, undo, redo, canUndo, canRedo, ai, exportToPdf]);

    const filteredHeadersForManager = headers.filter(h =>
        h.toLowerCase().includes(columnSearchTerm.toLowerCase())
    );

    const buttonColorClasses = {
        yellow: 'bg-yellow-900/50 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500 hover:text-black',
        red: 'bg-red-900/50 text-red-300 border-red-500/50 hover:bg-red-500 hover:text-white',
        green: 'bg-green-900/50 text-green-300 border-green-500/50 hover:bg-green-500 hover:text-black',
        blue: 'bg-blue-900/50 text-blue-300 border-blue-500/50 hover:bg-blue-500 hover:text-white',
        purple: 'bg-purple-900/50 text-purple-300 border-purple-500/50 hover:bg-purple-500 hover:text-white',
        gray: 'bg-slate-800 text-slate-300 border-slate-500/50 hover:bg-slate-600 hover:text-white',
    };

    if (data.length === 0) {
        return (
            <FileUpload 
                onFileLoad={onFileLoad}
                isLoading={isLoading}
                error={error}
            />
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-4xl font-bold text-yellow-400 font-copperplate-gothic tracking-wider">Data Editor</h1>
                <button
                    onClick={onGoHome}
                    title="Return to the main menu"
                    className="flex items-center gap-2 bg-slate-800 text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-yellow-400/20"
                >
                    <HomeIcon className="w-5 h-5" />
                    <span className="font-semibold">Back to Home</span>
                </button>
            </header>

            <p className="text-sm text-slate-300 italic">Tip: Double-click a cell to edit. Right-click a column header for options. Click a header to sort.</p>

            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <div className="flex flex-wrap items-center gap-2">
                    {actionButtons.map(({ label, icon: Icon, action, disabled, color, tooltip }) => (
                        <button
                            key={label}
                            onClick={action}
                            disabled={disabled}
                            title={tooltip}
                            className={`flex items-center gap-2 border px-3 py-2 rounded-md transition-colors duration-200 disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed ${buttonColorClasses[color as keyof typeof buttonColorClasses]}`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-semibold">{label}</span>
                        </button>
                    ))}
                     <button
                        key="Upload & Replace"
                        onClick={handleUploadButtonClick}
                        disabled={isLoading}
                        title="Upload a new Excel file to replace the current data"
                        className="flex items-center gap-2 border px-3 py-2 rounded-md transition-colors duration-200 bg-blue-900/50 text-blue-300 border-blue-500/50 hover:bg-blue-500 hover:text-white disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        <UploadIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Upload & Replace</span>
                    </button>
                </div>
            </div>

            <div className="relative">
                {(isDownloadingExcel || isExportingPdf) && (
                    <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-20 rounded-lg">
                        <SpinnerIcon className="w-12 h-12 text-yellow-400 animate-spin" />
                        <p className="mt-4 text-lg text-white">
                            {isDownloadingExcel ? 'Generating Excel file...' : 'Generating PDF file...'}
                        </p>
                    </div>
                )}
                <DataTable 
                    data={processedData}
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
                    filters={filters}
                    setFilters={setFilters}
                    sortConfig={sortConfig}
                    setSortConfig={setSortConfig}
                />
            </div>

            <Modal isOpen={isAddColumnModalOpen} onClose={() => setIsAddColumnModalOpen(false)} title="Add New Column">
                <form onSubmit={handleAddNewColumn}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="column-name" className="block text-sm font-medium text-slate-300 mb-1">
                                New Column Name
                            </label>
                            <input
                                type="text"
                                id="column-name"
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
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
                                className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
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
                            <SpinnerIcon className="w-8 h-8 text-yellow-400 animate-spin" />
                            <p className="text-lg text-slate-300">Analyzing data, please wait...</p>
                        </div>
                    ) : (
                        <pre className="whitespace-pre-wrap text-slate-300 font-sans">{analysisResult}</pre>
                    )}
                </div>
                 <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={() => setIsAnalysisModalOpen(false)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isColumnManagerOpen} onClose={() => { setIsColumnManagerOpen(false); setColumnSearchTerm(''); }} title="Manage Columns">
                <div className="space-y-3">
                    <p className="text-slate-300">Select columns to display in the table.</p>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search for a column..."
                            value={columnSearchTerm}
                            onChange={(e) => setColumnSearchTerm(e.target.value)}
                            className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 pl-10 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-700 rounded-md">
                        {filteredHeadersForManager.length > 0 ? (
                            filteredHeadersForManager.map(header => (
                                <div key={header} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`vis-${header}`}
                                        className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-yellow-400 focus:ring-yellow-400 accent-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        checked={!hiddenColumns.has(header)}
                                        onChange={() => handleColumnVisibilityToggle(header)}
                                        disabled={header === SERIAL_NUMBER_HEADER}
                                    />
                                    <label htmlFor={`vis-${header}`} className="ml-2 text-sm text-slate-300 truncate cursor-pointer" title={header}>
                                        {header}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 col-span-full text-center">No columns found.</p>
                        )}
                    </div>
                     <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                         <button
                            type="button"
                            onClick={handleResetColumns}
                            className="text-sm text-yellow-500 hover:text-yellow-400 hover:underline"
                         >
                            Reset to Default
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsColumnManagerOpen(false); setColumnSearchTerm(''); }}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isBatchUpdateOpen} onClose={() => setIsBatchUpdateOpen(false)} title="Batch Update">
                 <div className="space-y-4">
                     <p className="text-slate-300 text-sm">
                        Update <strong>{selectedRows.size}</strong> selected row(s).
                    </p>
                    <div>
                        <label htmlFor="batch-column" className="block text-sm font-medium text-slate-300 mb-1">
                            Column to Update
                        </label>
                        <select
                            id="batch-column"
                            value={batchUpdateConfig.column}
                            onChange={(e) => setBatchUpdateConfig({ ...batchUpdateConfig, column: e.target.value })}
                             className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        >
                            {headers.filter(h => h !== SERIAL_NUMBER_HEADER).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="batch-value" className="block text-sm font-medium text-slate-300 mb-1">
                            New Value
                        </label>
                        <input
                            type="text"
                            id="batch-value"
                            value={batchUpdateConfig.value}
                            onChange={(e) => setBatchUpdateConfig({ ...batchUpdateConfig, value: e.target.value })}
                            className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={() => setIsBatchUpdateOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        <button type="button" onClick={handleBatchUpdate} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded transition-colors">Update</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteConfirmModalOpen} onClose={() => setIsDeleteConfirmModalOpen(false)} title="Confirm Deletion">
                <div className="space-y-4">
                    <p className="text-slate-300">
                        Are you sure you want to delete the selected {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''}? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={() => setIsDeleteConfirmModalOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancel</button>
                        <button type="button" onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors">Confirm Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
