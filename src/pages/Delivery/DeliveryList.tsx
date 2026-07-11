import { useState, useEffect } from 'react';
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
import type { Delivery } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

export default function DeliveryList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Delivery | null>(null);
  const [_searchTerm, _setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'deliveries'),
      (snapshot) => {
        setDeliveries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'deliveries', deleteTarget.id));
      enqueueSnackbar('Delivery record deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete delivery record', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Delivery>[] = [
    { id: 'date', label: 'Date', width: 110, render: (r) => formatDate(r.createdAt) },
    { id: 'jobCardNumber', label: 'Job Card #', width: 140, render: (r) => <Typography sx={{ fontWeight: 600 }}>{r.jobCardNumber}</Typography> },
    { id: 'vehicleId', label: 'Vehicle', width: 130, render: (r) => (r as any).vehicleRegNo || r.vehicleId || '-' },
    { id: 'customerName', label: 'Customer', width: 160, render: (r) => (r as any).customerName || '-' },
    { id: 'deliveryDate', label: 'Delivery Date', width: 110, render: (r) => formatDate(r.deliveryDate) },
    { id: 'odometerOut', label: 'Odometer Out', width: 110, align: 'right', render: (r) => r.odometerOut ?? '-' },
  ];

  const actions: Action<Delivery>[] = [
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Deliveries</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/delivery/new')}>
          New Delivery
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={deliveries}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Delivery</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete delivery record for <strong>{deleteTarget?.jobCardNumber}</strong>? This action cannot be undone.
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