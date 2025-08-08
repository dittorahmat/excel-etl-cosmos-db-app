import { useContext } from 'react';
import { AuthContext } from './AuthContext';
/**
 * Hook to use the auth context
 * @returns AuthContextType with authentication state and methods
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
