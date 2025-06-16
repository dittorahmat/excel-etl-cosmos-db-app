import { useState, useEffect } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  Box,
  Collapse,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Upload as UploadIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight,
  List as ListIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  children?: MenuItem[];
}

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Auth context is used by other parts of the component
  useAuth();
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  // Close mobile drawer when route changes
  useEffect(() => {
    if (mobileOpen && isMobile) {
      onClose();
    }
  }, [location.pathname, isMobile, mobileOpen, onClose]);

  const handleClick = (text: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [text]: !prev[text],
    }));
  };

  const mainMenuItems: MenuItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      text: 'Data Upload',
      icon: <UploadIcon />,
      path: '/upload',
    },
    {
      text: 'Data Management',
      icon: <StorageIcon />,
      path: '/data',
      children: [
        {
          text: 'View All Data',
          icon: <ListIcon />,
          path: '/data',
        },
        {
          text: 'Add New',
          icon: <AddIcon />,
          path: '/data/new',
        },
      ],
    },
    {
      text: 'Bulk Operations',
      icon: <CloudUploadIcon />,
      path: '/bulk-upload',
    },
    {
      text: 'History',
      icon: <HistoryIcon />,
      path: '/history',
    },
  ];

  const adminMenuItems: MenuItem[] = [
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
    },
  ];

  const renderMenuItems = (items: MenuItem[], depth = 0) => {
    return items.map((item) => (
      <div key={item.path}>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to={item.path}
            selected={location.pathname === item.path}
            onClick={() => {
              if (item.children) {
                handleClick(item.text);
              }
            }}
            sx={{
              pl: 2 + depth * 2,
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.16)',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
            {item.children && (
              <>
                {openItems[item.text] ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItemButton>
        </ListItem>
        {item.children && (
          <Collapse in={openItems[item.text]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {renderMenuItems(item.children, depth + 1)}
            </List>
          </Collapse>
        )}
      </div>
    ));
  };

  const drawer = (
    <div>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box sx={{ flexGrow: 1 }}>Menu</Box>
          {!isMobile && (
            <IconButton onClick={onClose} size="small">
              {theme.direction === 'rtl' ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          )}
        </Box>
      </Toolbar>
      <Divider />
      <List>{renderMenuItems(mainMenuItems)}</List>
      <Divider />
      <List>{renderMenuItems(adminMenuItems)}</List>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="mailbox folders"
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};
