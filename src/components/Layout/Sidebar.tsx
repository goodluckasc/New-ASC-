import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,

  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  Business as BusinessIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  LocalShipping as LocalShippingIcon,
  Phone as PhoneIcon,
  Alarm as AlarmIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import type { Permissions } from '../../types';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  module?: keyof Permissions;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', module: 'dashboard' },
  { label: 'Customers & Vehicles', icon: <PeopleIcon />, path: '/vehicles', module: 'vehicles' },
  { label: 'Job Cards', icon: <AssignmentIcon />, path: '/jobcards', module: 'jobCards' },
  { label: 'Inventory', icon: <InventoryIcon />, path: '/inventory', module: 'inventory' },
  { label: 'Suppliers', icon: <BusinessIcon />, path: '/suppliers', module: 'suppliers' },
  { label: 'Purchases', icon: <ShoppingCartIcon />, path: '/purchases', module: 'purchases' },
  { label: 'Billing', icon: <ReceiptIcon />, path: '/billing', module: 'invoices' },
  { label: 'Payments', icon: <PaymentIcon />, path: '/payments', module: 'payments' },
  { label: 'Delivery', icon: <LocalShippingIcon />, path: '/delivery', module: 'deliveries' },
  { label: 'Calls', icon: <PhoneIcon />, path: '/calls', module: 'calls' },
  { label: 'Follow-ups', icon: <AlarmIcon />, path: '/followups', module: 'followUps' },
  { label: 'Reports', icon: <BarChartIcon />, path: '/reports', module: 'reports' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings', module: 'settings' },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ open, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const drawerWidth = open ? 260 : 72;

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        transition: 'width 0.3s ease',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          px: open ? 2 : 0,
          py: 1.5,
          minHeight: 64,
        }}
      >
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src="/logo.png"
              alt="ASC"
              sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
            >
              ASC
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
              ASC APP
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton onClick={onToggle} size="small">
            {open ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        )}
      </Box>

      <Divider />

      <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const hasModuleAccess = item.module ? hasPermission(item.module, 'read') : true;

          if (!hasModuleAccess) return null;

          return (
            <ListItemButton
              key={item.path}
              selected={isActive}
              onClick={() => {
                navigate(item.path);
                if (isMobile) onMobileClose();
              }}
              sx={{
                mx: 1,
                borderRadius: 1,
                mb: 0.5,
                minHeight: 44,
                justifyContent: open ? 'initial' : 'center',
                px: open ? 1.5 : 0,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: open ? 40 : 0,
                  justifyContent: 'center',
                  color: isActive ? 'inherit' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
        })}
      </List>

      <Divider />

      {user && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: open ? 2 : 1,
            justifyContent: open ? 'flex-start' : 'center',
          }}
        >
          <Avatar
            src={user.photoURL || undefined}
            sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
          >
            {user.displayName?.charAt(0).toUpperCase()}
          </Avatar>
          {open && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {user.displayName}
              </Typography>
              <Chip
                label={user.role.replace(/([A-Z])/g, ' $1').trim()}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 20, fontSize: 11 }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: 260,
            boxSizing: 'border-box',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          transition: 'width 0.3s ease',
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );
}
