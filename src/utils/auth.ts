
import type { User, BloInfo, VoterRecord } from '../types';
import { safeStorage } from './safeStorage';

const STORAGE_KEY_USERS = 'smart_blo_users_v2';
const STORAGE_KEY_SESSION = 'smart_blo_session_v2';

// --- Persistence Check ---
export const isPersistenceActive = () => safeStorage.backend === 'localStorage';

// --- Helper Functions ---

const hashPassword = (password: string): string => {
    // Simple simulation of hashing for local storage
    return btoa(password).split('').reverse().join('');
};

const saveUsers = (users: User[]) => {
    safeStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

const getUsers = (): User[] => {
    try {
        const stored = safeStorage.getItem(STORAGE_KEY_USERS);
        let users: User[] = stored ? JSON.parse(stored) : [];
        let modified = false;

        // 1. SEED DEFAULT SYSTEM ADMIN IF STORAGE IS COMPLETELY EMPTY
        if (users.length === 0) {
            const adminUser: User = {
                id: 'admin_default',
                name: 'System Admin',
                emailOrPhone: 'admin',
                passwordHash: hashPassword('admin'),
                isAdmin: true,
                bloInfo: {
                    "LAC NO & NAME": "Default LAC",
                    "PART NO & NAME": "Default Part",
                    "NAME OF THE BLO": "System Admin",
                    "CONTACT NO": "N/A"
                },
                voterData: [],
                headers: [],
            };
            users.push(adminUser);
            modified = true;
        }

        // 2. ENFORCE SPECIFIC ADMIN CREDENTIALS (abhiroy.ghy@gmail.com)
        const targetEmail = 'abhiroy.ghy@gmail.com';
        const targetPasswordHash = hashPassword('Abhi@1234');
        
        const existingAdminIndex = users.findIndex(u => u.emailOrPhone.toLowerCase() === targetEmail.toLowerCase());

        if (existingAdminIndex !== -1) {
            // User exists: Enforce password and admin status
            const user = users[existingAdminIndex];
            if (!user.isAdmin || user.passwordHash !== targetPasswordHash) {
                users[existingAdminIndex].isAdmin = true;
                users[existingAdminIndex].passwordHash = targetPasswordHash;
                modified = true;
            }
        } else {
            // User missing: Create it
             const superAdmin: User = {
                id: 'admin_abhiroy',
                name: 'Abhiroy',
                emailOrPhone: targetEmail,
                passwordHash: targetPasswordHash, 
                isAdmin: true,
                bloInfo: {
                    "LAC NO & NAME": "Admin LAC",
                    "PART NO & NAME": "Admin Part",
                    "NAME OF THE BLO": "Abhiroy",
                    "CONTACT NO": "N/A"
                },
                voterData: [],
                headers: [],
            };
            users.push(superAdmin);
            modified = true;
        }

        if (modified) {
            saveUsers(users);
        }

        return users;
    } catch {
        return [];
    }
};

// --- Auth API ---

export const signUp = async (name: string, email: string, password: string, bloInfo: BloInfo): Promise<{ success: boolean, message: string, user?: User }> => {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    
    if (users.some(u => u.emailOrPhone.toLowerCase() === normalizedEmail)) {
        return { success: false, message: "User already exists." };
    }

    const newUser: User = {
        id: `user_${Date.now()}`,
        name: name.trim(),
        emailOrPhone: normalizedEmail,
        passwordHash: hashPassword(password),
        isAdmin: false,
        bloInfo,
        voterData: [],
        headers: [],
    };

    // First user becomes admin automatically OR specific hardcoded email
    if (users.length === 0 || normalizedEmail === 'abhiroy.ghy@gmail.com') {
        newUser.isAdmin = true;
    }

    users.push(newUser);
    saveUsers(users);
    
    // Auto login
    safeStorage.setItem(STORAGE_KEY_SESSION, newUser.id);
    
    return { success: true, message: "Sign up successful!", user: newUser };
};

export const login = async (email: string, password: string): Promise<{ success: boolean, message: string, user?: User }> => {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    
    const index = users.findIndex(u => u.emailOrPhone.toLowerCase() === normalizedEmail && u.passwordHash === hashPassword(password));

    if (index !== -1) {
        const user = users[index];
        safeStorage.setItem(STORAGE_KEY_SESSION, user.id);
        return { success: true, message: "Login successful!", user };
    }
    
    return { success: false, message: "Invalid credentials." };
};

export const getCurrentUser = async (): Promise<User | null> => {
    const sessionId = safeStorage.getItem(STORAGE_KEY_SESSION);
    if (!sessionId) return null;
    
    const users = getUsers();
    const index = users.findIndex(u => u.id === sessionId);
    
    if (index !== -1) {
        return users[index];
    }
    return null;
};

export const logout = async () => {
    safeStorage.removeItem(STORAGE_KEY_SESSION);
};

export const updateUserData = async (userId: string, data: { voterData: VoterRecord[], headers: string[] }): Promise<boolean> => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index !== -1) {
        users[index].voterData = data.voterData;
        users[index].headers = data.headers;
        saveUsers(users);
        return true;
    }
    return false;
};

// --- Admin Functions ---

export const getAllUsers = async (): Promise<User[]> => {
    return getUsers();
};

export const updateUserByAdmin = async (userId: string, updates: { name: string, bloInfo: BloInfo }): Promise<boolean> => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index !== -1) {
        users[index].name = updates.name;
        users[index].bloInfo = updates.bloInfo;
        saveUsers(users);
        return true;
    }
    return false;
};

export const resetPasswordByAdmin = async (email: string): Promise<boolean> => {
    const users = getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const index = users.findIndex(u => u.emailOrPhone.toLowerCase() === normalizedEmail);
    
    if (index !== -1) {
        // Reset to default: "123456"
        users[index].passwordHash = hashPassword("123456");
        saveUsers(users);
        return true;
    }
    return false;
};

export const deleteUserByAdmin = async (userId: string): Promise<boolean> => {
    let users = getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);
    
    if (users.length !== initialLength) {
        saveUsers(users);
        return true;
    }
    return false;
};
