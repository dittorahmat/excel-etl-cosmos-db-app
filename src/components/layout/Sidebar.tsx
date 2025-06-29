import { useState, useEffect, type ReactNode } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { type SxProps, type Theme } from '@mui/material';
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
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Upload as UploadIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  // ChevronLeft and ChevronRight are unused in the current implementation
  List as ListIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

// Constants
const DRAWER_WIDTH = 240;

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
 * Represents a single menu item in the sidebar
 */
interface MenuItem {
  /** Display text of the menu item */
  text: string;
  /** Icon component to display next to the text */
  icon: ReactNode;
  /** Path to navigate to when clicked */
  path: string;
  /** Optional child menu items */
  children?: MenuItem[];
  /** Optional flag to indicate if the item is a divider */
  isDivider?: boolean;
  /** Optional flag to indicate if the item is a header */
  isHeader?: boolean;
  /** Whether this menu item requires authentication */
  requiresAuth?: boolean;
}

/**
 * Sidebar component that provides navigation for the application.
 * Supports nested menu items and responsive design.
 *
 * @component
 * @param {SidebarProps} props - The component props
 * @returns {JSX.Element} The rendered Sidebar component
 */
export const Sidebar = ({ mobileOpen, onClose }: SidebarProps): JSX.Element => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated } = useAuth();
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  // Close mobile drawer when route changes
  useEffect(() => {
    if (mobileOpen && isMobile) {
      onClose();
    }
  }, [location.pathname, isMobile, mobileOpen, onClose]);

  /**
   * Toggle the expanded state of a menu item
   */
  const handleItemClick = (text: string) => {
    setOpenItems(prev => ({
      ...prev,
      [text]: !prev[text]
    }));
  };

  /**
   * Check if a menu item is currently selected
   */
  const isItemSelected = (path: string): boolean => {
    return location.pathname === path ||
           (path !== '/' && location.pathname.startsWith(path));
  };

  /**
   * Render a single menu item
   */
  const renderMenuItem = (item: MenuItem, index: number, isChild = false) => {
    if (item.isDivider) {
      return <Divider key={`divider-${index}`} sx={styles.divider} />;
    }

    if (item.isHeader) {
      return (
        <ListItem key={item.text} sx={styles.header}>
          <ListItemText primary={item.text} />
        </ListItem>
      );
    }

    const hasChildren = item.children && item.children.length > 0;
    const isSelected = isItemSelected(item.path);
    const isExpanded = openItems[item.text];

    return (
      <ErrorBoundary key={item.path}>
        <ListItem
          disablePadding
          sx={{
            ...(isChild ? styles.childItem : {}),
            ...(isSelected ? styles.selectedItem : {})
          }}
        >
          <ListItemButton
            component={RouterLink}
            to={item.path}
            onClick={() => hasChildren ? handleItemClick(item.text) : undefined}
            sx={styles.listItemButton}
          >
            <ListItemIcon sx={styles.listItemIcon}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
            {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((child, childIndex) =>
                renderMenuItem(child, childIndex, true)
              )}
            </List>
          </Collapse>
        )}
      </ErrorBoundary>
    );
  };

  // Styles for the Sidebar component
  const styles = {
    drawer: {
      width: DRAWER_WIDTH,
      flexShrink: 0,
      '& .MuiDrawer-paper': {
        width: DRAWER_WIDTH,
        boxSizing: 'border-box',
        backgroundColor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`,
      },
    },
    drawerHeader: {
      display: 'flex',
      alignItems: 'center',
      padding: theme.spacing(0, 1),
      ...theme.mixins.toolbar,
      justifyContent: 'flex-end',
    },
    listItemButton: {
      '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
      },
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
    },
    listItemIcon: {
      minWidth: 40,
      color: 'inherit',
    },
    childItem: {
      paddingLeft: theme.spacing(4),
    },
    selectedItem: {
      backgroundColor: theme.palette.action.selected,
    },
    divider: {
      margin: theme.spacing(1, 0),
    },
    header: {
      color: theme.palette.text.secondary,
      padding: theme.spacing(1, 2),
      marginTop: theme.spacing(1),
      textTransform: 'uppercase',
      fontWeight: theme.typography.fontWeightMedium,
      fontSize: theme.typography.pxToRem(12),
      letterSpacing: '0.5px',
    },
  } as const satisfies Record<string, SxProps<Theme>>;

  // Define menu items
  const menuItems: MenuItem[] = [
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
      requiresAuth: true,
    },
  ];

  // Filter menu items based on authentication if needed
  const filteredMenuItems = isAuthenticated
    ? [...menuItems, ...adminMenuItems]
    : menuItems.filter(item => !item.requiresAuth);

  // Render the drawer content
  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH }}>
      <Toolbar />
      <List>
        {filteredMenuItems.map((item, index) => renderMenuItem(item, index))}
      </List>

      {/* Optional: Add a collapsible section for settings/account */}
      <Box sx={{ mt: 'auto' }}>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton
              component={RouterLink}
              to="/settings"
              sx={styles.listItemButton}
              selected={location.pathname === '/settings'}
            >
              <ListItemIcon sx={styles.listItemIcon}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <ErrorBoundary>
      <Box component="nav" sx={styles.drawer}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
    </ErrorBoundary>
  );
};
