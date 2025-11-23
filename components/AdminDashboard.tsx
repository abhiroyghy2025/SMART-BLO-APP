
import React, { useState, useEffect, useCallback } from 'react';
import type { User, BloInfo } from '../types';
import { HomeIcon, SpinnerIcon } from './icons';
import { Modal } from './Modal';
import { getAllUsers, updateUserByAdmin, resetPasswordByAdmin, deleteUserByAdmin } from '../utils/auth';

interface AdminDashboardProps {
    onGoHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onGoHome }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editableUser, setEditableUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setEditableUser(JSON.parse(JSON.stringify(user))); // Deep copy for editing
        setIsEditModalOpen(true);
    };
    
    const openResetPassModal = (user: User) => {
        setSelectedUser(user);
        setIsResetPassModalOpen(true);
    };

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const handleUserUpdate = async () => {
        if (!editableUser) return;
        const success = await updateUserByAdmin(editableUser.id, { name: editableUser.name, bloInfo: editableUser.bloInfo });
        if (success) {
            alert('User updated successfully.');
            fetchUsers();
            setIsEditModalOpen(false);
        } else {
            alert('Failed to update user.');
        }
    };
    
    const handlePasswordReset = async () => {
        if (!selectedUser) return;
        const success = await resetPasswordByAdmin(selectedUser.emailOrPhone);
        if (success) {
            alert(`Password for ${selectedUser.emailOrPhone} has been reset to "123456".`);
            setIsResetPassModalOpen(false);
        } else {
            alert('Failed to reset password.');
        }
    };

    const handleUserDelete = async () => {
        if (!selectedUser) return;
        const success = await deleteUserByAdmin(selectedUser.id);
        if (success) {
            alert('User deleted successfully.');
            fetchUsers();
            setIsDeleteModalOpen(false);
        } else {
            alert('Failed to delete user.');
        }
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'name' | keyof BloInfo) => {
        if (!editableUser) return;
        const { value } = e.target;
        if (field === 'name') {
            setEditableUser({ ...editableUser, name: value });
        } else {
            setEditableUser({
                ...editableUser,
                bloInfo: {
                    ...editableUser.bloInfo,
                    [field]: value
                }
            });
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-4xl font-bold text-yellow-400 font-copperplate-gothic tracking-wider">Admin Dashboard</h1>
                <button onClick={onGoHome} className="flex items-center gap-2 bg-slate-800 text-yellow-400 border border-yellow-500/50 px-4 py-2 rounded-lg hover:bg-yellow-400 hover:text-black transition-all">
                    <HomeIcon className="w-5 h-5" />
                    <span className="font-semibold">Back to Home</span>
                </button>
            </header>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <SpinnerIcon className="w-10 h-10 text-yellow-400 animate-spin" />
                </div>
            ) : (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Is Admin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800/80 divide-y divide-slate-800">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.emailOrPhone}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{user.isAdmin ? 'Yes' : 'No'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onClick={() => openEditModal(user)} className="text-blue-400 hover:text-blue-300" title="Edit User">Edit</button>
                                        <button onClick={() => openResetPassModal(user)} className="text-yellow-400 hover:text-yellow-300" title="Reset Password">Reset Pass</button>
                                        {!user.isAdmin && <button onClick={() => openDeleteModal(user)} className="text-red-400 hover:text-red-300" title="Delete User">Delete</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit User Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit User: ${selectedUser?.name}`}>
                {editableUser && (
                    <div className="space-y-4">
                        <InputField label="Full Name" value={editableUser.name} onChange={e => handleEditFormChange(e, 'name')} />
                        {Object.keys(editableUser.bloInfo).map(key => (
                             <InputField key={key} label={key as keyof BloInfo} value={editableUser.bloInfo[key as keyof BloInfo]} onChange={e => handleEditFormChange(e, key as keyof BloInfo)} />
                        ))}
                        <div className="flex justify-end gap-4 pt-2">
                            <button onClick={() => setIsEditModalOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded">Cancel</button>
                            <button onClick={handleUserUpdate} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded">Save Changes</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reset Password Modal */}
            <Modal isOpen={isResetPassModalOpen} onClose={() => setIsResetPassModalOpen(false)} title={`Reset Password for ${selectedUser?.name}`}>
                <div className="space-y-4">
                    <p className="text-slate-300">
                        Are you sure you want to reset the password for <strong>{selectedUser?.emailOrPhone}</strong>?
                        <br/><br/>
                        The password will be reset to default: <code className="text-yellow-400">123456</code>.
                    </p>
                    <div className="flex justify-end gap-4 pt-2">
                        <button onClick={() => setIsResetPassModalOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded">Cancel</button>
                        <button onClick={handlePasswordReset} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded">Confirm Reset</button>
                    </div>
                </div>
            </Modal>

            {/* Delete User Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={`Delete User: ${selectedUser?.name}`}>
                <div className="space-y-4">
                    <p className="text-slate-300">Are you sure you want to delete this user? This action cannot be undone.</p>
                    <div className="flex justify-end gap-4 pt-2">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded">Cancel</button>
                        <button onClick={handleUserDelete} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded">Confirm Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


const InputField: React.FC<{
    label: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    type?: string
}> = ({ label, value, onChange, type = "text" }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            className="block w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
        />
    </div>
);
