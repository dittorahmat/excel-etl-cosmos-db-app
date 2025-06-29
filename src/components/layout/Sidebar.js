import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Toolbar, Box, Collapse, useTheme, useMediaQuery, } from '@mui/material';
import { Dashboard as DashboardIcon, Upload as UploadIcon, Storage as StorageIcon, Settings as SettingsIcon, ExpandLess, ExpandMore, 
// ChevronLeft and ChevronRight are unused in the current implementation
List as ListIcon, Add as AddIcon, CloudUpload as CloudUploadIcon, History as HistoryIcon, } from '@mui/icons-material';
// Constants
const DRAWER_WIDTH = 240;
/**
 * Sidebar component that provides navigation for the application.
 * Supports nested menu items and responsive design.
 *
 * @component
 * @param {SidebarProps} props - The component props
 * @returns {JSX.Element} The rendered Sidebar component
 */
export const Sidebar = ({ mobileOpen, onClose }) => {
    const theme = useTheme();
    const location = useLocation();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { isAuthenticated } = useAuth();
    const [openItems, setOpenItems] = useState({});
    // Close mobile drawer when route changes
    useEffect(() => {
        if (mobileOpen && isMobile) {
            onClose();
        }
    }, [location.pathname, isMobile, mobileOpen, onClose]);
    /**
     * Toggle the expanded state of a menu item
     */
    const handleItemClick = (text) => {
        setOpenItems(prev => ({
            ...prev,
            [text]: !prev[text]
        }));
    };
    /**
     * Check if a menu item is currently selected
     */
    const isItemSelected = (path) => {
        return location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));
    };
    /**
     * Render a single menu item
     */
    const renderMenuItem = (item, index, isChild = false) => {
        if (item.isDivider) {
            return _jsx(Divider, { sx: styles.divider }, `divider-${index}`);
        }
        if (item.isHeader) {
            return (_jsx(ListItem, { sx: styles.header, children: _jsx(ListItemText, { primary: item.text }) }, item.text));
        }
        const hasChildren = item.children && item.children.length > 0;
        const isSelected = isItemSelected(item.path);
        const isExpanded = openItems[item.text];
        return (_jsxs(ErrorBoundary, { children: [_jsx(ListItem, { disablePadding: true, sx: {
                        ...(isChild ? styles.childItem : {}),
                        ...(isSelected ? styles.selectedItem : {})
                    }, children: _jsxs(ListItemButton, { component: RouterLink, to: item.path, onClick: () => hasChildren ? handleItemClick(item.text) : undefined, sx: styles.listItemButton, children: [_jsx(ListItemIcon, { sx: styles.listItemIcon, children: item.icon }), _jsx(ListItemText, { primary: item.text }), hasChildren && (isExpanded ? _jsx(ExpandLess, {}) : _jsx(ExpandMore, {}))] }) }), hasChildren && (_jsx(Collapse, { in: isExpanded, timeout: "auto", unmountOnExit: true, children: _jsx(List, { component: "div", disablePadding: true, children: item.children?.map((child, childIndex) => renderMenuItem(child, childIndex, true)) }) }))] }, item.path));
    };
    // Styles for the Sidebar component
    const styles = {
        drawer: {
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                backgroundColor: theme.palette.background.paper,
                borderRight: `1px solid ${theme.palette.divider}`,
            },
        },
        drawerHeader: {
            display: 'flex',
            alignItems: 'center',
            padding: theme.spacing(0, 1),
            ...theme.mixins.toolbar,
            justifyContent: 'flex-end',
        },
        listItemButton: {
            '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                },
            },
            '&:hover': {
                backgroundColor: theme.palette.action.hover,
            },
        },
        listItemIcon: {
            minWidth: 40,
            color: 'inherit',
        },
        childItem: {
            paddingLeft: theme.spacing(4),
        },
        selectedItem: {
            backgroundColor: theme.palette.action.selected,
        },
        divider: {
            margin: theme.spacing(1, 0),
        },
        header: {
            color: theme.palette.text.secondary,
            padding: theme.spacing(1, 2),
            marginTop: theme.spacing(1),
            textTransform: 'uppercase',
            fontWeight: theme.typography.fontWeightMedium,
            fontSize: theme.typography.pxToRem(12),
            letterSpacing: '0.5px',
        },
    };
    // Define menu items
    const menuItems = [
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
            requiresAuth: true,
        },
    ];
    // Filter menu items based on authentication if needed
    const filteredMenuItems = isAuthenticated
        ? [...menuItems, ...adminMenuItems]
        : menuItems.filter(item => !item.requiresAuth);
    // Render the drawer content
    const drawerContent = (_jsxs(Box, { sx: { width: DRAWER_WIDTH }, children: [_jsx(Toolbar, {}), _jsx(List, { children: filteredMenuItems.map((item, index) => renderMenuItem(item, index)) }), _jsxs(Box, { sx: { mt: 'auto' }, children: [_jsx(Divider, {}), _jsx(List, { children: _jsx(ListItem, { disablePadding: true, children: _jsxs(ListItemButton, { component: RouterLink, to: "/settings", sx: styles.listItemButton, selected: location.pathname === '/settings', children: [_jsx(ListItemIcon, { sx: styles.listItemIcon, children: _jsx(SettingsIcon, {}) }), _jsx(ListItemText, { primary: "Settings" })] }) }) })] })] }));
    return (_jsx(ErrorBoundary, { children: _jsxs(Box, { component: "nav", sx: styles.drawer, children: [_jsx(Drawer, { variant: "temporary", open: mobileOpen, onClose: onClose, ModalProps: {
                        keepMounted: true, // Better open performance on mobile
                    }, sx: {
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                        },
                    }, children: drawerContent }), _jsx(Drawer, { variant: "permanent", sx: {
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: DRAWER_WIDTH,
                        },
                    }, open: true, children: drawerContent })] }) }));
};
