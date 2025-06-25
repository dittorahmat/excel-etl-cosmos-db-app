import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { ReportProblem as ReportProblemIcon } from '@mui/icons-material';
/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "handleReset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                });
            }
        });
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }
    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        // Log the error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        // Update state with error info
        this.setState({ errorInfo });
        // Call the onError callback if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError) {
            // Render the provided fallback or the default error UI
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs(Box, { sx: { p: 3, maxWidth: '100%' }, children: [_jsxs(Alert, { severity: "error", icon: _jsx(ReportProblemIcon, { fontSize: "inherit" }), sx: { mb: 2 }, children: [_jsx(AlertTitle, { children: "Something went wrong" }), this.state.error?.message || 'An unexpected error occurred', _jsx(Box, { sx: { mt: 2 }, children: _jsx(Button, { variant: "outlined", color: "inherit", onClick: this.handleReset, size: "small", children: "Try again" }) })] }), process.env.NODE_ENV === 'development' && this.state.errorInfo && (_jsxs("details", { style: { whiteSpace: 'pre-wrap', marginTop: '1rem' }, children: [_jsx("summary", { children: "Error details" }), _jsx("pre", { style: { overflowX: 'auto' }, children: this.state.errorInfo.componentStack })] }))] }));
        }
        return this.props.children;
    }
}
// Default export with a more specific name to avoid naming conflicts
export const ErrorBoundaryComponent = ErrorBoundary;
export default ErrorBoundary;
