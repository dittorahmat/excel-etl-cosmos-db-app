import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
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
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs("div", { className: "p-4 max-w-full", children: [_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "Something went wrong" }), _jsxs(AlertDescription, { children: [this.state.error?.message || 'An unexpected error occurred', _jsx("div", { className: "mt-4", children: _jsx(Button, { variant: "outline", onClick: this.handleReset, size: "sm", children: "Try again" }) })] })] }), process.env.NODE_ENV === 'development' && this.state.errorInfo && (_jsxs("details", { className: "mt-4 whitespace-pre-wrap", children: [_jsx("summary", { children: "Error details" }), _jsx("pre", { className: "overflow-x-auto", children: this.state.errorInfo.componentStack })] }))] }));
        }
        return this.props.children;
    }
}
export const ErrorBoundaryComponent = ErrorBoundary;
export default ErrorBoundary;
