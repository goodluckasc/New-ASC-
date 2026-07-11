import { useState, useEffect, type ReactNode } from 'react';
import {
  Box, Tabs, Tab, Typography, Paper, TextField, Button, Switch,
  FormControlLabel, Grid, Avatar, IconButton, Divider, Stack,
  Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, InputLabel, FormControl, Alert, Chip as MuiChip,
  Checkbox,
} from '@mui/material';
import {
  Save, Upload, Add, Edit, Delete, CloudUpload, CloudDownload,
  DarkMode, LightMode, SettingsBrightness,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, storage, auth } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import type { User, UserRole } from '../../types';
import { MODULES } from '../../config/roles';

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
}

const SETTINGS_KEY = 'asc-app-settings';

interface AppSettings {
  companyName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  lowStockThreshold: number;
  serviceReminderDays: number;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  themeMode: 'light' | 'dark' | 'system';
  lastBackup: string | null;
}

const defaultSettings: AppSettings = {
  companyName: 'Auto Service Center',
  logo: '',
  address: '123, Dhaka, Bangladesh',
  phone: '+880 1700 000000',
  email: 'info@autoservice.com',
  website: 'www.autoservice.com',
  currency: 'BDT',
  taxRate: 5,
  invoicePrefix: 'INV',
  lowStockThreshold: 10,
  serviceReminderDays: 30,
  sidebarCollapsed: false,
  compactMode: false,
  themeMode: 'light',
  lastBackup: null,
};

const allModules = [...MODULES] as const;
const allActions = ['create', 'read', 'update', 'delete'] as const;

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'Admin';

  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  // General
  const handleChange = (field: keyof AppSettings, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveGeneral = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `logos/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleChange('logo', url);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) handleChange('logo', ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userDialog, setUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ displayName: '', email: '', phone: '', role: 'ServiceAdvisor' as UserRole, password: '' });

  useEffect(() => {
    if (!isAdmin) { setUsersLoading(false); return; }
    async function fetchUsers() {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
      } catch {
        setUsers([]);
      }
      setUsersLoading(false);
    }
    fetchUsers();
  }, [isAdmin]);

  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({ displayName: user.displayName, email: user.email, phone: user.phone || '', role: user.role, password: '' });
    } else {
      setEditingUser(null);
      setUserForm({ displayName: '', email: '', phone: '', role: 'ServiceAdvisor', password: '' });
    }
    setUserDialog(true);
  };

  const handleSaveUser = async () => {
    if (!isAdmin) return;
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          displayName: userForm.displayName,
          phone: userForm.phone,
          role: userForm.role,
        });
      } else {
        if (!userForm.password) {
          Alert; return;
        }
        const cred = await createUserWithEmailAndPassword(auth, userForm.email, userForm.password);
        await updateProfile(cred.user, { displayName: userForm.displayName });
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName: userForm.displayName,
          email: userForm.email,
          phone: userForm.phone,
          role: userForm.role,
          isActive: true,
          createdAt: serverTimestamp(),
        });
      }
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
      setUserDialog(false);
    } catch (err) {
      console.error('Failed to save user:', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch { /* ignore */ }
  };

  const toggleUserActive = async (u: User) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', u.id), { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    } catch { /* ignore */ }
  };

  // Technicians
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [techDialogOpen, setTechDialogOpen] = useState(false);
  const [techName, setTechName] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'technicians'), (snap) => {
      setTechnicians(snap.docs.map((d) => d.data().name as string));
    });
    return unsub;
  }, []);

  const handleAddTechnician = async () => {
    if (!techName.trim()) return;
    try {
      await addDoc(collection(db, 'technicians'), { name: techName.trim() });
      setTechName('');
      setTechDialogOpen(false);
    } catch (err) {
      console.error('Failed to add technician:', err);
    }
  };

  const handleRemoveTechnician = async (name: string) => {
    try {
      const q = query(collection(db, 'technicians'), where('name', '==', name));
      const snap = await getDocs(q);
      snap.forEach((d) => deleteDoc(doc(db, 'technicians', d.id)));
    } catch (err) {
      console.error('Failed to remove technician:', err);
    }
  };

  // Permissions
  const [permissions, setPermissions] = useState<Record<string, Record<string, Record<string, boolean>>>>(() => {
    try {
      const raw = localStorage.getItem('asc-permissions');
      if (raw) return JSON.parse(raw);
    } catch { /* */ }
    return {};
  });

  const handlePermissionToggle = (role: string, module: string, action: string) => {
    setPermissions((prev) => {
      const next = { ...prev };
      if (!next[role]) next[role] = {};
      if (!next[role][module]) next[role][module] = { create: false, read: false, update: false, delete: false };
      next[role][module] = { ...next[role][module], [action]: !next[role][module][action] };
      return next;
    });
  };

  const handleSavePermissions = () => {
    localStorage.setItem('asc-permissions', JSON.stringify(permissions));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Notifications
  const [notifTypes, setNotifTypes] = useState<Record<string, boolean>>({
    lowStock: true, serviceReminder: true, paymentReceived: true,
    jobCardCreated: true, followUp: true, invoiceGenerated: true,
  });

  // Backup
  const [lastBackup, setLastBackup] = useState(settings.lastBackup);

  const handleExportAll = async () => {
    const collections = ['customers', 'vehicles', 'jobCards', 'inventory', 'suppliers', 'purchases', 'invoices', 'payments', 'calls', 'followUps', 'activityLogs', 'notifications', 'users'];
    const data: Record<string, unknown[]> = {};
    for (const name of collections) {
      try {
        const snap = await getDocs(collection(db, name));
        data[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch {
        data[name] = [];
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `asc-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    setLastBackup(new Date().toISOString());
    setSettings((prev) => ({ ...prev, lastBackup: new Date().toISOString() }));
    saveSettings({ ...settings, lastBackup: new Date().toISOString() });
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        for (const [col, docs] of Object.entries(data)) {
          if (Array.isArray(docs)) {
            for (const d of docs) {
              try {
                await addDoc(collection(db, col), d);
              } catch { /* skip individual failures */ }
            }
          }
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch { /* */ }
    };
    input.click();
  };

  const [compactMode, setCompactMode] = useState(settings.compactMode);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(settings.sidebarCollapsed);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(settings.themeMode);

  useEffect(() => {
    setCompactMode(settings.compactMode);
    setSidebarCollapsed(settings.sidebarCollapsed);
    setThemeMode(settings.themeMode);
  }, [settings]);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>Settings</Typography>
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', minWidth: 100, fontSize: 13 } }}>
          <Tab label="General" />
          <Tab label="Users" disabled={!isAdmin} />
          <Tab label="Technicians" />
          <Tab label="Roles & Permissions" disabled={!isAdmin} />
          <Tab label="Notifications" />
          <Tab label="Backup" />
          <Tab label="Appearance" />
        </Tabs>
      </Paper>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>Settings saved successfully!</Alert>}

      {/* General */}
      <TabPanel value={tab} index={0}>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>General Settings</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack sx={{ alignItems: 'center' }} spacing={2}>
                <Avatar src={settings.logo || undefined} sx={{ width: 120, height: 120, bgcolor: 'grey.200' }}>
                  {settings.companyName.charAt(0).toUpperCase()}
                </Avatar>
                <Button component="label" variant="outlined" size="small" startIcon={<Upload />}>
                  Upload Logo
                  <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField label="Company Name" fullWidth size="small" value={settings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Address" fullWidth size="small" value={settings.address} onChange={(e) => handleChange('address', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Phone" fullWidth size="small" value={settings.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Email" fullWidth size="small" value={settings.email} onChange={(e) => handleChange('email', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Website" fullWidth size="small" value={settings.website} onChange={(e) => handleChange('website', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Default Currency" fullWidth size="small" value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Tax Rate (%)" type="number" fullWidth size="small" value={settings.taxRate} onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Invoice Prefix" fullWidth size="small" value={settings.invoicePrefix} onChange={(e) => handleChange('invoicePrefix', e.target.value)} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button variant="contained" startIcon={<Save />} onClick={handleSaveGeneral}>Save Settings</Button>
          </Box>
        </Paper>
      </TabPanel>

      {/* Users */}
      <TabPanel value={tab} index={1}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>User Management</Typography>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => openUserDialog()}>Add User</Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Loading...</Typography></TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No users found</Typography></TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell><MuiChip label={u.role} size="small" color={u.role === 'Admin' ? 'error' : 'primary'} variant="outlined" /></TableCell>
                    <TableCell>
                      <Switch size="small" checked={u.isActive} onChange={() => toggleUserActive(u)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openUserDialog(u)}><Edit /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog open={userDialog} onClose={() => setUserDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" fullWidth size="small" value={userForm.displayName} onChange={(e) => setUserForm((p) => ({ ...p, displayName: e.target.value }))} />
              <TextField label="Email" fullWidth size="small" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} />
              <TextField label="Phone" fullWidth size="small" value={userForm.phone} onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))} />
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select label="Role" value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
                  {(['Admin', 'Manager', 'ServiceAdvisor', 'Accounts', 'StoreKeeper', 'Technician'] as UserRole[]).map((r) => (
                    <MenuItem key={r} value={r}>{r === 'ServiceAdvisor' ? 'Service Advisor' : r}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!editingUser && (
                <TextField label="Password" type="password" fullWidth size="small" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveUser}>{editingUser ? 'Update' : 'Add'}</Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* Technicians */}
      <TabPanel value={tab} index={2}>
        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Technician Management</Typography>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setTechDialogOpen(true)}>
              Add Technician
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {technicians.length === 0 ? (
                  <TableRow><TableCell colSpan={2} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No technicians added yet</Typography></TableCell></TableRow>
                ) : technicians.map((name) => (
                  <TableRow key={name} hover>
                    <TableCell>{name}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => handleRemoveTechnician(name)}><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog open={techDialogOpen} onClose={() => setTechDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Add Technician</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="Technician Name"
              fullWidth
              size="small"
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
              sx={{ mt: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTechnician(); }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTechDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddTechnician}>Add</Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* Roles & Permissions */}
      <TabPanel value={tab} index={3}>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'auto' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Roles & Permissions Matrix</Typography>
            <Button variant="contained" startIcon={<Save />} onClick={handleSavePermissions}>Save Permissions</Button>
          </Stack>
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'grey.50' }}>Role / Module</TableCell>
                  {allActions.map((act) => (
                    <TableCell key={act} sx={{ fontWeight: 700, textTransform: 'capitalize', bgcolor: 'grey.50', textAlign: 'center' }}>{act}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(['Admin', 'Manager', 'ServiceAdvisor', 'Accounts', 'StoreKeeper', 'Technician'] as const).map((role) => (
                  allModules.map((mod, mi) => (
                    <TableRow key={`${role}-${mod}`} hover>
                      {mi === 0 && (
                        <TableCell rowSpan={allModules.length} sx={{ fontWeight: 600, verticalAlign: 'top', borderRight: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                          {role === 'ServiceAdvisor' ? 'Service Advisor' : role}
                        </TableCell>
                      )}
                      <TableCell sx={{ whiteSpace: 'nowrap', pl: mi === 0 ? 2 : 2 }}>{mod.charAt(0).toUpperCase() + mod.slice(1)}</TableCell>
                      {allActions.map((act) => {
                        const checked = permissions[role]?.[mod]?.[act] ?? false;
                        return (
                          <TableCell key={act} align="center" sx={{ px: 0 }}>
                            <Checkbox
                              checked={checked}
                              onChange={() => handlePermissionToggle(role, mod, act)}
                              size="small"
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Notifications */}
      <TabPanel value={tab} index={4}>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Notification Settings</Typography>
          <Stack spacing={2} sx={{ mb: 3 }}>
            {Object.entries(notifTypes).map(([key, val]) => (
              <FormControlLabel
                key={key}
                control={<Switch checked={val} onChange={() => setNotifTypes((p) => ({ ...p, [key]: !p[key] }))} />}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              />
            ))}
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Low Stock Alert Threshold" type="number" size="small" fullWidth value={settings.lowStockThreshold} onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 10)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Service Reminder Days" type="number" size="small" fullWidth value={settings.serviceReminderDays} onChange={(e) => handleChange('serviceReminderDays', parseInt(e.target.value) || 30)} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button variant="contained" startIcon={<Save />} onClick={() => { saveSettings(settings); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>Save</Button>
          </Box>
        </Paper>
      </TabPanel>

      {/* Backup */}
      <TabPanel value={tab} index={5}>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Data Backup & Restore</Typography>
          <Stack spacing={3}>
            <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Last Backup: {lastBackup ? format(new Date(lastBackup), 'PPPpp') : 'Never'}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" startIcon={<CloudUpload />} onClick={handleExportAll}>Export All Data</Button>
                <Button variant="outlined" startIcon={<CloudDownload />} onClick={handleImportData}>Import Data</Button>
              </Stack>
            </Paper>
            <Alert severity="info">
              Export will download all collections as a JSON file. Import will read a previously exported JSON file and add data to Firestore.
            </Alert>
          </Stack>
        </Paper>
      </TabPanel>

      {/* Appearance */}
      <TabPanel value={tab} index={6}>
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Appearance Settings</Typography>
          <Stack spacing={3}>
            <Typography variant="subtitle2" color="text.secondary">Theme Mode</Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant={themeMode === 'light' ? 'contained' : 'outlined'}
                startIcon={<LightMode />}
                onClick={() => handleChange('themeMode', 'light')}
              >Light</Button>
              <Button
                variant={themeMode === 'dark' ? 'contained' : 'outlined'}
                startIcon={<DarkMode />}
                onClick={() => handleChange('themeMode', 'dark')}
              >Dark</Button>
              <Button
                variant={themeMode === 'system' ? 'contained' : 'outlined'}
                startIcon={<SettingsBrightness />}
                onClick={() => handleChange('themeMode', 'system')}
              >System</Button>
            </Stack>

            <FormControlLabel
              control={<Switch checked={sidebarCollapsed} onChange={(e) => handleChange('sidebarCollapsed', e.target.checked)} />}
              label="Sidebar collapsed by default"
            />
            <FormControlLabel
              control={<Switch checked={compactMode} onChange={(e) => handleChange('compactMode', e.target.checked)} />}
              label="Compact mode"
            />
            <Box sx={{ textAlign: 'right' }}>
              <Button variant="contained" startIcon={<Save />} onClick={() => { saveSettings(settings); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>Save</Button>
            </Box>
          </Stack>
        </Paper>
      </TabPanel>
    </Box>
  );
}

