import { GoogleGenAI } from '@google/genai';
import { useMemo } from 'react';

export const useGemini = (apiKey?: string) => {
    return useMemo(() => {
        if (!apiKey) {
            return null;
        }
        return new GoogleGenAI({ apiKey });
    }, [apiKey]);
};
