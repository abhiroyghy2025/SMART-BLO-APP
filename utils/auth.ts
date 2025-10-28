import type { User, BloInfo, VoterRecord } from '../types';

// In a real application, this would be a secure, server-side database.
// We are using localStorage to simulate this for the browser-only environment.
const USERS_STORAGE_KEY = 'smart-blo-users';
const SESSION_STORAGE_KEY = 'smart-blo-session';

// --- Helper Functions ---

const getUsers = (): User[] => {
    try {
        const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
        return usersJson ? JSON.parse(usersJson) : [];
    } catch {
        return [];
    }
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

// Simple hashing function for demonstration. A real app MUST use a strong, salted hashing algorithm like bcrypt.
const hashPassword = (password: string): string => {
    // This is NOT secure. For demonstration purposes only.
    return `hashed_${password}`;
};

// --- Admin Setup ---

const ADMIN_CREDENTIALS = {
    emailOrPhone1: 'abhiroy.ghy@gmail.com',
    emailOrPhone2: '9474431525',
    password: 'Abhi@1234',
    name: 'Sukamal Roy (Admin)',
};

const initializeAdmin = () => {
    const users = getUsers();
    let adminExists = users.some(u => u.emailOrPhone === ADMIN_CREDENTIALS.emailOrPhone1);
    if (!adminExists) {
        const adminUser: User = {
            id: `user_${Date.now()}`,
            name: ADMIN_CREDENTIALS.name,
            emailOrPhone: ADMIN_CREDENTIALS.emailOrPhone1,
            passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
            isAdmin: true,
            bloInfo: {
                "LAC NO & NAME": "N/A",
                "PART NO & NAME": "N/A",
                "NAME OF THE BLO": ADMIN_CREDENTIALS.name,
                "CONTACT NO": ADMIN_CREDENTIALS.emailOrPhone2,
            },
            voterData: [],
            headers: [],
        };
        users.push(adminUser);
        saveUsers(users);
    }
};

// Ensure admin exists on script load
initializeAdmin();


// --- Public Auth API ---

export const signUp = (name: string, emailOrPhone: string, password: string, bloInfo: BloInfo): { success: boolean, message: string, user?: User } => {
    const users = getUsers();
    if (users.some(u => u.emailOrPhone.toLowerCase() === emailOrPhone.toLowerCase())) {
        return { success: false, message: "A user with this email or phone number already exists." };
    }

    const newUser: User = {
        id: `user_${Date.now()}_${Math.random()}`,
        name,
        emailOrPhone,
        passwordHash: hashPassword(password),
        isAdmin: false,
        bloInfo,
        voterData: [],
        headers: [],
    };

    users.push(newUser);
    saveUsers(users);
    return { success: true, message: "Sign up successful!", user: newUser };
};

export const login = (emailOrPhone: string, password: string): { success: boolean, message: string, user?: User } => {
    const users = getUsers();
    const normalizedInput = emailOrPhone.toLowerCase();
    
    const user = users.find(u => 
        u.emailOrPhone.toLowerCase() === normalizedInput ||
        (u.isAdmin && (ADMIN_CREDENTIALS.emailOrPhone1 === normalizedInput || ADMIN_CREDENTIALS.emailOrPhone2 === normalizedInput))
    );

    const passwordToMatch = user?.isAdmin ? hashPassword(ADMIN_CREDENTIALS.password) : hashPassword(password);

    if (user && user.passwordHash === passwordToMatch) {
        localStorage.setItem(SESSION_STORAGE_KEY, user.id);
        return { success: true, message: "Login successful!", user };
    }
    
    return { success: false, message: "Invalid credentials. Please try again." };
};

export const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getCurrentUser = (): User | null => {
    const userId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!userId) return null;

    const users = getUsers();
    return users.find(u => u.id === userId) || null;
};

export const updateUserData = (userId: string, data: { voterData: VoterRecord[], headers: string[] }): boolean => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;

    users[userIndex].voterData = data.voterData;
    users[userIndex].headers = data.headers;
    saveUsers(users);
    return true;
};

// --- Admin Functions ---

export const getAllUsers = (): User[] => {
    // In a real app, this would be a protected admin endpoint.
    return getUsers();
};

export const updateUserByAdmin = (userId: string, updates: { name: string, bloInfo: BloInfo }): boolean => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;

    users[userIndex].name = updates.name;
    users[userIndex].bloInfo = updates.bloInfo;
    saveUsers(users);
    return true;
};

export const resetPasswordByAdmin = (userId: string, newPassword: string): boolean => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;

    users[userIndex].passwordHash = hashPassword(newPassword);
    saveUsers(users);
    return true;
};

export const deleteUserByAdmin = (userId: string): boolean => {
    let users = getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);
    
    if (users.length < initialLength) {
        saveUsers(users);
        return true;
    }
    return false;
};
