import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  addDoc,
  collection,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import type { FollowUp, Customer, Vehicle } from '../../types';

interface FollowUpFormProps {
  open: boolean;
  onClose: () => void;
  followUp?: FollowUp | null;
  onSave?: () => void;
}

export default function FollowUpForm({ open, onClose, followUp, onSave }: FollowUpFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [date, setDate] = useState(followUp ? format(toDate(followUp.date) || new Date(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(followUp?.time || format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState(followUp?.notes || '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(followUp?.nextFollowUpDate ? format(toDate(followUp.nextFollowUpDate) || new Date(), 'yyyy-MM-dd') : '');
  const [status, setStatus] = useState<'Pending' | 'Completed' | 'Cancelled'>(followUp?.status || 'Pending');
  const [saving, setSaving] = useState(false);

  function toDate(val: unknown): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return (val as { toDate: () => Date }).toDate();
    }
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? null : d;
  }

  useEffect(() => {
    if (!open) return;
    const unsubC = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
    });
    const unsubV = onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)));
    });
    return () => { unsubC(); unsubV(); };
  }, [open]);

  useEffect(() => {
    if (followUp) {
      const customer = customers.find((c) => c.id === followUp.customerId);
      if (customer) setSelectedCustomer(customer);
      const vehicle = vehicles.find((v) => v.id === followUp.vehicleId);
      if (vehicle) setSelectedVehicle(vehicle);
    }
  }, [followUp, customers, vehicles]);

  const filteredVehicles = selectedCustomer
    ? vehicles.filter((v) => v.customerId === selectedCustomer.id)
    : vehicles;

  const handleSave = async () => {
    if (!selectedCustomer) {
      enqueueSnackbar('Please select a customer', { variant: 'error' });
      return;
    }
    if (!date) {
      enqueueSnackbar('Please select a date', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const data = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        mobile: selectedCustomer.mobile,
        vehicleId: selectedVehicle?.id || null,
        vehicleRegNo: selectedVehicle?.registrationNumber || null,
        date: new Date(date),
        time,
        notes,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        status,
        createdAt: serverTimestamp(),
      };

      if (followUp) {
        await updateDoc(doc(db, 'followUps', followUp.id), {
          ...data,
          createdAt: followUp.createdAt,
        });
      } else {
        await addDoc(collection(db, 'followUps'), data);
      }

      enqueueSnackbar(followUp ? 'Follow-up updated successfully' : 'Follow-up created successfully', { variant: 'success' });
      onSave?.();
    } catch {
      enqueueSnackbar('Failed to save follow-up', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{followUp ? 'Edit Follow-up' : 'Add Follow-up'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Autocomplete
            options={customers}
            getOptionLabel={(o) => `${o.name} (${o.mobile})`}
            value={selectedCustomer}
            onChange={(_, v) => { setSelectedCustomer(v); setSelectedVehicle(null); }}
            renderInput={(params) => <TextField {...params} label="Customer *" />}
            fullWidth
            disabled={!!followUp}
          />
          <Autocomplete
            options={filteredVehicles}
            getOptionLabel={(o) => `${o.registrationNumber} (${o.brand} ${o.model})`}
            value={selectedVehicle}
            onChange={(_, v) => setSelectedVehicle(v)}
            renderInput={(params) => <TextField {...params} label="Vehicle" />}
            fullWidth
            disabled={!!followUp}
          />
          <TextField
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Notes"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
          />
          <TextField
            label="Next Follow-up Date"
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Status"
            select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Pending' | 'Completed' | 'Cancelled')}
            fullWidth
          >
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : followUp ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}