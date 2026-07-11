import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import type { Permissions, Permission } from '../../types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredModule: keyof Permissions;
  requiredAction?: keyof Permission;
}

export default function ProtectedRoute({
  children,
  requiredModule,
  requiredAction = 'read',
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(requiredModule, requiredAction)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 2,
        }}
      >
        <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600 }}>
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You do not have permission to access this page.
        </Typography>
        <Button variant="outlined" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
