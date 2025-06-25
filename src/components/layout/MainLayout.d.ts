import { ReactNode } from 'react';
interface MainLayoutProps {
    /** The content to be rendered inside the layout */
    children: ReactNode;
}
/**
 * MainLayout component that provides the overall structure for the application
 * including Navbar, Sidebar, and main content area with responsive design.
 *
 * @component
 * @param {MainLayoutProps} props - The component props
 * @param {ReactNode} props.children - The content to be rendered inside the layout
 * @returns {JSX.Element} The rendered MainLayout component
 */
export declare const MainLayout: ({ children }: MainLayoutProps) => JSX.Element;
export {};
