
import { GoogleGenAI, Type } from '@google/genai';
import type { VoterRecord } from '../types';

export const parseVoiceInputWithGemini = async (transcript: string, headers: string[], ai: GoogleGenAI): Promise<Partial<VoterRecord>> => {
    if (!transcript.trim() || headers.length === 0) {
        return {};
    }

    const properties: { [key: string]: { type: Type.STRING, description: string } } = {};
    headers.forEach(header => {
        // Exclude serial numbers from AI parsing as they are auto-generated
        if (!header.toLowerCase().includes('serial no')) {
            properties[header] = {
                type: Type.STRING,
                description: `The value for the '${header}' field.`
            };
        }
    });

    const schema = {
        type: Type.OBJECT,
        properties: properties,
    };
    
    const prompt = `Analyze the following text and extract the information into a JSON object matching the provided schema. The user is filling out a form with the following fields: ${headers.join(', ')}. The text is: "${transcript}". Handle natural language like "set the name to..." or "the age is...". Only return fields mentioned in the text.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonText = response.text.trim();
        if (jsonText) {
            const parsedJson = JSON.parse(jsonText);
            return parsedJson as Partial<VoterRecord>;
        }
        return {};

    } catch (error) {
        console.error("Error parsing voice input with Gemini:", error);
        return {};
    }
};
