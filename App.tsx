
import React, { useState, useCallback, useEffect } from 'react';
import type { VoterRecord, BloInfo } from './types';
import { DataEditor } from './components/DataEditor';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { SearchPage } from './components/SearchPage';
import { LoginScreen } from './components/LoginScreen';
import { VoterFormModal } from './components/VoterFormModal';
import { AboutPage } from './components/AboutPage';
import { OnboardingTour } from './components/OnboardingTour';

declare const XLSX: any;

export type AppView = 'home' | 'search' | 'editor' | 'about';

const SERIAL_NUMBER_HEADER = 'SERIAL NO';

const DEFAULT_HEADERS = [
    SERIAL_NUMBER_HEADER,
    "VOTER'S NAME",
    "RELATIVE'S NAME",
    "HOUSE NO",
    "AGE",
    "GENDER",
    "VOTER ID (EPIC No.)",
    "CONTACT NO",
    "CATEGORY OF THE VOTER",
    "LAC NO (SIR 2005)",
    "PS NO (SIR 2005)",
    "SERIAL NO (SIR 2005)",
    "MAPPED CATEGORY IN APP",
    "CORRECTION REQUIRED (YES/NO)",
    "REMARKS"
];

const App: React.FC = () => {
    const [data, setData] = useState<VoterRecord[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<AppView>('home');
    const [fileName, setFileName] = useState<string>('VoterData.xlsx');
    const [bloInfo, setBloInfo] = useState<BloInfo | null>(null);
    const [isAddVoterModalOpen, setIsAddVoterModalOpen] = useState(false);
    const [showOnboardingTour, setShowOnboardingTour] = useState(false);

    useEffect(() => {
        try {
            const savedBloInfo = localStorage.getItem('bloInfo');
            if (savedBloInfo) {
                setBloInfo(JSON.parse(savedBloInfo));
                // If user is logged in but there's no data, it means they can start fresh
                if (data.length === 0 && headers.length === 0) {
                    setHeaders(DEFAULT_HEADERS);
                }
            } else {
                 // Check if the tour has been completed
                const hasCompletedTour = localStorage.getItem('hasCompletedOnboarding');
                if (!hasCompletedTour) {
                    setShowOnboardingTour(true);
                }
            }
        } catch (e) {
            console.error("Failed to parse B.L.O. info from localStorage", e);
            localStorage.removeItem('bloInfo');
        }
    }, []);

    const handleLogin = (info: BloInfo) => {
        setBloInfo(info);
        localStorage.setItem('bloInfo', JSON.stringify(info));
        // On first login, set up the default empty database
        if (data.length === 0 && headers.length === 0) {
            setHeaders(DEFAULT_HEADERS);
            setData([]);
        }
    };

    const handleFileLoad = useCallback((file: File) => {
        setIsLoading(true);
        setError(null);

        const validExtensions = ['.xlsx', '.xls'];
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

        if (!validExtensions.includes(fileExtension)) {
            setError("Invalid file format. Please upload an Excel file (.xlsx or .xls).");
            setIsLoading(false);
            return;
        }

        setFileName(file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            ? file.name
            : `${file.name.split('.')[0]}.xlsx`);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileData = e.target?.result;
                if (!fileData) {
                    throw new Error("The file seems to be empty or could not be read properly.");
                }
                const workbook = XLSX.read(fileData, { type: 'binary' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error("The Excel file contains no sheets.");
                }

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 1) {
                    throw new Error("The first sheet of the Excel file is empty. It must have at least a header row.");
                }

                const originalHeaderRow: string[] = jsonData[0].map(String);
                const mainDataRows: any[][] = jsonData.slice(1);

                const finalHeaders = originalHeaderRow.includes(SERIAL_NUMBER_HEADER)
                    ? originalHeaderRow
                    : [SERIAL_NUMBER_HEADER, ...originalHeaderRow];

                const serialIndex = finalHeaders.indexOf(SERIAL_NUMBER_HEADER);

                const rowsData: VoterRecord[] = mainDataRows.map((row: any[], index: number) => {
                    const record: VoterRecord = {
                        __id: `row_${Date.now()}_${index}`
                    };
                    
                    if (!originalHeaderRow.includes(SERIAL_NUMBER_HEADER)) {
                        record[SERIAL_NUMBER_HEADER] = index + 1;
                        originalHeaderRow.forEach((header, i) => {
                            record[header] = row[i];
                        });
                    } else {
                        finalHeaders.forEach((header, i) => {
                            if (header === SERIAL_NUMBER_HEADER) {
                                record[header] = row[serialIndex] || index + 1;
                            } else {
                                const originalIndex = originalHeaderRow.indexOf(header);
                                if (originalIndex > -1) {
                                    record[header] = row[originalIndex];
                                }
                            }
                        });
                    }
                    return record;
                });

                setHeaders(finalHeaders);
                setData(rowsData);
                setView('editor');
            } catch (err) {
                console.error("Error parsing file:", err);
                const message = err instanceof Error ? err.message : "An unknown error occurred.";
                setError(`Error parsing file: ${message}. Please ensure it is a valid, uncorrupted Excel file.`);
                setData([]);
                setHeaders(DEFAULT_HEADERS);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError("Could not read the file. Please check file permissions and try again.");
            setIsLoading(false);
        };
        reader.readAsBinaryString(file);
    }, []);

    const handleReset = () => {
        setData([]);
        setHeaders(DEFAULT_HEADERS);
        setError(null);
    }

    const handleGoHome = () => {
        setView('home');
    }
    
    const handleNavigate = (targetView: AppView) => {
        setView(targetView);
    }

    const handleSaveNewVoter = (newRecordData: Partial<VoterRecord>) => {
        const lastSerial = Math.max(0, ...data.map(r => typeof r[SERIAL_NUMBER_HEADER] === 'number' ? r[SERIAL_NUMBER_HEADER] : 0));
        
        const newVoter: VoterRecord = {
            __id: `row_new_${Date.now()}`,
            ...newRecordData,
            [SERIAL_NUMBER_HEADER]: lastSerial + 1,
        };

        headers.forEach(h => {
            if (!Object.prototype.hasOwnProperty.call(newVoter, h)) {
                newVoter[h] = '';
            }
        });

        setData(prevData => [...prevData, newVoter]);
        setIsAddVoterModalOpen(false);
        alert('New voter added successfully!');
    };
    
    const handleCompleteTour = () => {
        localStorage.setItem('hasCompletedOnboarding', 'true');
        setShowOnboardingTour(false);
    };

    const renderContent = () => {
        switch(view) {
            case 'home':
                return <HomeScreen 
                    onNavigate={handleNavigate} 
                    voterCount={data.length} 
                    bloInfo={bloInfo!}
                    onAddVoterClick={() => setIsAddVoterModalOpen(true)}
                />;
            case 'search':
                 return (
                    <SearchPage 
                        data={data}
                        headers={headers}
                        onGoHome={handleGoHome}
                        onDataUpdate={setData}
                        totalRecords={data.length}
                    />
                );
            case 'editor':
                return (
                    <DataEditor 
                        initialData={data} 
                        initialHeaders={headers} 
                        onReset={handleReset}
                        fileName={fileName}
                        onGoHome={handleGoHome}
                        bloInfo={bloInfo!}
                        onFileLoad={handleFileLoad}
                        isLoading={isLoading}
                        error={error}
                    />
                );
            case 'about':
                return <AboutPage onGoHome={handleGoHome} />;
            default:
                return <HomeScreen 
                    onNavigate={handleNavigate} 
                    voterCount={data.length} 
                    bloInfo={bloInfo!}
                    onAddVoterClick={() => setIsAddVoterModalOpen(true)}
                />;
        }
    }
    
    if (!bloInfo) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-transparent font-cambria">
             <Header onGoHome={handleGoHome} />
            <main className="container mx-auto p-4 md:p-8">
               {renderContent()}
            </main>
             <VoterFormModal 
                isOpen={isAddVoterModalOpen}
                onClose={() => setIsAddVoterModalOpen(false)}
                onSave={handleSaveNewVoter}
                headers={headers.filter(h => h !== SERIAL_NUMBER_HEADER)}
            />
            <OnboardingTour
                isOpen={showOnboardingTour}
                onClose={handleCompleteTour}
            />
        </div>
    );
};

export default App;