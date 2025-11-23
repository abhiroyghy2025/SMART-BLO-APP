
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

export interface User {
    id: string;
    name: string;
    emailOrPhone: string;
    passwordHash: string; // Restored for local auth
    isAdmin: boolean;
    bloInfo: BloInfo;
    voterData: VoterRecord[];
    headers: string[];
}
