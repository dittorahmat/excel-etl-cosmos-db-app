import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider.js';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Toolbar, Box, Collapse, useTheme, useMediaQuery, IconButton, } from '@mui/material';
import { Dashboard as DashboardIcon, Upload as UploadIcon, Storage as StorageIcon, Settings as SettingsIcon, ExpandLess, ExpandMore, ChevronLeft, ChevronRight, List as ListIcon, Add as AddIcon, CloudUpload as CloudUploadIcon, History as HistoryIcon, } from '@mui/icons-material';
const drawerWidth = 240;
export const Sidebar = ({ mobileOpen, onClose }) => {
    const theme = useTheme();
    const location = useLocation();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    // Auth context is used by other parts of the component
    useAuth();
    const [openItems, setOpenItems] = useState({});
    // Close mobile drawer when route changes
    useEffect(() => {
        if (mobileOpen && isMobile) {
            onClose();
        }
    }, [location.pathname, isMobile, mobileOpen, onClose]);
    const handleClick = (text) => {
        setOpenItems((prev) => ({
            ...prev,
            [text]: !prev[text],
        }));
    };
    const mainMenuItems = [
        {
            text: 'Dashboard',
            icon: _jsx(DashboardIcon, {}),
            path: '/',
        },
        {
            text: 'Data Upload',
            icon: _jsx(UploadIcon, {}),
            path: '/upload',
        },
        {
            text: 'Data Management',
            icon: _jsx(StorageIcon, {}),
            path: '/data',
            children: [
                {
                    text: 'View All Data',
                    icon: _jsx(ListIcon, {}),
                    path: '/data',
                },
                {
                    text: 'Add New',
                    icon: _jsx(AddIcon, {}),
                    path: '/data/new',
                },
            ],
        },
        {
            text: 'Bulk Operations',
            icon: _jsx(CloudUploadIcon, {}),
            path: '/bulk-upload',
        },
        {
            text: 'History',
            icon: _jsx(HistoryIcon, {}),
            path: '/history',
        },
    ];
    const adminMenuItems = [
        {
            text: 'Settings',
            icon: _jsx(SettingsIcon, {}),
            path: '/settings',
        },
    ];
    const renderMenuItems = (items, depth = 0) => {
        return items.map((item) => (_jsxs("div", { children: [_jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { component: RouterLink, to: item.path, selected: location.pathname === item.path, onClick: () => {
                            if (item.children) {
                                handleClick(item.text);
                            }
                        }, sx: {
                            pl: 2 + depth * 2,
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.16)',
                                },
                            },
                        }, children: [_jsx(ListItemIcon, { sx: { minWidth: 40 }, children: item.icon }), _jsx(ListItemText, { primary: item.text }), item.children && (_jsx(_Fragment, { children: openItems[item.text] ? _jsx(ExpandLess, {}) : _jsx(ExpandMore, {}) }))] }) }), item.children && (_jsx(Collapse, { in: openItems[item.text], timeout: "auto", unmountOnExit: true, children: _jsx(List, { component: "div", disablePadding: true, children: renderMenuItems(item.children, depth + 1) }) }))] }, item.path)));
    };
    const drawer = (_jsxs("div", { children: [_jsx(Toolbar, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', width: '100%' }, children: [_jsx(Box, { sx: { flexGrow: 1 }, children: "Menu" }), !isMobile && (_jsx(IconButton, { onClick: onClose, size: "small", children: theme.direction === 'rtl' ? _jsx(ChevronRight, {}) : _jsx(ChevronLeft, {}) }))] }) }), _jsx(Divider, {}), _jsx(List, { children: renderMenuItems(mainMenuItems) }), _jsx(Divider, {}), _jsx(List, { children: renderMenuItems(adminMenuItems) })] }));
    return (_jsxs(Box, { component: "nav", sx: { width: { sm: drawerWidth }, flexShrink: { sm: 0 } }, "aria-label": "mailbox folders", children: [_jsx(Drawer, { variant: "temporary", open: mobileOpen, onClose: onClose, ModalProps: {
                    keepMounted: true, // Better open performance on mobile.
                }, sx: {
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                    },
                }, children: drawer }), _jsx(Drawer, { variant: "permanent", sx: {
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                    },
                }, open: true, children: drawer })] }));
};
