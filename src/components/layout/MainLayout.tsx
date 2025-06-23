import React, { ReactNode, useState } from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '../common/ErrorBoundary';

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
export const MainLayout = ({ children }: MainLayoutProps): JSX.Element => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Navbar onMenuClick={isMobile ? handleDrawerToggle : undefined} />
        <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - 240px)` },
            marginTop: '64px', // Height of the Navbar
            transition: (theme) => theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          <Container 
            maxWidth="xl" 
            sx={{ 
              py: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};
