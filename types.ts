

export interface VoterRecord {
    [key: string]: any;
    __id: string;
    __highlighted?: boolean;
}

export interface BloInfo {
    "LAC NO & NAME": string;
    "PART NO & NAME": string;
    "NAME OF THE BLO": string;
    "CONTACT NO": string;
}

export interface GeminiConfig {
    apiKey: string;
}

export interface User {
    id: string;
    name: string;
    emailOrPhone: string;
    passwordHash: string; // In a real app, this would be a securely generated hash.
    isAdmin: boolean;
    bloInfo: BloInfo;
    voterData: VoterRecord[];
    headers: string[];
}