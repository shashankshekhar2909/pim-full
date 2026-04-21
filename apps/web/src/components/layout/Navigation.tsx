import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  Tooltip,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import WebhookIcon from '@mui/icons-material/Webhook';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 64;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Search', path: '/search', icon: <SearchIcon /> },
  { label: 'Products', path: '/skus', icon: <InventoryIcon /> },
  { label: 'Categories', path: '/categories', icon: <CategoryIcon /> },
  { label: 'Import Data', path: '/onboarding', icon: <UploadFileIcon /> },
  { label: 'Reports', path: '/reports', icon: <AssessmentIcon /> },
  { label: 'Team', path: '/team', icon: <PeopleIcon /> },
  { label: 'Integrations', path: '/integrations', icon: <WebhookIcon /> },
];

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, sidebarCollapsed } = useAppSelector((state) => state.ui);

  const drawerWidth = sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Drawer
      variant="persistent"
      open={sidebarOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.2s ease',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflowX: 'hidden',
          transition: 'width 0.2s ease',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', pt: 1 }}>
        <List disablePadding>
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                <Tooltip title={sidebarCollapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={isActive}
                    sx={{
                      minHeight: 48,
                      justifyContent: sidebarCollapsed ? 'center' : 'initial',
                      px: 2.5,
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.50',
                        color: 'primary.700',
                        '& .MuiListItemIcon-root': {
                          color: 'primary.700',
                        },
                        '&:hover': {
                          bgcolor: 'primary.100',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: sidebarCollapsed ? 0 : 2,
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!sidebarCollapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ mt: 2 }} />

        {!sidebarCollapsed && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="caption" color="text.disabled" fontWeight={600}>
              PIM System v0.1
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default Navigation;
