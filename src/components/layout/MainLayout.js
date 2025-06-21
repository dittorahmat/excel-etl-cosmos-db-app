import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';
export const MainLayout = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    return (_jsxs(Box, { sx: { display: 'flex', minHeight: '100vh' }, children: [_jsx(Navbar, { onMenuClick: isMobile ? handleDrawerToggle : undefined }), _jsx(Sidebar, { mobileOpen: mobileOpen, onClose: handleDrawerToggle }), _jsx(Box, { component: "main", sx: {
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${240}px)` },
                    marginTop: '64px', // Height of the Navbar
                }, children: _jsx(Container, { maxWidth: "xl", sx: { py: 2 }, children: children }) })] }));
};
