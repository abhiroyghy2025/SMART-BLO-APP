import { GoogleGenAI } from '@google/genai';
import { useMemo } from 'react';

// Declare process to ensure TypeScript compilation if types are missing
declare const process: { env: { API_KEY?: string; [key: string]: any } };

export const useGemini = () => {
    return useMemo(() => {
        // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
        // Assume this variable is pre-configured, valid, and accessible in the execution context.
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            // Fail silently if key is missing; UI can handle it or just disable AI features
            return null;
        }
        return new GoogleGenAI({ apiKey });
    }, []);
};