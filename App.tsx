

import React, { useState, useCallback, useEffect } from 'react';
import type { VoterRecord, BloInfo, GeminiConfig, User } from './types';
import { DataEditor } from './components/DataEditor';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { SearchPage } from './components/SearchPage';
import { LoginScreen } from './components/LoginScreen';
import { VoterFormModal } from './components/VoterFormModal';
import { AboutPage } from './components/AboutPage';
import { Adsense } from './components/Adsense';
import { SettingsModal } from './components/SettingsModal';
import { AdminDashboard } from './components/AdminDashboard';
import { getCurrentUser, logout, updateUserData } from './utils/auth';

declare const XLSX: any;

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
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<AppView>('home');
    const [fileName, setFileName] = useState<string>('VoterData.xlsx');
    const [isAddVoterModalOpen, setIsAddVoterModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [geminiConfig, setGeminiConfig] = useState<GeminiConfig | null>(null);

    useEffect(() => {
        // Check for active session
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
        
        // Load saved configs
        try {
            const savedGeminiConfig = localStorage.getItem('geminiConfig');
            if (savedGeminiConfig) setGeminiConfig(JSON.parse(savedGeminiConfig));
        } catch (e) {
            console.error("Failed to parse configs from localStorage", e);
            localStorage.removeItem('geminiConfig');
        }
    }, []);

    const handleLoginSuccess = () => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
            setView('home');
        } else {
             setError("Login failed unexpectedly. Please try again.");
        }
    };

    const handleLogout = () => {
        logout();
        setCurrentUser(null);
        setView('home');
    };
    
    const saveCurrentUserData = useCallback((updatedData: { voterData: VoterRecord[], headers: string[] }) => {
        if (!currentUser) return;
        
        const success = updateUserData(currentUser.id, updatedData);
        if (success) {
            // Update state to reflect changes immediately
            setCurrentUser(prevUser => prevUser ? { ...prevUser, ...updatedData } : null);
        } else {
            alert("Error: Could not save data. Your session might have expired. Please log out and log back in.");
        }
    }, [currentUser]);

    const handleFileLoad = useCallback((file: File) => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);
        // ... (validation logic is the same)
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // ... (parsing logic is the same as before)
                const fileData = e.target?.result;
                if (!fileData) throw new Error("File could not be read.");
                const workbook = XLSX.read(fileData, { type: 'binary' });
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
                setView('editor');
            } catch (err) {
                console.error("Error parsing file:", err);
                setError(`Error parsing file. Please ensure it is a valid Excel file.`);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    }, [currentUser, saveCurrentUserData]);

    const handleReset = () => {
        if (window.confirm("Are you sure you want to delete all voter data? This cannot be undone.")) {
            saveCurrentUserData({ voterData: [], headers: DEFAULT_HEADERS });
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
    
    const handleSaveGeminiConfig = (config: GeminiConfig) => {
        setGeminiConfig(config);
        localStorage.setItem('geminiConfig', JSON.stringify(config));
    };

    const renderContent = () => {
        if (!currentUser) return null; // Should not happen if logic is correct
        
        const currentData = currentUser.voterData || [];
        const currentHeaders = currentUser.headers.length > 0 ? currentUser.headers : DEFAULT_HEADERS;

        switch(view) {
            case 'home':
                return <HomeScreen onNavigate={handleNavigate} voterCount={currentData.length} bloInfo={currentUser.bloInfo} onAddVoterClick={() => setIsAddVoterModalOpen(true)} />;
            case 'search':
                 return <SearchPage data={currentData} headers={currentHeaders} onGoHome={() => setView('home')} onDataUpdate={(updatedData) => saveCurrentUserData({ voterData: updatedData, headers: currentHeaders })} totalRecords={currentData.length} apiKey={geminiConfig?.apiKey} />;
            case 'editor':
                return <DataEditor initialData={currentData} initialHeaders={currentHeaders} onReset={handleReset} fileName={fileName} onGoHome={() => setView('home')} bloInfo={currentUser.bloInfo} onFileLoad={handleFileLoad} isLoading={isLoading} error={error} onSave={(d, h) => saveCurrentUserData({ voterData: d, headers: h })} apiKey={geminiConfig?.apiKey} />;
            case 'about':
                return <AboutPage onGoHome={() => setView('home')} />;
            case 'admin':
                return currentUser.isAdmin ? <AdminDashboard onGoHome={() => setView('home')} /> : <p>Access Denied</p>;
            default:
                return <HomeScreen onNavigate={handleNavigate} voterCount={currentData.length} bloInfo={currentUser.bloInfo} onAddVoterClick={() => setIsAddVoterModalOpen(true)} />;
        }
    }
    
    return (
        <div className="min-h-screen bg-transparent font-cambria pb-64 md:pb-80">
            {!currentUser ? (
                <LoginScreen onLoginSuccess={handleLoginSuccess} />
             ) : (
                <>
                    <Header onGoHome={() => setView('home')} onOpenSettings={() => setIsSettingsModalOpen(true)} currentUser={currentUser} onLogout={handleLogout} onNavigate={handleNavigate} />
                    <main className="container mx-auto p-4 md:p-8">
                       {renderContent()}
                    </main>
                    <VoterFormModal 
                        isOpen={isAddVoterModalOpen}
                        onClose={() => setIsAddVoterModalOpen(false)}
                        onSave={handleSaveNewVoter}
                        headers={currentUser.headers.length > 0 ? currentUser.headers.filter(h => h !== SERIAL_NUMBER_HEADER) : DEFAULT_HEADERS.filter(h => h !== SERIAL_NUMBER_HEADER)}
                        apiKey={geminiConfig?.apiKey}
                    />
                    <SettingsModal
                        isOpen={isSettingsModalOpen}
                        onClose={() => setIsSettingsModalOpen(false)}
                        onSaveGemini={handleSaveGeminiConfig}
                        currentGeminiConfig={geminiConfig}
                    />
                </>
             )}

            <Adsense />
        </div>
    );
};

export default App;