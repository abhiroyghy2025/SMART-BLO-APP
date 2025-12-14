
import React, { useState, useCallback, useEffect } from 'react';
import type { VoterRecord, User } from './types';
import { DataEditor } from './components/DataEditor';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { SearchPage } from './components/SearchPage';
import { LoginScreen } from './components/LoginScreen';
import { VoterFormModal } from './components/VoterFormModal';
import { AboutPage } from './components/AboutPage';
import { AdminDashboard } from './components/AdminDashboard';
import { getCurrentUser, logout, updateUserData, isPersistenceActive } from './utils/auth';
import { SpinnerIcon, AlertIcon } from './components/icons';
import * as XLSX from 'xlsx';

export type AppView = 'home' | 'search' | 'editor' | 'about' | 'admin';

const SERIAL_NUMBER_HEADER = 'SERIAL NO';

const DEFAULT_HEADERS = [
    SERIAL_NUMBER_HEADER, "VOTER'S NAME", "RELATIVE'S NAME", "HOUSE NO", "AGE", "GENDER",
    "VOTER ID (EPIC No.)", "CONTACT NO", "CATEGORY OF THE VOTER", "LAC NO (SIR 2005)",
    "PS NO (SIR 2005)", "SERIAL NO (SIR 2005)", "MAPPED CATEGORY IN APP",
    "CORRECTION REQUIRED (YES/NO)", "REMARKS"
];

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<AppView>('home');
    const [fileName, setFileName] = useState<string>('VoterData.xlsx');
    const [isAddVoterModalOpen, setIsAddVoterModalOpen] = useState(false);
    const [showPersistenceWarning, setShowPersistenceWarning] = useState(false);
    const [isLaunchAnimationPlaying, setIsLaunchAnimationPlaying] = useState(true);
    
    // Key to force re-mounting of DataEditor only when file changes/resets
    const [editorSessionId, setEditorSessionId] = useState(0);

    // Launch Timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLaunchAnimationPlaying(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Initial Auth Check
    useEffect(() => {
        const checkAuth = async () => {
            const user = await getCurrentUser();
            setCurrentUser(user);
            setIsAuthLoading(false);
            if (!isPersistenceActive()) {
                setShowPersistenceWarning(true);
            }
        };
        checkAuth();
    }, []);

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setView('home');
    };

    const handleLogout = async () => {
        await logout();
        setCurrentUser(null);
        setView('home');
    };
    
    const saveCurrentUserData = useCallback(async (updatedData: { voterData: VoterRecord[], headers: string[] }) => {
        if (!currentUser) return;
        
        // Optimistic UI update
        const updatedUser = { ...currentUser, ...updatedData };
        setCurrentUser(updatedUser);

        const success = await updateUserData(currentUser.id, updatedData);
        if (!success) {
            console.error("Failed to save data to local storage");
        }
    }, [currentUser]);

    const handleFileLoad = useCallback((file: File) => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);
        
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const fileData = e.target?.result;
                if (!fileData) throw new Error("File could not be read.");
                const workbook = XLSX.read(fileData, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const originalHeaderRow: string[] = jsonData.length > 0 ? jsonData[0].map(String) : [];
                const mainDataRows: any[][] = jsonData.length > 1 ? jsonData.slice(1) : [];

                const finalHeaders = originalHeaderRow.includes(SERIAL_NUMBER_HEADER) ? originalHeaderRow : [SERIAL_NUMBER_HEADER, ...originalHeaderRow];
                const rowsData: VoterRecord[] = mainDataRows.map((row: any[], index: number) => {
                    const record: VoterRecord = { __id: `row_${Date.now()}_${index}` };
                    if (!originalHeaderRow.includes(SERIAL_NUMBER_HEADER)) {
                        record[SERIAL_NUMBER_HEADER] = index + 1;
                        originalHeaderRow.forEach((header, i) => {
                            record[header] = row[i];
                        });
                    } else {
                        finalHeaders.forEach((header, i) => {
                            record[header] = row[originalHeaderRow.indexOf(header)];
                        });
                        if (!record[SERIAL_NUMBER_HEADER]) {
                             record[SERIAL_NUMBER_HEADER] = index + 1;
                        }
                    }
                    return record;
                });
                
                saveCurrentUserData({ voterData: rowsData, headers: finalHeaders });
                setEditorSessionId(prev => prev + 1); // Force new editor session
                setView('editor');
            } catch (err) {
                console.error("Error parsing file:", err);
                setError(`Error parsing file. Please ensure it is a valid Excel file.`);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    }, [currentUser, saveCurrentUserData]);

    const handleReset = () => {
        if (window.confirm("Are you sure you want to delete all voter data? This cannot be undone.")) {
            saveCurrentUserData({ voterData: [], headers: DEFAULT_HEADERS });
            setEditorSessionId(prev => prev + 1); // Force new editor session
            setError(null);
        }
    }

    const handleNavigate = (targetView: AppView) => setView(targetView);

    const handleSaveNewVoter = (newRecordData: Partial<VoterRecord>) => {
        if (!currentUser) return;
        const { voterData, headers } = currentUser;
        const lastSerial = Math.max(0, ...voterData.map(r => typeof r[SERIAL_NUMBER_HEADER] === 'number' ? r[SERIAL_NUMBER_HEADER] : 0));
        
        const newVoter: VoterRecord = { __id: `row_new_${Date.now()}`, ...newRecordData, [SERIAL_NUMBER_HEADER]: lastSerial + 1 };
        headers.forEach(h => {
            if (!Object.prototype.hasOwnProperty.call(newVoter, h)) newVoter[h] = '';
        });

        const newVoterData = [...voterData, newVoter];
        saveCurrentUserData({ voterData: newVoterData, headers });
        setIsAddVoterModalOpen(false);
        alert('New voter added successfully!');
    };

    const renderContent = () => {
        if (!currentUser) return null;
        
        const currentData = currentUser.voterData || [];
        const currentHeaders = currentUser.headers.length > 0 ? currentUser.headers : DEFAULT_HEADERS;

        switch(view) {
            case 'home':
                return <HomeScreen onNavigate={handleNavigate} voterCount={currentData.length} bloInfo={currentUser.bloInfo} onAddVoterClick={() => setIsAddVoterModalOpen(true)} />;
            case 'search':
                 return <SearchPage data={currentData} headers={currentHeaders} onGoHome={() => setView('home')} onDataUpdate={(updatedData) => saveCurrentUserData({ voterData: updatedData, headers: currentHeaders })} totalRecords={currentData.length} />;
            case 'editor':
                return <DataEditor key={editorSessionId} initialData={currentData} initialHeaders={currentHeaders} onReset={handleReset} fileName={fileName} onGoHome={() => setView('home')} bloInfo={currentUser.bloInfo} onFileLoad={handleFileLoad} isLoading={isLoading} error={error} onSave={(d, h) => saveCurrentUserData({ voterData: d, headers: h })} />;
            case 'about':
                return <AboutPage onGoHome={() => setView('home')} />;
            case 'admin':
                return currentUser.isAdmin ? <AdminDashboard onGoHome={() => setView('home')} /> : <p className="text-center text-red-500 mt-10">Access Denied</p>;
            default:
                return <HomeScreen onNavigate={handleNavigate} voterCount={currentData.length} bloInfo={currentUser.bloInfo} onAddVoterClick={() => setIsAddVoterModalOpen(true)} />;
        }
    }

    if (isAuthLoading || isLaunchAnimationPlaying) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center z-50 fixed inset-0 font-sans">
                <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-up {
                        animation: fadeInUp 1s ease-out forwards;
                    }
                `}</style>
                <div className="text-center animate-fade-in-up">
                    <h1 className="text-5xl md:text-7xl font-bold text-yellow-400 font-copperplate-gothic tracking-widest mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                        Smart B.L.O.
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mb-6 opacity-80"></div>
                    <p className="text-slate-300 text-xl font-cambria tracking-wide">
                        Developed By: <span className="text-pink-500 font-semibold drop-shadow-sm">Sukamal Roy</span>
                    </p>
                    <div className="mt-12 opacity-80">
                         <SpinnerIcon className="w-10 h-10 text-yellow-500 animate-spin mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent font-cambria pb-8 flex flex-col">
            {showPersistenceWarning && (
                <div className="bg-orange-600/90 text-white text-sm py-2 px-4 text-center sticky top-0 z-50 flex items-center justify-center gap-2 backdrop-blur-sm">
                    <AlertIcon className="w-4 h-4" />
                    <span>
                        <strong>Embedded Mode:</strong> Data is not saved permanently. Refreshing the page will clear your changes.
                    </span>
                    <button onClick={() => setShowPersistenceWarning(false)} className="ml-4 underline hover:text-gray-200">Dismiss</button>
                </div>
            )}

            {!currentUser ? (
                <LoginScreen onLoginSuccess={handleLoginSuccess} />
             ) : (
                <>
                    <Header onGoHome={() => setView('home')} currentUser={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} />
                    <main className="container mx-auto p-4 md:p-8 flex-grow">
                       {renderContent()}
                    </main>
                    <VoterFormModal 
                        isOpen={isAddVoterModalOpen}
                        onClose={() => setIsAddVoterModalOpen(false)}
                        onSave={handleSaveNewVoter}
                        headers={currentUser.headers.length > 0 ? currentUser.headers.filter(h => h !== SERIAL_NUMBER_HEADER) : DEFAULT_HEADERS.filter(h => h !== SERIAL_NUMBER_HEADER)}
                    />
                </>
             )}
        </div>
    );
};

export default App;
