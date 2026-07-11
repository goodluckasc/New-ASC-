import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import type { JobCard, JobCardStatus, JobCardPriority } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

const statusColors: Record<JobCardStatus, string> = {
  Open: '#1976d2',
  'Waiting Parts': '#f57c00',
  'In Progress': '#fbc02d',
  Ready: '#388e3c',
  Delivered: '#9e9e9e',
  Cancelled: '#d32f2f',
};

const priorityColors: Record<JobCardPriority, string> = {
  Low: '#388e3c',
  Medium: '#1976d2',
  High: '#f57c00',
  Urgent: '#d32f2f',
};

export default function JobCardList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<JobCard | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [searchTerm, _setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'jobCards'),
      (snapshot) => {
        setJobCards(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as JobCard)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'jobCards', deleteTarget.id));
      enqueueSnackbar('Job card deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete job card', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const filteredData = jobCards.filter((j) => {
    if (filterStatus && j.status !== filterStatus) return false;
    if (filterPriority && j.priority !== filterPriority) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matches =
        j.jobCardNumber.toLowerCase().includes(term) ||
        j.customerName.toLowerCase().includes(term) ||
        j.vehicleRegNo.toLowerCase().includes(term);
      if (!matches) return false;
    }
    return true;
  });

  const columns: Column<JobCard>[] = [
    {
      id: 'jobCardNumber',
      label: 'Job Card #',
      width: 140,
      render: (r) => <Typography sx={{ fontWeight: 600 }}>{r.jobCardNumber}</Typography>,
    },
    { id: 'date', label: 'Date', width: 110, hideOnSm: true, render: (r) => formatDate(r.date) },
    { id: 'customerName', label: 'Customer', width: 160, render: (r) => r.customerName },
    { id: 'vehicleRegNo', label: 'Vehicle', width: 130, hideOnSm: true, render: (r) => r.vehicleRegNo },
    { id: 'assignedTechnician', label: 'Technician', width: 130, hideOnSm: true, render: (r) => r.assignedTechnician || '-' },
    {
      id: 'priority',
      label: 'Priority',
      width: 100,
      hideOnSm: true,
      render: (r) => (
        <Chip
          label={r.priority}
          size="small"
          sx={{
            color: '#fff',
            backgroundColor: priorityColors[r.priority],
            fontWeight: 600,
            fontSize: 11,
          }}
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 130,
      render: (r) => (
        <Chip
          label={r.status}
          size="small"
          sx={{
            color: '#fff',
            backgroundColor: statusColors[r.status],
            fontWeight: 600,
            fontSize: 11,
          }}
        />
      ),
    },
    { id: 'grandTotal', label: 'Total', width: 100, align: 'right', hideOnSm: true, render: (r) => `৳${r.grandTotal?.toLocaleString() || '0'}` },
  ];

  const actions: Action<JobCard>[] = [
    { label: 'Edit', icon: <Edit />, onClick: (r) => navigate(`/jobcards/${r.id}/edit`) },
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Job Cards</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/jobcards/new')}>
          New Job Card
        </Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="Waiting Parts">Waiting Parts</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Ready">Ready</MenuItem>
            <MenuItem value="Delivered">Delivered</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={filterPriority}
            label="Priority"
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Urgent">Urgent</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
        onRowClick={(r) => navigate(`/jobcards/${r.id}`)}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Job Card</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.jobCardNumber}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}