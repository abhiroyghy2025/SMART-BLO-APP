import { GoogleGenAI } from '@google/genai';
import { useMemo } from 'react';

export const useGemini = () => {
    const ai = useMemo(() => {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("API_KEY environment variable not set. Gemini features will be disabled.");
            return null;
        }
        return new GoogleGenAI({ apiKey });
    }, []);

    return ai;
};
