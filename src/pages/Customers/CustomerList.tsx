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
import { Add, Edit, Delete } from '@mui/icons-material';
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
import CustomerForm from './CustomerForm';
import type { Customer } from '../../types';

function formatDate(val: unknown): string {
  if (!val) return '-';
  if (val instanceof Date) return format(val, 'dd/MM/yyyy');
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return format((val as { toDate: () => Date }).toDate(), 'dd/MM/yyyy');
  }
  return String(val);
}

export default function CustomerList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        setCustomers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const handleAdd = () => {
    setEditCustomer(null);
    setFormOpen(true);
  };

  const handleEdit = (row: Customer) => {
    setEditCustomer(row);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'customers', deleteTarget.id));
      enqueueSnackbar('Customer deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete customer', { variant: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Customer>[] = [
    { id: 'name', label: 'Name', render: (r) => r.name },
    { id: 'mobile', label: 'Mobile', render: (r) => r.mobile },
    { id: 'email', label: 'Email', render: (r) => r.email || '-' },
    { id: 'vehicleCount', label: 'Vehicle Count', render: (r) => r.vehicleCount ?? 0 },
    { id: 'createdAt', label: 'Created Date', render: (r) => formatDate(r.createdAt) },
  ];

  const actions: Action<Customer>[] = [
    { label: 'Edit', icon: <Edit />, onClick: handleEdit },
    { label: 'Delete', icon: <Delete />, onClick: (r) => setDeleteTarget(r) },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Customers
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          Add Customer
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        getId={(r) => r.id}
        actions={actions}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
      />

      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editCustomer}
        onSave={() => {
          enqueueSnackbar(editCustomer ? 'Customer updated successfully' : 'Customer added successfully', {
            variant: 'success',
          });
        }}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
