import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Avatar,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, AdminPanelSettings, CheckCircle, Person } from '@mui/icons-material';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Setup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [email, setEmail] = useState('admin@asc.com');
  const [password, setPassword] = useState('123456');
  const [confirmPassword, setConfirmPassword] = useState('123456');
  const [displayName, setDisplayName] = useState('System Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminExists, setAdminExists] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'Admin'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setAdminExists(true);
        }
      } catch {
        setError('Unable to check admin status. Ensure Firebase is configured.');
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, []);

  const validate = (): boolean => {
    let valid = true;
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setDisplayNameError(null);
    setError(null);

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Invalid email format');
      valid = false;
    }

    if (!displayName.trim()) {
      setDisplayNameError('Display name is required');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await register(email, password, displayName, 'Admin');
      setSuccess('Admin user created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login', { state: { message: 'Admin setup complete. Please sign in.' } }), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Setup failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Card
          elevation={8}
          sx={{
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.98)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {adminExists ? (
              <>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Avatar sx={{ mx: 'auto', width: 56, height: 56, bgcolor: 'success.main', mb: 2 }}>
                    <CheckCircle />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Setup Complete
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    An admin user already exists. Initial setup has already been completed.
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 16,
                  }}
                >
                  Go to Login
                </Button>
              </>
            ) : (
              <>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Avatar sx={{ mx: 'auto', width: 56, height: 56, bgcolor: 'primary.main', mb: 2 }}>
                    <AdminPanelSettings />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Admin Setup
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Create the initial administrator account
                  </Typography>
                </Box>

                <Box component="form" onSubmit={handleSubmit} noValidate>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}
                  {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {success}
                    </Alert>
                  )}

                  <TextField
                    fullWidth
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    error={!!displayNameError}
                    helperText={displayNameError}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ mb: 2.5 }}
                  />

                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!emailError}
                    helperText={emailError}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ mb: 2.5 }}
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!passwordError}
                    helperText={passwordError}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ mb: 2.5 }}
                  />

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={!!confirmPasswordError}
                    helperText={confirmPasswordError}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ mb: 3 }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: 16,
                    }}
                  >
                    {submitting ? <CircularProgress size={24} color="inherit" /> : 'Create Admin Account'}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        <Typography
          variant="caption"
          color="white"
          sx={{ display: 'block', textAlign: 'center', mt: 3, opacity: 0.7 }}
        >
          &copy; {new Date().getFullYear()} ASC APP. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}