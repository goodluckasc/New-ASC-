import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import DataTable, { type Column, type Action } from '../../components/Common/DataTable';
import SupplierForm from './SupplierForm';
import type { Supplier } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

export default function SupplierList() {
  const { enqueueSnackbar } = useSnackbar();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'suppliers'),
      (snapshot) => {
        setSuppliers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleAdd = () => {
    setEditSupplier(null);
    setFormOpen(true);
  };

  const handleEdit = (row: Supplier) => {
    setEditSupplier(row);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'suppliers', deleteTarget.id));
      enqueueSnackbar('Supplier deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete supplier', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Supplier>[] = [
    { id: 'name', label: 'Name', render: (r) => <Typography sx={{ fontWeight: 600 }}>{r.name}</Typography> },
    { id: 'mobile', label: 'Mobile', render: (r) => r.mobile },
    { id: 'email', label: 'Email', render: (r) => r.email || '-' },
    { id: 'currentDue', label: 'Current Due', align: 'right', render: (r) => `৳${r.currentDue?.toLocaleString() || '0'}` },
    { id: 'previousBalance', label: 'Previous Balance', align: 'right', render: (r) => `৳${r.previousBalance?.toLocaleString() || '0'}` },
  ];

  const actions: Action<Supplier>[] = [
    { label: 'Edit', icon: <Edit />, onClick: handleEdit },
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Suppliers</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          Add Supplier
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
        onRowClick={(r) => setSelectedSupplier(selectedSupplier?.id === r.id ? null : r)}
      />

      {selectedSupplier && (
        <Paper elevation={0} sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Payment History - {selectedSupplier.name}</Typography>
            <Chip label={`${selectedSupplier.paymentHistory?.length || 0} payment(s)`} size="small" color="primary" />
          </Box>
          <Box sx={{ p: 2 }}>
            {!selectedSupplier.paymentHistory || selectedSupplier.paymentHistory.length === 0 ? (
              <Typography color="text.secondary">No payment history found.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedSupplier.paymentHistory.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell align="right">৳{p.amount?.toLocaleString()}</TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell>{p.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </Paper>
      )}

      <SupplierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        supplier={editSupplier}
        onSave={() => {
          enqueueSnackbar(editSupplier ? 'Supplier updated successfully' : 'Supplier added successfully', { variant: 'success' });
        }}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Supplier</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
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
