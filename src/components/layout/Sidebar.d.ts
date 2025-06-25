/**
 * Props for the Sidebar component
 */
interface SidebarProps {
    /** Controls the mobile drawer open/close state */
    mobileOpen: boolean;
    /** Callback function when the sidebar is closed (mobile) */
    onClose: () => void;
}
/**
 * Sidebar component that provides navigation for the application.
 * Supports nested menu items and responsive design.
 *
 * @component
 * @param {SidebarProps} props - The component props
 * @returns {JSX.Element} The rendered Sidebar component
 */
export declare const Sidebar: ({ mobileOpen, onClose }: SidebarProps) => JSX.Element;
export {};
