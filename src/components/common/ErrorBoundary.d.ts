import { Component, ErrorInfo, ReactNode } from 'react';
interface ErrorBoundaryProps {
    /** Content to be rendered inside the error boundary */
    children: ReactNode;
    /** Optional fallback UI when an error occurs */
    fallback?: ReactNode;
    /** Callback when an error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}
/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI.
 */
export declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): {
        hasError: boolean;
        error: Error;
    };
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    handleReset: () => void;
    render(): ReactNode;
}
export declare const ErrorBoundaryComponent: typeof ErrorBoundary;
export default ErrorBoundary;
