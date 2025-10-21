import React, { useState, useCallback } from 'react';
import type { VoterRecord } from './types';
import { FileUpload } from './components/FileUpload';
import { DataEditor } from './components/DataEditor';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { SearchPage } from './components/SearchPage';

declare const XLSX: any;

export type AppView = 'home' | 'search' | 'editor';

const App: React.FC = () => {
    const [data, setData] = useState<VoterRecord[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<AppView>('home');
    const [fileName, setFileName] = useState<string>('export.xlsx');
    const [footerData, setFooterData] = useState<any[][]>([]);

    const handleFileLoad = useCallback((file: File) => {
        setIsLoading(true);
        setError(null);
        setFileName(file.name.endsWith('.xlsx') || file.name.endsWith('.xls') 
            ? file.name 
            : `${file.name.split('.')[0]}.xlsx`);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileData = e.target?.result;
                const workbook = XLSX.read(fileData, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    throw new Error("Excel file must have a header row and at least one data row.");
                }
                
                const originalHeaderRow: string[] = jsonData[0].map(String);
                const allDataRows: any[][] = jsonData.slice(1);

                const FOOTER_ROW_COUNT = 4;
                let mainDataRows: any[][] = allDataRows;
                let footerRows: any[][] = [];

                if (allDataRows.length > FOOTER_ROW_COUNT) {
                    mainDataRows = allDataRows.slice(0, allDataRows.length - FOOTER_ROW_COUNT);
                    footerRows = allDataRows.slice(allDataRows.length - FOOTER_ROW_COUNT);
                }
                
                const serialNumberHeader = 'SERIAL NO IN THE VOTER LIST';
                const finalHeaders = [serialNumberHeader, ...originalHeaderRow];

                const rowsData: VoterRecord[] = mainDataRows.map((row: any[], index: number) => {
                    const record: VoterRecord = { 
                        __id: `row_${Date.now()}_${index}`,
                        [serialNumberHeader]: index + 1
                    };
                    originalHeaderRow.forEach((header, i) => {
                        record[header] = row[i];
                    });
                    return record;
                });

                setHeaders(finalHeaders);
                setData(rowsData);
                setFooterData(footerRows);
            } catch (err) {
                console.error("Error parsing file:", err);
                setError(err instanceof Error ? err.message : "An unknown error occurred during file processing.");
                setData([]);
                setHeaders([]);
                setFooterData([]);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
             setError("Failed to read the file.");
             setIsLoading(false);
        };
        reader.readAsBinaryString(file);
    }, []);

    const handleReset = () => {
        setData([]);
        setHeaders([]);
        setError(null);
        setFooterData([]);
    }

    const handleGoHome = () => {
        setView('home');
    }
    
    const handleNavigate = (targetView: AppView) => {
        setView(targetView);
    }

    const renderContent = () => {
        const noDataLoaded = data.length === 0;

        switch(view) {
            case 'home':
                return <HomeScreen onNavigate={handleNavigate} voterCount={data.length} footerData={footerData}/>;
            case 'search':
                return noDataLoaded ? (
                    <FileUpload onFileLoad={handleFileLoad} isLoading={isLoading} error={error} />
                ) : (
                    <SearchPage 
                        data={data}
                        headers={headers}
                        onGoHome={handleGoHome}
                        onDataUpdate={setData}
                        totalRecords={data.length}
                    />
                );
            case 'editor':
                return noDataLoaded ? (
                    <FileUpload onFileLoad={handleFileLoad} isLoading={isLoading} error={error} />
                ) : (
                    <DataEditor 
                        initialData={data} 
                        initialHeaders={headers} 
                        onReset={handleReset}
                        fileName={fileName}
                        onGoHome={handleGoHome}
                    />
                );
            default:
                return <HomeScreen onNavigate={handleNavigate} voterCount={data.length} footerData={footerData} />;
        }
    }

    return (
        <div className="min-h-screen bg-black font-sans">
             <Header onGoHome={handleGoHome} />
            <main className="container mx-auto p-4 md:p-8">
               {renderContent()}
            </main>
        </div>
    );
};

export default App;