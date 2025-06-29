import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from "../ui/button.js";
import { useAuth } from "../../auth/AuthProvider";
export const LoginButton = () => {
    const { isAuthenticated, login, logout, user } = useAuth();
    return (_jsx("div", { className: "flex items-center gap-4", children: isAuthenticated ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "text-sm text-muted-foreground", children: ["Welcome, ", user?.name || 'User'] }), _jsx(Button, { variant: "outline", onClick: logout, children: "Sign out" })] })) : (_jsx(Button, { onClick: login, children: "Sign in with Microsoft" })) }));
};
