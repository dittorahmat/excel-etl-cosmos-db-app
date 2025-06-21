import { ReactNode, useState } from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar onMenuClick={isMobile ? handleDrawerToggle : undefined} />
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${240}px)` },
          marginTop: '64px', // Height of the Navbar
        }}
      >
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};
