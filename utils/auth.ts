
import type { User, BloInfo, VoterRecord } from '../types';

const STORAGE_KEY_USERS = 'smart_blo_users_v2';
const STORAGE_KEY_SESSION = 'smart_blo_session_v2';

// --- Helper Functions ---

const getUsers = (): User[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_USERS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

const hashPassword = (password: string): string => {
    // Simple simulation of hashing for local storage
    return btoa(password).split('').reverse().join('');
};

// --- Auth API ---

export const signUp = async (name: string, email: string, password: string, bloInfo: BloInfo): Promise<{ success: boolean, message: string, user?: User }> => {
    const users = getUsers();
    
    if (users.some(u => u.emailOrPhone === email)) {
        return { success: false, message: "User already exists." };
    }

    const newUser: User = {
        id: `user_${Date.now()}`,
        name,
        emailOrPhone: email,
        passwordHash: hashPassword(password),
        isAdmin: false,
        bloInfo,
        voterData: [],
        headers: [],
    };

    // First user becomes admin automatically (optional feature, helpful for testing)
    if (users.length === 0) {
        newUser.isAdmin = true;
    }

    users.push(newUser);
    saveUsers(users);
    
    // Auto login
    localStorage.setItem(STORAGE_KEY_SESSION, newUser.id);
    
    return { success: true, message: "Sign up successful!", user: newUser };
};

export const login = async (email: string, password: string): Promise<{ success: boolean, message: string, user?: User }> => {
    const users = getUsers();
    const user = users.find(u => u.emailOrPhone === email && u.passwordHash === hashPassword(password));

    if (user) {
        localStorage.setItem(STORAGE_KEY_SESSION, user.id);
        return { success: true, message: "Login successful!", user };
    }
    
    return { success: false, message: "Invalid credentials." };
};

export const getCurrentUser = async (): Promise<User | null> => {
    const sessionId = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!sessionId) return null;
    
    const users = getUsers();
    return users.find(u => u.id === sessionId) || null;
};

export const logout = async () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
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
    const index = users.findIndex(u => u.emailOrPhone === email);
    
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
