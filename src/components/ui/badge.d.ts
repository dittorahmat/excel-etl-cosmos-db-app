import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "../../lib/badge-variants";
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
}
declare function Badge({ className, variant, ...props }: BadgeProps): import("react/jsx-runtime").JSX.Element;
export { Badge };
