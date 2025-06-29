import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useContext7WithAuth } from '../lib/context7.js';
// Using native button for now since shadcn button is not properly set up
const Button = (props) => (_jsx("button", { ...props, className: `inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${props.variant === 'outline'
        ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
        : 'bg-primary text-primary-foreground hover:bg-primary/90'} h-10 px-4 py-2 ${props.className || ''}` }));
// Using native input for now since shadcn input is not properly set up
const Input = (props) => (_jsx("input", { ...props, className: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}` }));
export const Context7Example = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const { query: queryContext, isAuthenticated } = useContext7WithAuth();
    const handleSearch = async () => {
        if (!query.trim()) {
            setError('Please enter a search query');
            return;
        }
        if (!isAuthenticated) {
            setError('Please sign in to use Context7');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await queryContext(query);
            setResults(response);
        }
        catch (err) {
            console.error('Context7 query failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to query Context7. Please try again.');
        }
        finally {
            setIsLoading(false);
        }
    };
    if (!isAuthenticated) {
        return (_jsxs("div", { className: "space-y-4 p-4 border rounded-lg bg-muted/50", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Context7 Integration" }), _jsx("p", { className: "text-muted-foreground", children: "Please sign in to use the Context7 integration." })] }));
    }
    return (_jsxs("div", { className: "space-y-4 p-4 border rounded-lg", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Context7 Integration" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Search using Context7 with your authenticated session." }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Enter your query...", className: "flex-1", onKeyDown: (e) => e.key === 'Enter' && handleSearch(), disabled: isLoading }), _jsx(Button, { onClick: handleSearch, disabled: isLoading || !query.trim(), className: "min-w-[100px]", children: isLoading ? 'Searching...' : 'Search' })] }), error && (_jsx("div", { className: "p-3 text-sm text-red-600 bg-red-50 rounded-md", children: error })), results && (_jsxs("div", { className: "mt-4 space-y-2", children: [_jsx("h3", { className: "font-medium", children: "Results:" }), _jsx("div", { className: "p-4 bg-muted/50 rounded-md overflow-auto max-h-96", children: _jsx("pre", { className: "text-xs", children: JSON.stringify(results, null, 2) }) })] }))] }));
};
