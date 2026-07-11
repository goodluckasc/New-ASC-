import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  CheckCircle as Check,
  Cancel as CancelIcon,
  Phone,
  WhatsApp,
} from '@mui/icons-material';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import FollowUpForm from './FollowUpForm';
import type { FollowUp } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

const statusColors: Record<string, string> = {
  Pending: '#1976d2',
  Completed: '#388e3c',
  Cancelled: '#d32f2f',
};

export default function FollowUpList() {
  const { enqueueSnackbar } = useSnackbar();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editFollowUp, setEditFollowUp] = useState<FollowUp | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [searchTerm, _setSearchTerm] = useState('');
  const [cancelTarget, setCancelTarget] = useState<FollowUp | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'followUps'),
      (snapshot) => {
        setFollowUps(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FollowUp)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleEdit = (row: FollowUp) => {
    setEditFollowUp(row);
    setFormOpen(true);
  };

  const handleComplete = async (row: FollowUp) => {
    try {
      await updateDoc(doc(db, 'followUps', row.id), { status: 'Completed' });
      enqueueSnackbar('Follow-up marked as completed', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update follow-up', { variant: 'error' });
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      await updateDoc(doc(db, 'followUps', cancelTarget.id), { status: 'Cancelled' });
      enqueueSnackbar('Follow-up cancelled', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to cancel follow-up', { variant: 'error' });
    }
    setCancelTarget(null);
  };

  const filteredData = followUps.filter((f) => {
    if (filterStatus && f.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      if (!f.customerName.toLowerCase().includes(term) && !(f.mobile || '').toLowerCase().includes(term)) return false;
    }
    if (filterDate !== 'all') {
      const d = toDate(f.date);
      if (!d) return false;
      if (filterDate === 'today' && !isToday(d)) return false;
      if (filterDate === 'week' && !isThisWeek(d)) return false;
      if (filterDate === 'month' && !isThisMonth(d)) return false;
    }
    return true;
  });

  const columns: Column<FollowUp>[] = [
    {
      id: 'date',
      label: 'Date',
      width: 110,
      render: (r) => {
        const d = toDate(r.date);
        const isTodayDate = d && isToday(d);
        return (
          <Typography sx={{ fontWeight: isTodayDate ? 700 : 400 }} color={isTodayDate ? 'primary.main' : 'text.primary'}>
            {formatDate(r.date)}
            {isTodayDate && ' (Today)'}
          </Typography>
        );
      },
    },
    { id: 'time', label: 'Time', width: 80, render: (r) => r.time || '-' },
    { id: 'customerName', label: 'Customer', width: 160, render: (r) => <Typography sx={{ fontWeight: 600 }}>{r.customerName}</Typography> },
    { id: 'mobile', label: 'Mobile', width: 130, render: (r) => r.mobile || '-' },
    { id: 'notes', label: 'Notes', width: 200, render: (r) => r.notes || '-' },
    { id: 'nextFollowUpDate', label: 'Next Follow-up', width: 110, render: (r) => formatDate(r.nextFollowUpDate) },
    {
      id: 'status',
      label: 'Status',
      width: 110,
      render: (r) => (
        <Chip
          label={r.status}
          size="small"
          sx={{ color: '#fff', backgroundColor: statusColors[r.status] || '#9e9e9e', fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      width: 120,
      sortable: false,
      render: (r) => (
        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          {r.mobile && (
            <>
              <Tooltip title="Call">
                <IconButton size="small" component="a" href={`tel:${r.mobile}`}>
                  <Phone fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="WhatsApp">
                <IconButton size="small" component="a" href={`https://wa.me/${r.mobile.replace(/[^0-9]/g, '')}`} target="_blank">
                  <WhatsApp fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      ),
    },
  ];

  const actions: Action<FollowUp>[] = [
    { label: 'Edit', icon: <Edit />, onClick: handleEdit },
    { label: 'Complete', icon: <Check />, onClick: handleComplete },
    { label: 'Cancel', icon: <CancelIcon />, onClick: (r) => setCancelTarget(r) },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Follow-ups</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditFollowUp(null); setFormOpen(true); }}>
          Add Follow-up
        </Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Date</InputLabel>
          <Select value={filterDate} label="Date" onChange={(e) => setFilterDate(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
        toolbarContent={undefined}
      />

      <FollowUpForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditFollowUp(null); }}
        followUp={editFollowUp}
        onSave={() => {
          enqueueSnackbar(editFollowUp ? 'Follow-up updated successfully' : 'Follow-up added successfully', { variant: 'success' });
          setFormOpen(false);
          setEditFollowUp(null);
        }}
      />

      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <DialogTitle>Cancel Follow-up</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel follow-up for <strong>{cancelTarget?.customerName}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>No</Button>
          <Button onClick={handleCancelConfirm} color="error" variant="contained">Yes, Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}