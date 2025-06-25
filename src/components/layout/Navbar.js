import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
// Import the default export from ErrorBoundary
import ErrorBoundaryComponent from '../common/ErrorBoundary';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, Avatar, Box, Divider, ListItemIcon, ListItemText, Tooltip, } from '@mui/material';
import { ExitToApp, Menu as MenuIcon, Person, Settings, } from '@mui/icons-material';
/**
 * Navbar component that displays the application header with user menu and navigation
 *
 * @component
 * @param {Object} props - Component props
 * @param {() => void} [props.onMenuClick] - Callback function for menu button click
 * @returns {JSX.Element} Rendered Navbar component
 */
// Styles for the Navbar component
const styles = {
    appBar: {
        elevation: 0,
    },
    menuButton: {
        mr: 2,
    },
    title: {
        flexGrow: 1,
        textDecoration: 'none',
        color: 'inherit',
        fontWeight: 'bold',
        '&:hover': {
            opacity: 0.9,
        },
    },
    menuPaper: {
        overflow: 'visible',
        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
        mt: 1.5,
        '& .MuiAvatar-root': {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
        },
        '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
        },
    },
};
/**
 * Navbar component that displays the application header with user menu and navigation
 */
export const Navbar = ({ onMenuClick }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();
    // Safely type the user as our extended type
    const typedUser = user;
    /**
     * Get user profile information with fallbacks
     */
    const getUserProfile = () => ({
        name: typedUser?.name || typedUser?.username || 'User',
        email: typedUser?.email || '',
        picture: typedUser?.picture,
    });
    // Get user profile
    const userProfile = getUserProfile();
    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = useCallback(() => {
        setAnchorEl(null);
    }, []);
    const handleLogout = useCallback(async () => {
        try {
            await logout();
            navigate('/login');
        }
        catch (error) {
            console.error('Error signing out:', error);
        }
        handleMenuClose();
    }, [logout, navigate, handleMenuClose]);
    const handleProfileClick = () => {
        handleMenuClose();
        navigate('/profile');
    };
    const handleSettingsClick = () => {
        handleMenuClose();
        navigate('/settings');
    };
    /**
     * Get user initials from their name
     */
    const getUserInitials = () => {
        const name = userProfile.name || 'U';
        return name
            .split(' ')
            .map((part) => (part[0] || '').toUpperCase())
            .join('')
            .substring(0, 2);
    };
    return (_jsx(ErrorBoundaryComponent, { children: _jsx(AppBar, { position: "static", sx: styles.appBar, children: _jsxs(Toolbar, { children: [onMenuClick && (_jsx(IconButton, { edge: "start", color: "inherit", "aria-label": "menu", onClick: onMenuClick, sx: styles.menuButton, children: _jsx(MenuIcon, {}) })), _jsx(Typography, { variant: "h6", component: RouterLink, to: "/", sx: styles.title, children: "Excel ETL App" }), isAuthenticated ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Tooltip, { title: "Account settings", children: _jsx(IconButton, { onClick: handleProfileMenuOpen, size: "small", sx: { ml: 2 }, "aria-controls": "account-menu", "aria-haspopup": "true", children: userProfile.picture ? (_jsx(Avatar, { alt: userProfile.name || 'User', src: userProfile.picture, sx: { width: 32, height: 32 } })) : (_jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: 'primary.main' }, children: getUserInitials() })) }) }), _jsxs(Menu, { id: "account-menu", anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, onClick: handleMenuClose, PaperProps: {
                                    elevation: 0,
                                    sx: styles.menuPaper
                                }, transformOrigin: { horizontal: 'right', vertical: 'top' }, anchorOrigin: { horizontal: 'right', vertical: 'bottom' }, children: [_jsxs(Box, { sx: { px: 2, py: 1 }, children: [_jsx(Typography, { variant: "subtitle1", fontWeight: "medium", children: userProfile.name || 'User' }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: userProfile.email || '' })] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: handleProfileClick, children: [_jsx(ListItemIcon, { children: _jsx(Person, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Profile" })] }), _jsxs(MenuItem, { onClick: handleSettingsClick, children: [_jsx(ListItemIcon, { children: _jsx(Settings, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Settings" })] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: handleLogout, children: [_jsx(ListItemIcon, { children: _jsx(ExitToApp, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Logout" })] })] })] })) : (_jsx(Button, { color: "inherit", component: RouterLink, to: "/login", sx: { textTransform: 'none' }, children: "Sign In" }))] }) }) }));
};
