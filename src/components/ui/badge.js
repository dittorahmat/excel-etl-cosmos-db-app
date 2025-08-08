import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../lib/utils";
import { badgeVariants } from "../../lib/badge-variants";
function Badge({ className, variant, ...props }) {
    return (_jsx("div", { className: cn(badgeVariants({ variant }), className), ...props }));
}
export { Badge };
