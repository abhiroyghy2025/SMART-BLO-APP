import React, { useState, useCallback } from 'react';
import { UploadIcon, AlertIcon } from './icons';

interface FileUploadProps {
    onFileLoad: (file: File) => void;
    isLoading: boolean;
    error: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoad, isLoading, error }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileLoad(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    }, [onFileLoad]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileLoad(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-2xl text-center">
                <h2 className="text-4xl font-bold text-gray-200 mb-4 font-copperplate-gothic tracking-wider">Upload Excel File</h2>
                <p className="text-gray-300 mb-8 text-lg">
                    To begin, please upload your voter data file.
                </p>

                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-12 transition-all duration-300 ${isDragging ? 'border-yellow-400 bg-slate-800/50 shadow-2xl shadow-yellow-400/20 scale-105' : 'border-slate-600'}`}
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept=".xlsx, .xls"
                        disabled={isLoading}
                    />
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <UploadIcon className="w-16 h-16 text-gray-500" />
                        <p className="text-gray-300 text-xl">
                            <label htmlFor="file-upload" className="font-semibold text-yellow-400 hover:text-yellow-300 cursor-pointer transition-colors">
                                Click to upload
                            </label> or drag and drop
                        </p>
                        <p className="text-sm text-gray-300">XLSX or XLS files only</p>
                    </div>
                </div>

                {isLoading && <p className="mt-6 text-lg text-blue-400 animate-pulse">Processing file...</p>}
                
                {error && (
                    <div className="mt-6 flex items-center justify-center bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                        <AlertIcon className="w-5 h-5 mr-3"/>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};