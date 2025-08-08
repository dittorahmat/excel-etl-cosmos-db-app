import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '../common/ErrorBoundary';
export const MainLayout = ({ children }) => {
    return (_jsx(ErrorBoundary, { children: _jsxs("div", { className: "flex h-screen bg-gray-100 dark:bg-gray-900", children: [_jsx(Sidebar, {}), _jsxs("div", { className: "flex flex-col flex-1", children: [_jsx(Navbar, {}), _jsx("main", { className: "flex-1 p-4 overflow-y-auto", children: children })] })] }) }));
};
