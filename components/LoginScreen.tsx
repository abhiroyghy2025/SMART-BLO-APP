
import React, { useState } from 'react';
import type { BloInfo, User } from '../types';
import { Header } from './Header';
import { signUp, login } from '../utils/auth';
import { SpinnerIcon } from './icons';

interface LoginScreenProps {
    onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [bloInfo, setBloInfo] = useState<BloInfo>({
        "LAC NO & NAME": "",
        "PART NO & NAME": "",
        "NAME OF THE BLO": "",
        "CONTACT NO": ""
    });

    const resetForm = () => {
        setName('');
        setEmailOrPhone('');
        setPassword('');
        setBloInfo({
            "LAC NO & NAME": "",
            "PART NO & NAME": "",
            "NAME OF THE BLO": "",
            "CONTACT NO": ""
        });
        setError(null);
    };

    const handleToggleMode = () => {
        setIsSignUp(!isSignUp);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        try {
            if (isSignUp) {
                // Sign Up logic
                const requiredBloFields: (keyof BloInfo)[] = ["LAC NO & NAME", "PART NO & NAME"];
                const isBloInfoIncomplete = requiredBloFields.some(field => !bloInfo[field].trim());

                if (isBloInfoIncomplete || !name.trim() || !emailOrPhone.trim() || !password.trim()) {
                    setError("Please fill in all required fields for sign up.");
                    setIsLoading(false);
                    return;
                }

                // Auto-populate the remaining fields from other form inputs
                const finalBloInfo: BloInfo = {
                    ...bloInfo,
                    "NAME OF THE BLO": name.trim(),
                    "CONTACT NO": emailOrPhone.trim()
                };

                const result = await signUp(name, emailOrPhone, password, finalBloInfo);
                if (result.success && result.user) {
                    onLoginSuccess(result.user);
                } else {
                    setError(result.message);
                }
            } else {
                // Login logic
                if (!emailOrPhone.trim() || !password.trim()) {
                    setError("Please enter your credentials.");
                    setIsLoading(false);
                    return;
                }
                const result = await login(emailOrPhone, password);
                if (result.success && result.user) {
                    onLoginSuccess(result.user);
                } else {
                    setError(result.message);
                }
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBloInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBloInfo(prev => ({ ...prev, [name]: value as string }));
    };

    const bloFields: (keyof BloInfo)[] = [ "LAC NO & NAME", "PART NO & NAME" ];

    return (
        <div className="bg-transparent flex flex-col items-center justify-center p-4">
            <Header onGoHome={() => {}} currentUser={null} onLogout={() => {}} onNavigate={() => {}} />
            <div className="w-full max-w-md bg-slate-800/50 border border-yellow-500/30 rounded-lg shadow-2xl shadow-yellow-400/10 p-8 space-y-6 mt-8 backdrop-blur-sm">
                <h2 className="text-3xl font-bold text-yellow-400 text-center font-copperplate-gothic tracking-wider">
                    {isSignUp ? 'Create Account' : 'Welcome'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <>
                            <InputField label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} />
                            {bloFields.map(field => (
                                <InputField key={field} label={field} name={field} value={bloInfo[field]} onChange={handleBloInfoChange} />
                            ))}
                        </>
                    )}
                    <InputField label="Email" type="email" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} />
                    <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold py-3 px-6 rounded-md hover:from-yellow-400 hover:to-yellow-500 transition-all duration-300 text-lg mt-4 shadow-lg shadow-yellow-500/20 hover:shadow-xl hover:shadow-yellow-400/30 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isLoading && !error ? <SpinnerIcon className="w-6 h-6 animate-spin text-black" /> : (isSignUp ? 'Sign Up' : 'Log In')}
                    </button>
                </form>

                <p className="text-center text-slate-300">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}
                    <button onClick={handleToggleMode} className="font-semibold text-yellow-400 hover:text-yellow-300 ml-2" disabled={isLoading}>
                        {isSignUp ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
};

interface InputFieldProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    name?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, type = 'text', name }) => (
    <div>
        <label htmlFor={label} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={label}
            name={name || label}
            value={value}
            onChange={onChange}
            required
            className="block w-full bg-slate-700 border-2 border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-0 focus:border-yellow-500 transition-colors sm:text-sm"
        />
    </div>
);
