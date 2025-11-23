
import { GoogleGenAI } from '@google/genai';
import { useMemo } from 'react';

// Helper to safely access process.env without crashing in browsers
const getEnv = (key: string) => {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            return process.env[key];
        }
    } catch (e) {
        return undefined;
    }
    return undefined;
};

export const useGemini = () => {
    return useMemo(() => {
        const apiKey = getEnv('API_KEY');
        if (!apiKey) {
            // Fail silently if key is missing to avoid crashing app logic that depends on this hook
            // The UI should handle the disabled state based on the return value being null
            return null;
        }
        return new GoogleGenAI({ apiKey });
    }, []);
};
