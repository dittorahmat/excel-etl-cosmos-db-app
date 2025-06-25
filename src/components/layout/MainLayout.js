import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '../common/ErrorBoundary';
/**
 * MainLayout component that provides the overall structure for the application
 * including Navbar, Sidebar, and main content area with responsive design.
 *
 * @component
 * @param {MainLayoutProps} props - The component props
 * @param {ReactNode} props.children - The content to be rendered inside the layout
 * @returns {JSX.Element} The rendered MainLayout component
 */
export const MainLayout = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    return (_jsx(ErrorBoundary, { children: _jsxs(Box, { sx: { display: 'flex', minHeight: '100vh' }, children: [_jsx(Navbar, { onMenuClick: isMobile ? handleDrawerToggle : undefined }), _jsx(Sidebar, { mobileOpen: mobileOpen, onClose: handleDrawerToggle }), _jsx(Box, { component: "main", sx: {
                        flexGrow: 1,
                        p: 3,
                        width: { sm: `calc(100% - 240px)` },
                        marginTop: '64px', // Height of the Navbar
                        transition: (theme) => theme.transitions.create(['margin', 'width'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.leavingScreen,
                        }),
                    }, children: _jsx(Container, { maxWidth: "xl", sx: {
                            py: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }, children: children }) })] }) }));
};
