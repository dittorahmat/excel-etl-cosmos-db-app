import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Upload, Database, ChevronDown, ChevronRight, KeyRound, } from 'lucide-react';
import { useState } from 'react';
const menuItems = [
    {
        title: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
    },
    {
        title: 'Data Upload',
        path: '/upload',
        icon: Upload,
    },
];
const adminMenuItems = [
    {
        title: 'API Keys',
        path: '/api-keys',
        icon: KeyRound,
    },
    {
        title: 'API Query Builder',
        path: '/api-query-builder',
        icon: Database, // Using Database icon for now, can be changed later
    },
];
export const Sidebar = () => {
    const { isAuthenticated } = useAuth();
    const [openSections, setOpenSections] = useState({});
    const toggleSection = (title) => {
        setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
    };
    return (_jsxs("aside", { className: "w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col", children: [_jsx("div", { className: "h-16 flex items-center justify-center border-b dark:border-gray-700", children: _jsx("h1", { className: "text-2xl font-bold", children: "ETL" }) }), _jsxs("nav", { className: "flex-1 px-2 py-4 space-y-1", children: [menuItems.map((item) => item.subItems ? (_jsxs("div", { children: [_jsxs(Button, { variant: "ghost", className: "w-full justify-between", onClick: () => toggleSection(item.title), children: [_jsxs("div", { className: "flex items-center", children: [_jsx(item.icon, { className: "mr-3 h-5 w-5" }), item.title] }), openSections[item.title] ? (_jsx(ChevronDown, { className: "h-5 w-5" })) : (_jsx(ChevronRight, { className: "h-5 w-5" }))] }), openSections[item.title] && (_jsx("div", { className: "pl-4 mt-1 space-y-1", children: item.subItems.map((subItem) => (_jsxs(NavLink, { to: subItem.path, className: ({ isActive }) => cn('flex items-center px-3 py-2 text-sm font-medium rounded-md', isActive
                                        ? 'bg-gray-200 dark:bg-gray-700'
                                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'), children: [_jsx(subItem.icon, { className: "mr-3 h-5 w-5" }), subItem.title] }, subItem.path))) }))] }, item.title)) : (_jsxs(NavLink, { to: item.path, className: ({ isActive }) => cn('flex items-center px-3 py-2 text-sm font-medium rounded-md', isActive
                            ? 'bg-gray-200 dark:bg-gray-700'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700'), children: [_jsx(item.icon, { className: "mr-3 h-5 w-5" }), item.title] }, item.path))), isAuthenticated && (_jsx("div", { className: "pt-4 mt-4 border-t dark:border-gray-700", children: adminMenuItems.map((item) => (_jsxs(NavLink, { to: item.path, className: ({ isActive }) => cn('flex items-center px-3 py-2 text-sm font-medium rounded-md', isActive
                                ? 'bg-gray-200 dark:bg-gray-700'
                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'), children: [_jsx(item.icon, { className: "mr-3 h-5 w-5" }), item.title] }, item.path))) }))] })] }));
};
