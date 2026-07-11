import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import type { Purchase } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

export default function PurchaseList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [searchTerm, _setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'purchases'),
      (snapshot) => {
        setPurchases(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Purchase)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return purchases;
    const term = searchTerm.toLowerCase();
    return purchases.filter(
      (p) =>
        p.purchaseNumber.toLowerCase().includes(term) ||
        p.supplierName.toLowerCase().includes(term),
    );
  }, [purchases, searchTerm]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'purchases', deleteTarget.id));
      enqueueSnackbar('Purchase deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete purchase', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Purchase>[] = [
    { id: 'purchaseNumber', label: 'Purchase #', width: 160, render: (r) =>         <Typography sx={{ fontWeight: 600 }}>{r.purchaseNumber}</Typography> },
    { id: 'date', label: 'Date', width: 110, render: (r) => formatDate(r.date) },
    { id: 'supplierName', label: 'Supplier', render: (r) => r.supplierName },
    { id: 'invoiceNumber', label: 'Invoice #', render: (r) => r.invoiceNumber || '-' },
    { id: 'total', label: 'Total', align: 'right', render: (r) => `৳${r.total?.toLocaleString() || '0'}` },
    { id: 'paid', label: 'Paid', align: 'right', render: (r) => `৳${r.paid?.toLocaleString() || '0'}` },
    {
      id: 'due',
      label: 'Due',
      align: 'right',
      render: (r) => {
        const due = r.due || 0;
        return (
          <Typography color={due > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 600 }}>
            ৳{due.toLocaleString()}
          </Typography>
        );
      },
    },
  ];

  const actions: Action<Purchase>[] = [
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Purchases</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/purchases/new')}>
          New Purchase
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Purchase</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete purchase <strong>{deleteTarget?.purchaseNumber}</strong>? This action cannot be undone.
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
