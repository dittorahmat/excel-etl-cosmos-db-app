import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider.js';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, Avatar, Box, Divider, ListItemIcon, ListItemText, Tooltip, } from '@mui/material';
import { ExitToApp, Menu as MenuIcon, Person, Settings, } from '@mui/icons-material';
export const Navbar = ({ onMenuClick }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();
    // Safely type the user as our extended type
    const typedUser = user;
    // Create a safe user profile object with fallbacks
    const userProfile = {
        name: typedUser?.name || typedUser?.username || 'User',
        email: typedUser?.email || '',
        picture: typedUser?.picture,
    };
    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleLogout = async () => {
        handleMenuClose();
        try {
            await logout();
            navigate('/login');
        }
        catch (error) {
            console.error('Logout failed:', error);
        }
    };
    const handleProfileClick = () => {
        handleMenuClose();
        navigate('/profile');
    };
    const handleSettingsClick = () => {
        handleMenuClose();
        navigate('/settings');
    };
    const getUserInitials = () => {
        if (!typedUser)
            return 'U';
        const name = userProfile.name || '';
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };
    return (_jsx(AppBar, { position: "static", elevation: 0, children: _jsxs(Toolbar, { children: [onMenuClick && (_jsx(IconButton, { edge: "start", color: "inherit", "aria-label": "menu", onClick: onMenuClick, sx: { mr: 2 }, children: _jsx(MenuIcon, {}) })), _jsx(Typography, { variant: "h6", component: RouterLink, to: "/", sx: {
                        flexGrow: 1,
                        textDecoration: 'none',
                        color: 'inherit',
                        fontWeight: 'bold',
                        '&:hover': {
                            opacity: 0.9,
                        },
                    }, children: "Excel ETL App" }), isAuthenticated ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [_jsx(Tooltip, { title: "Account settings", children: _jsx(IconButton, { onClick: handleProfileMenuOpen, size: "small", sx: { ml: 2 }, "aria-controls": "account-menu", "aria-haspopup": "true", children: userProfile.picture ? (_jsx(Avatar, { alt: userProfile.name || 'User', src: userProfile.picture, sx: { width: 32, height: 32 } })) : (_jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: 'primary.main' }, children: getUserInitials() })) }) }), _jsxs(Menu, { id: "account-menu", anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, onClick: handleMenuClose, PaperProps: {
                                elevation: 0,
                                sx: {
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
                            }, transformOrigin: { horizontal: 'right', vertical: 'top' }, anchorOrigin: { horizontal: 'right', vertical: 'bottom' }, children: [_jsxs(Box, { sx: { px: 2, py: 1 }, children: [_jsx(Typography, { variant: "subtitle1", fontWeight: "medium", children: userProfile.name || 'User' }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: userProfile.email || '' })] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: handleProfileClick, children: [_jsx(ListItemIcon, { children: _jsx(Person, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Profile" })] }), _jsxs(MenuItem, { onClick: handleSettingsClick, children: [_jsx(ListItemIcon, { children: _jsx(Settings, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Settings" })] }), _jsx(Divider, {}), _jsxs(MenuItem, { onClick: handleLogout, children: [_jsx(ListItemIcon, { children: _jsx(ExitToApp, { fontSize: "small" }) }), _jsx(ListItemText, { children: "Logout" })] })] })] })) : (_jsx(Button, { color: "inherit", component: RouterLink, to: "/login", sx: { textTransform: 'none' }, children: "Sign In" }))] }) }));
};
