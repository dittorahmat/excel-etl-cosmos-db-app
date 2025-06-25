/**
 * Navbar component props
 */
interface NavbarProps {
    /** Callback function for menu button click */
    onMenuClick?: () => void;
}
/**
 * Navbar component that displays the application header with user menu and navigation
 */
export declare const Navbar: ({ onMenuClick }: NavbarProps) => JSX.Element;
export {};
