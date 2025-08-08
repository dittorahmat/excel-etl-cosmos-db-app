import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ApiQueryBuilder } from '../components/ApiQueryBuilder/ApiQueryBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
const ApiQueryBuilderPage = () => {
    return (_jsxs("div", { className: "container mx-auto p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "API Query Builder Standalone" }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Build Your API Query" }) }), _jsx(CardContent, { children: _jsx(ApiQueryBuilder, { baseUrl: "/api/v2/query/rows" }) })] })] }));
};
export default ApiQueryBuilderPage;
