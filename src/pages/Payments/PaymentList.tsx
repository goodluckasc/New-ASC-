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
  TextField,
  Paper,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import PaymentDialog from './PaymentDialog';
import type { Payment, PaymentMethod } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

const methodColors: Record<PaymentMethod, string> = {
  Cash: '#388e3c',
  Card: '#1976d2',
  Bank: '#f57c00',
  'Mobile Banking': '#7b1fa2',
};

export default function PaymentList() {
  const { enqueueSnackbar } = useSnackbar();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filterMethod, setFilterMethod] = useState('');
  const [searchTerm, _setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        setPayments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'payments', deleteTarget.id));
      enqueueSnackbar('Payment deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete payment', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const filteredData = payments.filter((p) => {
    if (filterMethod && p.method !== filterMethod) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matches =
        (p.reference || '').toLowerCase().includes(term);
      if (!matches) return false;
    }
    if (dateFrom || dateTo) {
      const pDate = p.date instanceof Date ? p.date :
        typeof p.date === 'object' && p.date !== null && 'toDate' in p.date
          ? (p.date as { toDate: () => Date }).toDate() : new Date(p.date || '');
      if (dateFrom && pDate < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (pDate > end) return false;
      }
    }
    return true;
  });

  const totalCollected = filteredData.reduce((sum, p) => sum + (p.amount || 0), 0);

  const columns: Column<Payment>[] = [
    { id: 'date', label: 'Date', width: 110, render: (r) => formatDate(r.date) },
    { id: 'invoiceId', label: 'Invoice #', width: 140, render: (r) => r.invoiceId || '-' },
    { id: 'customerName', label: 'Customer', width: 160, render: (r) => (r as any).customerName || '-' },
    { id: 'amount', label: 'Amount', width: 110, align: 'right', render: (r) => `৳${r.amount?.toLocaleString() || '0'}` },
    {
      id: 'method',
      label: 'Method',
      width: 130,
      render: (r) => (
        <Chip
          label={r.method}
          size="small"
          sx={{ color: '#fff', backgroundColor: methodColors[r.method], fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    { id: 'reference', label: 'Reference', width: 140, render: (r) => r.reference || '-' },
  ];

  const actions: Action<Payment>[] = [
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Payments</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setFormOpen(true)}>
          Record Payment
        </Button>
      </Box>

      <Paper elevation={0} sx={{ p: 2, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} color="success.main">
          Total Collected: ৳{totalCollected.toLocaleString()}
        </Typography>
      </Paper>

      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Payment Method</InputLabel>
          <Select value={filterMethod} label="Payment Method" onChange={(e) => setFilterMethod(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Card">Card</MenuItem>
            <MenuItem value="Bank">Bank</MenuItem>
            <MenuItem value="Mobile Banking">Mobile Banking</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="From Date"
          type="date"
          size="small"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="To Date"
          type="date"
          size="small"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
      />

      <PaymentDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={() => {
          enqueueSnackbar('Payment recorded successfully', { variant: 'success' });
          setFormOpen(false);
        }}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Payment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this payment of <strong>৳{deleteTarget?.amount?.toLocaleString()}</strong>? This action cannot be undone.
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