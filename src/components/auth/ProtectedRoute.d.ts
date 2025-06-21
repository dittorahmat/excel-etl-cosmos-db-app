import { ReactNode } from 'react';
interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: string;
}
export declare const ProtectedRoute: ({ children, requiredRole }: ProtectedRouteProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
