import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { VoterRecord } from '../types';
import { TrashIcon, EditIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

interface DataTableProps {
    data: VoterRecord[];
    headers: string[];
    onCellChange: (rowId: string, header: string, value: any) => void;
    onColumnDelete: (header: string) => void;
    onColumnRename: (oldName: string, newName: string) => void;
    onColumnReorder: (newHeaders: string[]) => void;
    selectedRows: Set<string>;
    setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
    hiddenColumns: Set<string>;
    setHiddenColumns: React.Dispatch<React.SetStateAction<Set<string>>>;
    readOnlyColumns?: string[];
}

const ContextMenu: React.FC<{
    x: number;
    y: number;
    header: string;
    onSort: (dir: 'ascending' | 'descending') => void;
    onHide: () => void;
    onClose: () => void;
    isHidable: boolean;
}> = ({ x, y, header, onSort, onHide, onClose, isHidable }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className="absolute z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1 w-48 text-sm"
        >
            <div className="px-3 py-2 text-gray-400 border-b border-gray-700 truncate" title={header}>
                Column: <span className="font-semibold text-gray-300">{header}</span>
            </div>
            <button onClick={() => onSort('ascending')} className="w-full text-left px-3 py-2 hover:bg-yellow-500/20 text-gray-200">Sort Ascending</button>
            <button onClick={() => onSort('descending')} className="w-full text-left px-3 py-2 hover:bg-yellow-500/20 text-gray-200">Sort Descending</button>
            <button onClick={onHide} disabled={!isHidable} className="w-full text-left px-3 py-2 hover:bg-yellow-500/20 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Hide Column</button>
        </div>
    );
};

export const DataTable: React.FC<DataTableProps> = ({ 
    data, headers, onCellChange, onColumnDelete, onColumnRename, onColumnReorder, 
    selectedRows, setSelectedRows, hiddenColumns, setHiddenColumns, readOnlyColumns = [] 
}) => {
    const [editingCell, setEditingCell] = useState<{ rowId: string, header: string } | null>(null);
    const [editingHeader, setEditingHeader] = useState<{ oldName: string, newName: string } | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; header: string } | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const visibleHeaders = useMemo(() => headers.filter(h => !hiddenColumns.has(h)), [headers, hiddenColumns]);

    const processedData = useMemo(() => {
        let processableData = [...data];
        
        const activeFilters = Object.entries(filters).filter(([, value]) => value);
        if (activeFilters.length > 0) {
            processableData = processableData.filter(row => {
                return activeFilters.every(([header, filterValue]) => {
                    const cellValue = row[header];
                    // FIX: A cell value can be of any type (e.g., number or null).
                    // To prevent a 'toLowerCase' on unknown type error, it must be converted to a string.
                    const stringValue = String(cellValue ?? '');
                    return stringValue.toLowerCase().includes(filterValue.toLowerCase());
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


    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numVisibleRows = processedData.length;
            const numSelectedVisibleRows = processedData.filter(r => selectedRows.has(r.__id)).length;
            selectAllCheckboxRef.current.indeterminate = numSelectedVisibleRows > 0 && numSelectedVisibleRows < numVisibleRows;
        }
    }, [selectedRows, processedData]);


    const handleCellDoubleClick = (rowId: string, header: string) => setEditingCell({ rowId, header });
    
    const handleCellChange = (e: React.ChangeEvent<HTMLInputElement>, rowId: string, header: string) => {
        onCellChange(rowId, header, e.target.value);
    };
    
    const handleCellBlur = () => setEditingCell(null);

    const handleRowSelection = (rowId: string) => {
        const newSelection = new Set(selectedRows);
        newSelection.has(rowId) ? newSelection.delete(rowId) : newSelection.add(rowId);
        setSelectedRows(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allVisibleRowIds = new Set(processedData.map(row => row.__id));
            setSelectedRows(allVisibleRowIds);
        } else {
            setSelectedRows(new Set());
        }
    };

    const deleteColumn = (headerToDelete: string) => {
        onColumnDelete(headerToDelete);
    };

    const handleHeaderRename = () => {
        if (!editingHeader) return;
        const { oldName, newName } = editingHeader;
        const trimmedNewName = newName.trim();
        if (!trimmedNewName || (trimmedNewName.toLowerCase() !== oldName.toLowerCase() && headers.some(h => h.toLowerCase() === trimmedNewName.toLowerCase()))) {
            setEditingHeader(null); return;
        }
        if (oldName !== trimmedNewName) {
            onColumnRename(oldName, trimmedNewName);
        }
        setEditingHeader(null);
    };
    
    const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleHeaderRename();
        else if (e.key === 'Escape') setEditingHeader(null);
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableCellElement>, position: number) => { dragItem.current = headers.indexOf(visibleHeaders[position]); };
    const handleDragEnter = (e: React.DragEvent<HTMLTableCellElement>, position: number) => { dragOverItem.current = headers.indexOf(visibleHeaders[position]); };
    const handleDrop = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;
        const newHeaders = [...headers];
        const dragItemContent = newHeaders[dragItem.current];
        newHeaders.splice(dragItem.current, 1);
        newHeaders.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        onColumnReorder(newHeaders);
    };
    
    const handleFilterChange = (header: string, value: string) => setFilters(prev => ({ ...prev, [header]: value }));
    const requestSort = (key: string) => {
        if (readOnlyColumns.includes(key)) return;
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLTableCellElement>, header: string) => {
        e.preventDefault();
        if (readOnlyColumns.includes(header)) return;
        setContextMenu({ x: e.pageX, y: e.pageY, header });
    };

    const hideColumn = (header: string) => {
        setHiddenColumns(prev => new Set(prev).add(header));
    };

    return (
        <div className="overflow-auto border border-gray-700 rounded-lg max-h-[65vh] bg-gray-900/50 backdrop-blur-sm relative">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800 sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="p-4 sticky left-0 bg-gray-800 z-10">
                            <input
                                ref={selectAllCheckboxRef}
                                type="checkbox"
                                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400"
                                onChange={handleSelectAll}
                                checked={processedData.length > 0 && processedData.every(r => selectedRows.has(r.__id))}
                            />
                        </th>
                        {visibleHeaders.map((header, index) => (
                            <th
                                key={header}
                                scope="col"
                                className={`px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider group ${!readOnlyColumns.includes(header) ? 'cursor-pointer' : 'cursor-default'}`}
                                draggable={!editingHeader && !readOnlyColumns.includes(header)}
                                onClick={() => requestSort(header)}
                                onContextMenu={(e) => handleContextMenu(e, header)}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                {editingHeader && editingHeader.oldName === header ? (
                                    <input type="text" value={editingHeader.newName} onChange={(e) => setEditingHeader({ ...editingHeader, newName: e.target.value })} onBlur={handleHeaderRename} onKeyDown={handleHeaderKeyDown} autoFocus className="bg-gray-700 w-full p-1 rounded border border-yellow-400 focus:outline-none text-xs font-medium uppercase"/>
                                ) : (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate" title={header}>{header}</span>
                                        {sortConfig && sortConfig.key === header && (sortConfig.direction === 'ascending' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />)}
                                        {!readOnlyColumns.includes(header) && (
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-auto space-x-2">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingHeader({ oldName: header, newName: header }); }} className="text-yellow-400 hover:text-yellow-300" title={`Rename "${header}" column`}><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteColumn(header); }} className="text-red-400 hover:text-red-300" title={`Delete "${header}" column`}><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </th>
                        ))}
                    </tr>
                    <tr className="bg-gray-700/50">
                        <th className="sticky left-0 bg-gray-700/50 z-10" />
                        {visibleHeaders.map(header => (
                            <th key={`${header}-filter`} className="p-1 font-normal">
                                <input
                                    type="text"
                                    placeholder={readOnlyColumns.includes(header) ? '' : 'Filter...'}
                                    value={filters[header] || ''}
                                    onClick={e => e.stopPropagation()}
                                    onChange={(e) => handleFilterChange(header, e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed"
                                    disabled={readOnlyColumns.includes(header)}
                                />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {processedData.map((row) => (
                        <tr key={row.__id} className={`${selectedRows.has(row.__id) ? 'bg-yellow-900/40' : ''} ${row.__highlighted ? 'bg-blue-900/40' : ''} hover:bg-gray-700/50 transition-colors duration-150`}>
                            <td className="p-4 sticky left-0 bg-inherit z-10">
                                <input type="checkbox" className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-400" checked={selectedRows.has(row.__id)} onChange={() => handleRowSelection(row.__id)}/>
                            </td>
                            {visibleHeaders.map((header) => (
                                <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300" onDoubleClick={() => !readOnlyColumns.includes(header) && handleCellDoubleClick(row.__id, header)}>
                                    {editingCell && editingCell.rowId === row.__id && editingCell.header === header ? (
                                        <input type="text" value={row[header] || ''} onChange={(e) => handleCellChange(e, row.__id, header)} onBlur={handleCellBlur} autoFocus className="bg-gray-700 w-full p-1 rounded border border-yellow-400 focus:outline-none" />
                                    ) : (
                                        row[header]
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    header={contextMenu.header}
                    onSort={(dir) => setSortConfig({ key: contextMenu.header, direction: dir })}
                    onHide={() => hideColumn(contextMenu.header)}
                    onClose={() => setContextMenu(null)}
                    isHidable={!readOnlyColumns.includes(contextMenu.header)}
                />
            )}
        </div>
    );
};